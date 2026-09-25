import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
  Download,
  Filter,
  AlertCircle,
  Building2,
  TrendingUp,
  CheckCircle2,
  Share2,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Bilty, CompanySettings, MonthEndSummary, MonthEndTransaction, Party, UserSession } from '../../types';
import { db } from '../../database/db';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { NativeBridge } from '../../services/nativeBridge';

interface MonthEndViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const MonthEndView: React.FC<MonthEndViewProps> = ({
  currentUser,
  settings,
  onShowToast,
  onRequestConfirm,
}) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [monthKey, setMonthKey] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [summary, setSummary] = useState<MonthEndSummary | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const p = await db.getParties();
    setParties(p);

    const locked = await db.isMonthClosed(monthKey);
    setIsLocked(locked);

    const summaries = await db.generateMonthEndSummary(monthKey, selectedPartyId);
    setSummary(summaries.length > 0 ? summaries[0] : null);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [monthKey, selectedPartyId]);

  const handleCloseMonth = () => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can close and lock a billing month.', 'error');
      return;
    }

    onRequestConfirm(
      `Close & Lock Billing Month (${monthKey})?`,
      `Locking this month will protect all Bilty records in ${monthKey} against edits or accidental modifications. Are you sure?`,
      async () => {
        try {
          await db.closeMonth(monthKey, `Closed by ${currentUser.name}`);
          setIsLocked(true);
          onShowToast(`Month ${monthKey} closed and locked successfully.`, 'success');
        } catch (err: any) {
          onShowToast(err.message || 'Failed to close month', 'error');
        }
      }
    );
  };

  const handleReopenMonth = () => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can re-open a locked billing month.', 'error');
      return;
    }

    onRequestConfirm(
      `Re-open Locked Month (${monthKey})?`,
      `Re-opening this month will allow billing operators to modify records for ${monthKey}. This action will be audited.`,
      async () => {
        try {
          await db.reopenMonth(monthKey);
          setIsLocked(false);
          onShowToast(`Month ${monthKey} re-opened.`, 'info');
        } catch (err: any) {
          onShowToast(err.message || 'Failed to re-open month', 'error');
        }
      },
      true
    );
  };

  const [isExportingAuditPdf, setIsExportingAuditPdf] = useState(false);

  const handleExportConsolidatedAuditPdf = async () => {
    try {
      setIsExportingAuditPdf(true);
      const [bilties, memos, partiesList, vehicles, medicalEntries, closedMonths, allSummaries] = await Promise.all([
        db.getBilties(),
        db.getMemos(),
        db.getParties(),
        db.getVehicles(),
        db.getMedicalEntries(),
        db.getClosedMonths(),
        db.generateMonthEndSummary(monthKey),
      ]);

      const closedRecord = closedMonths.find((cm) => cm.monthKey === monthKey);

      PdfService.generateMonthEndConsolidatedAuditPdf({
        monthKey,
        settings,
        bilties,
        memos,
        parties: partiesList,
        vehicles,
        medicalEntries,
        partySummaries: allSummaries,
        closedRecord,
        currentUser,
      });

      await db.logAudit(
        'Month-End Audit PDF Exported',
        'MonthEnd',
        monthKey,
        undefined,
        `Exported consolidated audit dossier for ${monthKey}`
      );

      onShowToast(`Consolidated Audit PDF generated successfully for ${monthKey}`, 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to generate Month-End Audit PDF', 'error');
    } finally {
      setIsExportingAuditPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (!summary) return;
    PdfService.generateMonthEndPdf([summary], monthKey, settings);
    onShowToast('Generated Month-End Statement PDF', 'success');
  };

  const handleExportExcel = () => {
    if (!summary) return;
    const transactions = summary.transactions || [];
    const data = transactions.map((t: MonthEndTransaction) => ({
      'Date': t.date,
      'Bilty #': t.biltyNumber,
      'Vehicle': t.vehicleNumber,
      'From': t.fromCity,
      'To': t.toCity,
      'Material': t.material,
      'Packages': t.packages,
      'Weight': t.weight,
      'Freight': t.freight,
      'Other Charges': t.otherCharges,
      'Total Amount': t.totalAmount,
      'Paid': t.paidAmount,
      'Balance Due': t.balanceAmount,
    }));

    ExcelService.exportToExcel(data, `MonthEnd_${summary.monthKey}_${summary.partyName.replace(/\s+/g, '_')}`, 'Statement');
    onShowToast('Exported Monthly Statement to Excel', 'success');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Header */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
            <span>MONTH END PARTIES STATEMENT & CLOSING</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Party-wise consolidated billing statement, ledger reconciliation and month-end lock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLocked ? (
            <button
              onClick={handleReopenMonth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              title="Admin Re-open"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Re-Open Month</span>
            </button>
          ) : (
            <button
              onClick={handleCloseMonth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              title="Close and Lock Month"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close & Lock Month</span>
            </button>
          )}

          <button
            onClick={handleExportConsolidatedAuditPdf}
            disabled={isExportingAuditPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            title="Export Consolidated Month-End Financial & Logistical Audit PDF Dossier"
          >
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span>{isExportingAuditPdf ? 'Generating...' : 'Consolidated Audit PDF'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Select Month and Party */}
      <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Billing Month:</span>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold outline-none focus:border-amber-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="font-bold text-slate-700">Party Filter:</span>
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-amber-600"
          >
            <option value="ALL">-- All Consolidated Parties --</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city})
              </option>
            ))}
          </select>
        </div>

        {/* Lock Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold">
          {isLocked ? (
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <Lock className="w-3.5 h-3.5" />
              <span>Month Closed & Locked</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Month Open (Active)</span>
            </span>
          )}
        </div>
      </div>

      {/* Printable Area / Financial Summary Ledger */}
      {summary && (
        <div className="printable-area bg-white rounded-xl border border-slate-300 p-6 shadow-sm space-y-6">
          {/* Statement Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">
                MONTHLY FREIGHT STATEMENT & PARTY LEDGER
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{settings.companyName}</h2>
              <p className="text-slate-600 text-xs mt-0.5">{settings.address}, {settings.cityState}</p>
              <p className="text-slate-500 text-[11px]">GSTIN: {settings.gstNumber} | Phone: {settings.mobile}</p>
            </div>

            <div className="sm:text-right font-mono bg-slate-50 p-3 rounded border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-sans">Statement For</div>
              <div className="text-base font-black text-blue-900">{summary.partyName}</div>
              <div className="text-xs text-slate-700 font-semibold">Month: {summary.monthKey}</div>
            </div>
          </div>

          {/* Aggregated KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Opening Balance</span>
              <span className="text-base font-extrabold text-slate-800 font-mono">
                {settings.currencySymbol} {summary.openingBalance.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[10px] text-blue-800 uppercase font-bold block">Total Bilties / Freight</span>
              <span className="text-base font-extrabold text-blue-900 font-mono">
                {settings.currencySymbol} {summary.totalBiltyAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-600 block mt-0.5">{summary.totalEntries} Bilties</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] text-emerald-800 uppercase font-bold block">Total Paid Advance</span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {settings.currencySymbol} {(summary.totalPaidAmount ?? summary.totalPaid).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-[10px] text-rose-800 uppercase font-bold block">Closing Due Balance</span>
              <span className="text-lg font-black text-rose-700 font-mono">
                {settings.currencySymbol} {summary.closingBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Detailed Transaction List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold p-2.5 text-xs flex items-center justify-between">
              <span>BILTY TRANSACTIONS BREAKDOWN ({(summary.transactions || []).length})</span>
              <span className="font-mono text-[11px]">Period: {summary.monthKey}</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Bilty #</th>
                  <th className="py-2 px-3">Vehicle</th>
                  <th className="py-2 px-3">Route</th>
                  <th className="py-2 px-3">Material</th>
                  <th className="py-2 px-3 text-right">Pkgs / Wt</th>
                  <th className="py-2 px-3 text-right">Freight</th>
                  <th className="py-2 px-3 text-right">Charges</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Paid</th>
                  <th className="py-2 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!summary.transactions || summary.transactions.length === 0) ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No Bilty transactions recorded for this month and party selection.
                    </td>
                  </tr>
                ) : (
                  summary.transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-600">{t.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{t.biltyNumber}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{t.vehicleNumber}</td>
                      <td className="py-2 px-3 text-slate-600">{t.fromCity} &rarr; {t.toCity}</td>
                      <td className="py-2 px-3 text-slate-700">{t.material}</td>
                      <td className="py-2 px-3 text-right font-mono">{t.packages} / {t.weight}</td>
                      <td className="py-2 px-3 text-right font-mono">{settings.currencySymbol} {t.freight.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono">{settings.currencySymbol} {t.otherCharges.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {settings.currencySymbol} {t.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {settings.currencySymbol} {t.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {settings.currencySymbol} {t.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-900">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right">Summary Totals:</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {settings.currencySymbol} {summary.totalFreight.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {settings.currencySymbol} {(summary.totalOtherCharges ?? summary.totalCharges).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-900 font-extrabold">
                    {settings.currencySymbol} {summary.totalBiltyAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-extrabold">
                    {settings.currencySymbol} {(summary.totalPaidAmount ?? summary.totalPaid).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-black">
                    {settings.currencySymbol} {(summary.totalPendingAmount ?? summary.totalPending).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-bold text-slate-800">
            <div className="border-t border-slate-400 pt-1">Party Representative Signature</div>
            <div className="border-t border-slate-400 pt-1">Authorized Signatory - {settings.companyName}</div>
          </div>
        </div>
      )}
    </div>
  );
};
