import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Cross,
  FileSpreadsheet,
  Download,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Bilty, CompanySettings, MedicalEntry, Party, UserSession } from '../../types';
import { db } from '../../database/db';
import { MedicalFormModal } from './MedicalFormModal';
import { MedicalPrintView } from './MedicalPrintView';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface MedicalViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedMedicalId?: string;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const MedicalView: React.FC<MedicalViewProps> = ({
  currentUser,
  settings,
  selectedMedicalId,
  onShowToast,
  onRequestConfirm,
}) => {
  const [entries, setEntries] = useState<MedicalEntry[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<MedicalEntry | null>(null);
  const [printEntry, setPrintEntry] = useState<MedicalEntry | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [e, p, b] = await Promise.all([
      db.getMedicalEntries(),
      db.getParties(),
      db.getBilties(),
    ]);
    setEntries(e);
    setParties(p);
    setBilties(b);
    setLoading(false);

    if (selectedMedicalId) {
      const match = e.find((x) => x.id === selectedMedicalId);
      if (match) setPrintEntry(match);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMedicalId]);

  const filteredEntries = entries.filter((e) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.entryNumber.toLowerCase().includes(q) ||
        e.party.toLowerCase().includes(q) ||
        e.medicalItem.toLowerCase().includes(q) ||
        e.batchNumber.toLowerCase().includes(q) ||
        e.patientReference.toLowerCase().includes(q) ||
        e.transportBiltyNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (entry: MedicalEntry) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Medical entries.', 'error');
      return;
    }
    onRequestConfirm(
      `Delete Medical Entry #${entry.entryNumber}?`,
      'This entry will be moved to the Recycle Bin.',
      async () => {
        try {
          await db.deleteMedicalEntry(entry.id, true);
          setEntries((prev) => prev.filter((item) => item.id !== entry.id));
          onShowToast(`Entry #${entry.entryNumber} moved to Recycle Bin`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete entry', 'error');
        }
      },
      true
    );
  };

  const handleExportExcel = () => {
    const data = filteredEntries.map((e) => ({
      'Entry #': e.entryNumber,
      'Date': e.date || (e as any).entryDate || '',
      'Party / Hospital': e.party,
      'Patient Reference': e.patientReference || 'N/A',
      'Medical Item': e.medicalItem,
      'Quantity': e.quantity,
      'Batch Number': e.batchNumber,
      'Amount': e.amount,
      'Transport Bilty #': e.transportBiltyNumber,
      'Remarks': e.remarks || '',
    }));
    ExcelService.exportToExcel(data, `Medical_Entries_${Date.now()}`, 'Medical');
    onShowToast('Exported Medical Entries to Excel', 'success');
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cross className="w-5 h-5 text-teal-600" />
            <span>MEDICAL & PHARMA CONSIGNMENTS</span>
            <span className="text-xs bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredEntries.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pharmaceutical cargo register, clinical batch tracking, hospital medicine deliveries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => {
              if (currentUser.role === 'viewer') {
                onShowToast('Viewer account has read-only access.', 'warning');
                return;
              }
              setEntryToEdit(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Medical Entry</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Entry #, Item, Batch, Party..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-teal-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-3">Entry #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Party / Hospital</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3">Batch #</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Bilty Ref</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading medical entries...
                  </td>
                </tr>
              ) : paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No medical entries found. Click "New Medical Entry" to register one.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{e.entryNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{e.entryDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{e.party}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{e.medicalItem}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-teal-800 bg-teal-50/50">
                      {e.batchNumber}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">{e.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {settings.currencySymbol} {e.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-700">
                      {e.transportBiltyNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintEntry(e)}
                          className="p-1 text-slate-500 hover:text-teal-600 rounded"
                          title="Print Slip"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => PdfService.generateMedicalPdf(e, settings)}
                          className="p-1 text-slate-500 hover:text-teal-600 rounded"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEntryToEdit(e);
                            setIsFormOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-teal-600 rounded"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border rounded bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border rounded bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <MedicalFormModal
          isOpen={isFormOpen}
          entryToEdit={entryToEdit}
          settings={settings}
          parties={parties}
          bilties={bilties}
          onClose={() => setIsFormOpen(false)}
          onSave={(saved) => {
            setEntries((prev) => {
              const idx = prev.findIndex((item) => item.id === saved.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
              }
              return [saved, ...prev];
            });
            loadData();
            onShowToast(entryToEdit ? `Medical entry #${saved.entryNumber} updated` : `Medical entry #${saved.entryNumber} created`, 'success');
          }}
        />
      )}

      {printEntry && (
        <MedicalPrintView
          entry={printEntry}
          settings={settings}
          onClose={() => setPrintEntry(null)}
        />
      )}
    </div>
  );
};
