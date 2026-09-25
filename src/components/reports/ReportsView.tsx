import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Layers,
  Truck,
  Building2,
  AlertCircle,
  FileCheck,
  History,
  Cross,
  ShieldCheck,
  FileText,
  Lock,
  Unlock,
  TrendingUp,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  X
} from 'lucide-react';
import {
  AuditLog,
  Bilty,
  ClosedMonthRecord,
  CompanySettings,
  MedicalEntry,
  Memo,
  MonthEndSummary,
  Party,
  UserSession,
  Vehicle
} from '../../types';
import { db } from '../../database/db';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface ReportsViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type ReportType =
  | 'bilty-register'
  | 'month-end-audit'
  | 'outstanding-dues'
  | 'vehicle-trips'
  | 'party-ledger'
  | 'gst-summary'
  | 'medical-register'
  | 'audit-trail';

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  settings,
  onShowToast,
}) => {
  const [reportType, setReportType] = useState<ReportType>('bilty-register');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().substring(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [selectedParty, setSelectedParty] = useState('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [paymentType, setPaymentType] = useState('ALL');

  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [closedMonths, setClosedMonths] = useState<ClosedMonthRecord[]>([]);
  const [medicalEntries, setMedicalEntries] = useState<MedicalEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Month-End Audit Specific State
  const [selectedAuditMonth, setSelectedAuditMonth] = useState<string>(() =>
    new Date().toISOString().substring(0, 7)
  );
  const [partySummaries, setPartySummaries] = useState<MonthEndSummary[]>([]);
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [isGeneratingAuditPdf, setIsGeneratingAuditPdf] = useState(false);
  const [showAuditExportModal, setShowAuditExportModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [b, p, v, m, a, memosData, closedData] = await Promise.all([
      db.getBilties(),
      db.getParties(),
      db.getVehicles(),
      db.getMedicalEntries(),
      db.getAuditLogs(),
      db.getMemos(),
      db.getClosedMonths(),
    ]);
    setBilties(b);
    setParties(p);
    setVehicles(v);
    setMedicalEntries(m);
    setAuditLogs(a);
    setMemos(memosData);
    setClosedMonths(closedData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Month End Summaries whenever selectedAuditMonth changes
  useEffect(() => {
    if (selectedAuditMonth) {
      db.generateMonthEndSummary(selectedAuditMonth).then((summaries) => {
        setPartySummaries(summaries);
      });
    }
  }, [selectedAuditMonth]);

  // Filtered Bilties
  const filteredBilties = bilties.filter((b) => {
    if (b.biltyDate < fromDate || b.biltyDate > toDate) return false;
    if (selectedParty !== 'ALL' && b.consignor !== selectedParty && b.consignee !== selectedParty) return false;
    if (selectedVehicle !== 'ALL' && b.vehicleNumber !== selectedVehicle) return false;
    if (paymentType !== 'ALL' && b.paymentType !== paymentType) return false;
    return true;
  });

  // Filtered Medical
  const filteredMedical = medicalEntries.filter((m) => {
    const mDate = m.entryDate || m.date;
    if (mDate < fromDate || mDate > toDate) return false;
    if (selectedParty !== 'ALL' && m.party !== selectedParty) return false;
    return true;
  });

  // Filtered Audits
  const filteredAudits = auditLogs.filter((a) => {
    const logDate = a.timestamp.substring(0, 10);
    return logDate >= fromDate && logDate <= toDate;
  });

  // KPI Calculations
  const totalBiltyFreight = filteredBilties.reduce((acc, b) => acc + b.freight, 0);
  const totalBiltyAmount = filteredBilties.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalPaid = filteredBilties.reduce((acc, b) => acc + b.paidAmount, 0);
  const totalBalance = filteredBilties.reduce((acc, b) => acc + b.balanceAmount, 0);
  const totalWeight = filteredBilties.reduce((acc, b) => acc + b.weight, 0);

  // Available months from bilties and memos + last 6 months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const current = new Date().toISOString().substring(0, 7);
    set.add(current);
    // past 6 months
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      d.setMonth(d.getMonth() - 1);
      set.add(d.toISOString().substring(0, 7));
    }
    bilties.forEach((b) => {
      if (b.biltyDate && b.biltyDate.length >= 7) set.add(b.biltyDate.substring(0, 7));
    });
    memos.forEach((m) => {
      if (m.memoDate && m.memoDate.length >= 7) set.add(m.memoDate.substring(0, 7));
    });
    closedMonths.forEach((c) => {
      if (c.monthKey) set.add(c.monthKey);
    });
    return Array.from(set).sort().reverse();
  }, [bilties, memos, closedMonths]);

  // Specific month data for Month-End Audit
  const auditMonthBilties = useMemo(
    () => bilties.filter((b) => b.biltyDate && b.biltyDate.startsWith(selectedAuditMonth) && !b.isDeleted),
    [bilties, selectedAuditMonth]
  );
  const auditMonthMemos = useMemo(
    () => memos.filter((m) => m.memoDate && m.memoDate.startsWith(selectedAuditMonth) && !m.isDeleted),
    [memos, selectedAuditMonth]
  );
  const auditMonthMedicals = useMemo(
    () => medicalEntries.filter((m) => ((m.entryDate || m.date) || '').startsWith(selectedAuditMonth) && !m.isDeleted),
    [medicalEntries, selectedAuditMonth]
  );
  const auditClosedRecord = useMemo(
    () => closedMonths.find((cm) => cm.monthKey === selectedAuditMonth),
    [closedMonths, selectedAuditMonth]
  );
  const isMonthLocked = !!auditClosedRecord;

  // Month-End Financial Audit KPIs
  const auditTotalFreight = auditMonthBilties.reduce((sum, b) => sum + (b.freight || 0), 0);
  const auditTotalCharges = auditMonthBilties.reduce(
    (sum, b) => sum + (b.loadingCharges || 0) + (b.unloadingCharges || 0) + (b.otherCharges || 0),
    0
  );
  const auditTotalBiltyAmount = auditMonthBilties.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const auditTotalPaid = auditMonthBilties.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const auditTotalBalance = auditMonthBilties.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);
  const auditTotalGst = auditMonthBilties.reduce((sum, b) => sum + (b.serviceTaxGst || 0), 0);
  const auditCollectionEfficiency =
    auditTotalBiltyAmount > 0 ? ((auditTotalPaid / auditTotalBiltyAmount) * 100).toFixed(1) : '100.0';

  const auditTotalMemoAmount = auditMonthMemos.reduce((sum, m) => sum + (m.amount || 0), 0);
  const auditTotalAdvance = auditMonthMemos.reduce((sum, m) => sum + (m.advanceAmount || 0), 0);
  const auditTotalDiesel = auditMonthMemos.reduce((sum, m) => sum + (m.dieselAmount || 0), 0);
  const auditOperatingSurplus = auditTotalPaid - (auditTotalAdvance + auditTotalDiesel);

  // Month-End Logistical Audit KPIs
  const auditTotalWeightKg = auditMonthBilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const auditTotalPackages = auditMonthBilties.reduce((sum, b) => sum + (Number(b.packages) || 0), 0);

  // Route breakdown for audit month
  const auditRouteMap = useMemo(() => {
    const map: Record<string, { count: number; weight: number; freight: number }> = {};
    auditMonthBilties.forEach((b) => {
      const r = `${b.fromCity || 'Unknown'} -> ${b.toCity || 'Unknown'}`;
      if (!map[r]) map[r] = { count: 0, weight: 0, freight: 0 };
      map[r].count += 1;
      map[r].weight += Number(b.weight) || 0;
      map[r].freight += Number(b.totalAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].freight - a[1].freight);
  }, [auditMonthBilties]);

  // Fleet breakdown for audit month
  const auditFleetMap = useMemo(() => {
    const map: Record<string, { trips: number; weight: number; freight: number }> = {};
    auditMonthBilties.forEach((b) => {
      const v = b.vehicleNumber?.trim().toUpperCase() || 'OTHER';
      if (!map[v]) map[v] = { trips: 0, weight: 0, freight: 0 };
      map[v].trips += 1;
      map[v].weight += Number(b.weight) || 0;
      map[v].freight += Number(b.totalAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].trips - a[1].trips);
  }, [auditMonthBilties]);

  const handleExportMonthEndAuditPdf = async (targetMonthKey: string = selectedAuditMonth) => {
    try {
      setIsGeneratingAuditPdf(true);
      const closed = closedMonths.find((cm) => cm.monthKey === targetMonthKey);
      let summaries = partySummaries;
      if (targetMonthKey !== selectedAuditMonth || summaries.length === 0) {
        summaries = await db.generateMonthEndSummary(targetMonthKey);
      }

      PdfService.generateMonthEndConsolidatedAuditPdf({
        monthKey: targetMonthKey,
        settings,
        bilties,
        memos,
        parties,
        vehicles,
        medicalEntries,
        partySummaries: summaries,
        closedRecord: closed,
        currentUser,
        auditNotes: auditNotes || undefined,
      });

      await db.logAudit(
        'Month-End Audit PDF Exported',
        'Reports',
        targetMonthKey,
        undefined,
        `Consolidated financial and logistical audit dossier exported for ${targetMonthKey}`
      );

      onShowToast(`Consolidated Month-End Audit PDF generated successfully for ${targetMonthKey}`, 'success');
      setShowAuditExportModal(false);
    } catch (err: any) {
      console.error('Audit PDF Generation failed', err);
      onShowToast(err.message || 'Failed to generate Month-End Audit PDF', 'error');
    } finally {
      setIsGeneratingAuditPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (reportType === 'bilty-register') {
      const data = filteredBilties.map((b) => ({
        'Bilty #': b.biltyNumber,
        'Date': b.biltyDate,
        'Consignor': b.consignor,
        'Consignee': b.consignee,
        'Vehicle #': b.vehicleNumber,
        'From': b.fromCity,
        'To': b.toCity,
        'Material': b.material,
        'Weight': b.weight,
        'Freight': b.freight,
        'Charges': b.otherCharges,
        'Total': b.totalAmount,
        'Paid': b.paidAmount,
        'Balance': b.balanceAmount,
        'Payment Type': b.paymentType,
      }));
      ExcelService.exportToExcel(data, `Bilty_Register_${fromDate}_to_${toDate}`, 'Bilty Register');
    } else if (reportType === 'outstanding-dues') {
      const partyDueMap: Record<string, { party: string; totalDue: number; biltyCount: number }> = {};
      bilties.forEach((b) => {
        if (b.balanceAmount > 0) {
          const key = b.consignor;
          if (!partyDueMap[key]) {
            partyDueMap[key] = { party: key, totalDue: 0, biltyCount: 0 };
          }
          partyDueMap[key].totalDue += b.balanceAmount;
          partyDueMap[key].biltyCount += 1;
        }
      });
      ExcelService.exportToExcel(Object.values(partyDueMap), `Outstanding_Dues_${Date.now()}`, 'Outstanding Dues');
    } else if (reportType === 'gst-summary') {
      const data = filteredBilties.map((b) => ({
        'Bilty #': b.biltyNumber,
        'Date': b.biltyDate,
        'Consignor': b.consignor,
        'Consignee': b.consignee,
        'Taxable Amount': b.freight,
        'GST Amount': b.serviceTaxGst || 0,
        'Total Invoice': b.totalAmount,
        'GST Status': (b.serviceTaxGst || 0) > 0 ? 'Tax Paid' : 'Reverse Charge (RCM)',
      }));
      ExcelService.exportToExcel(data, `GST_Summary_${fromDate}_to_${toDate}`, 'GST Summary');
    } else if (reportType === 'medical-register') {
      const data = filteredMedical.map((m) => ({
        'Entry #': m.entryNumber,
        'Date': m.entryDate || m.date,
        'Party': m.party,
        'Item': m.medicalItem,
        'Batch #': m.batchNumber,
        'Quantity': m.quantity,
        'Amount': m.amount,
        'Transport Bilty #': m.transportBiltyNumber,
      }));
      ExcelService.exportToExcel(data, `Medical_Register_${fromDate}_to_${toDate}`, 'Medical Cargo');
    } else if (reportType === 'month-end-audit') {
      const data = partySummaries.map((s) => ({
        'Month Period': selectedAuditMonth,
        'Party / Client': s.partyName,
        'Opening Balance': s.openingBalance,
        'Consignment Entries': s.totalEntries,
        'Freight Billed': s.totalFreight,
        'Auxiliary Charges': s.totalCharges,
        'Total Gross Billed': s.totalBiltyAmount,
        'Collections Received': s.totalPaid,
        'Pending Receivables': s.totalPending,
        'Closing Balance': s.closingBalance,
        'Audit Status': s.isClosed ? 'LOCKED & AUDITED' : 'OPEN',
      }));
      ExcelService.exportToExcel(data, `MonthEnd_Consolidated_Audit_${selectedAuditMonth}`, 'Month-End Audit');
    } else if (reportType === 'audit-trail') {
      const data = filteredAudits.map((a) => ({
        'Timestamp': a.timestamp,
        'User': a.userName || a.user,
        'Action': a.action,
        'Entity': `${a.entityType || a.module} (${a.entityId || a.recordId})`,
        'Details': a.details || a.newValue || '',
      }));
      ExcelService.exportToExcel(data, `Audit_Trail_${fromDate}_to_${toDate}`, 'Audit Trail');
    } else {
      onShowToast('Export generated', 'success');
      return;
    }
    onShowToast(`Exported ${reportType} to Excel`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>FINANCIAL & OPERATIONAL REPORTS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit registers, fleet utilization, outstanding receivables, GST summaries and compliance trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportMonthEndAuditPdf(selectedAuditMonth)}
            disabled={isGeneratingAuditPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            title="Export Consolidated Month-End Financial & Logistical Audit PDF"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>{isGeneratingAuditPdf ? 'Generating PDF...' : 'Export Audit PDF'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="no-print bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'bilty-register', label: 'Bilty Register', icon: Layers },
          { id: 'month-end-audit', label: 'Month-End Audit Summary', icon: ShieldCheck, isFeatured: true },
          { id: 'outstanding-dues', label: 'Outstanding Aging', icon: AlertCircle },
          { id: 'vehicle-trips', label: 'Fleet Trips', icon: Truck },
          { id: 'gst-summary', label: 'GST Summary', icon: FileCheck },
          { id: 'medical-register', label: 'Medical Cargo', icon: Cross },
          { id: 'audit-trail', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                active
                  ? tab.isFeatured
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : tab.isFeatured
                  ? 'text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-bold border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : tab.isFeatured ? 'text-blue-700' : ''}`} />
              <span>{tab.label}</span>
              {tab.isFeatured && !active && (
                <span className="ml-1 text-[9px] px-1.5 py-0.2 bg-blue-200 text-blue-900 font-black rounded uppercase">
                  PDF
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Ribbon */}
      {reportType === 'month-end-audit' ? (
        <div className="no-print bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white p-3 rounded-xl border border-blue-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Audit Target Month:</span>
              <select
                value={selectedAuditMonth}
                onChange={(e) => setSelectedAuditMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 shadow-xs focus:ring-2 focus:ring-blue-500"
              >
                {availableMonths.map((m) => {
                  const [y, mon] = m.split('-');
                  const d = new Date(parseInt(y, 10), parseInt(mon, 10) - 1, 1);
                  const label = !isNaN(d.getTime())
                    ? d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                    : m;
                  const isClosed = closedMonths.some((cm) => cm.monthKey === m);
                  return (
                    <option key={m} value={m}>
                      {label} {isClosed ? '★ [LOCKED & AUDITED]' : '○ [OPEN]'}
                    </option>
                  );
                })}
              </select>
            </div>

            {isMonthLocked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Month Locked & Audited</span>
                {auditClosedRecord?.closedAt && (
                  <span className="text-[10px] text-emerald-700 font-normal">
                    ({new Date(auditClosedRecord.closedAt).toLocaleDateString()})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <Unlock className="w-3.5 h-3.5 text-amber-700" />
                <span>Provisional / Pre-Audit Status</span>
              </span>
            )}

            <span className="text-slate-500 text-[11px]">
              Ref: <span className="font-mono font-bold text-slate-700">AUD-{selectedAuditMonth.replace('-', '')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportMonthEndAuditPdf(selectedAuditMonth)}
              disabled={isGeneratingAuditPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingAuditPdf ? 'Generating PDF...' : 'Download Consolidated Audit PDF'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Audit Excel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 border rounded text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 border rounded text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Party:</span>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="px-2 py-1 border rounded text-slate-800 max-w-[160px]"
            >
              <option value="ALL">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Vehicle:</span>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="px-2 py-1 border rounded text-slate-800 max-w-[140px]"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNumber}>
                  {v.vehicleNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Payment:</span>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="px-2 py-1 border rounded text-slate-800"
            >
              <option value="ALL">All Types</option>
              <option value="Paid">Paid</option>
              <option value="To Pay">To Pay</option>
              <option value="T.B.B.">T.B.B.</option>
            </select>
          </div>
        </div>
      )}

      {/* Printable Report Section */}
      <div className="printable-area bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-4">
        {/* Printable Report Header */}
        <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              OFFICIAL TRANSPORT MANAGEMENT AUDIT REPORT
            </div>
            <h2 className="text-xl font-black text-slate-900">{settings.companyName}</h2>
            <p className="text-slate-600 text-xs">{settings.address}, {settings.cityState}</p>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="font-bold text-indigo-900 uppercase">
              {reportType === 'month-end-audit'
                ? 'CONSOLIDATED MONTH-END AUDIT DOSSIER'
                : reportType.replace('-', ' ').toUpperCase()}
            </div>
            <div className="text-slate-600">
              {reportType === 'month-end-audit' ? (
                <span className="font-bold text-blue-900">Month: {selectedAuditMonth}</span>
              ) : (
                `Period: ${fromDate} → ${toDate}`
              )}
            </div>
            <div className="text-[10px] text-slate-400">Generated: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* 0. CONSOLIDATED MONTH-END AUDIT REPORT */}
        {reportType === 'month-end-audit' && (
          <div className="space-y-6">
            {/* Audit Status & Action Banner */}
            <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-black tracking-wider uppercase text-sm">
                    STATUTORY AUDIT & FINANCIAL CLOSURE: {selectedAuditMonth}
                  </span>
                  {isMonthLocked ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      LOCKED
                    </span>
                  ) : (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      OPEN / PRE-CLOSURE
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                  Consolidated multi-page audit report certifying freight billings, receivables collections, outward logistics dispatch, fleet fuel & driver advances, and party closing balances.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => handleExportMonthEndAuditPdf(selectedAuditMonth)}
                  disabled={isGeneratingAuditPdf}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-black shadow-lg transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isGeneratingAuditPdf ? 'Compiling Dossier...' : 'Export Consolidated Audit PDF'}</span>
                </button>
              </div>
            </div>

            {/* Financial Performance KPI Grid */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Financial & Revenue Reconciliation ({selectedAuditMonth})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gross Freight</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {settings.currencySymbol} {auditTotalFreight.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">Total Billed</span>
                  <span className="text-base font-black text-indigo-950 font-mono">
                    {settings.currencySymbol} {auditTotalBiltyAmount.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Collections Realized</span>
                  <span className="text-base font-black text-emerald-800 font-mono">
                    {settings.currencySymbol} {auditTotalPaid.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Pending Receivables</span>
                  <span className="text-base font-black text-rose-800 font-mono">
                    {settings.currencySymbol} {auditTotalBalance.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">Collection Efficiency</span>
                  <span className="text-base font-black text-blue-900 font-mono">
                    {auditCollectionEfficiency}%
                  </span>
                </div>
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="text-[10px] text-teal-700 uppercase font-bold block">Operating Surplus</span>
                  <span className={`text-base font-black font-mono ${auditOperatingSurplus >= 0 ? 'text-teal-800' : 'text-rose-700'}`}>
                    {settings.currencySymbol} {auditOperatingSurplus.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Logistical Operations KPI Grid */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Logistics & Outward Dispatch Volume</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Consignments</span>
                  <span className="text-base font-black text-slate-900 font-mono">{auditMonthBilties.length} Bilties</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Cumulative Cargo Weight</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {(auditTotalWeightKg / 1000).toFixed(2)} MT <span className="text-xs text-slate-500">({auditTotalWeightKg.toLocaleString()} Kg)</span>
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Packages Dispatched</span>
                  <span className="text-base font-black text-slate-900 font-mono">{auditTotalPackages.toLocaleString()} Pkgs</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Outward Trips (Memos)</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {auditMonthMemos.length} Trips <span className="text-xs text-slate-500">({auditFleetMap.length} Trucks)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Corridors & Fleet Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Freight Corridors */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>Top Freight Corridors</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{auditRouteMap.length} Active Routes</span>
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-500 border-b">
                        <th className="pb-1.5 font-bold">Corridor</th>
                        <th className="pb-1.5 text-center font-bold">BTs</th>
                        <th className="pb-1.5 text-right font-bold">Weight (Kg)</th>
                        <th className="pb-1.5 text-right font-bold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditRouteMap.slice(0, 5).map(([route, data], idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 font-medium text-slate-800">{route}</td>
                          <td className="py-1.5 text-center font-mono">{data.count}</td>
                          <td className="py-1.5 text-right font-mono">{data.weight.toLocaleString()}</td>
                          <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                            {settings.currencySymbol} {data.freight.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {auditRouteMap.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No dispatch routes logged for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fleet Utilization */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fleet Vehicle Utilization</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{auditFleetMap.length} Vehicles</span>
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-500 border-b">
                        <th className="pb-1.5 font-bold">Vehicle #</th>
                        <th className="pb-1.5 text-center font-bold">Trips</th>
                        <th className="pb-1.5 text-right font-bold">Weight (Kg)</th>
                        <th className="pb-1.5 text-right font-bold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditFleetMap.slice(0, 5).map(([veh, data], idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 font-mono font-bold text-slate-800">{veh}</td>
                          <td className="py-1.5 text-center font-mono">{data.trips}</td>
                          <td className="py-1.5 text-right font-mono">{data.weight.toLocaleString()}</td>
                          <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                            {settings.currencySymbol} {data.freight.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {auditFleetMap.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No fleet trips recorded for this month
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Consolidated Party Ledger & Receivables Reconciliation */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 p-3 flex flex-wrap items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                    Party-Wise Financial Ledger & Receivables Reconciliation ({partySummaries.length} Parties)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Audit Ref: AUD-{selectedAuditMonth.replace('-', '')}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b text-[11px]">
                      <th className="p-2.5">Party / Client</th>
                      <th className="p-2.5 text-right">Opening Bal</th>
                      <th className="p-2.5 text-center">Entries</th>
                      <th className="p-2.5 text-right">Freight</th>
                      <th className="p-2.5 text-right">Charges</th>
                      <th className="p-2.5 text-right">Gross Total</th>
                      <th className="p-2.5 text-right">Collections</th>
                      <th className="p-2.5 text-right">Pending Due</th>
                      <th className="p-2.5 text-right">Closing Bal</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partySummaries.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 font-mono text-[11px]">
                        <td className="p-2.5 font-sans font-bold text-slate-900">{s.partyName}</td>
                        <td className="p-2.5 text-right text-slate-600">
                          {settings.currencySymbol} {s.openingBalance.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-bold text-[10px]">
                            {s.totalEntries}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">{settings.currencySymbol} {s.totalFreight.toLocaleString()}</td>
                        <td className="p-2.5 text-right">{settings.currencySymbol} {s.totalCharges.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-indigo-900">
                          {settings.currencySymbol} {s.totalBiltyAmount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-emerald-700 font-bold">
                          {settings.currencySymbol} {s.totalPaid.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-rose-700 font-bold">
                          {settings.currencySymbol} {s.totalPending.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          {settings.currencySymbol} {s.closingBalance.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.isClosed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.isClosed ? 'Audited' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {partySummaries.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          No party ledger summaries found for {selectedAuditMonth}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {partySummaries.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold font-mono text-[11px] text-slate-900 border-t-2 border-slate-300">
                        <td className="p-2.5 font-sans font-black uppercase">Consolidated Total</td>
                        <td className="p-2.5 text-right">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.openingBalance, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          {partySummaries.reduce((sum, s) => sum + s.totalEntries, 0)}
                        </td>
                        <td className="p-2.5 text-right">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.totalFreight, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.totalCharges, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-indigo-900 font-black">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.totalBiltyAmount, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-emerald-800 font-black">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.totalPaid, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-rose-800 font-black">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.totalPending, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-950">
                          {settings.currencySymbol}{' '}
                          {partySummaries.reduce((sum, s) => sum + s.closingBalance, 0).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center font-sans text-[10px] text-slate-500">100% RECONCILED</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Outward Dispatch Manifest Table */}
            {auditMonthMemos.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 p-3 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-700" />
                    <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                      Outward Dispatch Manifest ({auditMonthMemos.length} Trips)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total Advance: {settings.currencySymbol} {auditTotalAdvance.toLocaleString()} | Diesel:{' '}
                    {settings.currencySymbol} {auditTotalDiesel.toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b text-[11px]">
                        <th className="p-2">Memo #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Vehicle #</th>
                        <th className="p-2">Driver</th>
                        <th className="p-2">Route</th>
                        <th className="p-2 text-right">Freight Rate</th>
                        <th className="p-2 text-right">Advance</th>
                        <th className="p-2 text-right">Diesel</th>
                        <th className="p-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {auditMonthMemos.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{m.memoNumber}</td>
                          <td className="p-2 text-slate-600">{m.memoDate}</td>
                          <td className="p-2 font-bold text-blue-900">{m.vehicleNumber}</td>
                          <td className="p-2 font-sans text-slate-700">{m.driver || '-'}</td>
                          <td className="p-2 font-sans text-slate-700">
                            {m.fromCity} &rarr; {m.toCity}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {settings.currencySymbol} {m.amount.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-rose-700">
                            {settings.currencySymbol} {(m.advanceAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-amber-700">
                            {settings.currencySymbol} {(m.dieselAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {settings.currencySymbol} {(m.balanceAmount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audit Attestation & Notes Editor */}
            <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Auditor Attestation & Regulatory Endorsement</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Standard Statutory Compliance Section (Certified in Export PDF)
                </span>
              </div>

              <div className="space-y-1.5 no-print">
                <label className="text-[11px] font-bold text-slate-700">
                  Custom Auditor Remarks / Notes (included on Page 3 of the Consolidated Audit PDF):
                </label>
                <textarea
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="Enter audit observations, tax reconciliation notes, or internal compliance remarks (optional)..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Signatory Preview Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Logistics Operations In-Charge</div>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-xs italic text-slate-400">
                    Signature / Seal
                  </div>
                  <div className="text-[10px] text-slate-600">Dispatches & Fleet Verified</div>
                </div>

                <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Chief Financial Officer / Accounts</div>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-xs italic text-slate-400">
                    Signature / Seal
                  </div>
                  <div className="text-[10px] text-slate-600">Ledgers & Collections Certified</div>
                </div>

                <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Statutory Auditor / Managing Director</div>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-xs italic text-slate-400">
                    Signature / Seal
                  </div>
                  <div className="text-[10px] text-slate-600">Final Attestation & Filing</div>
                </div>
              </div>

              <div className="no-print pt-2 flex justify-end">
                <button
                  onClick={() => handleExportMonthEndAuditPdf(selectedAuditMonth)}
                  disabled={isGeneratingAuditPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingAuditPdf ? 'Compiling PDF...' : 'Download Official 3-Page Audit PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. BILTY REGISTER REPORT */}
        {reportType === 'bilty-register' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 border rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Consignments</span>
                <span className="text-lg font-black text-slate-900 font-mono">{filteredBilties.length}</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-800 uppercase font-bold block">Total Freight Amount</span>
                <span className="text-lg font-black text-blue-900 font-mono">
                  {settings.currencySymbol} {totalBiltyAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Paid Advance</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {settings.currencySymbol} {totalPaid.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[10px] text-rose-800 uppercase font-bold block">Pending Receivables</span>
                <span className="text-lg font-black text-rose-700 font-mono">
                  {settings.currencySymbol} {totalBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2">Bilty #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Consignor</th>
                    <th className="p-2">Consignee</th>
                    <th className="p-2">Vehicle</th>
                    <th className="p-2">Route</th>
                    <th className="p-2 text-right">Freight</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Balance</th>
                    <th className="p-2 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBilties.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        No Bilty records found for this criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBilties.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-blue-700">{b.biltyNumber}</td>
                        <td className="p-2 font-mono text-slate-600">{b.biltyDate}</td>
                        <td className="p-2 font-medium text-slate-900">{b.consignor}</td>
                        <td className="p-2 font-medium text-slate-800">{b.consignee}</td>
                        <td className="p-2 font-mono font-bold text-slate-700">{b.vehicleNumber}</td>
                        <td className="p-2 text-slate-600">{b.fromCity} &rarr; {b.toCity}</td>
                        <td className="p-2 text-right font-mono">{settings.currencySymbol} {b.freight.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {settings.currencySymbol} {b.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-700">
                          {settings.currencySymbol} {b.paidAmount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-rose-700">
                          {settings.currencySymbol} {b.balanceAmount.toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-semibold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border">
                            {b.paymentType}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. OUTSTANDING DUES REPORT */}
        {reportType === 'outstanding-dues' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2.5">Party / Client</th>
                    <th className="p-2.5">Pending Bilties Count</th>
                    <th className="p-2.5 text-right">Total Outstanding Balance</th>
                    <th className="p-2.5 text-center">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(
                    bilties.reduce((acc, b) => {
                      if (b.balanceAmount > 0) {
                        if (!acc[b.consignor]) acc[b.consignor] = { count: 0, balance: 0 };
                        acc[b.consignor].count += 1;
                        acc[b.consignor].balance += b.balanceAmount;
                      }
                      return acc;
                    }, {} as Record<string, { count: number; balance: number }>)
                  ).map(([party, stat]) => (
                    <tr key={party} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{party}</td>
                      <td className="p-2.5 font-mono text-slate-700">{stat.count} Pending Consignments</td>
                      <td className="p-2.5 text-right font-mono font-black text-rose-700 text-sm">
                        {settings.currencySymbol} {stat.balance.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stat.balance > 50000 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {stat.balance > 50000 ? 'High Due' : 'Standard'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. GST SUMMARY REPORT */}
        {reportType === 'gst-summary' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2.5">Bilty #</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Party</th>
                    <th className="p-2.5 text-right">Taxable Freight</th>
                    <th className="p-2.5 text-right">GST Collected</th>
                    <th className="p-2.5 text-right">Total Invoice Value</th>
                    <th className="p-2.5 text-center">Tax Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBilties.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-blue-700">{b.biltyNumber}</td>
                      <td className="p-2.5 font-mono text-slate-600">{b.biltyDate}</td>
                      <td className="p-2.5 font-bold text-slate-900">{b.consignor}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        {settings.currencySymbol} {b.freight.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                        {settings.currencySymbol} {(b.serviceTaxGst || 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">
                        {settings.currencySymbol} {b.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border">
                          {(b.serviceTaxGst || 0) > 0 ? 'Forward Charge (GST)' : 'Reverse Charge (RCM)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. FLEET TRIPS REPORT */}
        {reportType === 'vehicle-trips' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2.5">Vehicle #</th>
                    <th className="p-2.5">Total Trips Handled</th>
                    <th className="p-2.5 text-right">Total Freight Generated</th>
                    <th className="p-2.5 text-right">Total Weight Loaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => {
                    const vehicleBilties = bilties.filter((b) => b.vehicleNumber === v.vehicleNumber);
                    const totalAmt = vehicleBilties.reduce((acc, b) => acc + b.totalAmount, 0);
                    const totalWt = vehicleBilties.reduce((acc, b) => acc + b.weight, 0);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-700">{v.vehicleNumber}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{vehicleBilties.length} trips</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {settings.currencySymbol} {totalAmt.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">{totalWt.toLocaleString()} kg</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. MEDICAL CARGO REPORT */}
        {reportType === 'medical-register' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2.5">Entry #</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Party / Hospital</th>
                    <th className="p-2.5">Medical Item</th>
                    <th className="p-2.5">Batch #</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedical.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-teal-700">{m.entryNumber}</td>
                      <td className="p-2.5 font-mono text-slate-600">{m.entryDate || m.date}</td>
                      <td className="p-2.5 font-bold text-slate-900">{m.party}</td>
                      <td className="p-2.5 text-slate-800">{m.medicalItem}</td>
                      <td className="p-2.5 font-mono font-bold text-teal-800">{m.batchNumber}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{m.quantity}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {settings.currencySymbol} {m.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. AUDIT TRAIL REPORT */}
        {reportType === 'audit-trail' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Operator</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Entity</th>
                    <th className="p-2.5">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAudits.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 font-mono text-[11px]">
                      <td className="p-2 text-slate-500">{new Date(a.timestamp).toLocaleString()}</td>
                      <td className="p-2 font-bold text-slate-900">{a.userName || a.user}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          a.action === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {a.action}
                        </span>
                      </td>
                      <td className="p-2 text-slate-700">{a.entityType || a.module} ({a.entityId || a.recordId})</td>
                      <td className="p-2 text-slate-600 font-sans">{a.details || a.newValue || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
