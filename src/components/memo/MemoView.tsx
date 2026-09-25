import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Eye,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowRight,
  UserCheck,
  MapPin,
  Navigation,
  ArrowLeftRight,
  Filter,
  RotateCcw
} from 'lucide-react';
import { Bilty, CompanySettings, Driver, Memo, OperatingCity, Party, UserSession, Vehicle } from '../../types';
import { db } from '../../database/db';
import { defaultOperatingCities } from '../../database/seedData';
import { MemoFormModal } from './MemoFormModal';
import { MemoPrintView } from './MemoPrintView';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface MemoViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedMemoId?: string;
  initialRoute?: { fromCity?: string; toCity?: string } | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const MemoView: React.FC<MemoViewProps> = ({
  currentUser,
  settings,
  selectedMemoId,
  initialRoute,
  onShowToast,
  onRequestConfirm,
}) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFromCity, setFilterFromCity] = useState<string>('all');
  const [filterToCity, setFilterToCity] = useState<string>('all');
  const [currentRouteForModal, setCurrentRouteForModal] = useState<{ fromCity?: string; toCity?: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memoToEdit, setMemoToEdit] = useState<Memo | null>(null);
  const [printMemo, setPrintMemo] = useState<Memo | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [m, p, v, d, b] = await Promise.all([
      db.getMemos(),
      db.getParties(),
      db.getVehicles(),
      db.getDrivers(),
      db.getBilties(),
    ]);
    setMemos(m);
    setParties(p);
    setVehicles(v);
    setDrivers(d);
    setBilties(b);
    setLoading(false);

    if (selectedMemoId && selectedMemoId !== 'new') {
      const match = m.find((x) => x.id === selectedMemoId);
      if (match) setPrintMemo(match);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMemoId]);

  useEffect(() => {
    if (selectedMemoId === 'new' || initialRoute) {
      setMemoToEdit(null);
      if (initialRoute?.fromCity || initialRoute?.toCity) {
        setCurrentRouteForModal(initialRoute);
        if (initialRoute.fromCity) setFilterFromCity(initialRoute.fromCity);
        if (initialRoute.toCity) setFilterToCity(initialRoute.toCity);
      }
      setIsFormOpen(true);
    }
  }, [selectedMemoId, initialRoute]);

  const configuredCityNames = useMemo(() => {
    const raw = Array.isArray(settings.operatingCities)
      ? settings.operatingCities
      : defaultOperatingCities;
    const deletedSet = new Set((settings.deletedCityNames || []).map((n) => n.trim().toLowerCase()));

    return (raw as any[])
      .map((c: OperatingCity | string) => (typeof c === 'string' ? c : c.name))
      .filter((name: string) => Boolean(name) && !deletedSet.has(name.trim().toLowerCase()));
  }, [settings.operatingCities, settings.deletedCityNames]);

  const uniqueFromCities = Array.from(
    new Set([
      ...configuredCityNames,
      ...memos.map((m) => m.fromCity),
      ...parties.map((p) => p.city),
    ].filter(Boolean))
  ).sort();

  const uniqueToCities = Array.from(
    new Set([
      ...configuredCityNames,
      ...memos.map((m) => m.toCity),
      ...parties.map((p) => p.city),
    ].filter(Boolean))
  ).sort();

  const dynamicRoutes = (settings.quickRoutes && settings.quickRoutes.length > 0)
    ? settings.quickRoutes.filter((r) => r.active !== false).map((r) => ({
        label: `${r.fromCity} → ${r.toCity}`,
        from: r.fromCity,
        to: r.toCity,
      }))
    : [
        { label: 'Mumbai → Jaipur', from: 'Mumbai', to: 'Jaipur' },
        { label: 'Ahmedabad → Indore', from: 'Ahmedabad', to: 'Indore' },
        { label: 'Delhi → Mumbai', from: 'Delhi', to: 'Mumbai' },
        { label: 'Surat → Delhi', from: 'Surat', to: 'Delhi' },
      ];

  const commonRouteFilters = [
    { label: 'All Routes', from: 'all', to: 'all' },
    ...dynamicRoutes,
  ];

  const filteredMemos = memos.filter((m) => {
    if (filterFromCity !== 'all' && m.fromCity?.toLowerCase() !== filterFromCity.toLowerCase()) {
      return false;
    }
    if (filterToCity !== 'all' && m.toCity?.toLowerCase() !== filterToCity.toLowerCase()) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchProduct = m.items?.some((i) => i.productName.toLowerCase().includes(q));
      return (
        m.memoNumber.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        (m.sender && m.sender.toLowerCase().includes(q)) ||
        (m.receiver && m.receiver.toLowerCase().includes(q)) ||
        m.vehicleNumber.toLowerCase().includes(q) ||
        m.driver.toLowerCase().includes(q) ||
        m.fromCity.toLowerCase().includes(q) ||
        m.toCity.toLowerCase().includes(q) ||
        matchProduct ||
        m.biltyReferences.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalFilteredFreight = filteredMemos.reduce((acc, m) => acc + (m.amount || 0), 0);
  const totalFilteredPackages = filteredMemos.reduce((acc, m) => acc + (m.packages || 0), 0);

  const totalPages = Math.ceil(filteredMemos.length / pageSize) || 1;
  const paginatedMemos = filteredMemos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (memo: Memo) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Memo records.', 'error');
      return;
    }
    onRequestConfirm(
      `Delete Memo #${memo.memoNumber}?`,
      'This memo will be moved to the Recycle Bin.',
      async () => {
        try {
          await db.deleteMemo(memo.id, true);
          setMemos((prev) => prev.filter((m) => m.id !== memo.id));
          onShowToast(`Memo #${memo.memoNumber} moved to Recycle Bin`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete memo', 'error');
        }
      },
      true
    );
  };

  const handleExportExcel = () => {
    const data = filteredMemos.map((m) => ({
      'Memo Number': m.memoNumber,
      'Date': m.memoDate,
      'Sender (Consignor)': m.sender || m.party,
      'Receiver (Consignee)': m.receiver || 'N/A',
      'Vehicle': m.vehicleNumber,
      'Driver': m.driver,
      'Driver Mobile': m.driverMobile || '',
      'Route': `${m.fromCity} to ${m.toCity}`,
      'Products': m.items && m.items.length > 0
        ? m.items.map((i) => `${i.productName} (${i.packages} pkgs)`).join('; ')
        : (m.material || ''),
      'Total Packages': m.packages || (m.items?.reduce((s, i) => s + (i.packages || 0), 0) || 0),
      'Total Freight': m.amount,
      'Advance Paid': m.advanceAmount || 0,
      'Diesel Slip': m.dieselAmount || 0,
      'Balance Payable': m.balanceAmount || 0,
      'Bilties Attached': m.biltyReferences.join(', '),
      'Remarks': m.remarks || '',
    }));
    ExcelService.exportToExcel(data, `Memo_Register_${Date.now()}`, 'Memos');
    onShowToast('Exported Memo Register to Excel', 'success');
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sky-600" />
            <span>DISPATCH MEMO REGISTER</span>
            <span className="text-xs bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredMemos.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lorry hire challans, sender & receiver dispatch manifests, and product itemized consignments.
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
              setMemoToEdit(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Memo</span>
          </button>
        </div>
      </div>

      {/* CITY-WISE DISPATCH & ROUTE FILTER HUB */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-sky-500/20">
              <MapPin className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>City-Wise Dispatch Desk</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/40 font-mono font-medium">
                  Shehar-Wise Creation & Filter
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Filter memos city-wise or create a targeted loading challan for a route.
              </div>
            </div>
          </div>

          {/* Quick Route Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {commonRouteFilters.map((rf) => {
              const isActive = filterFromCity === rf.from && filterToCity === rf.to;
              return (
                <button
                  key={rf.label}
                  onClick={() => {
                    setFilterFromCity(rf.from);
                    setFilterToCity(rf.to);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {rf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* City Selectors & Launch Action */}
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* From City */}
          <div className="md:col-span-3 flex items-center gap-2 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-sky-400 shrink-0">From:</span>
            <select
              value={filterFromCity}
              onChange={(e) => setFilterFromCity(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs w-full focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-white">All Origin Cities</option>
              {uniqueFromCities.map((c) => (
                <option key={`view-from-${c}`} value={c} className="bg-slate-900 text-white">{c}</option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={() => {
                if (filterFromCity !== 'all' || filterToCity !== 'all') {
                  const temp = filterFromCity;
                  setFilterFromCity(filterToCity);
                  setFilterToCity(temp);
                }
              }}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Swap Cities"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* To City */}
          <div className="md:col-span-3 flex items-center gap-2 bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span className="text-[10px] uppercase font-bold text-emerald-400 shrink-0">To:</span>
            <select
              value={filterToCity}
              onChange={(e) => setFilterToCity(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs w-full focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-white">All Destination Cities</option>
              {uniqueToCities.map((c) => (
                <option key={`view-to-${c}`} value={c} className="bg-slate-900 text-white">{c}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-2 flex items-center gap-2">
            {(filterFromCity !== 'all' || filterToCity !== 'all') && (
              <button
                onClick={() => {
                  setFilterFromCity('all');
                  setFilterToCity('all');
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded border border-slate-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <div className="text-[11px] text-slate-400">
              <span className="text-white font-bold">{filteredMemos.length}</span> memos (₹{totalFilteredFreight.toLocaleString()})
            </div>
          </div>

          {/* Create Memo for this Route */}
          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={() => {
                if (currentUser.role === 'viewer') {
                  onShowToast('Viewer account has read-only access.', 'warning');
                  return;
                }
                const routePayload = {
                  fromCity: filterFromCity !== 'all' ? filterFromCity : 'Mumbai',
                  toCity: filterToCity !== 'all' ? filterToCity : 'Jaipur',
                };
                setCurrentRouteForModal(routePayload);
                setMemoToEdit(null);
                setIsFormOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg text-xs font-black shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>
                Create City Memo
                {filterFromCity !== 'all' && filterToCity !== 'all' ? ` (${filterFromCity} → ${filterToCity})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search Memo #, Sender, Receiver, Product Name, Vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-sky-600 text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Memo # & Date</th>
                <th className="py-3 px-3">Sender (Consignor)</th>
                <th className="py-3 px-3">Receiver (Consignee)</th>
                <th className="py-3 px-3">Products / Material</th>
                <th className="py-3 px-3">Vehicle & Driver</th>
                <th className="py-3 px-3">Route</th>
                <th className="py-3 px-3">Bilties Attached</th>
                <th className="py-3 px-3 text-right">Freight Amount</th>
                <th className="py-3 px-3 text-right">Adv + Diesel</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Loading Memos...
                  </td>
                </tr>
              ) : paginatedMemos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No Memo records found. Click "New Memo" to create one.
                  </td>
                </tr>
              ) : (
                paginatedMemos.map((m) => {
                  const productCount = m.items?.length || 0;
                  const totalPkgs = m.packages || (m.items?.reduce((s, i) => s + (i.packages || 0), 0) || 0);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Memo # & Date */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-sky-700 text-xs">{m.memoNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.memoDate}</div>
                      </td>

                      {/* Sender */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {m.sender || m.party}
                        </div>
                        {m.senderMobile && (
                          <div className="text-[10px] text-slate-500 font-mono">Ph: {m.senderMobile}</div>
                        )}
                      </td>

                      {/* Receiver */}
                      <td className="py-2.5 px-3">
                        {m.receiver ? (
                          <>
                            <div className="font-semibold text-emerald-950 line-clamp-1">
                              {m.receiver}
                            </div>
                            {m.receiverMobile && (
                              <div className="text-[10px] text-slate-500 font-mono">Ph: {m.receiverMobile}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Not Specified</span>
                        )}
                      </td>

                      {/* Products / Material */}
                      <td className="py-2.5 px-3 max-w-[220px]">
                        {productCount > 0 ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                                {productCount} {productCount === 1 ? 'Product' : 'Products'}
                              </span>
                              <span className="text-[11px] text-slate-600 font-mono">
                                ({totalPkgs} pkgs)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 truncate mt-0.5" title={m.items?.map(i => i.productName).join(', ')}>
                              {m.items?.map(i => i.productName).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-700 truncate" title={m.material || 'General Cargo'}>
                            {m.material || 'General Cargo'} ({totalPkgs} pkgs)
                          </div>
                        )}
                      </td>

                      {/* Vehicle & Driver */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-800">{m.vehicleNumber}</div>
                        <div className="text-[11px] text-slate-600">{m.driver}</div>
                      </td>

                      {/* Route */}
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="font-medium">{m.fromCity}</span>
                        <span className="text-slate-400 mx-1">&rarr;</span>
                        <span className="font-medium">{m.toCity}</span>
                      </td>

                      {/* Bilties */}
                      <td className="py-2.5 px-3 font-mono">
                        {m.biltyReferences.length > 0 ? (
                          <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                            {m.biltyReferences.length} Bilties
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                      </td>

                      {/* Freight Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {settings.currencySymbol} {m.amount.toLocaleString()}
                      </td>

                      {/* Advance + Diesel */}
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {settings.currencySymbol} {((m.advanceAmount || 0) + (m.dieselAmount || 0)).toLocaleString()}
                      </td>

                      {/* Balance */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {settings.currencySymbol} {(m.balanceAmount || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPrintMemo(m)}
                            className="p-1 text-slate-500 hover:text-sky-600 rounded"
                            title="Print / View Memo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (currentUser.role === 'viewer') {
                                onShowToast('Viewer account has read-only access.', 'warning');
                                return;
                              }
                              setMemoToEdit(m);
                              setIsFormOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded"
                            title="Edit Memo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(m)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded"
                              title="Delete Memo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold">{currentPage}</span> of{' '}
              <span className="font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 border border-slate-300 rounded bg-white disabled:opacity-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 border border-slate-300 rounded bg-white disabled:opacity-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <MemoFormModal
          isOpen={isFormOpen}
          memoToEdit={memoToEdit}
          settings={settings}
          parties={parties}
          vehicles={vehicles}
          drivers={drivers}
          bilties={bilties}
          initialRoute={currentRouteForModal || initialRoute}
          onClose={() => {
            setIsFormOpen(false);
            setCurrentRouteForModal(null);
          }}
          onSave={(saved) => {
            setMemos((prev) => {
              const idx = prev.findIndex((item) => item.id === saved.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
              }
              return [saved, ...prev];
            });
            onShowToast(
              memoToEdit ? `Updated Memo #${saved.memoNumber}` : `Created Memo #${saved.memoNumber}`,
              'success'
            );
            loadData();
          }}
        />
      )}

      {/* Printable Sheet View */}
      {printMemo && (
        <MemoPrintView
          memo={printMemo}
          settings={settings}
          onClose={() => setPrintMemo(null)}
        />
      )}
    </div>
  );
};
