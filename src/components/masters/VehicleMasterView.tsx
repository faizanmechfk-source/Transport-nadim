import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { CompanySettings, UserSession, Vehicle } from '../../types';
import { db } from '../../database/db';
import { ExcelService } from '../../services/excelService';

interface VehicleMasterViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedVehicleId?: string;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const VehicleMasterView: React.FC<VehicleMasterViewProps> = ({
  currentUser,
  settings,
  selectedVehicleId,
  onShowToast,
  onRequestConfirm,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicleNumber: '',
    vehicleType: '10-Tyre Truck',
    ownerName: '',
    driverName: '',
    driverMobile: '',
    insuranceExpiry: '',
    fitnessExpiry: '',
    permitExpiry: '',
    status: 'Active',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getVehicles();
    setVehicles(data);
    setLoading(false);

    if (selectedVehicleId) {
      const match = data.find((v) => v.id === selectedVehicleId);
      if (match) {
        setVehicleToEdit(match);
        setFormData({ ...match });
        setIsModalOpen(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedVehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNumber?.trim()) {
      setError('Vehicle Number is required');
      return;
    }

    try {
      setSaving(true);
      const savedVehicle = await db.saveVehicle(formData);
      setVehicles((prev) => {
        const idx = prev.findIndex((item) => item.id === savedVehicle.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = savedVehicle;
          return updated;
        }
        return [savedVehicle, ...prev];
      });
      onShowToast(vehicleToEdit ? `Vehicle ${savedVehicle.vehicleNumber} updated` : `Vehicle ${savedVehicle.vehicleNumber} added successfully`, 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (v: Vehicle, permanent: boolean = false) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Vehicle records.', 'error');
      return;
    }
    onRequestConfirm(
      permanent ? `Permanently Delete Vehicle ${v.vehicleNumber}?` : `Move Vehicle ${v.vehicleNumber} to Recycle Bin?`,
      permanent
        ? 'This vehicle record will be wiped permanently from the database.'
        : 'This vehicle record will be moved to the Recycle Bin. You can restore it anytime.',
      async () => {
        try {
          await db.deleteVehicle(v.id, !permanent);
          setVehicles((prev) => prev.filter((item) => item.id !== v.id));
          onShowToast(`Vehicle ${v.vehicleNumber} ${permanent ? 'permanently purged' : 'moved to Recycle Bin'}`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete vehicle', 'error');
        }
      },
      true
    );
  };

  const handleExportExcel = () => {
    const data = filteredVehicles.map((v) => ({
      'Vehicle Number': v.vehicleNumber,
      'Vehicle Type': v.vehicleType,
      'Owner': v.ownerName,
      'Driver': v.driverName,
      'Driver Mobile': v.driverMobile,
      'Insurance Expiry': v.insuranceExpiry,
      'Fitness Expiry': v.fitnessExpiry,
      'Permit Expiry': v.permitExpiry,
      'Status': v.status,
    }));
    ExcelService.exportToExcel(data, `Vehicles_Master_${Date.now()}`, 'Vehicles');
    onShowToast('Exported Vehicles to Excel', 'success');
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.driverMobile.includes(q) ||
        v.ownerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>VEHICLE MASTER (FLEET DIRECTORY)</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredVehicles.length} Vehicles
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vehicle registration, insurance & fitness compliance tracking, driver assignments.
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
              setVehicleToEdit(null);
              setFormData({
                vehicleNumber: '',
                vehicleType: '10-Tyre Truck',
                ownerName: '',
                driverName: '',
                driverMobile: '',
                insuranceExpiry: '',
                fitnessExpiry: '',
                permitExpiry: '',
                status: 'Active',
              });
              setError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search Vehicle #, Driver, Owner, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-3">Vehicle #</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Owner Name</th>
                <th className="py-3 px-3">Driver Name & Mobile</th>
                <th className="py-3 px-3">Insurance Expiry</th>
                <th className="py-3 px-3">Fitness Expiry</th>
                <th className="py-3 px-3">Permit Expiry</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading vehicles...</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">No vehicles found.</td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{v.vehicleNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">{v.vehicleType}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{v.ownerName}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {v.driverName} ({v.driverMobile || 'N/A'})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{v.insuranceExpiry || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{v.fitnessExpiry || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{v.permitExpiry || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setVehicleToEdit(v);
                            setFormData({ ...v });
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
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
                {vehicleToEdit ? `Edit Vehicle ${vehicleToEdit.vehicleNumber}` : 'Add New Vehicle'}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="text-rose-600 text-xs font-semibold">{error}</div>}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Vehicle Registration # *</label>
                <input
                  type="text"
                  value={formData.vehicleNumber || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. MH04AB1234"
                  className="w-full px-3 py-1.5 border rounded font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType || '10-Tyre Truck'}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  >
                    <option value="10-Tyre Truck">10-Tyre Truck</option>
                    <option value="12-Tyre Truck">12-Tyre Truck</option>
                    <option value="14-Tyre Trailer">14-Tyre Trailer</option>
                    <option value="Container 32ft">Container 32ft</option>
                    <option value="Canter / LCV">Canter / LCV</option>
                    <option value="Tata Ace / Pickup">Tata Ace / Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border rounded"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={formData.driverName || ''}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Driver Mobile</label>
                <input
                  type="tel"
                  value={formData.driverMobile || ''}
                  onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fitness Expiry</label>
                  <input
                    type="date"
                    value={formData.fitnessExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Permit Expiry</label>
                  <input
                    type="date"
                    value={formData.permitExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, permitExpiry: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-[11px]"
                  />
                </div>
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
                  className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold shadow"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
