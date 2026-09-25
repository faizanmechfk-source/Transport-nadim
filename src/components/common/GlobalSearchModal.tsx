import React, { useState, useEffect } from 'react';
import { Search, X, FileText, ScrollText, Cross, Users, Truck, UserCheck, ArrowRight } from 'lucide-react';
import { Bilty, Driver, MedicalEntry, Memo, Party, Vehicle } from '../../types';
import { db } from '../../database/db';
import { NavItemKey } from './Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: NavItemKey, recordId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    bilties: Bilty[];
    memos: Memo[];
    medicals: MedicalEntry[];
    parties: Party[];
    vehicles: Vehicle[];
    drivers: Driver[];
  }>({
    bilties: [],
    memos: [],
    medicals: [],
    parties: [],
    vehicles: [],
    drivers: [],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // toggle search
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ bilties: [], memos: [], medicals: [], parties: [], vehicles: [], drivers: [] });
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ bilties: [], memos: [], medicals: [], parties: [], vehicles: [], drivers: [] });
      return;
    }

    const q = query.trim().toLowerCase();
    const searchAll = async () => {
      setLoading(true);
      const [bilties, memos, medicals, parties, vehicles, drivers] = await Promise.all([
        db.getBilties(),
        db.getMemos(),
        db.getMedicalEntries(),
        db.getParties(),
        db.getVehicles(),
        db.getDrivers(),
      ]);

      const matchB = bilties.filter(
        (b) =>
          b.biltyNumber.toLowerCase().includes(q) ||
          b.consignor.toLowerCase().includes(q) ||
          b.consignee.toLowerCase().includes(q) ||
          b.vehicleNumber.toLowerCase().includes(q) ||
          b.driverName.toLowerCase().includes(q) ||
          b.driverMobile.includes(q) ||
          b.material.toLowerCase().includes(q) ||
          b.totalAmount.toString().includes(q) ||
          b.fromCity.toLowerCase().includes(q) ||
          b.toCity.toLowerCase().includes(q)
      );

      const matchM = memos.filter(
        (m) =>
          m.memoNumber.toLowerCase().includes(q) ||
          m.party.toLowerCase().includes(q) ||
          m.vehicleNumber.toLowerCase().includes(q) ||
          m.driver.toLowerCase().includes(q) ||
          m.biltyReferences.some((r) => r.toLowerCase().includes(q)) ||
          m.amount.toString().includes(q)
      );

      const matchMed = medicals.filter(
        (me) =>
          me.entryNumber.toLowerCase().includes(q) ||
          me.party.toLowerCase().includes(q) ||
          me.patientReference.toLowerCase().includes(q) ||
          me.medicalItem.toLowerCase().includes(q) ||
          me.batchNumber.toLowerCase().includes(q) ||
          me.transportBiltyNumber.toLowerCase().includes(q) ||
          me.amount.toString().includes(q)
      );

      const matchP = parties.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.contactPerson.toLowerCase().includes(q) ||
          p.mobile.includes(q) ||
          (p.gstNumber && p.gstNumber.toLowerCase().includes(q)) ||
          p.city.toLowerCase().includes(q)
      );

      const matchV = vehicles.filter(
        (v) =>
          v.vehicleNumber.toLowerCase().includes(q) ||
          v.driverName.toLowerCase().includes(q) ||
          v.driverMobile.includes(q) ||
          v.ownerName.toLowerCase().includes(q)
      );

      const matchD = drivers.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.mobile.includes(q) ||
          d.licenseNumber.toLowerCase().includes(q) ||
          (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(q))
      );

      setResults({
        bilties: matchB.slice(0, 5),
        memos: matchM.slice(0, 5),
        medicals: matchMed.slice(0, 5),
        parties: matchP.slice(0, 5),
        vehicles: matchV.slice(0, 5),
        drivers: matchD.slice(0, 5),
      });
      setLoading(false);
    };

    const timer = setTimeout(searchAll, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.bilties.length +
    results.memos.length +
    results.medicals.length +
    results.parties.length +
    results.vehicles.length +
    results.drivers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600" />
          <input
            type="text"
            placeholder="Search Bilty #, Memo #, Medical #, Party, Vehicle, Mobile, Driver, City..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {loading && (
            <div className="py-8 text-center text-slate-400">Searching records...</div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500">
              No matching records found for "{query}".
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-slate-400">
              Type any bilty number, party name, vehicle registration, or phone number to search across all modules.
            </div>
          )}

          {/* Bilty Matches */}
          {results.bilties.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Bilty Entries ({results.bilties.length})</span>
              </div>
              <div className="space-y-1">
                {results.bilties.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onNavigate('bilty', b.id);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50/70 border border-slate-100 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-blue-700">
                        {b.biltyNumber} &bull; {b.consignor} &rarr; {b.consignee}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b.fromCity} to {b.toCity} | Veh: {b.vehicleNumber} | Freight: ₹{b.totalAmount.toLocaleString()} | Date: {b.biltyDate}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Memo Matches */}
          {results.memos.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Memos ({results.memos.length})</span>
              </div>
              <div className="space-y-1">
                {results.memos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onNavigate('memo', m.id);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/70 border border-slate-100 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-indigo-700">
                        {m.memoNumber} &bull; {m.party}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Veh: {m.vehicleNumber} | Driver: {m.driver} | Amount: ₹{m.amount.toLocaleString()} | Date: {m.memoDate}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medical Matches */}
          {results.medicals.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Cross className="w-3.5 h-3.5 text-teal-600" />
                <span>Medical Entries ({results.medicals.length})</span>
              </div>
              <div className="space-y-1">
                {results.medicals.map((me) => (
                  <button
                    key={me.id}
                    onClick={() => {
                      onNavigate('medical', me.id);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-teal-50/70 border border-slate-100 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-teal-700">
                        {me.entryNumber} &bull; {me.medicalItem} ({me.party})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Batch: {me.batchNumber} | Qty: {me.quantity} | Bilty Ref: {me.transportBiltyNumber} | ₹{me.amount.toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Party Matches */}
          {results.parties.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Parties ({results.parties.length})</span>
              </div>
              <div className="space-y-1">
                {results.parties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate('parties', p.id);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {p.name} {p.gstNumber ? `(GST: ${p.gstNumber})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Contact: {p.contactPerson} | Mobile: {p.mobile} | {p.city}, {p.state}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicles & Drivers */}
          {(results.vehicles.length > 0 || results.drivers.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.vehicles.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Vehicles</span>
                  </div>
                  {results.vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        onNavigate('vehicles', v.id);
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 mb-1"
                    >
                      <div className="font-bold text-slate-800">{v.vehicleNumber}</div>
                      <div className="text-[10px] text-slate-500">Driver: {v.driverName} ({v.driverMobile})</div>
                    </button>
                  ))}
                </div>
              )}

              {results.drivers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Drivers</span>
                  </div>
                  {results.drivers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        onNavigate('drivers', d.id);
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 mb-1"
                    >
                      <div className="font-bold text-slate-800">{d.name}</div>
                      <div className="text-[10px] text-slate-500">Mobile: {d.mobile} | Lic: {d.licenseNumber}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
          <span>Press <b>Esc</b> to close</span>
          <span>Showing top relevant results</span>
        </div>
      </div>
    </div>
  );
};
