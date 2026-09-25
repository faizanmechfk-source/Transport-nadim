import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Layers,
  CheckSquare,
  Square,
  FileText
} from 'lucide-react';
import { Bilty, CompanySettings, Driver, Party, UserSession, Vehicle } from '../../types';
import { db } from '../../database/db';
import { BiltyFormModal } from './BiltyFormModal';
import { BiltyPrintView } from './BiltyPrintView';
import { BiltySinglePagePrintModal } from './BiltySinglePagePrintModal';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { NativeBridge } from '../../services/nativeBridge';

interface BiltyViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  selectedBiltyId?: string;
  initialRoute?: { fromCity?: string; toCity?: string; cityFilter?: string } | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const BiltyView: React.FC<BiltyViewProps> = ({
  currentUser,
  settings,
  selectedBiltyId,
  initialRoute,
  onShowToast,
  onRequestConfirm,
}) => {
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Row Selection for Single-Page Print & Export
  const [selectedBiltyIds, setSelectedBiltyIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [biltyToEdit, setBiltyToEdit] = useState<Bilty | null>(null);
  const [printBilty, setPrintBilty] = useState<Bilty | null>(null);
  const [isSinglePageModalOpen, setIsSinglePageModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [b, p, v, d] = await Promise.all([
      db.getBilties(),
      db.getParties(),
      db.getVehicles(),
      db.getDrivers(),
    ]);
    setBilties(b);
    setParties(p);
    setVehicles(v);
    setDrivers(d);
    setLoading(false);

    if (selectedBiltyId) {
      const match = b.find((x) => x.id === selectedBiltyId);
      if (match) {
        setPrintBilty(match);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBiltyId]);

  useEffect(() => {
    if (initialRoute) {
      if (initialRoute.cityFilter) {
        setSearchTerm(initialRoute.cityFilter);
      }
      if (initialRoute.fromCity || initialRoute.toCity) {
        setBiltyToEdit(null);
        setIsFormOpen(true);
      }
    }
  }, [initialRoute]);

  // Filter logic
  const filteredBilties = bilties.filter((b) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        b.biltyNumber.toLowerCase().includes(q) ||
        b.consignor.toLowerCase().includes(q) ||
        b.consignee.toLowerCase().includes(q) ||
        b.fromCity.toLowerCase().includes(q) ||
        b.toCity.toLowerCase().includes(q) ||
        b.vehicleNumber.toLowerCase().includes(q) ||
        b.driverName.toLowerCase().includes(q) ||
        b.material.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedParty && b.consignor !== selectedParty && b.consignee !== selectedParty) {
      return false;
    }

    if (selectedVehicle && b.vehicleNumber !== selectedVehicle) {
      return false;
    }

    if (selectedPaymentType && b.paymentType !== selectedPaymentType) {
      return false;
    }

    if (startDate && b.biltyDate < startDate) {
      return false;
    }

    if (endDate && b.biltyDate > endDate) {
      return false;
    }

    return true;
  });

  // Row selection logic
  const selectedBilties = filteredBilties.filter((b) => selectedBiltyIds.has(b.id));
  const allFilteredSelected = filteredBilties.length > 0 && filteredBilties.every((b) => selectedBiltyIds.has(b.id));
  const someFilteredSelected = filteredBilties.some((b) => selectedBiltyIds.has(b.id)) && !allFilteredSelected;

  const handleToggleSelectAll = (select: boolean) => {
    if (select) {
      const next = new Set(selectedBiltyIds);
      filteredBilties.forEach((b) => next.add(b.id));
      setSelectedBiltyIds(next);
      onShowToast(`Selected all ${filteredBilties.length} filtered BTs`, 'info');
    } else {
      const next = new Set(selectedBiltyIds);
      filteredBilties.forEach((b) => next.delete(b.id));
      setSelectedBiltyIds(next);
    }
  };

  const handleSelectAllBTs = () => {
    setSelectedBiltyIds(new Set(bilties.map((b) => b.id)));
    onShowToast(`Selected all ${bilties.length} bilties in database`, 'info');
  };

  const handleClearSelection = () => {
    setSelectedBiltyIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    setSelectedBiltyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getBiltiesForSinglePage = (): Bilty[] => {
    if (selectedBiltyIds.size > 0) {
      return selectedBilties;
    }
    return filteredBilties;
  };

  const handleOpenSinglePagePrint = () => {
    const target = getBiltiesForSinglePage();
    if (target.length === 0) {
      onShowToast('No BT records available to print', 'warning');
      return;
    }
    setIsSinglePageModalOpen(true);
  };

  const handleDirectSinglePagePdf = () => {
    const target = getBiltiesForSinglePage();
    if (target.length === 0) {
      onShowToast('No BT records available to export', 'warning');
      return;
    }
    try {
      PdfService.generateSinglePageBiltiesPdf(target, settings, {
        orientation: 'landscape',
        density: target.length > 20 ? 'ultra' : target.length > 10 ? 'compact' : 'normal',
      });
      onShowToast(`Exported ${target.length} BTs onto 1-page PDF`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to export 1-page PDF', 'error');
    }
  };

  // Pagination slice
  const totalPages = Math.ceil(filteredBilties.length / pageSize) || 1;
  const paginatedBilties = filteredBilties.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = () => {
    if (currentUser.role === 'viewer') {
      onShowToast('Viewer account has read-only access.', 'warning');
      return;
    }
    setBiltyToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (bilty: Bilty) => {
    if (currentUser.role === 'viewer') {
      onShowToast('Viewer account has read-only access.', 'warning');
      return;
    }
    setBiltyToEdit(bilty);
    setIsFormOpen(true);
  };

  const handleDelete = (bilty: Bilty) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can delete Bilty records.', 'error');
      return;
    }

    onRequestConfirm(
      `Delete Bilty #${bilty.biltyNumber}?`,
      `This record will be moved to the Recycle Bin. You can restore it anytime from the Reports > Deleted History section.`,
      async () => {
        try {
          await db.deleteBilty(bilty.id, true);
          setBilties((prev) => prev.filter((b) => b.id !== bilty.id));
          setSelectedBiltyIds((prev) => {
            const next = new Set(prev);
            next.delete(bilty.id);
            return next;
          });
          onShowToast(`Bilty #${bilty.biltyNumber} moved to Recycle Bin`, 'success');
          loadData();
        } catch (err: any) {
          onShowToast(err.message || 'Failed to delete Bilty', 'error');
        }
      },
      true
    );
  };

  const handleExportExcel = () => {
    const target = selectedBiltyIds.size > 0 ? selectedBilties : filteredBilties;
    if (target.length === 0) {
      onShowToast('No BT records available to export', 'warning');
      return;
    }

    const dataToExport = target.map((b) => ({
      'Bilty Number': b.biltyNumber,
      'Date': b.biltyDate,
      'Consignor': b.consignor,
      'Consignee': b.consignee,
      'From City': b.fromCity,
      'To City': b.toCity,
      'Vehicle': b.vehicleNumber,
      'Driver': b.driverName,
      'Driver Mobile': b.driverMobile,
      'Material': b.material,
      'Packages': b.packages,
      'Package Type': b.packageType,
      'Weight': `${b.weight} ${b.weightUnit}`,
      'Freight': b.freight,
      'Loading': b.loadingCharges,
      'Unloading': b.unloadingCharges,
      'Other Charges': b.otherCharges,
      'Total Amount': b.totalAmount,
      'Payment Type': b.paymentType,
      'Paid Amount': b.paidAmount,
      'Balance Due': b.balanceAmount,
      'Remarks': b.remarks || '',
    }));

    ExcelService.exportToExcel(
      dataToExport,
      `Bilty_Register_${selectedBiltyIds.size > 0 ? 'Selected_' : ''}${Date.now()}`,
      'Bilties'
    );
    onShowToast(`Exported ${target.length} Bilty records to Excel`, 'success');
  };

  const handleExportCsv = () => {
    const target = selectedBiltyIds.size > 0 ? selectedBilties : filteredBilties;
    if (target.length === 0) {
      onShowToast('No BT records available to export', 'warning');
      return;
    }

    const dataToExport = target.map((b) => ({
      'Bilty Number': b.biltyNumber,
      'Date': b.biltyDate,
      'Consignor': b.consignor,
      'Consignee': b.consignee,
      'From City': b.fromCity,
      'To City': b.toCity,
      'Vehicle': b.vehicleNumber,
      'Freight Total': b.totalAmount,
      'Payment Type': b.paymentType,
      'Paid': b.paidAmount,
      'Balance': b.balanceAmount,
    }));

    ExcelService.exportToCsv(
      dataToExport,
      `Bilty_Export_${selectedBiltyIds.size > 0 ? 'Selected_' : ''}${Date.now()}`
    );
    onShowToast(`Exported ${target.length} Bilty records to CSV`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>BILTY ENTRY & MANAGEMENT</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredBilties.length} Records
            </span>
            {selectedBiltyIds.size > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold">
                {selectedBiltyIds.size} Selected
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consignment notes, freight billing, single-page consolidated lorry receipt printing, and exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Select All BT Quick Toggle */}
          <button
            onClick={() => handleToggleSelectAll(!allFilteredSelected)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              allFilteredSelected
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle selection of all filtered BTs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>{allFilteredSelected ? 'Deselect All' : `Select All BT (${filteredBilties.length})`}</span>
          </button>

          {/* Pure BT Ek Hi Page Print Button */}
          <button
            onClick={handleOpenSinglePagePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            title="Print all selected BTs consolidated onto a single page (Ek Hi Page Print)"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            <span>Pure BT Ek Hi Page Print</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
              {selectedBiltyIds.size > 0 ? selectedBiltyIds.size : filteredBilties.length}
            </span>
          </button>

          {/* 1-Page PDF Direct Export */}
          <button
            onClick={handleDirectSinglePagePdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Export 1-Page Consolidated PDF for all selected or filtered BTs"
          >
            <Download className="w-4 h-4" />
            <span>1-Page PDF</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title={selectedBiltyIds.size > 0 ? `Export ${selectedBiltyIds.size} selected BTs to Excel` : 'Export filtered records to Excel'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel {selectedBiltyIds.size > 0 ? `(${selectedBiltyIds.size})` : ''}</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          {/* New Bilty */}
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Bilty</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search Bilty #, Party, Route, Vehicle, Driver..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:border-blue-600 outline-none"
            />
          </div>

          {/* Party filter */}
          <div>
            <select
              value={selectedParty}
              onChange={(e) => {
                setSelectedParty(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 focus:border-blue-600 outline-none"
            >
              <option value="">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle filter */}
          <div>
            <select
              value={selectedVehicle}
              onChange={(e) => {
                setSelectedVehicle(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 focus:border-blue-600 outline-none"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNumber}>
                  {v.vehicleNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Payment filter */}
          <div>
            <select
              value={selectedPaymentType}
              onChange={(e) => {
                setSelectedPaymentType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 focus:border-blue-600 outline-none"
            >
              <option value="">All Payments</option>
              <option value="Paid">Paid Only</option>
              <option value="To-Pay">To-Pay Only</option>
              <option value="T.B.B.">T.B.B. Only</option>
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] outline-none"
              title="Start Date"
            />
            <span className="text-slate-400">&ndash;</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] outline-none"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Selection Notification & Action Bar */}
      {selectedBiltyIds.size > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 px-4 rounded-xl shadow-lg border border-blue-700/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-inner">
              {selectedBiltyIds.size}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-tight">
                  {selectedBiltyIds.size} of {filteredBilties.length} Bilties Selected
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.2 rounded-full">
                  Ready for 1-Page Print
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-blue-200 mt-0.5 font-mono">
                <span>Pkgs: <strong className="text-white">{selectedBilties.reduce((s, b) => s + (Number(b.packages) || 0), 0)}</strong></span>
                <span>&bull;</span>
                <span>Weight: <strong className="text-white">{selectedBilties.reduce((s, b) => s + (Number(b.weight) || 0), 0)} Kg</strong></span>
                <span>&bull;</span>
                <span>Freight: <strong className="text-white">₹{selectedBilties.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0).toLocaleString()}</strong></span>
                <span>&bull;</span>
                <span>Balance: <strong className="text-rose-300">₹{selectedBilties.reduce((s, b) => s + (Number(b.balanceAmount) || 0), 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenSinglePagePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pure BT Ek Hi Page Per Print</span>
            </button>

            <button
              onClick={handleDirectSinglePagePdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>1-Page PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel ({selectedBiltyIds.size})</span>
            </button>

            <button
              onClick={() => handleToggleSelectAll(true)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
            >
              Select All Filtered ({filteredBilties.length})
            </button>

            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected && filteredBilties.length > 0}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select All BTs in this filtered list"
                  />
                </th>
                <th className="py-3 px-3">Bilty #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Consignor</th>
                <th className="py-3 px-3">Consignee</th>
                <th className="py-3 px-3">Route</th>
                <th className="py-3 px-3">Vehicle</th>
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3 text-right">Freight</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    Loading Bilty records...
                  </td>
                </tr>
              ) : paginatedBilties.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    No Bilty records found matching filters. Click "New Bilty" to create one.
                  </td>
                </tr>
              ) : (
                paginatedBilties.map((b) => (
                  <tr
                    key={b.id}
                    className={`transition-colors ${
                      selectedBiltyIds.has(b.id)
                        ? 'bg-blue-50/80 font-medium border-l-4 border-blue-600'
                        : 'hover:bg-blue-50/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center border-r border-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedBiltyIds.has(b.id)}
                        onChange={() => handleToggleRow(b.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-700 font-mono">
                      {b.biltyNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{b.biltyDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[150px] truncate" title={b.consignor}>
                      {b.consignor}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-[150px] truncate" title={b.consignee}>
                      {b.consignee}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {b.fromCity} &rarr; {b.toCity}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {b.vehicleNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate" title={b.material}>
                      {b.packages} {b.packageType} ({b.material})
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      {settings.currencySymbol} {b.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-mono font-semibold">
                      {settings.currencySymbol} {b.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {settings.currencySymbol} {b.balanceAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.paymentType === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.paymentType === 'To-Pay'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {b.paymentType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintBilty(b)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Print / View Individual Bilty"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => PdfService.generateBiltyPdf(b, settings)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Edit Bilty"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete Bilty (Soft Delete)"
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

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredBilties.length)} of {filteredBilties.length} bilties
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <BiltyFormModal
          isOpen={isFormOpen}
          biltyToEdit={biltyToEdit}
          settings={settings}
          parties={parties}
          vehicles={vehicles}
          drivers={drivers}
          initialRoute={initialRoute}
          onClose={() => setIsFormOpen(false)}
          onSave={(savedBilty) => {
            setBilties((prev) => {
              const idx = prev.findIndex((b) => b.id === savedBilty.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = savedBilty;
                return updated;
              }
              return [savedBilty, ...prev];
            });
            loadData();
            onShowToast(biltyToEdit ? `Bilty #${savedBilty.biltyNumber} updated successfully` : `New Bilty #${savedBilty.biltyNumber} created successfully`, 'success');
          }}
        />
      )}

      {/* Print View Modal */}
      {printBilty && (
        <BiltyPrintView
          bilty={printBilty}
          settings={settings}
          onClose={() => setPrintBilty(null)}
        />
      )}

      {/* Single Page (Ek Hi Page) Consolidated BT Print & Export Modal */}
      {isSinglePageModalOpen && (
        <BiltySinglePagePrintModal
          bilties={getBiltiesForSinglePage()}
          settings={settings}
          onClose={() => setIsSinglePageModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
