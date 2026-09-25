import React, { useState, useEffect } from 'react';
import {
  FileText,
  GitCompare,
  ScrollText,
  Cross,
  CheckSquare,
  CalendarCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Truck,
  Users,
  ShieldCheck,
  Printer,
  FileSpreadsheet,
  Download,
  Clock,
  MapPin,
  ArrowLeftRight,
  Navigation,
  Sparkles
} from 'lucide-react';
import { Bilty, CompanySettings, MatchEntry, MedicalEntry, MedicalMatchEntry, Memo, Party, UserSession, ViewType } from '../../types';
import { db } from '../../database/db';
import { NavItemKey } from '../common/Sidebar';
import { PdfService } from '../../services/pdfService';
import { ExcelService } from '../../services/excelService';
import { DailyOperationalVolumeSummary } from './DailyOperationalVolumeSummary';
import { CityWiseSelectionHub } from './CityWiseSelectionHub';

interface DashboardViewProps {
  onNavigate: (view: any, recordId?: string, payload?: any) => void;
  currentUser: UserSession;
  settings: CompanySettings;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  currentUser,
  settings,
  onShowToast,
}) => {
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [medicalEntries, setMedicalEntries] = useState<MedicalEntry[]>([]);
  const [matchEntries, setMatchEntries] = useState<MatchEntry[]>([]);
  const [medicalMatches, setMedicalMatches] = useState<MedicalMatchEntry[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [b, m, med, mtc, medMtc, p] = await Promise.all([
      db.getBilties(),
      db.getMemos(),
      db.getMedicalEntries(),
      db.getMatchEntries(),
      db.getMedicalMatchEntries(),
      db.getParties(),
    ]);

    setBilties(b);
    setMemos(m);
    setMedicalEntries(med);
    setMatchEntries(mtc);
    setMedicalMatches(medMtc);
    setParties(p);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute real metrics
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthKey = todayStr.substring(0, 7);

  const todayBilties = bilties.filter((b) => b.biltyDate === todayStr || b.biltyDate === localTodayStr);
  const todayBiltiesWeight = todayBilties.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const todayMemos = memos.filter((m) => m.memoDate === todayStr || m.memoDate === localTodayStr);

  const pendingMatchups = matchEntries.filter((m) => !m.isVerified && m.status !== 'Matched');
  const pendingMedicalMatches = medicalMatches.filter((m) => !m.isVerified && m.status !== 'Matched');

  const currentMonthBilties = bilties.filter((b) => b.biltyDate.startsWith(currentMonthKey));
  const currentMonthTotalAmount = currentMonthBilties.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  const totalOutstanding = bilties.reduce((acc, b) => acc + (b.balanceAmount || 0), 0) +
    parties.reduce((acc, p) => acc + (p.openingBalance || 0), 0);

  const mainModules = [
    {
      id: 'bilty' as NavItemKey,
      title: 'BILTY ENTRY',
      icon: Truck,
      color: 'from-blue-600 to-blue-700',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Lorry receipts, consignor & consignee booking, freight calculations and print.',
      count: bilties.length,
      countLabel: 'Total Bilties',
      actionLabel: 'New Bilty',
      onAction: () => onNavigate('bilty'),
    },
    {
      id: 'matchup' as NavItemKey,
      title: 'ENTRIES MATCH-UP',
      icon: GitCompare,
      color: 'from-indigo-600 to-indigo-700',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Reconcile booking office entries with transporter delivery sheets & detect differences.',
      count: pendingMatchups.length,
      countLabel: 'Discrepancies',
      actionLabel: 'Reconcile',
      onAction: () => onNavigate('matchup'),
    },
    {
      id: 'memo' as NavItemKey,
      title: 'MEMO (DISPATCH)',
      icon: ScrollText,
      color: 'from-sky-600 to-sky-700',
      tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
      description: 'City-wise dispatch challans, vehicle loading memos and multi-bilty consolidation.',
      count: memos.length,
      countLabel: 'Total Memos',
      actionLabel: 'Create Memo (Alt+M)',
      onAction: () => onNavigate('memo', 'new'),
    },
    {
      id: 'medical' as NavItemKey,
      title: 'MEDICAL ENTRIES',
      icon: Cross,
      color: 'from-teal-600 to-teal-700',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Healthcare & pharmaceutical cargo register, batch tracking, patient references.',
      count: medicalEntries.length,
      countLabel: 'Medical Records',
      actionLabel: 'New Entry',
      onAction: () => onNavigate('medical'),
    },
    {
      id: 'medicalMatchup' as NavItemKey,
      title: 'MEDICAL MATCH-UP',
      icon: CheckSquare,
      color: 'from-emerald-600 to-emerald-700',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Compare pharma dispatch with hospital pharmacy receiving & verify batch/quantity.',
      count: pendingMedicalMatches.length,
      countLabel: 'Pending Checks',
      actionLabel: 'Verify Batch',
      onAction: () => onNavigate('medicalMatchup'),
    },
    {
      id: 'monthEnd' as NavItemKey,
      title: 'MONTH END PARTIES',
      icon: CalendarCheck,
      color: 'from-amber-600 to-amber-700',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Generate monthly party statements, outstanding ledger, closing & protect audit.',
      count: parties.length,
      countLabel: 'Active Parties',
      actionLabel: 'View Statement',
      onAction: () => onNavigate('monthEnd'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-white/5 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-700/60 px-3 py-1 rounded-full text-xs font-semibold text-blue-200 mb-2 border border-blue-600/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{settings.companyName}</span>
              <span className="text-blue-400">&bull;</span>
              <span>{settings.cityState}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              TRANSPORT ENTRY
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl font-normal">
              Unified operating system for transport booking, lorry receipt bilties, delivery match-up, pharma consignments, and party billing statements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Desktop Shortcut: Create Memo */}
            <button
              onClick={() => onNavigate('memo', 'new')}
              className="flex items-center gap-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs shadow-md transition-colors"
              title="Desktop Shortcut: Create Memo (Alt+M / Ctrl+Shift+M)"
            >
              <ScrollText className="w-4 h-4 text-slate-950" />
              <span>Create Memo</span>
              <kbd className="bg-sky-600/30 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-mono border border-sky-600/40 hidden sm:inline">
                Alt+M
              </kbd>
            </button>
            <button
              onClick={() => onNavigate('bilty')}
              className="flex items-center gap-1.5 bg-white text-blue-900 hover:bg-blue-50 font-bold px-3.5 py-2 rounded-lg text-xs shadow transition-colors"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Create Bilty</span>
            </button>
            <button
              onClick={() => onNavigate('matchup')}
              className="flex items-center gap-1.5 bg-blue-700/80 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg text-xs border border-blue-600 transition-colors"
            >
              <GitCompare className="w-4 h-4 text-blue-300" />
              <span>Match-Up</span>
            </button>
            <button
              onClick={() => onNavigate('monthEnd')}
              className="flex items-center gap-1.5 bg-blue-700/80 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg text-xs border border-blue-600 transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-amber-300" />
              <span>Month End</span>
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S OPERATIONAL VOLUME SUMMARY (TOTAL WEIGHT & COUNT HERO) */}
      <DailyOperationalVolumeSummary
        bilties={bilties}
        settings={settings}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* REAL DASHBOARD STATISTICS (No fake data) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Real-Time Operating Metrics
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Date: {todayStr}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Today's Bilty & Weight */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Today's Bilty & Weight</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {todayBilties.length}
              </span>
              <span className="text-xs font-bold text-blue-700 font-mono">
                {todayBiltiesWeight.toLocaleString()} Kg
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              All time: <span className="font-semibold text-slate-700">{bilties.length} bilties</span>
            </div>
          </div>

          {/* Card 2: Today's Memo */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Today's Memo</span>
              <ScrollText className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {todayMemos.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total created: <span className="font-semibold text-slate-700">{memos.length} memos</span>
            </div>
          </div>

          {/* Card 3: Medical Entries */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Medical Entries</span>
              <Cross className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {medicalEntries.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pharma & Healthcare cargo
            </div>
          </div>

          {/* Card 4: Pending Match-Up */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Pending Match-Up</span>
              <AlertCircle className={`w-4 h-4 ${pendingMatchups.length > 0 ? 'text-amber-600' : 'text-emerald-500'}`} />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {pendingMatchups.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {pendingMatchups.length === 0 ? 'All entries reconciled' : 'Discrepancies to resolve'}
            </div>
          </div>

          {/* Card 5: Medical Pending Match-Up */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Med. Pending Match-Up</span>
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {pendingMedicalMatches.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {pendingMedicalMatches.length === 0 ? 'All batches reconciled' : 'Pending batch checks'}
            </div>
          </div>

          {/* Card 6: Total Parties */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Total Parties</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {parties.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Consignors & Consignees
            </div>
          </div>

          {/* Card 7: Current Month Amount */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>This Month Freight</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {settings.currencySymbol} {currentMonthTotalAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Month: <span className="font-semibold text-slate-700">{currentMonthKey}</span>
            </div>
          </div>

          {/* Card 8: Outstanding Amount */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Total Outstanding</span>
              <CalendarCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-700 font-mono">
              {settings.currencySymbol} {totalOutstanding.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pending party dues
            </div>
          </div>
        </div>
      </div>

      {/* CITY-WISE SELECTION & OPERATIONAL COMMAND HUB (SHORTCUTS + DESKTOP SELECTION + QUICK ROUTES) */}
      <CityWiseSelectionHub
        bilties={bilties}
        memos={memos}
        settings={settings}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* 6 MAIN DASHBOARD MODULE CARDS (Required by prompt) */}
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
          Core Transport Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {mod.title}
                        </h3>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${mod.tagColor}`}>
                          {mod.count} {mod.countLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed min-h-[36px]">
                    {mod.description}
                  </p>
                </div>

                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onNavigate(mod.id)}
                    className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={mod.onAction}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                  >
                    {mod.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE WITH REAL DATA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Bilty Bookings</h3>
            <span className="text-xs text-slate-500 font-normal">({bilties.length} Total)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('bilty')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>View All Bilty Entries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Bilty #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Consignor</th>
                <th className="py-2.5 px-3">Consignee</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3 text-right">Freight</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bilties.slice(0, 5).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-blue-700 font-mono">{b.biltyNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{b.biltyDate}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{b.consignor}</td>
                  <td className="py-2.5 px-3 text-slate-700">{b.consignee}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">{b.fromCity} &rarr; {b.toCity}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{b.vehicleNumber}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {settings.currencySymbol} {b.totalAmount.toLocaleString()}
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
                        onClick={() => PdfService.generateBiltyPdf(b, settings)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                        title="Download PDF Bilty"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNavigate('bilty', b.id)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                        title="View / Edit Bilty"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
