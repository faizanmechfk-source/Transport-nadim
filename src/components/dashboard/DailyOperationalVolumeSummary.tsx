import React, { useState } from 'react';
import {
  Scale,
  FileText,
  Truck,
  Package,
  TrendingUp,
  Calendar,
  Plus,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Bilty, CompanySettings } from '../../types';
import { PdfService } from '../../services/pdfService';

interface DailyOperationalVolumeSummaryProps {
  bilties: Bilty[];
  settings: CompanySettings;
  onNavigate: (view: any, recordId?: string, payload?: any) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DailyOperationalVolumeSummary: React.FC<DailyOperationalVolumeSummaryProps> = ({
  bilties,
  settings,
  onNavigate,
  onShowToast,
}) => {
  const [showTodayTable, setShowTodayTable] = useState(false);

  // Compute Current Day strings (both ISO UTC and Local Date formats)
  const now = new Date();
  const todayIso = now.toISOString().substring(0, 10);
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const todayLocal = `${localYear}-${localMonth}-${localDay}`;

  const formattedDisplayDate = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Filter bilties generated for the current day
  const todayBilties = bilties.filter(
    (b) => b.biltyDate === todayIso || b.biltyDate === todayLocal
  );

  // Operational metrics
  const totalCount = todayBilties.length;
  const totalWeightKg = todayBilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const totalWeightMetricTons = (totalWeightKg / 1000).toFixed(2);
  const totalWeightQuintals = (totalWeightKg / 100).toFixed(1);
  const avgWeightPerBilty = totalCount > 0 ? Math.round(totalWeightKg / totalCount) : 0;

  const totalPackages = todayBilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);
  const totalFreightAmount = todayBilties.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalPaidAmount = todayBilties.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
  const totalBalanceAmount = todayBilties.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

  // Unique operational dispatches
  const uniqueVehicles = Array.from(new Set(todayBilties.map((b) => b.vehicleNumber).filter(Boolean)));
  const uniqueRoutes = Array.from(new Set(todayBilties.map((b) => `${b.fromCity} → ${b.toCity}`).filter(Boolean)));

  // Payment breakdown counts
  const paidCount = todayBilties.filter((b) => b.paymentType === 'Paid').length;
  const toPayCount = todayBilties.filter((b) => b.paymentType === 'To-Pay').length;
  const tbbCount = todayBilties.filter((b) => b.paymentType === 'T.B.B.').length;

  const handlePrintTodayManifest = () => {
    if (todayBilties.length === 0) {
      if (onShowToast) onShowToast('No bilties generated for today yet.', 'info');
      return;
    }
    try {
      PdfService.generateSinglePageBiltiesPdf(todayBilties, settings, {
        orientation: 'landscape',
        density: todayBilties.length > 15 ? 'compact' : 'normal',
        title: `DAILY DISPATCH REGISTER & MANIFEST (${todayLocal})`,
      });
      if (onShowToast) {
        onShowToast(`Exported Today's ${todayBilties.length} Bilties to 1-Page PDF`, 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to generate PDF', 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Top Header Banner with Live Pulse */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                Operational Dispatch Velocity
              </span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Today &bull; {todayLocal}</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Today's Operational Volume Summary</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Instant insight into today's consignment weight, total bilty generation, and active freight movements.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {totalCount > 0 && (
            <button
              onClick={handlePrintTodayManifest}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg font-bold border border-slate-700 transition-colors"
              title="Print all of today's bilties on a 1-page consolidated sheet"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Today's BTs (1-Page)</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('bilty')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg font-bold shadow-md shadow-blue-600/30 transition-all"
            title="Create a new Bilty entry"
          >
            <Plus className="w-4 h-4" />
            <span>New Bilty Today</span>
          </button>
        </div>
      </div>

      {/* Main 4 Metric Hero Cards */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. TOTAL WEIGHT GENERATED TODAY */}
          <div className="bg-gradient-to-br from-blue-50/80 via-white to-sky-50/60 p-4 rounded-xl border-2 border-blue-200/90 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
              <span className="uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>Today's Total Weight</span>
              </span>
              <span className="bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-black">
                {totalWeightMetricTons} MT
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {totalWeightKg.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-slate-600 font-mono">Kg</span>
            </div>

            {/* Sub-insights */}
            <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Avg / Bilty:</span>
              <span className="font-bold font-mono text-slate-900">
                {avgWeightPerBilty > 0 ? `${avgWeightPerBilty.toLocaleString()} Kg` : '-'}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quintals:</span>
              <span className="font-mono font-semibold text-blue-800">
                {totalWeightKg > 0 ? `${totalWeightQuintals} Qtl` : '0 Qtl'}
              </span>
            </div>
          </div>

          {/* 2. TOTAL BILTIES COUNT GENERATED TODAY */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 p-4 rounded-xl border-2 border-indigo-200/90 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition-colors">
            <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
              <span className="uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Today's Bilties Generated</span>
              </span>
              <span className="bg-indigo-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-black">
                BTs
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {totalCount}
              </span>
              <span className="text-sm font-bold text-slate-600">
                {totalCount === 1 ? 'Bilty' : 'Bilties'}
              </span>
            </div>

            {/* Sub-insights */}
            <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>Total Packages:</span>
              </span>
              <span className="font-bold font-mono text-slate-900">
                {totalPackages.toLocaleString()} Pkgs
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status:</span>
              <span className="font-semibold text-indigo-800">
                {totalCount > 0 ? `${paidCount} Paid • ${toPayCount} To-Pay • ${tbbCount} TBB` : 'No bookings yet'}
              </span>
            </div>
          </div>

          {/* 3. TODAY'S FREIGHT BOOKING REVENUE */}
          <div className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-4 rounded-xl border-2 border-emerald-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
              <span className="uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Today's Freight Booked</span>
              </span>
              <span className="bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-black">
                Revenue
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-emerald-700">{settings.currencySymbol}</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {totalFreightAmount.toLocaleString()}
              </span>
            </div>

            {/* Sub-insights */}
            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Collected / Paid:</span>
              <span className="font-bold font-mono text-emerald-800">
                {settings.currencySymbol} {totalPaidAmount.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Balance Dues:</span>
              <span className="font-mono font-semibold text-rose-700">
                {settings.currencySymbol} {totalBalanceAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 4. ACTIVE FLEET & DISPATCH CORRIDORS */}
          <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-4 rounded-xl border-2 border-amber-200/90 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
              <span className="uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Fleet & Routes Today</span>
              </span>
              <span className="bg-amber-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-black">
                Active
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {uniqueVehicles.length}
              </span>
              <span className="text-sm font-bold text-slate-600">
                {uniqueVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
              </span>
            </div>

            {/* Sub-insights */}
            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Active Routes:</span>
              </span>
              <span className="font-bold font-mono text-slate-900">
                {uniqueRoutes.length} Corridors
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 truncate">
              <span>Top Corridor:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={uniqueRoutes[0] || 'None'}>
                {uniqueRoutes[0] || 'No dispatches'}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Highlights Strip */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{formattedDisplayDate}:</span>
            </span>

            {totalCount > 0 ? (
              <span className="text-slate-600">
                Generated <strong className="text-slate-900 font-mono">{totalCount} BTs</strong> with a cumulative operational tonnage of{' '}
                <strong className="text-blue-900 font-mono font-bold">{totalWeightKg.toLocaleString()} Kg ({totalWeightMetricTons} MT)</strong> across{' '}
                <strong className="text-slate-900 font-mono">{totalPackages} packages</strong>.
              </span>
            ) : (
              <span className="text-slate-500 italic">
                No bilty bookings recorded yet for today ({todayLocal}). Ready for dispatch entries.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {totalCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowTodayTable(!showTodayTable)}
                className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                <span>{showTodayTable ? 'Hide Details' : `View Today's ${totalCount} Bilties`}</span>
                {showTodayTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('bilty')}
                className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                <span>Book Today's First Bilty</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Today's Bilties Drilldown Table */}
        {showTodayTable && totalCount > 0 && (
          <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-blue-900 text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-300" />
                <span className="font-bold tracking-tight">Today's Generated Bilties Register</span>
                <span className="bg-blue-800 text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded">
                  {totalCount} Records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintTodayManifest}
                  className="flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                >
                  <Printer className="w-3 h-3 text-sky-300" />
                  <span>Print 1-Page Manifest</span>
                </button>
                <button
                  onClick={() => onNavigate('bilty')}
                  className="flex items-center gap-1 bg-white text-blue-900 hover:bg-blue-50 px-2.5 py-1 rounded text-[11px] font-bold transition-colors"
                >
                  <span>Open Bilty Manager</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs border-collapse bg-white">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th className="py-2 px-3 text-center w-8">#</th>
                    <th className="py-2 px-3">Bilty #</th>
                    <th className="py-2 px-3">Consignor</th>
                    <th className="py-2 px-3">Consignee</th>
                    <th className="py-2 px-3">Route</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3 text-center">Pkgs</th>
                    <th className="py-2 px-3 text-right">Weight (Kg)</th>
                    <th className="py-2 px-3 text-right">Freight</th>
                    <th className="py-2 px-3 text-center">Mode</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayBilties.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{b.biltyNumber}</td>
                      <td className="py-2 px-3 font-medium text-slate-900 max-w-[140px] truncate" title={b.consignor}>
                        {b.consignor}
                      </td>
                      <td className="py-2 px-3 text-slate-700 max-w-[140px] truncate" title={b.consignee}>
                        {b.consignee}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {b.fromCity} &rarr; {b.toCity}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {b.vehicleNumber}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">{b.packages}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                        {Number(b.weight).toLocaleString()} {b.weightUnit || 'Kg'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {settings.currencySymbol} {b.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            b.paymentType === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.paymentType === 'To-Pay'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {b.paymentType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onNavigate('bilty', b.id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold p-1 hover:bg-blue-50 rounded"
                          title="View / Edit Bilty"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 font-bold border-t border-blue-200">
                  <tr>
                    <td colSpan={6} className="py-2 px-3 text-right uppercase tracking-wider text-blue-950 font-extrabold text-[10px]">
                      Today's Total ({totalCount} Bilties):
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-black text-blue-950">
                      {totalPackages.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-blue-900">
                      {totalWeightKg.toLocaleString()} Kg
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                      {settings.currencySymbol} {totalFreightAmount.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
