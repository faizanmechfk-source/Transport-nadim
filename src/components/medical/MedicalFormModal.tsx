import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Cross } from 'lucide-react';
import { Bilty, CompanySettings, MedicalEntry, Party } from '../../types';
import { db } from '../../database/db';

interface MedicalFormModalProps {
  isOpen: boolean;
  entryToEdit: MedicalEntry | null;
  settings: CompanySettings;
  parties: Party[];
  bilties: Bilty[];
  onClose: () => void;
  onSave: (saved: MedicalEntry) => void;
}

export const MedicalFormModal: React.FC<MedicalFormModalProps> = ({
  isOpen,
  entryToEdit,
  settings,
  parties,
  bilties,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<MedicalEntry>>({
    entryNumber: '',
    entryDate: new Date().toISOString().substring(0, 10),
    party: '',
    patientReference: '',
    medicalItem: '',
    quantity: 1,
    batchNumber: '',
    amount: 0,
    transportBiltyNumber: '',
    remarks: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (entryToEdit) {
      setFormData({ ...entryToEdit });
    } else {
      db.getNextMedicalNumber().then((nextNum) => {
        setFormData({
          entryNumber: nextNum,
          entryDate: new Date().toISOString().substring(0, 10),
          party: parties[0]?.name || '',
          patientReference: '',
          medicalItem: '',
          quantity: 1,
          batchNumber: `BT-${Math.floor(1000 + Math.random() * 9000)}`,
          amount: 0,
          transportBiltyNumber: bilties[0]?.biltyNumber || '',
          remarks: '',
        });
      });
    }
    setError(null);
  }, [isOpen, entryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entryNumber?.trim()) {
      setError('Entry Number is required');
      return;
    }
    if (!formData.medicalItem?.trim()) {
      setError('Medical Item / Drug Name is required');
      return;
    }
    if (!formData.batchNumber?.trim()) {
      setError('Batch Number is required');
      return;
    }

    try {
      setSaving(true);
      const saved = await db.saveMedicalEntry(formData);
      onSave(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save Medical Entry');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Cross className="w-4 h-4 text-teal-400" />
            <span>{entryToEdit ? `Edit Medical Entry #${entryToEdit.entryNumber}` : 'New Medical Entry'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Entry Number *</label>
              <input
                type="text"
                value={formData.entryNumber || ''}
                onChange={(e) => setFormData({ ...formData, entryNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.entryDate || ''}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Party / Hospital / Pharma</label>
              <input
                type="text"
                list="med-parties"
                value={formData.party || ''}
                onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
              />
              <datalist id="med-parties">
                {parties.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Medical Item / Drug *</label>
              <input
                type="text"
                value={formData.medicalItem || ''}
                onChange={(e) => setFormData({ ...formData, medicalItem: e.target.value })}
                placeholder="e.g. Paracetamol IV 100ml, Amoxicillin 500mg"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                value={formData.batchNumber || ''}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. BATCH-2026-X"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity || 1}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Amount ({settings.currencySymbol})</label>
              <input
                type="number"
                min="0"
                value={formData.amount || 0}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-teal-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Patient / Clin. Ref</label>
              <input
                type="text"
                value={formData.patientReference || ''}
                onChange={(e) => setFormData({ ...formData, patientReference: e.target.value })}
                placeholder="e.g. Patient ID / Ward 4"
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Transport Bilty Number</label>
              <input
                type="text"
                list="med-bilty-list"
                value={formData.transportBiltyNumber || ''}
                onChange={(e) => setFormData({ ...formData, transportBiltyNumber: e.target.value })}
                placeholder="Select or enter Bilty #"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
              <datalist id="med-bilty-list">
                {bilties.map((b) => (
                  <option key={b.id} value={b.biltyNumber} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Remarks</label>
              <input
                type="text"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Storage temperature, handling..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : entryToEdit ? 'Update Entry' : 'Create Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
