import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
  Building,
  Phone,
  Mail,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { CompanySettings, Party, UserSession } from '../../types';
import { db } from '../../database/db';
import { ExcelService } from '../../services/excelService';

interface PartyMasterViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedPartyId?: string;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const PartyMasterView: React.FC<PartyMasterViewProps> = ({
  currentUser,
  settings,
  selectedPartyId,
  onShowToast,
  onRequestConfirm,
}) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partyToEdit, setPartyToEdit] = useState<Party | null>(null);
  const [formData, setFormData] = useState<Partial<Party>>({
    name: '',
    contactPerson: '',
    mobile: '',
    alternateMobile: '',
    address: '',
    city: '',
    state: '',
    gstNumber: '',
    email: '',
    openingBalance: 0,
    creditLimit: 0,
    remarks: '',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getParties();
    setParties(data);
    setLoading(false);

    if (selectedPartyId) {
      const match = data.find((p) => p.id === selectedPartyId);
      if (match) {
        setPartyToEdit(match);
        setFormData({ ...match });
        setIsModalOpen(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPartyId]);

  const handleOpenAdd = () => {
    if (currentUser.role === 'viewer') {
      onShowToast('Viewer account has read-only access.', 'warning');
      return;
    }
    setPartyToEdit(null);
    setFormData({
      name: '',
      contactPerson: '',
      mobile: '',
      alternateMobile: '',
      address: '',
      city: '',
      state: '',
      gstNumber: '',
      email: '',
      openingBalance: 0,
      creditLimit: 0,
      remarks: '',
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Party) => {
    if (currentUser.role === 'viewer') {
      onShowToast('Viewer account has read-only access.', 'warning');
      return;
    }
    setPartyToEdit(p);
    setFormData({ ...p });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (p: Party, permanent: boolean = false) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Party records.', 'error');
      return;
    }
    onRequestConfirm(
      permanent ? `Permanently Delete Party "${p.name}"?` : `Move Party "${p.name}" to Recycle Bin?`,
      permanent
        ? 'This party master record will be wiped permanently from the database.'
        : 'This party will be moved to the Recycle Bin. You can restore it anytime from Settings > Recycle Bin.',
      async () => {
        try {
          await db.deleteParty(p.id, !permanent);
          setParties((prev) => prev.filter((item) => item.id !== p.id));
          onShowToast(`Party "${p.name}" ${permanent ? 'permanently purged' : 'moved to Recycle Bin'}.`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete party', 'error');
        }
      },
      true
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name?.trim()) {
      setFormError('Party Name is required.');
      return;
    }
    if (!formData.mobile?.trim()) {
      setFormError('Mobile Number is required.');
      return;
    }

    // Duplicate check on party name
    const existing = parties.find(
      (p) => p.name.trim().toLowerCase() === formData.name!.trim().toLowerCase() && p.id !== partyToEdit?.id
    );
    if (existing) {
      setFormError(`A party with name "${formData.name}" already exists.`);
      return;
    }

    try {
      setSaving(true);
      const savedParty = await db.saveParty(formData);
      setParties((prev) => {
        const idx = prev.findIndex((item) => item.id === savedParty.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = savedParty;
          return updated;
        }
        return [savedParty, ...prev];
      });
      onShowToast(partyToEdit ? `Party "${savedParty.name}" updated successfully` : `Party "${savedParty.name}" added successfully`, 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save party');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    const data = filteredParties.map((p) => ({
      'Party Name': p.name,
      'Contact Person': p.contactPerson,
      'Mobile': p.mobile,
      'Alt Mobile': p.alternateMobile || '',
      'City': p.city,
      'State': p.state,
      'GSTIN': p.gstNumber || '',
      'Email': p.email || '',
      'Opening Balance': p.openingBalance,
      'Credit Limit': p.creditLimit,
      'Status': p.isActive ? 'Active' : 'Inactive',
    }));
    ExcelService.exportToExcel(data, `Parties_Master_${Date.now()}`, 'Parties');
    onShowToast('Exported Parties to Excel', 'success');
  };

  const filteredParties = parties.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.contactPerson.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.gstNumber && p.gstNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>PARTY MASTER (CLIENT DIRECTORY)</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredParties.length} Parties
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Consignors, Consignees, GST numbers, contact details, and credit profiles.
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
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Party</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Party Name, Contact, Mobile, City, GST..."
            value={search}
            onChange={(e) => setSearch}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-3">Party Name</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Mobile Phone</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3 text-right">Opening Bal.</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading party master...
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No parties found matching search.
                  </td>
                </tr>
              ) : (
                filteredParties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.contactPerson}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{p.mobile}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.city}, {p.state}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">
                      {p.gstNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {settings.currencySymbol} {p.openingBalance.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {settings.currencySymbol} {(p.creditLimit || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.isActive ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                          title="Edit Party"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
                          title="Delete Party"
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
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs my-auto">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="font-bold text-sm">
                {partyToEdit ? `Edit Party: ${partyToEdit.name}` : 'Add New Party / Client'}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Party / Business Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Apex Industries Pvt Ltd"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alt Phone</label>
                  <input
                    type="tel"
                    value={formData.alternateMobile || ''}
                    onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber || ''}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="15-digit GSTIN"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Balance ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={formData.openingBalance || 0}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit || 0}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Account Active</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : partyToEdit ? 'Update Party' : 'Create Party'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
