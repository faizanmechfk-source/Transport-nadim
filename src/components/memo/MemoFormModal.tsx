import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  ArrowRight,
  UserCheck,
  Calculator,
  MapPin,
  Navigation,
  ArrowLeftRight,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { Bilty, CompanySettings, Driver, Memo, MemoItem, Party, Vehicle } from '../../types';
import { db } from '../../database/db';

interface MemoFormModalProps {
  isOpen: boolean;
  memoToEdit: Memo | null;
  settings: CompanySettings;
  parties: Party[];
  vehicles: Vehicle[];
  drivers: Driver[];
  bilties: Bilty[];
  initialRoute?: { fromCity?: string; toCity?: string } | null;
  onClose: () => void;
  onSave: (saved: Memo) => void;
}

export const MemoFormModal: React.FC<MemoFormModalProps> = ({
  isOpen,
  memoToEdit,
  settings,
  parties,
  vehicles,
  drivers,
  bilties,
  initialRoute,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Memo>>({
    memoNumber: '',
    memoDate: new Date().toISOString().substring(0, 10),
    party: '',
    sender: '',
    senderMobile: '',
    receiver: '',
    receiverMobile: '',
    vehicleNumber: '',
    driver: '',
    driverMobile: '',
    fromCity: '',
    toCity: '',
    amount: 0,
    advanceAmount: 0,
    dieselAmount: 0,
    balanceAmount: 0,
    packages: 0,
    weight: 0,
    items: [],
    biltyReferences: [],
    remarks: '',
  });

  const [selectedBiltyNumber, setSelectedBiltyNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (memoToEdit) {
      setFormData({
        ...memoToEdit,
        sender: memoToEdit.sender || memoToEdit.party || '',
        party: memoToEdit.party || memoToEdit.sender || '',
        items: memoToEdit.items && memoToEdit.items.length > 0 ? [...memoToEdit.items] : [],
      });
    } else {
      db.getNextMemoNumber().then((nextNum) => {
        const defaultFrom = initialRoute?.fromCity || parties[0]?.city || 'Mumbai';
        const defaultTo = initialRoute?.toCity || parties[1]?.city || 'Jaipur';

        const matchingSender = parties.find((p) => p.city?.toLowerCase() === defaultFrom.toLowerCase()) || parties[0];
        const matchingReceiver = parties.find((p) => p.city?.toLowerCase() === defaultTo.toLowerCase()) || parties[1] || parties[0];

        const defaultSenderName = matchingSender?.name || '';
        const defaultReceiverName = matchingReceiver?.name || '';

        setFormData({
          memoNumber: nextNum,
          memoDate: new Date().toISOString().substring(0, 10),
          party: defaultSenderName,
          sender: defaultSenderName,
          senderMobile: matchingSender?.mobile || '',
          receiver: defaultReceiverName,
          receiverMobile: matchingReceiver?.mobile || '',
          vehicleNumber: vehicles[0]?.vehicleNumber || '',
          driver: vehicles[0]?.driverName || '',
          driverMobile: vehicles[0]?.driverMobile || '',
          fromCity: defaultFrom,
          toCity: defaultTo,
          amount: 0,
          advanceAmount: 0,
          dieselAmount: 0,
          balanceAmount: 0,
          packages: 0,
          weight: 0,
          items: [
            {
              id: 'itm-' + Date.now(),
              productName: '',
              packages: 1,
              packageType: 'Cartons',
              weight: 0,
              rate: 0,
              amount: 0,
              remarks: '',
            },
          ],
          biltyReferences: [],
          remarks: '',
        });
      });
    }
    setError(null);
  }, [isOpen, memoToEdit, parties, vehicles, initialRoute]);

  const uniqueCities = Array.from(
    new Set([
      'Mumbai',
      'Delhi',
      'Ahmedabad',
      'Jaipur',
      'Indore',
      'Surat',
      'Pune',
      'Kolkata',
      'Bangalore',
      'Hyderabad',
      'Kanpur',
      'Ludhiana',
      'Nagpur',
      'Vadodara',
      ...parties.map((p) => p.city),
      ...bilties.map((b) => b.fromCity),
      ...bilties.map((b) => b.toCity),
    ].filter(Boolean))
  ).sort();

  const commonRoutePresets = [
    { from: 'Mumbai', to: 'Jaipur' },
    { from: 'Ahmedabad', to: 'Indore' },
    { from: 'Delhi', to: 'Mumbai' },
    { from: 'Surat', to: 'Delhi' },
    { from: 'Pune', to: 'Bangalore' },
    { from: 'Jaipur', to: 'Ahmedabad' },
  ];

  const currentFrom = (formData.fromCity || '').trim().toLowerCase();
  const currentTo = (formData.toCity || '').trim().toLowerCase();

  const matchingRouteBilties = bilties.filter(
    (b) =>
      b.fromCity?.trim().toLowerCase() === currentFrom &&
      b.toCity?.trim().toLowerCase() === currentTo
  );

  const unattachedRouteBilties = matchingRouteBilties.filter(
    (b) => !formData.biltyReferences?.includes(b.biltyNumber)
  );

  const routeBiltiesTotalAmount = unattachedRouteBilties.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const routeBiltiesTotalPkgs = unattachedRouteBilties.reduce((acc, b) => acc + (b.packages || 0), 0);
  const routeBiltiesTotalWeight = unattachedRouteBilties.reduce((acc, b) => acc + (b.weight || 0), 0);

  const handleSwapRoute = () => {
    const from = formData.fromCity || '';
    const to = formData.toCity || '';
    setFormData((prev) => ({
      ...prev,
      fromCity: to,
      toCity: from,
    }));
  };

  const handleSelectRoutePreset = (from: string, to: string) => {
    const matchingSender = parties.find((p) => p.city?.toLowerCase() === from.toLowerCase());
    const matchingReceiver = parties.find((p) => p.city?.toLowerCase() === to.toLowerCase());

    setFormData((prev) => ({
      ...prev,
      fromCity: from,
      toCity: to,
      sender: matchingSender ? matchingSender.name : prev.sender,
      party: matchingSender ? matchingSender.name : prev.party,
      senderMobile: matchingSender?.mobile || prev.senderMobile,
      receiver: matchingReceiver ? matchingReceiver.name : prev.receiver,
      receiverMobile: matchingReceiver?.mobile || prev.receiverMobile,
    }));
  };

  const handleAttachAllRouteBilties = () => {
    if (unattachedRouteBilties.length === 0) return;

    let currentRefs = [...(formData.biltyReferences || [])];
    let currentItems = [...(formData.items || [])];
    if (currentItems.length === 1 && !currentItems[0].productName) {
      currentItems = [];
    }

    let addedAmt = 0;
    unattachedRouteBilties.forEach((b) => {
      if (!currentRefs.includes(b.biltyNumber)) {
        currentRefs.push(b.biltyNumber);
        addedAmt += (b.totalAmount || 0);
        if (b.material) {
          currentItems.push({
            id: 'itm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            productName: b.material,
            packages: b.packages || 1,
            amount: b.totalAmount || b.freight || 0,
            remarks: `Bilty #${b.biltyNumber} (${b.consignor} -> ${b.consignee})`,
          });
        }
      }
    });

    const totalPkgs = currentItems.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);
    const currentAmt = formData.amount || 0;
    const newAmt = currentAmt === 0 ? addedAmt : currentAmt + addedAmt;
    const bal = Math.max(0, newAmt - ((formData.advanceAmount || 0) + (formData.dieselAmount || 0)));

    const firstBilty = unattachedRouteBilties[0];

    setFormData((prev) => ({
      ...prev,
      biltyReferences: currentRefs,
      items: currentItems,
      packages: totalPkgs,
      amount: newAmt,
      balanceAmount: bal,
      sender: prev.sender || firstBilty?.consignor || '',
      party: prev.party || firstBilty?.consignor || '',
      receiver: prev.receiver || firstBilty?.consignee || '',
    }));
  };

  const sortedSenders = [...parties].sort((a, b) => {
    const aMatch = a.city?.toLowerCase() === currentFrom ? 1 : 0;
    const bMatch = b.city?.toLowerCase() === currentFrom ? 1 : 0;
    return bMatch - aMatch;
  });

  const sortedReceivers = [...parties].sort((a, b) => {
    const aMatch = a.city?.toLowerCase() === currentTo ? 1 : 0;
    const bMatch = b.city?.toLowerCase() === currentTo ? 1 : 0;
    return bMatch - aMatch;
  });

  const handleVehicleChange = (vehNum: string) => {
    const v = vehicles.find((x) => x.vehicleNumber === vehNum);
    setFormData((prev) => ({
      ...prev,
      vehicleNumber: vehNum,
      driver: v?.driverName || prev.driver,
      driverMobile: v?.driverMobile || prev.driverMobile,
    }));
  };

  const handleSenderChange = (name: string) => {
    const matched = parties.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setFormData((prev) => ({
      ...prev,
      sender: name,
      party: name,
      senderMobile: matched ? matched.mobile : prev.senderMobile,
      fromCity: matched ? matched.city : prev.fromCity,
    }));
  };

  const handleReceiverChange = (name: string) => {
    const matched = parties.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setFormData((prev) => ({
      ...prev,
      receiver: name,
      receiverMobile: matched ? matched.mobile : prev.receiverMobile,
      toCity: matched ? matched.city : prev.toCity,
    }));
  };

  const handleFinancialChange = (field: 'amount' | 'advanceAmount' | 'dieselAmount', val: number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      const amt = field === 'amount' ? val : Number(updated.amount) || 0;
      const adv = field === 'advanceAmount' ? val : Number(updated.advanceAmount) || 0;
      const dsl = field === 'dieselAmount' ? val : Number(updated.dieselAmount) || 0;
      const bal = Math.max(0, amt - (adv + dsl));
      return {
        ...updated,
        balanceAmount: bal,
      };
    });
  };

  // Product items handlers
  const handleAddProduct = () => {
    const newItem: MemoItem = {
      id: 'itm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      productName: '',
      packages: 1,
      amount: 0,
      remarks: '',
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const handleProductChange = (index: number, field: keyof MemoItem, value: any) => {
    const currentItems = [...(formData.items || [])];
    const target = { ...currentItems[index] };

    if (field === 'packages' || field === 'amount') {
      (target as any)[field] = parseFloat(value) || 0;
    } else {
      (target as any)[field] = value;
    }

    currentItems[index] = target;

    // Recalculate total package count
    const totalPkgs = currentItems.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      items: currentItems,
      packages: totalPkgs,
    }));
  };

  const handleRemoveProduct = (index: number) => {
    const currentItems = (formData.items || []).filter((_, idx) => idx !== index);
    const totalPkgs = currentItems.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      items: currentItems,
      packages: totalPkgs,
    }));
  };

  const handleApplyItemsAmountToTotal = () => {
    const totalItemsAmount = (formData.items || []).reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    const adv = Number(formData.advanceAmount) || 0;
    const dsl = Number(formData.dieselAmount) || 0;
    const bal = Math.max(0, totalItemsAmount - (adv + dsl));

    setFormData((prev) => ({
      ...prev,
      amount: totalItemsAmount,
      balanceAmount: bal,
    }));
  };

  const handleAddBiltyRef = () => {
    if (!selectedBiltyNumber) return;
    if (formData.biltyReferences?.includes(selectedBiltyNumber)) return;

    const matchedBilty = bilties.find((b) => b.biltyNumber === selectedBiltyNumber);
    const newRefs = [...(formData.biltyReferences || []), selectedBiltyNumber];

    // Add this bilty's cargo as a product item if available
    let currentItems = [...(formData.items || [])];
    if (matchedBilty && matchedBilty.material) {
      // Remove empty placeholder item if present
      if (currentItems.length === 1 && !currentItems[0].productName) {
        currentItems = [];
      }
      currentItems.push({
        id: 'itm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productName: matchedBilty.material,
        packages: matchedBilty.packages || 1,
        amount: matchedBilty.totalAmount || matchedBilty.freight || 0,
        remarks: `Consignment from Bilty #${matchedBilty.biltyNumber}`,
      });
    }

    const addAmt = matchedBilty ? matchedBilty.totalAmount : 0;
    const currentAmt = formData.amount || 0;
    const newAmt = currentAmt === 0 ? addAmt : currentAmt + addAmt;
    const bal = Math.max(0, newAmt - ((formData.advanceAmount || 0) + (formData.dieselAmount || 0)));

    const newSender = formData.sender || (matchedBilty ? matchedBilty.consignor : '');
    const newReceiver = formData.receiver || (matchedBilty ? matchedBilty.consignee : '');
    const newFrom = formData.fromCity || (matchedBilty ? matchedBilty.fromCity : '');
    const newTo = formData.toCity || (matchedBilty ? matchedBilty.toCity : '');

    const totalPkgs = currentItems.reduce((acc, it) => acc + (Number(it.packages) || 0), 0);

    setFormData((prev) => ({
      ...prev,
      biltyReferences: newRefs,
      sender: newSender,
      party: newSender || prev.party,
      receiver: newReceiver,
      fromCity: newFrom,
      toCity: newTo,
      items: currentItems,
      packages: totalPkgs,
      amount: newAmt,
      balanceAmount: bal,
    }));
    setSelectedBiltyNumber('');
  };

  const handleRemoveBiltyRef = (ref: string) => {
    setFormData((prev) => ({
      ...prev,
      biltyReferences: (prev.biltyReferences || []).filter((r) => r !== ref),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memoNumber?.trim()) {
      setError('Memo Number is required');
      return;
    }
    if (!formData.memoDate) {
      setError('Memo Date is required');
      return;
    }
    if (!formData.vehicleNumber?.trim()) {
      setError('Vehicle Number is required');
      return;
    }

    try {
      setSaving(true);
      const totalPkgs = (formData.items || []).reduce((acc, it) => acc + (Number(it.packages) || 0), 0);

      const toSave = {
        ...formData,
        packages: totalPkgs > 0 ? totalPkgs : (formData.packages || 0),
        weight: formData.weight || 0,
        party: formData.sender || formData.party || '',
      };

      const saved = await db.saveMemo(toSave);
      onSave(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save memo');
    } finally {
      setSaving(false);
    }
  };

  const itemsTotalPackages = (formData.items || []).reduce((acc, it) => acc + (Number(it.packages) || 0), 0);
  const itemsTotalAmount = (formData.items || []).reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {memoToEdit ? `Edit Memo #${memoToEdit.memoNumber}` : 'New Lorry Dispatch Memo'}
            </span>
            <span className="bg-sky-500/20 text-sky-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
              Sender, Receiver & Product Entry
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Row: Memo No, Date, Vehicle, Driver */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Memo Number *</label>
              <input
                type="text"
                value={formData.memoNumber || ''}
                onChange={(e) => setFormData({ ...formData, memoNumber: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sky-900"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Memo Date *</label>
              <input
                type="date"
                value={formData.memoDate || ''}
                onChange={(e) => setFormData({ ...formData, memoDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Vehicle Number *</label>
              <input
                type="text"
                list="memo-veh-list"
                value={formData.vehicleNumber || ''}
                onChange={(e) => handleVehicleChange(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold uppercase bg-white"
                placeholder="e.g. MH04EF7711"
                required
              />
              <datalist id="memo-veh-list">
                {vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNumber}>
                    {v.vehicleNumber} ({v.driverName || 'No Driver'})
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Driver Name & Mobile</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={formData.driver || ''}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  placeholder="Driver Name"
                />
                <input
                  type="text"
                  value={formData.driverMobile || ''}
                  onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                  className="w-1/2 px-2 py-1.5 border border-slate-300 rounded bg-white font-mono text-[11px]"
                  placeholder="Mobile No."
                />
              </div>
            </div>
          </div>

          {/* CITY-WISE ROUTE DISPATCH SETUP (SHEHAR-WISE MEMO CREATION) */}
          <div className="border border-sky-300 rounded-xl overflow-hidden bg-gradient-to-r from-sky-50 via-blue-50/60 to-indigo-50/50 shadow-2xs">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2.5 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-200" />
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  City-Wise Route Dispatch (Shehar-Wise Dispatch Station)
                </span>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {formData.fromCity || 'Origin'} &rarr; {formData.toCity || 'Destination'}
                </span>
              </div>
              <span className="text-[11px] text-sky-100 font-medium hidden sm:inline">
                Origin City se Destination City ka Lorry Challan
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-center">
                {/* Origin City */}
                <div className="md:col-span-5 bg-white p-2.5 rounded-lg border border-sky-200 shadow-2xs">
                  <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>From City (Ravangi Shehar / Origin) *</span>
                  </label>
                  <input
                    type="text"
                    list="city-origin-list"
                    value={formData.fromCity || ''}
                    onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-800 text-xs focus:border-sky-500 focus:bg-sky-50/30"
                    placeholder="e.g. Mumbai, Delhi, Ahmedabad"
                    required
                  />
                  <datalist id="city-origin-list">
                    {uniqueCities.map((c) => (
                      <option key={`orig-${c}`} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* Swap Route */}
                <div className="md:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleSwapRoute}
                    className="p-2 rounded-full bg-white hover:bg-sky-100 border border-sky-300 text-sky-700 hover:text-sky-900 shadow-2xs transition-colors"
                    title="Swap Origin & Destination Cities"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Destination City */}
                <div className="md:col-span-5 bg-white p-2.5 rounded-lg border border-sky-200 shadow-2xs">
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>To City (Manzil Shehar / Destination) *</span>
                  </label>
                  <input
                    type="text"
                    list="city-dest-list"
                    value={formData.toCity || ''}
                    onChange={(e) => setFormData({ ...formData, toCity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-800 text-xs focus:border-emerald-500 focus:bg-emerald-50/30"
                    placeholder="e.g. Jaipur, Indore, Surat"
                    required
                  />
                  <datalist id="city-dest-list">
                    {uniqueCities.map((c) => (
                      <option key={`dest-${c}`} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Fast City Route Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Route Presets:
                </span>
                {commonRoutePresets.map((rt) => {
                  const isCurrent =
                    rt.from.toLowerCase() === currentFrom &&
                    rt.to.toLowerCase() === currentTo;
                  return (
                    <button
                      type="button"
                      key={`${rt.from}-${rt.to}`}
                      onClick={() => handleSelectRoutePreset(rt.from, rt.to)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-sky-700 text-white border-sky-700 font-bold'
                          : 'bg-white hover:bg-sky-100 text-slate-700 border-slate-300 hover:border-sky-300'
                      }`}
                    >
                      <span>{rt.from}</span>
                      <span className="text-sky-500">&rarr;</span>
                      <span>{rt.to}</span>
                    </button>
                  );
                })}
              </div>

              {/* Auto-Match Route Bilties Banner */}
              {unattachedRouteBilties.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-950">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">
                        ⚡ {unattachedRouteBilties.length} Bilties booked for {formData.fromCity} &rarr; {formData.toCity}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Total Freight: <span className="font-bold">{settings.currencySymbol} {routeBiltiesTotalAmount.toLocaleString()}</span> &bull; {routeBiltiesTotalPkgs} Packages &bull; {routeBiltiesTotalWeight} Kg
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAttachAllRouteBilties}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Attach All {unattachedRouteBilties.length} Route Bilties & Auto-Fill</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SENDER & RECEIVER SECTION */}
          <div className="border border-sky-200 rounded-lg overflow-hidden bg-sky-50/30">
            <div className="bg-sky-100/70 px-3.5 py-2 border-b border-sky-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sky-950">
                <UserCheck className="w-4 h-4 text-sky-700" />
                <span>Consignment Parties (Sender & Receiver)</span>
              </div>
              <span className="text-[11px] text-sky-700 font-medium">Bhejne Wala & Paane Wala</span>
            </div>

            <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SENDER (Consignor / Bhejne Wala) */}
              <div className="bg-white border border-sky-200 rounded-md p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold text-sky-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    Sender (Consignor / Bhejne Wala)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">From Dispatch</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sender Name / Party *</label>
                  <input
                    type="text"
                    list="memo-sender-list"
                    value={formData.sender || ''}
                    onChange={(e) => handleSenderChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:bg-white"
                    placeholder="Type or select Sender party..."
                  />
                  <datalist id="memo-sender-list">
                    {sortedSenders.map((p) => {
                      const isCityMatch = p.city?.toLowerCase() === currentFrom;
                      return (
                        <option key={p.id} value={p.name}>
                          {p.name} {isCityMatch ? `★ [${p.city} - Origin Match]` : `[${p.city}]`} ({p.mobile || 'No Mobile'})
                        </option>
                      );
                    })}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">Sender Mobile</label>
                    <input
                      type="text"
                      value={formData.senderMobile || ''}
                      onChange={(e) => setFormData({ ...formData, senderMobile: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-slate-50 focus:bg-white"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">From City / Origin</label>
                    <input
                      type="text"
                      value={formData.fromCity || ''}
                      onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white font-semibold"
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                </div>
              </div>

              {/* RECEIVER (Consignee / Paane Wala) */}
              <div className="bg-white border border-emerald-200 rounded-md p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                    Receiver (Consignee / Paane Wala)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">To Destination</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Receiver Name / Party *</label>
                  <input
                    type="text"
                    list="memo-receiver-list"
                    value={formData.receiver || ''}
                    onChange={(e) => handleReceiverChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium focus:bg-white"
                    placeholder="Type or select Receiver party..."
                  />
                  <datalist id="memo-receiver-list">
                    {sortedReceivers.map((p) => {
                      const isCityMatch = p.city?.toLowerCase() === currentTo;
                      return (
                        <option key={p.id} value={p.name}>
                          {p.name} {isCityMatch ? `★ [${p.city} - Destination Match]` : `[${p.city}]`} ({p.mobile || 'No Mobile'})
                        </option>
                      );
                    })}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">Receiver Mobile</label>
                    <input
                      type="text"
                      value={formData.receiverMobile || ''}
                      onChange={(e) => setFormData({ ...formData, receiverMobile: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px] bg-slate-50 focus:bg-white"
                      placeholder="e.g. 9811223344"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">To City / Destination</label>
                    <input
                      type="text"
                      value={formData.toCity || ''}
                      onChange={(e) => setFormData({ ...formData, toCity: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white"
                      placeholder="e.g. Delhi / Jaipur"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCT ENTRY (PRODUCT NAME WISE TABLE) */}
          <div className="border border-indigo-200 rounded-lg overflow-hidden bg-indigo-50/20">
            <div className="bg-indigo-100/70 px-3.5 py-2.5 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-indigo-950 text-xs">
                  Product Entry (Product Name Wise / Itemized Goods)
                </span>
                <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {(formData.items || []).length} Items
                </span>
              </div>

              <div className="flex items-center gap-2">
                {itemsTotalAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyItemsAmountToTotal}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-800 rounded font-semibold text-[11px] shadow-2xs"
                    title="Copy sum of product amounts to Total Freight"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Apply ₹{itemsTotalAmount.toLocaleString()} to Total</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            <div className="p-3">
              {(formData.items || []).length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-white rounded border border-dashed border-indigo-200">
                  <Package className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No product items added to this memo yet.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click "Add Product" to enter goods product-name wise (e.g. Cotton Cartons, Steel Pipes, Medicines).
                  </p>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white font-bold rounded inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Product</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded border border-indigo-100 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-2.5 min-w-[180px]">Product / Item Name *</th>
                        <th className="py-2 px-2 w-28 text-center">Pkgs / Qty</th>
                        <th className="py-2 px-2 w-32 text-right">Amount ({settings.currencySymbol})</th>
                        <th className="py-2 px-2.5 min-w-[140px]">Remarks / Description</th>
                        <th className="py-2 px-2 text-center w-10">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(formData.items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-1.5 px-2 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleProductChange(idx, 'productName', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-medium focus:border-indigo-500 focus:bg-white"
                              placeholder="e.g. Cotton Fabrics, Medicines, Electronics"
                              required
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.packages ?? 1}
                              onChange={(e) => handleProductChange(idx, 'packages', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-center font-mono font-bold"
                              placeholder="1"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.amount ?? 0}
                              onChange={(e) => handleProductChange(idx, 'amount', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-right font-mono font-bold text-indigo-900 bg-slate-50 focus:bg-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => handleProductChange(idx, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                              placeholder="Optional note"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100/80 font-bold border-t border-slate-300 text-slate-800">
                      <tr>
                        <td colSpan={2} className="py-2 px-3 text-right text-[11px] uppercase">
                          Product Totals:
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-indigo-900">
                          {itemsTotalPackages} Pkgs
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-indigo-900 text-sm">
                          {settings.currencySymbol} {itemsTotalAmount.toLocaleString()}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Consolidated Bilty Consignments */}
          <div className="border border-sky-200 bg-sky-50/40 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <span>Attach Consolidated Bilty Consignments</span>
                <span className="text-[11px] text-sky-700 font-normal">
                  (Auto-adds bilty material to product entries & fills parties)
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedBiltyNumber}
                onChange={(e) => setSelectedBiltyNumber(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs"
              >
                <option value="">-- Select Bilty to Attach to Memo --</option>
                {bilties.map((b) => (
                  <option key={b.id} value={b.biltyNumber}>
                    {b.biltyNumber} &bull; {b.consignor} &rarr; {b.consignee} | {b.material} ({b.packages} pkgs) - ₹{b.totalAmount}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddBiltyRef}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold text-xs"
              >
                Attach & Import
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(formData.biltyReferences || []).map((ref) => (
                <span
                  key={ref}
                  className="bg-white border border-sky-300 px-2.5 py-1 rounded text-sky-950 font-mono font-bold flex items-center gap-2 shadow-2xs text-[11px]"
                >
                  <span>{ref}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBiltyRef(ref)}
                    className="text-rose-500 hover:text-rose-700 text-sm leading-none"
                    title="Remove bilty reference"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Financial Breakdown (Amount, Advance, Diesel, Balance) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 text-xs">Financial Breakdown & Payments</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Total Freight ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount || 0}
                  onChange={(e) => handleFinancialChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Advance Cash Paid</label>
                <input
                  type="number"
                  min="0"
                  value={formData.advanceAmount || 0}
                  onChange={(e) => handleFinancialChange('advanceAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-emerald-700 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Diesel / Fuel Slip</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dieselAmount || 0}
                  onChange={(e) => handleFinancialChange('dieselAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono text-amber-700 font-bold"
                />
              </div>
              <div className="bg-white p-2.5 border border-rose-300 rounded flex flex-col justify-center">
                <span className="text-[10px] text-rose-800 uppercase font-bold block">Balance Due / Payable</span>
                <span className="text-base font-extrabold text-rose-700 font-mono">
                  {settings.currencySymbol} {(formData.balanceAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Dispatch Remarks / Instructions</label>
            <input
              type="text"
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded"
              placeholder="e.g. Special loading instructions, unloading time, contact at destination"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              * Required fields: Memo Number, Date, Vehicle Number
            </div>
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : memoToEdit ? 'Update Memo' : 'Create Memo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
