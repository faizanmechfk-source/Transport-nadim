import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { CompanySettings, Driver, UserSession, Vehicle } from '../../types';
import { db } from '../../database/db';
import { ExcelService } from '../../services/excelService';

interface DriverMasterViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedDriverId?: string;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const DriverMasterView: React.FC<DriverMasterViewProps> = ({
  currentUser,
  settings,
  selectedDriverId,
  onShowToast,
  onRequestConfirm,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    mobile: '',
    alternateMobile: '',
    licenseNumber: '',
    licenseExpiry: '',
    assignedVehicle: '',
    address: '',
    emergencyContact: '',
    status: 'Active',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [d, v] = await Promise.all([db.getDrivers(), db.getVehicles()]);
    setDrivers(d);
    setVehicles(v);
    setLoading(false);

    if (selectedDriverId) {
      const match = d.find((x) => x.id === selectedDriverId);
      if (match) {
        setDriverToEdit(match);
        setFormData({ ...match });
        setIsModalOpen(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDriverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Driver Name is required');
      return;
    }
    if (!formData.mobile?.trim()) {
      setError('Mobile Number is required');
      return;
    }

    try {
      setSaving(true);
      const savedDriver = await db.saveDriver(formData);
      setDrivers((prev) => {
        const idx = prev.findIndex((item) => item.id === savedDriver.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = savedDriver;
          return updated;
        }
        return [savedDriver, ...prev];
      });
      onShowToast(driverToEdit ? `Driver "${savedDriver.name}" updated` : `Driver "${savedDriver.name}" added successfully`, 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (d: Driver, permanent: boolean = false) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Driver records.', 'error');
      return;
    }
    onRequestConfirm(
      permanent ? `Permanently Delete Driver "${d.name}"?` : `Move Driver "${d.name}" to Recycle Bin?`,
      permanent
        ? 'This driver record will be wiped permanently from the database.'
        : 'This driver record will be moved to the Recycle Bin. You can restore it anytime.',
      async () => {
        try {
          await db.deleteDriver(d.id, !permanent);
          setDrivers((prev) => prev.filter((item) => item.id !== d.id));
          onShowToast(`Driver ${d.name} ${permanent ? 'permanently purged' : 'moved to Recycle Bin'}`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete driver', 'error');
        }
      },
      true
    );
  };

  const handleExportExcel = () => {
    const data = filteredDrivers.map((d) => ({
      'Driver Name': d.name,
      'Mobile': d.mobile,
      'Alt Mobile': d.alternateMobile || '',
      'License #': d.licenseNumber,
      'License Expiry': d.licenseExpiry,
      'Assigned Vehicle': d.assignedVehicle || 'None',
      'Address': d.address || '',
      'Emergency Contact': d.emergencyContact || '',
      'Status': d.status,
    }));
    ExcelService.exportToExcel(data, `Drivers_Master_${Date.now()}`, 'Drivers');
    onShowToast('Exported Drivers to Excel', 'success');
  };

  const filteredDrivers = drivers.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.mobile.includes(q) ||
        d.licenseNumber.toLowerCase().includes(q) ||
        (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <span>DRIVER MASTER (CREW DIRECTORY)</span>
            <span className="text-xs bg-purple-100 text-purple-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredDrivers.length} Drivers
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Driver profiles, commercial driving licenses, validity checks, and vehicle assignments.
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
              setDriverToEdit(null);
              setFormData({
                name: '',
                mobile: '',
                alternateMobile: '',
                licenseNumber: '',
                licenseExpiry: '',
                assignedVehicle: vehicles[0]?.vehicleNumber || '',
                address: '',
                emergencyContact: '',
                status: 'Active',
              });
              setError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Driver Name, Mobile, License..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-purple-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-3">Driver Name</th>
                <th className="py-3 px-3">Mobile Phone</th>
                <th className="py-3 px-3">License Number</th>
                <th className="py-3 px-3">License Expiry</th>
                <th className="py-3 px-3">Assigned Vehicle</th>
                <th className="py-3 px-3">Emergency Contact</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading drivers...</td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No drivers found.</td>
                </tr>
              ) : (
                filteredDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{d.mobile}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{d.licenseNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{d.licenseExpiry || '-'}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                      {d.assignedVehicle || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{d.emergencyContact || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setDriverToEdit(d);
                            setFormData({ ...d });
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-purple-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-slate-900">
                {driverToEdit ? `Edit Driver: ${driverToEdit.name}` : 'Add New Driver'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="text-rose-600 text-xs font-semibold">{error}</div>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Singh"
                    className="w-full px-3 py-1.5 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile *</label>
                  <input
                    type="tel"
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-1.5 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">License Number *</label>
                  <input
                    type="text"
                    value={formData.licenseNumber || ''}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. DL-1420110012345"
                    className="w-full px-3 py-1.5 border rounded font-mono uppercase font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={formData.licenseExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Vehicle</label>
                  <select
                    value={formData.assignedVehicle || ''}
                    onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded font-mono"
                  >
                    <option value="">-- No Vehicle Assigned --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.vehicleNumber}>
                        {v.vehicleNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Relation & Phone"
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded font-bold shadow"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
