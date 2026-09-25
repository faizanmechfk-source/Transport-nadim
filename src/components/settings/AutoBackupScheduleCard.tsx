import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Database,
  CheckCircle2,
  AlertCircle,
  Play,
  Save,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  FileCheck2,
  Check
} from 'lucide-react';
import { AutoBackupConfig, AutoBackupSnapshot, BackupInterval, CompanySettings, DayOfWeek } from '../../types';
import { db } from '../../database/db';
import { AutoBackupScheduler } from '../../services/autoBackupScheduler';

interface AutoBackupScheduleCardProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
];

const TIME_PRESETS = [
  { time: '18:00', label: '6:00 PM (Closing)' },
  { time: '20:00', label: '8:00 PM (Evening)' },
  { time: '21:00', label: '9:00 PM (Night)' },
  { time: '23:30', label: '11:30 PM (Midnight)' },
];

export const AutoBackupScheduleCard: React.FC<AutoBackupScheduleCardProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
  onRequestConfirm,
}) => {
  const currentConfig: AutoBackupConfig = settings.autoBackupConfig || {
    enabled: true,
    interval: 'daily',
    time: '21:00',
    dayOfWeek: 'sunday',
    autoDownload: false,
    maxRetentionCount: 10,
    lastBackupAt: undefined,
    lastBackupStatus: undefined,
  };

  const [config, setConfig] = useState<AutoBackupConfig>(currentConfig);
  const [snapshots, setSnapshots] = useState<AutoBackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);

  useEffect(() => {
    if (settings.autoBackupConfig) {
      setConfig(settings.autoBackupConfig);
    }
  }, [settings.autoBackupConfig]);

  const loadSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const list = await db.getAutoBackupSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const updated = await db.updateAutoBackupConfig(config);
      onUpdateSettings({
        ...settings,
        autoBackupConfig: updated,
      });
      onShowToast(
        `Auto-backup schedule updated: ${updated.enabled ? `${updated.interval.toUpperCase()} at ${updated.time}` : 'Disabled'}`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Failed to save auto-backup configuration: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      const { snapshot, dumpJson } = await db.executeScheduledBackup('manual', 'Manual instant backup trigger');
      
      // Update UI settings state
      const freshSettings = await db.getSettings();
      onUpdateSettings(freshSettings);
      if (freshSettings.autoBackupConfig) {
        setConfig(freshSettings.autoBackupConfig);
      }

      await loadSnapshots();

      // If user enabled auto-download or requested test
      if (config.autoDownload) {
        const blob = new Blob([dumpJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().substring(0, 10);
        a.href = url;
        a.download = `TransportEntry_AutoBackup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      onShowToast(
        `Backup snapshot created! ${snapshot.biltyCount} Bilties, ${snapshot.memoCount} Memos (${snapshot.fileSizeKb} KB)`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Instant backup failed: ' + err.message, 'error');
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleDownloadSnapshot = (snap: AutoBackupSnapshot) => {
    try {
      if (!snap.dataJson) {
        onShowToast('Snapshot payload is empty.', 'error');
        return;
      }
      const blob = new Blob([snap.dataJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const datePart = snap.timestamp.substring(0, 10);
      a.href = url;
      a.download = `TransportEntry_Snapshot_${datePart}_${snap.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Snapshot downloaded to your device', 'success');
    } catch (err: any) {
      onShowToast('Download failed: ' + err.message, 'error');
    }
  };

  const handleRestoreSnapshot = (snap: AutoBackupSnapshot) => {
    if (!snap.dataJson) {
      onShowToast('Snapshot contains only metadata and cannot be restored directly.', 'error');
      return;
    }

    const dateStr = new Date(snap.timestamp).toLocaleString();
    onRequestConfirm(
      `Restore Snapshot from ${dateStr}?`,
      `This will restore the database to the state captured on ${dateStr} (${snap.biltyCount} bilties, ${snap.memoCount} memos). Current records will be replaced. Continue?`,
      async () => {
        try {
          const success = await db.restoreCompleteBackup(snap.dataJson);
          if (success) {
            onShowToast('Database restored from snapshot successfully! Reloading...', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          } else {
            onShowToast('Failed to restore snapshot: Invalid format', 'error');
          }
        } catch (err: any) {
          onShowToast('Restore failed: ' + err.message, 'error');
        }
      },
      true
    );
  };

  const handleDeleteSnapshot = (snapId: string) => {
    onRequestConfirm(
      'Delete Backup Snapshot?',
      'This will remove this saved backup snapshot from internal storage.',
      async () => {
        await db.deleteAutoBackupSnapshot(snapId);
        onShowToast('Snapshot deleted', 'info');
        loadSnapshots();
      },
      true
    );
  };

  const scheduledInfo = AutoBackupScheduler.getNextScheduledInfo(config);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5">
      {/* Header with Title and Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Automated Data Protection
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  config.enabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {config.enabled ? 'Active Scheduler' : 'Disabled'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Automatic Database Backup Scheduler</span>
              <span className="text-xs font-normal text-slate-500 hidden md:inline">
                (स्वचालित डेटाबेस बैकअप)
              </span>
            </h2>
          </div>
        </div>

        {/* Quick Run Test Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunNow}
            disabled={isRunningNow}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Create an immediate backup snapshot right now"
          >
            {isRunningNow ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />
            )}
            <span>{isRunningNow ? 'Backing Up...' : 'Run Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Schedule Settings Form (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Master Enable/Disable Switch Card */}
          <div
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
              config.enabled
                ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 opacity-90'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                  config.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Enable Auto-Scheduled Backups</span>
                  {config.enabled && (
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                      ON
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Automatically snapshot and archive all Bilties, Memos, Medical batches, and Party ledgers in the background.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                config.enabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Interval Choice: Daily vs Weekly */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Backup Frequency Interval (बैकअप अंतराल)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Daily Option */}
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, interval: 'daily' }))}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.interval === 'daily'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>Daily Interval</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                      Recommended
                    </span>
                  </span>
                  {config.interval === 'daily' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Takes an automatic snapshot every single day at your configured closing or shift time.
                </p>
              </button>

              {/* Weekly Option */}
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, interval: 'weekly' }))}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.interval === 'weekly'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>Weekly Interval</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                      Haftawar
                    </span>
                  </span>
                  {config.interval === 'weekly' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Takes an automatic snapshot once per week on your designated office closing day (e.g. Sunday).
                </p>
              </button>
            </div>
          </div>

          {/* Time of Day & Presets */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Scheduled Time of Day (24-Hour Format)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Select when the daily or weekly background backup should run.
                </p>
              </div>

              {/* Time Input */}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig((prev) => ({ ...prev, time: e.target.value }))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Presets:</span>
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, time: p.time }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    config.time === p.time
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week Selector (Shown if Weekly is selected) */}
          {config.interval === 'weekly' && (
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Day of the Week for Weekly Backup (हफ्ते का दिन)</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAYS.map((d) => {
                  const isSelected = (config.dayOfWeek || 'sunday') === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, dayOfWeek: d.key }))}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-indigo-100 border border-indigo-100 font-medium'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider">{d.short}</div>
                      <div className="text-[9px] opacity-80 hidden sm:block">{d.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Options: Auto Download & Retention */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Auto Download to Disk Toggle */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Auto-Download JSON to Disk</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Also saves file to device Downloads
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.autoDownload}
                onChange={(e) => setConfig((prev) => ({ ...prev, autoDownload: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Retention Count */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Keep Local Snapshots</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Older snapshots automatically roll over
                </div>
              </div>
              <select
                value={config.maxRetentionCount || 10}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, maxRetentionCount: parseInt(e.target.value, 10) || 10 }))
                }
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-700"
              >
                <option value={5}>Last 5 snapshots</option>
                <option value={10}>Last 10 snapshots</option>
                <option value={15}>Last 15 snapshots</option>
              </select>
            </div>
          </div>

          {/* Save Settings CTA */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Settings apply immediately to the background scheduler.</span>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Schedule Settings'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Status Card & Protection Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Status Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl border border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Scheduler Live Status
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">Current Schedule:</div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {config.enabled
                      ? `${config.interval === 'daily' ? 'Daily' : 'Weekly (' + (config.dayOfWeek || 'Sun') + ')'} at ${config.time}`
                      : 'Disabled'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400">Next Scheduled Trigger:</div>
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{scheduledInfo.text}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400">Last Executed Backup:</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {config.lastBackupAt ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{new Date(config.lastBackupAt).toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No automated backup run yet</span>
                  )}
                </div>
                {config.lastBackupSummary && (
                  <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
                    {config.lastBackupSummary}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/80 text-[10px] text-slate-400 leading-relaxed">
              Auto-backups preserve all consignment bills, dispatches, medical supplies, and party balances safely in browser local snapshots and disk export.
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <span>How Auto-Backup Works</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 leading-normal">
              <li>Monitors your set interval (Daily or Weekly) in the background.</li>
              <li>Saves high-integrity database snapshots with 0 downtime.</li>
              <li>You can 1-click restore or download any snapshot anytime below.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Snapshots History Table */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Saved Auto-Backup Snapshots ({snapshots.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              (Latest snapshots available for instant 1-click recovery)
            </span>
          </div>

          <button
            type="button"
            onClick={loadSnapshots}
            disabled={loadingSnapshots}
            className="p-1 text-slate-500 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-50 text-[11px] flex items-center gap-1"
            title="Refresh Snapshots List"
          >
            <RefreshCw className={`w-3 h-3 ${loadingSnapshots ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {snapshots.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            <Clock className="w-7 h-7 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-600">No backup snapshots recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Run Backup Now&quot; above to create your first scheduled snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-2.5">Date & Time</th>
                  <th className="p-2.5">Trigger Interval</th>
                  <th className="p-2.5">Bilties & Memos</th>
                  <th className="p-2.5">Parties</th>
                  <th className="p-2.5">File Size</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-mono text-[11px] text-slate-900 font-semibold whitespace-nowrap">
                      {new Date(snap.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          snap.triggerType === 'manual'
                            ? 'bg-amber-100 text-amber-800'
                            : snap.interval === 'weekly'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {snap.triggerType === 'manual' ? 'Manual Test' : `${snap.interval} Auto`}
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-slate-700">
                      <span className="font-semibold text-blue-700">{snap.biltyCount}</span> Bilties,{' '}
                      <span className="font-semibold text-sky-700">{snap.memoCount}</span> Memos
                    </td>
                    <td className="p-2.5 text-slate-600 font-medium">
                      {snap.partyCount} Parties
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                      {snap.fileSizeKb} KB
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadSnapshot(snap)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Download JSON Dump"
                        >
                          <Download className="w-3 h-3 text-slate-600" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Restore Database to this Snapshot"
                        >
                          <RotateCcw className="w-3 h-3 text-blue-600" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete Snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
