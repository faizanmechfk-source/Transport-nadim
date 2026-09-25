import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CompanySettings, MatchEntry, MatchStatus, UserSession } from '../../types';
import { db } from '../../database/db';
import { MatchingService, RawTransportEntry } from '../../services/matchingService';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface MatchupViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const MatchupView: React.FC<MatchupViewProps> = ({
  currentUser,
  settings,
  onShowToast,
  onRequestConfirm,
}) => {
  const [matchEntries, setMatchEntries] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryForResolve, setSelectedEntryForResolve] = useState<MatchEntry | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await db.getMatchEntries();
    setMatchEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const bilties = await db.getBilties();
      const memos = await db.getMemos();

      const rawBilties: RawTransportEntry[] = bilties.map((b) => ({
        biltyNumber: b.biltyNumber,
        date: b.biltyDate,
        party: b.consignor,
        vehicle: b.vehicleNumber,
        amount: b.totalAmount,
        weight: b.weight,
      }));

      const transporterSheet: RawTransportEntry[] = memos.map((m) => ({
        biltyNumber: m.biltyReferences[0] || m.memoNumber,
        date: m.memoDate,
        party: m.party,
        vehicle: m.vehicleNumber,
        amount: m.amount,
        weight: m.weight || 0,
      }));

      const results = MatchingService.reconcileTransportEntries(rawBilties, transporterSheet);
      await db.bulkSaveMatchEntries(results);
      setMatchEntries(results);
      onShowToast(`Reconciliation complete. ${results.length} records processed.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Reconciliation failed', 'error');
    } finally {
      setReconciling(false);
    }
  };

  const handleVerify = async (entry: MatchEntry) => {
    try {
      await db.setMatchResolution(entry.id, true);
      setMatchEntries((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, isVerified: true, resolvedBy: currentUser.name, resolvedAt: new Date().toISOString() }
            : item
        )
      );
      onShowToast(`Entry #${entry.biltyNumber} verified`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast('Failed to verify entry', 'error');
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedEntryForResolve) return;
    try {
      await db.setMatchResolution(selectedEntryForResolve.id, true, resolutionNote);
      setMatchEntries((prev) =>
        prev.map((item) =>
          item.id === selectedEntryForResolve.id
            ? {
                ...item,
                isVerified: true,
                resolutionNote: resolutionNote,
                resolvedBy: currentUser.name,
                resolvedAt: new Date().toISOString(),
              }
            : item
        )
      );
      onShowToast(`Resolution saved for #${selectedEntryForResolve.biltyNumber}`, 'success');
      setSelectedEntryForResolve(null);
      setResolutionNote('');
      loadData();
    } catch (err: any) {
      onShowToast('Failed to save resolution note', 'error');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredEntries.map((e) => ({
      'Bilty / Doc #': e.biltyNumber,
      'Date': e.biltyDate || e.date,
      'Status': e.status,
      'Set A (Booking) Party': e.partyA || e.bookingRecord?.consignor || 'N/A',
      'Set A (Booking) Vehicle': e.vehicleA || e.bookingRecord?.vehicleNumber || 'N/A',
      'Set A Freight': e.amountA ?? e.bookingRecord?.amount ?? 0,
      'Set B (Transporter) Party': e.partyB || e.transporterRecord?.transporterName || 'N/A',
      'Set B (Transporter) Vehicle': e.vehicleB || e.transporterRecord?.vehicleNumber || 'N/A',
      'Set B Freight': e.amountB ?? e.transporterRecord?.amount ?? 0,
      'Discrepancies': (e.discrepancies || e.diffNotes || []).join('; ') || 'None',
      'Verified': e.isVerified ? 'YES' : 'NO',
      'Resolution': e.resolutionNotes || e.resolutionNote || '',
    }));

    ExcelService.exportToExcel(dataToExport, `Transport_MatchUp_${Date.now()}`, 'MatchUp');
    onShowToast('Exported Match-Up report to Excel', 'success');
  };

  const handleExportPdf = () => {
    PdfService.generateMatchUpPdf(filteredEntries, 'Transport Match-Up', settings);
    onShowToast('Generated Match-Up PDF report', 'success');
  };

  // Filtered entries
  const filteredEntries = matchEntries.filter((e) => {
    if (statusFilter !== 'All' && e.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const discrepancies = e.discrepancies || e.diffNotes || [];
      const match =
        e.biltyNumber.toLowerCase().includes(q) ||
        (e.partyA && e.partyA.toLowerCase().includes(q)) ||
        (e.partyB && e.partyB.toLowerCase().includes(q)) ||
        discrepancies.some((d: string) => d.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const matchedCount = matchEntries.filter((e) => e.status === 'Matched').length;
  const partialCount = matchEntries.filter((e) => e.status === 'Partially Matched').length;
  const missingCount = matchEntries.filter((e) => e.status.startsWith('Missing')).length;
  const duplicateCount = matchEntries.filter((e) => e.status === 'Duplicate').length;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-600" />
            <span>ENTRIES MATCH-UP (RECONCILIATION)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit comparison between Booking Office records and Transporter Delivery manifests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Reconciling...' : 'Run Auto-Reconcile'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div
          onClick={() => setStatusFilter(statusFilter === 'Matched' ? 'All' : 'Matched')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'Matched'
              ? 'bg-emerald-50 border-emerald-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Fully Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{matchedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Records 100% in sync</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Partially Matched' ? 'All' : 'Partially Matched')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'Partially Matched'
              ? 'bg-amber-50 border-amber-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Partial Discrepancy</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">{partialCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Weight, Pkg or Amount diff</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Missing in Transporter' ? 'All' : 'Missing in Transporter')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter.startsWith('Missing')
              ? 'bg-rose-50 border-rose-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Missing Records</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">{missingCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Absent in opposite ledger</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Duplicate' ? 'All' : 'Duplicate')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'Duplicate'
              ? 'bg-purple-50 border-purple-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Duplicates</span>
            <Copy className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-1">{duplicateCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Double entered docs</div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Bilty #, Party, Discrepancy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:border-indigo-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 focus:border-indigo-600 outline-none"
          >
            <option value="All">All Statuses ({matchEntries.length})</option>
            <option value="Matched">Matched Only</option>
            <option value="Partially Matched">Partially Matched (Discrepant)</option>
            <option value="Missing in Transporter">Missing in Transporter</option>
            <option value="Missing in Booking">Missing in Booking</option>
            <option value="Duplicate">Duplicate</option>
          </select>

          {statusFilter !== 'All' && (
            <button
              onClick={() => setStatusFilter('All')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Comparison Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3">Bilty #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Booking Record (A)</th>
                <th className="py-3 px-3">Transporter Sheet (B)</th>
                <th className="py-3 px-3">Discrepancy Breakdown</th>
                <th className="py-3 px-3 text-center">Verified</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading reconciliation records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No records found matching filters. Click "Run Auto-Reconcile" to re-process bilties.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isOk = e.status === 'Matched';
                  const isPartial = e.status === 'Partially Matched';
                  const isMissing = e.status.startsWith('Missing');

                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !isOk ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {e.biltyNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{e.biltyDate || e.date}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOk
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPartial
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isMissing
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isOk && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isPartial && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {isMissing && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{e.status}</span>
                        </span>
                      </td>

                      {/* Booking Record (A) */}
                      <td className="py-2.5 px-3">
                        {e.bookingRecord || e.partyA ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">
                              {e.partyA || (e.bookingRecord ? `${e.bookingRecord.consignor} → ${e.bookingRecord.consignee}` : 'Set A Record')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Veh: {e.vehicleA || e.bookingRecord?.vehicleNumber || 'N/A'} &bull; ₹
                              {(e.amountA ?? e.bookingRecord?.amount ?? 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic font-semibold">Missing in Booking</span>
                        )}
                      </td>

                      {/* Transporter Sheet (B) */}
                      <td className="py-2.5 px-3">
                        {e.transporterRecord || e.partyB ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">
                              {e.partyB || e.transporterRecord?.transporterName || 'Set B Record'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Veh: {e.vehicleB || e.transporterRecord?.vehicleNumber || 'N/A'} &bull; ₹
                              {(e.amountB ?? e.transporterRecord?.amount ?? 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic font-semibold">Missing in Transporter</span>
                        )}
                      </td>

                      {/* Discrepancies */}
                      <td className="py-2.5 px-3">
                        {((e.discrepancies || e.diffNotes || []).length === 0) ? (
                          <span className="text-emerald-600 font-semibold text-[11px]">&check; In Sync</span>
                        ) : (
                          <div className="space-y-0.5">
                            {(e.discrepancies || e.diffNotes || []).map((d: string, i: number) => (
                              <div
                                key={i}
                                className="text-[11px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-medium"
                              >
                                {d}
                              </div>
                            ))}
                            {(e.resolutionNotes || e.resolutionNote) && (
                              <div className="text-[10px] text-blue-700 italic">
                                Note: {e.resolutionNotes || e.resolutionNote}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Verified Status */}
                      <td className="py-2.5 px-3 text-center">
                        {e.isVerified ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!e.isVerified ? (
                            <button
                              onClick={() => handleVerify(e)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-xs"
                              title="Mark as Verified"
                            >
                              Verify
                            </button>
                          ) : null}

                          <button
                            onClick={() => {
                              setSelectedEntryForResolve(e);
                              setResolutionNote(e.resolutionNotes || e.resolutionNote || '');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px]"
                            title="Add or Edit Resolution Note"
                          >
                            Resolve Note
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Note Modal */}
      {selectedEntryForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="font-bold">
                Resolve Discrepancy: Bilty #{selectedEntryForResolve.biltyNumber}
              </div>
              <button
                onClick={() => setSelectedEntryForResolve(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <span className="text-slate-500 block font-bold text-[10px] uppercase mb-1">
                  Identified Discrepancies
                </span>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded space-y-1">
                  {(selectedEntryForResolve.discrepancies || selectedEntryForResolve.diffNotes || []).map((d: string, i: number) => (
                    <div key={i} className="text-rose-800 font-medium">
                      &bull; {d}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Resolution / Clarification Note
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Transporter confirmed extra handling fee of ₹200; Approved by branch manager."
                  className="w-full p-2 border border-slate-300 rounded focus:border-indigo-600 outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedEntryForResolve(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResolution}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow"
              >
                Save & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
