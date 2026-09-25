import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { CompanySettings, MedicalMatchEntry, UserSession } from '../../types';
import { db } from '../../database/db';
import { MatchingService, RawMedicalEntry } from '../../services/matchingService';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface MedicalMatchupViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const MedicalMatchupView: React.FC<MedicalMatchupViewProps> = ({
  currentUser,
  settings,
  onShowToast,
  onRequestConfirm,
}) => {
  const [entries, setEntries] = useState<MedicalMatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<MedicalMatchEntry | null>(null);
  const [note, setNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await db.getMedicalMatchEntries();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const medicals = await db.getMedicalEntries();
      const existing = await db.getMedicalMatchEntries();

      const rawMedicals: RawMedicalEntry[] = medicals.map((m) => ({
        entryNumber: m.entryNumber,
        date: m.date || m.entryDate || '',
        party: m.party,
        item: m.medicalItem,
        quantity: m.quantity,
        batch: m.batchNumber,
        amount: m.amount,
      }));

      // Extract pharmacy receiving slips
      const hospitalSheet: RawMedicalEntry[] = existing
        .filter((e) => e.hospitalRecord)
        .map((e) => ({
          entryNumber: e.entryNumber,
          date: e.date || e.entryDate || '',
          party: e.hospitalRecord?.party || e.partyB || '',
          item: e.hospitalRecord?.item || e.itemB || '',
          quantity: e.hospitalRecord?.quantity ?? e.quantityB ?? 0,
          batch: e.hospitalRecord?.batchNumber || e.batchB || '',
          amount: e.hospitalRecord?.amount ?? e.amountB ?? 0,
        }));

      const results = MatchingService.reconcileMedicalEntries(rawMedicals, hospitalSheet);
      await db.bulkSaveMedicalMatchEntries(results);
      setEntries(results);
      onShowToast(`Medical match-up reconciled. ${results.length} batches checked.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Medical reconciliation failed', 'error');
    } finally {
      setReconciling(false);
    }
  };

  const handleVerify = async (entry: MedicalMatchEntry) => {
    try {
      await db.setMedicalMatchResolution(entry.id, true);
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, isVerified: true, resolvedBy: currentUser.name, resolvedAt: new Date().toISOString() }
            : item
        )
      );
      onShowToast(`Medical batch for Entry #${entry.entryNumber} verified`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast('Failed to verify batch', 'error');
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedEntry) return;
    try {
      await db.setMedicalMatchResolution(selectedEntry.id, true, note);
      setEntries((prev) =>
        prev.map((item) =>
          item.id === selectedEntry.id
            ? {
                ...item,
                isVerified: true,
                correctionNote: note,
                resolvedBy: currentUser.name,
                resolvedAt: new Date().toISOString(),
              }
            : item
        )
      );
      onShowToast(`Resolution saved for entry #${selectedEntry.entryNumber}`, 'success');
      setSelectedEntry(null);
      setNote('');
      loadData();
    } catch (err: any) {
      onShowToast('Failed to save resolution note', 'error');
    }
  };

  const handleExportExcel = () => {
    const data = filteredEntries.map((e) => ({
      'Entry #': e.entryNumber,
      'Date': e.date || e.entryDate,
      'Status': e.status,
      'Warehouse Item': e.warehouseRecord?.item || e.itemA || 'N/A',
      'Warehouse Batch': e.warehouseRecord?.batchNumber || e.batchA || 'N/A',
      'Warehouse Qty': e.warehouseRecord?.quantity ?? e.quantityA ?? 0,
      'Warehouse Amount': e.warehouseRecord?.amount ?? e.amountA ?? 0,
      'Hospital Qty': e.hospitalRecord?.quantity ?? e.quantityB ?? 'N/A',
      'Hospital Amount': e.hospitalRecord?.amount ?? e.amountB ?? 'N/A',
      'Discrepancies': (e.discrepancies || e.diffNotes || []).join('; ') || 'None',
      'Verified': e.isVerified ? 'YES' : 'NO',
      'Resolution Notes': e.resolutionNotes || e.correctionNote || '',
    }));

    ExcelService.exportToExcel(data, `Medical_MatchUp_${Date.now()}`, 'MedMatch');
    onShowToast('Exported Medical Match-Up to Excel', 'success');
  };

  const filteredEntries = entries.filter((e) => {
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const discrepancies = e.discrepancies || e.diffNotes || [];
      return (
        e.entryNumber.toLowerCase().includes(q) ||
        (e.warehouseRecord?.item.toLowerCase().includes(q) ?? false) ||
        (e.warehouseRecord?.batchNumber.toLowerCase().includes(q) ?? false) ||
        (e.hospitalRecord?.party.toLowerCase().includes(q) ?? false) ||
        discrepancies.some((d: string) => d.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const matchedCount = entries.filter((e) => e.status === 'Matched').length;
  const partialCount = entries.filter((e) => e.status === 'Partially Matched').length;
  const missingCount = entries.filter((e) => e.status.startsWith('Missing')).length;

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <span>MEDICAL ENTRIES MATCH-UP</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit comparison between Central Medical Warehouse dispatch and Hospital Pharmacy receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Checking Batches...' : 'Re-verify Batches'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setStatusFilter(statusFilter === 'Matched' ? 'All' : 'Matched')}
          className={`p-3 rounded-xl border cursor-pointer ${
            statusFilter === 'Matched' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Batches Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{matchedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Partially Matched' ? 'All' : 'Partially Matched')}
          className={`p-3 rounded-xl border cursor-pointer ${
            statusFilter === 'Partially Matched' ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Discrepant Batches / Qty</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">{partialCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Missing in Hospital' ? 'All' : 'Missing in Hospital')}
          className={`p-3 rounded-xl border cursor-pointer ${
            statusFilter.startsWith('Missing') ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Missing Pharmacy Slips</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">{missingCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Batch #, Item, Entry #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 outline-none"
          >
            <option value="All">All Statuses ({entries.length})</option>
            <option value="Matched">Matched Only</option>
            <option value="Partially Matched">Discrepant Batches</option>
            <option value="Missing in Hospital">Missing in Hospital</option>
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-3">Entry #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Warehouse Dispatch (A)</th>
                <th className="py-3 px-3">Hospital Pharmacy (B)</th>
                <th className="py-3 px-3">Discrepancy Breakdown</th>
                <th className="py-3 px-3 text-center">Verified</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading medical match-up...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching records found. Click "Re-verify Batches" to scan.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isOk = e.status === 'Matched';
                  const isPartial = e.status === 'Partially Matched';
                  const isMissing = e.status.startsWith('Missing');

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{e.entryNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{e.entryDate}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOk
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPartial
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isOk && <CheckCircle2 className="w-3 h-3" />}
                          {isPartial && <AlertTriangle className="w-3 h-3" />}
                          {isMissing && <XCircle className="w-3 h-3" />}
                          <span>{e.status}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        {e.warehouseRecord ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{e.warehouseRecord.item}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Batch: <span className="text-teal-800 font-bold">{e.warehouseRecord.batchNumber}</span> &bull; Qty: {e.warehouseRecord.quantity} &bull; ₹{e.warehouseRecord.amount.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic">Missing in Warehouse</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {e.hospitalRecord ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{e.hospitalRecord.party}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Batch: <span className="text-teal-800 font-bold">{e.hospitalRecord.batchNumber}</span> &bull; Qty: {e.hospitalRecord.quantity} &bull; ₹{e.hospitalRecord.amount.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic">Missing in Hospital</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {((e.discrepancies || e.diffNotes || []).length === 0) ? (
                          <span className="text-emerald-600 font-semibold">&check; Batch & Qty Verified</span>
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
                            {(e.resolutionNotes || e.correctionNote) && (
                              <div className="text-[10px] text-blue-700 italic">Note: {e.resolutionNotes || e.correctionNote}</div>
                            )}
                          </div>
                        )}
                      </td>

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

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!e.isVerified && (
                            <button
                              onClick={() => handleVerify(e)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px]"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedEntry(e);
                              setNote(e.resolutionNotes || '');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            Note
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

      {/* Note Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-4 space-y-3">
            <div className="font-bold text-slate-900 text-sm">
              Batch Discrepancy Note: Entry #{selectedEntry.entryNumber}
            </div>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Hospital confirmed 1 damaged vial replaced under warranty"
              className="w-full p-2 border border-slate-300 rounded text-slate-800 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-3 py-1.5 border rounded text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResolution}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
