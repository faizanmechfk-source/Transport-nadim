import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calculator } from 'lucide-react';
import { Bilty, CompanySettings, Driver, Party, PaymentType, Vehicle } from '../../types';
import { db } from '../../database/db';

interface BiltyFormModalProps {
  isOpen: boolean;
  biltyToEdit: Bilty | null;
  settings: CompanySettings;
  parties: Party[];
  vehicles: Vehicle[];
  drivers: Driver[];
  initialRoute?: { fromCity?: string; toCity?: string } | null;
  onClose: () => void;
  onSave: (savedBilty: Bilty) => void;
}

export const BiltyFormModal: React.FC<BiltyFormModalProps> = ({
  isOpen,
  biltyToEdit,
  settings,
  parties,
  vehicles,
  drivers,
  initialRoute,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Bilty>>({
    biltyNumber: '',
    biltyDate: new Date().toISOString().substring(0, 10),
    consignor: '',
    consignee: '',
    fromCity: '',
    toCity: '',
    transporter: settings.companyName || 'National Road Carrier',
    vehicleNumber: '',
    driverName: '',
    driverMobile: '',
    material: '',
    packages: 1,
    packageType: 'Cartons',
    weight: 0,
    weightUnit: 'Kg',
    freight: 0,
    loadingCharges: 0,
    unloadingCharges: 0,
    otherCharges: 0,
    totalAmount: 0,
    paymentType: 'To-Pay',
    paidAmount: 0,
    balanceAmount: 0,
    remarks: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (biltyToEdit) {
      setFormData({ ...biltyToEdit });
    } else {
      // Auto-assign next bilty number
      db.getNextBiltyNumber().then((nextNum) => {
        setFormData({
          biltyNumber: nextNum,
          biltyDate: new Date().toISOString().substring(0, 10),
          consignor: parties[0]?.name || '',
          consignee: parties[1]?.name || '',
          fromCity: initialRoute?.fromCity || parties[0]?.city || 'Delhi',
          toCity: initialRoute?.toCity || parties[1]?.city || 'Mumbai',
          transporter: settings.companyName,
          vehicleNumber: vehicles[0]?.vehicleNumber || '',
          driverName: vehicles[0]?.driverName || '',
          driverMobile: vehicles[0]?.driverMobile || '',
          material: '',
          packages: 1,
          packageType: 'Cartons',
          weight: 0,
          weightUnit: 'Kg',
          freight: 0,
          loadingCharges: 0,
          unloadingCharges: 0,
          otherCharges: 0,
          totalAmount: 0,
          paymentType: 'To-Pay',
          paidAmount: 0,
          balanceAmount: 0,
          remarks: '',
        });
      });
    }
    setError(null);
  }, [isOpen, biltyToEdit]);

  // Recalculate totals
  const handleAmountChange = (field: keyof Bilty, value: number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      const freight = field === 'freight' ? value : Number(updated.freight) || 0;
      const loading = field === 'loadingCharges' ? value : Number(updated.loadingCharges) || 0;
      const unloading = field === 'unloadingCharges' ? value : Number(updated.unloadingCharges) || 0;
      const other = field === 'otherCharges' ? value : Number(updated.otherCharges) || 0;
      const paid = field === 'paidAmount' ? value : Number(updated.paidAmount) || 0;

      const total = freight + loading + unloading + other;
      const balance = Math.max(0, total - paid);

      return {
        ...updated,
        totalAmount: total,
        balanceAmount: balance,
      };
    });
  };

  const handleVehicleSelect = (vehNum: string) => {
    const found = vehicles.find((v) => v.vehicleNumber === vehNum);
    setFormData((prev) => ({
      ...prev,
      vehicleNumber: vehNum,
      driverName: found?.driverName || prev.driverName,
      driverMobile: found?.driverMobile || prev.driverMobile,
    }));
  };

  const handleConsignorSelect = (partyName: string) => {
    const found = parties.find((p) => p.name === partyName);
    setFormData((prev) => ({
      ...prev,
      consignor: partyName,
      fromCity: found?.city || prev.fromCity,
    }));
  };

  const handleConsigneeSelect = (partyName: string) => {
    const found = parties.find((p) => p.name === partyName);
    setFormData((prev) => ({
      ...prev,
      consignee: partyName,
      toCity: found?.city || prev.toCity,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.biltyNumber?.trim()) {
      setError('Bilty Number is required.');
      return;
    }
    if (!formData.biltyDate) {
      setError('Bilty Date is required.');
      return;
    }
    if (!formData.consignor?.trim()) {
      setError('Consignor (Sender) is required.');
      return;
    }
    if (!formData.consignee?.trim()) {
      setError('Consignee (Receiver) is required.');
      return;
    }
    if (!formData.fromCity?.trim()) {
      setError('Dispatch City (From) is required.');
      return;
    }
    if (!formData.toCity?.trim()) {
      setError('Destination City (To) is required.');
      return;
    }
    if (!formData.vehicleNumber?.trim()) {
      setError('Vehicle Number is required.');
      return;
    }

    try {
      setSaving(true);
      const saved = await db.saveBilty(formData);
      onSave(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save Bilty');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-sm">
              {biltyToEdit ? `Edit Bilty #${biltyToEdit.biltyNumber}` : 'New Bilty Consignment Entry'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Numbering & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bilty Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.biltyNumber || ''}
                onChange={(e) => setFormData({ ...formData, biltyNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bilty Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.biltyDate || ''}
                onChange={(e) => setFormData({ ...formData, biltyDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={formData.paymentType || 'To-Pay'}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as PaymentType })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:border-blue-600 outline-none"
              >
                <option value="To-Pay">To-Pay (Pay on Delivery)</option>
                <option value="Paid">Paid (Advance Cleared)</option>
                <option value="T.B.B.">T.B.B. (To Be Billed)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transporter</label>
              <input
                type="text"
                value={formData.transporter || ''}
                onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Section 2: Consignor, Consignee & Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consignor */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Consignor (Sender) Details</span>
                <span className="text-[10px] text-blue-600">Select or Type</span>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Consignor Name *</label>
                <input
                  type="text"
                  list="consignor-list"
                  value={formData.consignor || ''}
                  onChange={(e) => handleConsignorSelect(e.target.value)}
                  placeholder="Type or select consignor"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium focus:border-blue-600 outline-none"
                  required
                />
                <datalist id="consignor-list">
                  {parties.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Dispatch City (From) *</label>
                <input
                  type="text"
                  value={formData.fromCity || ''}
                  onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                  required
                />
              </div>
            </div>

            {/* Consignee */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Consignee (Receiver) Details</span>
                <span className="text-[10px] text-blue-600">Select or Type</span>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Consignee Name *</label>
                <input
                  type="text"
                  list="consignee-list"
                  value={formData.consignee || ''}
                  onChange={(e) => handleConsigneeSelect(e.target.value)}
                  placeholder="Type or select consignee"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium focus:border-blue-600 outline-none"
                  required
                />
                <datalist id="consignee-list">
                  {parties.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Destination City (To) *</label>
                <input
                  type="text"
                  value={formData.toCity || ''}
                  onChange={(e) => setFormData({ ...formData, toCity: e.target.value })}
                  placeholder="e.g. Jaipur"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle & Driver */}
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
              Vehicle & Driver Assignment
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  list="vehicle-list"
                  value={formData.vehicleNumber || ''}
                  onChange={(e) => handleVehicleSelect(e.target.value.toUpperCase())}
                  placeholder="e.g. DL01AB8899"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold uppercase focus:border-blue-600 outline-none"
                  required
                />
                <datalist id="vehicle-list">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.vehicleNumber} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Driver Name</label>
                <input
                  type="text"
                  value={formData.driverName || ''}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Driver name"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Driver Mobile</label>
                <input
                  type="tel"
                  value={formData.driverMobile || ''}
                  onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Material & Goods Details */}
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
              Material / Goods Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Material / Goods Description *</label>
                <input
                  type="text"
                  value={formData.material || ''}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="e.g. Industrial Machinery, Pharma Cartons, Steel Pipes"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">No. of Packages</label>
                <input
                  type="number"
                  min="1"
                  value={formData.packages || 1}
                  onChange={(e) => setFormData({ ...formData, packages: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Package Type</label>
                <select
                  value={formData.packageType || 'Cartons'}
                  onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                >
                  <option value="Cartons">Cartons</option>
                  <option value="Bags">Bags</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Bundles">Bundles</option>
                  <option value="Drums">Drums</option>
                  <option value="Pallets">Pallets</option>
                  <option value="Loose">Loose</option>
                  <option value="Rolls">Rolls</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Total Weight</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.weight || 0}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Weight Unit</label>
                <select
                  value={formData.weightUnit || 'Kg'}
                  onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                >
                  <option value="Kg">Kg</option>
                  <option value="Ton">Ton</option>
                  <option value="Quintal">Quintal</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Remarks / Special Instructions</label>
                <input
                  type="text"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Fragile, Keep Dry, Handle With Care"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Freight & Financial Calculations */}
          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3">
            <div className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1 flex items-center justify-between">
              <span>Freight Charges & Billing Breakdown</span>
              <span className="text-[10px] text-slate-500 font-normal">Auto-calculates Total & Balance</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Basic Freight ({settings.currencySymbol})</label>
                <input
                  type="number"
                  min="0"
                  value={formData.freight || 0}
                  onChange={(e) => handleAmountChange('freight', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Loading Charges</label>
                <input
                  type="number"
                  min="0"
                  value={formData.loadingCharges || 0}
                  onChange={(e) => handleAmountChange('loadingCharges', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Unloading Charges</label>
                <input
                  type="number"
                  min="0"
                  value={formData.unloadingCharges || 0}
                  onChange={(e) => handleAmountChange('unloadingCharges', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Other / Stat Charges</label>
                <input
                  type="number"
                  min="0"
                  value={formData.otherCharges || 0}
                  onChange={(e) => handleAmountChange('otherCharges', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Totals */}
              <div className="bg-white p-2.5 rounded border border-blue-300">
                <span className="text-[10px] text-slate-500 block font-bold uppercase">Total Freight</span>
                <span className="text-base font-extrabold text-blue-900 font-mono">
                  {settings.currencySymbol} {(formData.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded border border-emerald-300">
                <label className="block text-[10px] text-emerald-800 font-bold uppercase mb-0.5">Paid Advance</label>
                <input
                  type="number"
                  min="0"
                  value={formData.paidAmount || 0}
                  onChange={(e) => handleAmountChange('paidAmount', parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold text-emerald-700 outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded border border-rose-300 sm:col-span-2">
                <span className="text-[10px] text-rose-800 block font-bold uppercase">Balance Due</span>
                <span className="text-base font-extrabold text-rose-700 font-mono">
                  {settings.currencySymbol} {(formData.balanceAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : biltyToEdit ? 'Update Bilty' : 'Create Bilty'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
