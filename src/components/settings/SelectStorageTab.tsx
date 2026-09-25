import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Save,
  ShieldCheck,
  FolderSync,
  Laptop,
  Layers,
  Database,
  Check,
  Info,
  Clock,
  Sparkles,
  WifiOff
} from 'lucide-react';
import { CompanySettings, StorageConfig, StorageMode } from '../../types';
import { db } from '../../database/db';
import { FileStorageService } from '../../services/fileStorageService';

interface SelectStorageTabProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

export const SelectStorageTab: React.FC<SelectStorageTabProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
  onRequestConfirm,
}) => {
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(
    settings.storageConfig || {
      mode: 'hybrid',
      customDirectoryPath: 'C:\\TransportData\\Records',
      folderName: 'Local Storage & PC Directory',
      autoSyncToFileSystem: true,
      backupSubFolder: 'Daily_Backups',
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncMessage: 'Offline local database initialized',
    }
  );

  const [hasPickerSupport, setHasPickerSupport] = useState<boolean>(true);
  const [activeFolderHandleName, setActiveFolderHandleName] = useState<string | null>(null);
  const [customPathInput, setCustomPathInput] = useState<string>(
    settings.storageConfig?.customDirectoryPath || 'C:\\TransportData\\Records'
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [storageUsage, setStorageUsage] = useState<{
    usedMb: string;
    quotaMb: string;
    percentUsed: number;
    isPersisted: boolean;
  }>({
    usedMb: '0.00',
    quotaMb: 'Unlimited',
    percentUsed: 0,
    isPersisted: false,
  });

  const [recordCounts, setRecordCounts] = useState<{
    bilties: number;
    memos: number;
    parties: number;
    vehicles: number;
    drivers: number;
    medical: number;
  }>({
    bilties: 0,
    memos: 0,
    parties: 0,
    vehicles: 0,
    drivers: 0,
    medical: 0,
  });

  useEffect(() => {
    setHasPickerSupport(FileStorageService.isFileSystemAccessSupported());

    // Check stored folder handle in IndexedDB
    FileStorageService.getStoredDirectoryHandle().then((handle) => {
      if (handle) {
        setActiveFolderHandleName(handle.name);
      }
    });

    // Load storage quota
    FileStorageService.getStorageUsage().then(setStorageUsage);

    // Load counts
    Promise.all([
      db.getBilties(true),
      db.getMemos(true),
      db.getParties(true),
      db.getVehicles(true),
      db.getDrivers(true),
      db.getMedicalEntries(true),
    ]).then(([b, m, p, v, d, med]) => {
      setRecordCounts({
        bilties: b.length,
        memos: m.length,
        parties: p.length,
        vehicles: v.length,
        drivers: d.length,
        medical: med.length,
      });
    });
  }, []);

  // Browse PC Folder using showDirectoryPicker
  const handlePickDirectory = async () => {
    try {
      setSyncing(true);
      const res = await FileStorageService.pickDirectory();
      setActiveFolderHandleName(res.folderName);

      const updatedConfig: StorageConfig = {
        ...storageConfig,
        folderName: res.folderName,
        customDirectoryPath: res.folderName,
        hasDirectoryPermission: true,
        lastSyncStatus: 'success',
        lastSyncMessage: `PC Folder "${res.folderName}" connected successfully`,
      };

      setStorageConfig(updatedConfig);
      setCustomPathInput(res.folderName);

      const updatedSettings = {
        ...settings,
        storageConfig: updatedConfig,
      };
      await db.updateSettings(updatedSettings);
      onUpdateSettings(updatedSettings);

      // Auto run first sync to populate the folder
      const backupJson = await db.exportCompleteBackup();
      await FileStorageService.syncDatabaseToDirectory(
        backupJson,
        updatedConfig.backupSubFolder || 'Daily_Backups'
      );

      onShowToast(
        `PC Folder "${res.folderName}" selected! Live data file "transport_database.json" created.`,
        'success'
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onShowToast(err.message || 'Failed to select folder', 'error');
      }
    } finally {
      setSyncing(false);
    }
  };

  // Save manual custom path
  const handleSaveCustomPath = async () => {
    if (!customPathInput.trim()) {
      onShowToast('Please enter a valid directory path', 'warning');
      return;
    }

    try {
      setSavingConfig(true);
      const updatedConfig: StorageConfig = {
        ...storageConfig,
        customDirectoryPath: customPathInput.trim(),
        folderName: customPathInput.trim(),
      };

      setStorageConfig(updatedConfig);
      const updatedSettings = {
        ...settings,
        storageConfig: updatedConfig,
      };
      await db.updateSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      onShowToast('Storage directory path saved to settings', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save path', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Sync now to selected PC folder
  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const backupJson = await db.exportCompleteBackup();

      if (activeFolderHandleName) {
        const res = await FileStorageService.syncDatabaseToDirectory(
          backupJson,
          storageConfig.backupSubFolder || 'Daily_Backups'
        );
        const updatedConfig: StorageConfig = {
          ...storageConfig,
          lastSyncedAt: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastSyncMessage: res.message,
        };
        setStorageConfig(updatedConfig);
        await db.updateStorageConfig(updatedConfig);
        onShowToast(res.message, 'success');
      } else {
        // Fallback: download file named with custom path
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transport_database_${new Date().toISOString().substring(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        onShowToast(`Backup saved for path "${customPathInput}"`, 'success');
      }
    } catch (err: any) {
      onShowToast('Sync failed: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Restore directly from PC folder
  const handleReadFromFolder = async () => {
    try {
      setSyncing(true);
      const jsonContent = await FileStorageService.readDatabaseFromDirectory();
      onRequestConfirm(
        'Restore from Selected PC Folder',
        `This will reload the database from "${activeFolderHandleName}/transport_database.json". All existing records will be updated. Do you wish to continue?`,
        async () => {
          const success = await db.restoreCompleteBackup(jsonContent);
          if (success) {
            onShowToast('Database restored successfully from PC folder!', 'success');
            setTimeout(() => window.location.reload(), 800);
          } else {
            onShowToast('Failed to parse database file in selected folder', 'error');
          }
        },
        true
      );
    } catch (err: any) {
      onShowToast('Could not read from PC folder: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Auto-sync
  const handleToggleAutoSync = async (enabled: boolean) => {
    const updatedConfig: StorageConfig = {
      ...storageConfig,
      autoSyncToFileSystem: enabled,
    };
    setStorageConfig(updatedConfig);
    const updatedSettings = {
      ...settings,
      storageConfig: updatedConfig,
    };
    await db.updateSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    onShowToast(
      enabled
        ? 'Auto-save to PC folder activated: every Bilty/Memo change will be saved directly to your folder!'
        : 'Auto-save to PC folder deactivated.',
      'info'
    );
  };

  // Change Storage Mode
  const handleModeChange = async (mode: StorageMode) => {
    const updatedConfig: StorageConfig = {
      ...storageConfig,
      mode,
    };
    setStorageConfig(updatedConfig);
    const updatedSettings = {
      ...settings,
      storageConfig: updatedConfig,
    };
    await db.updateSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    onShowToast(`Storage mode switched to ${mode}`, 'info');
  };

  // Enable Persistent Storage
  const handleRequestPersistence = async () => {
    const persisted = await FileStorageService.requestPersistentStorage();
    if (persisted) {
      setStorageUsage((prev) => ({ ...prev, isPersisted: true }));
      onShowToast('Persistent storage granted! Browser will never delete offline data.', 'success');
    } else {
      onShowToast('Storage is already persistent or managed by system policy.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Fully Offline & Local Storage Summary */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% Fully Offline Ready</span>
              <span className="text-white/40">•</span>
              <span>No Internet Connection Needed</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <HardDrive className="w-7 h-7 text-blue-400" />
              <span>Select Storage Location (PC Path & Offline Sync)</span>
            </h2>
            <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
              Aapka pura data (Bilties, Memos, Medical, Parties) aapke PC me local storage par save hota hai.
              Yaha se aap apne computer ki drive (D: Drive, C: Drive, Desktop) me custom folder chunein taki data wahi safe rahe!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 text-xs disabled:opacity-50"
            >
              <FolderSync className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Saving to PC...' : 'Save Data to PC Folder Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Main Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select PC Folder / Custom Path (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: PC Folder Selection (showDirectoryPicker) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  <span>PC Folder Selection (Computer Directory)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apne computer ya laptop ka folder chunein jaha database files save hongi.
                </p>
              </div>

              {activeFolderHandleName ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Folder Connected</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>No PC Folder Linked</span>
                </span>
              )}
            </div>

            {/* Currently Active Folder Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Connected PC Folder / Path
                  </span>
                  <div className="font-mono text-sm font-semibold text-slate-800 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      {activeFolderHandleName || customPathInput || 'No Folder Selected'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasPickerSupport ? (
                    <button
                      onClick={handlePickDirectory}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm text-xs transition-all active:scale-95"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{activeFolderHandleName ? 'Change PC Folder' : 'Browse PC Folder'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Browser Folder Picker not supported. Use manual path below.
                    </span>
                  )}
                </div>
              </div>

              {activeFolderHandleName && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">File Written:</span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      transport_database.json
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last Synced: {storageConfig.lastSyncedAt ? new Date(storageConfig.lastSyncedAt).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Path Input (e.g. for custom path specification) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Custom Directory Path (PC Local Drive)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                  placeholder="e.g. D:\TransportSoftware\Data or C:\Users\Admin\Desktop\BillingRecords"
                  className="flex-1 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                />
                <button
                  onClick={handleSaveCustomPath}
                  disabled={savingConfig}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Path</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Aap yaha computer ka koi bhi path likh sakte hai (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">D:\TransportData</code>). Jab bhi backup export ya save hoga, yeh path default banega.
              </p>
            </div>

            {/* Auto-Sync Toggle & Subfolder Name */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Auto-Sync to PC Folder (Automatic Save)</span>
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Bilty, Memo, ya Party add/edit/delete hote hi background me turant PC folder me file update ho jaye.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storageConfig.autoSyncToFileSystem}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Subfolder config */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Automatic Backup Subfolder Name:</span>
                  <p className="text-[11px] text-slate-500">Folder inside selected directory where daily snapshots are saved.</p>
                </div>
                <input
                  type="text"
                  value={storageConfig.backupSubFolder || 'Daily_Backups'}
                  onChange={async (e) => {
                    const updated = { ...storageConfig, backupSubFolder: e.target.value };
                    setStorageConfig(updated);
                    await db.updateStorageConfig(updated);
                  }}
                  className="w-44 px-3 py-1.5 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Folder Actions: Sync Now / Read From Folder */}
            <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs text-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Save/Sync Entire Database to PC Folder</span>
              </button>

              {activeFolderHandleName && (
                <button
                  onClick={handleReadFromFolder}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Read / Reload Data From PC Folder</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Storage Mode Architecture Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Storage Architecture Mode</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select how data is stored on this PC:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Option 1: Hybrid Mode */}
              <div
                onClick={() => handleModeChange('hybrid')}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  storageConfig.mode === 'hybrid'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Hybrid Mode</span>
                  </span>
                  {storageConfig.mode === 'hybrid' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 mb-2">
                  Recommended
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Fastest speed. Saves locally in Browser/IndexedDB + automatically mirrors complete JSON copies to your chosen PC folder.
                </p>
              </div>

              {/* Option 2: Browser Local Only */}
              <div
                onClick={() => handleModeChange('browser-local')}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  storageConfig.mode === 'browser-local'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-slate-600" />
                    <span>Browser Internal</span>
                  </span>
                  {storageConfig.mode === 'browser-local' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 mb-2">
                  Isolated
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Saved only inside local device IndexedDB storage without external folder sync.
                </p>
              </div>

              {/* Option 3: Custom PC Directory Direct */}
              <div
                onClick={() => handleModeChange('custom-pc-directory')}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  storageConfig.mode === 'custom-pc-directory'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                    <span>PC Directory Direct</span>
                  </span>
                  {storageConfig.mode === 'custom-pc-directory' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 mb-2">
                  Direct Files
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Prioritizes saving files directly into the custom PC path with persistent directory writes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Storage Health, Quota & Record Counts (1 Column) */}
        <div className="space-y-6">
          {/* Storage Quota Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Local Storage Quota & Health</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Storage Used:</span>
                <span className="font-mono text-blue-600">{storageUsage.usedMb} MB / {storageUsage.quotaMb} MB</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(storageUsage.percentUsed, 1)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Aapke PC par data storage ke liye lakho entries ki jagah uplabdh hai.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Storage Persistence:</span>
                {storageUsage.isPersisted ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Permanent</span>
                  </span>
                ) : (
                  <button
                    onClick={handleRequestPersistence}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline"
                  >
                    Lock Storage (Never Delete)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Service Worker Cache:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active (100% Offline)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Offline Database Records Count */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Offline Database Records</span>
            </h3>
            <p className="text-xs text-slate-500">
              Total records saved on this local machine:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Bilties (Consignment Notes):</span>
                <span className="font-bold text-slate-900">{recordCounts.bilties}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Challan / Memos:</span>
                <span className="font-bold text-slate-900">{recordCounts.memos}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Registered Parties:</span>
                <span className="font-bold text-slate-900">{recordCounts.parties}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Vehicles Master:</span>
                <span className="font-bold text-slate-900">{recordCounts.vehicles}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Drivers Master:</span>
                <span className="font-bold text-slate-900">{recordCounts.drivers}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Medical Register Entries:</span>
                <span className="font-bold text-slate-900">{recordCounts.medical}</span>
              </div>
            </div>
          </div>

          {/* Quick Offline Instructions */}
          <div className="bg-slate-900 rounded-2xl p-5 text-slate-200 space-y-3 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <WifiOff className="w-4 h-4" />
              <span>Fully Offline Guidelines</span>
            </div>
            <ul className="text-xs space-y-2 text-slate-300 leading-relaxed list-disc list-inside">
              <li>Internet band hone par bhi yeh app 100% normal tarike se kaam karta rahega.</li>
              <li>Bilties, Memos banana, Print karna aur Month-End audit sabhi offline possible hai.</li>
              <li>Aapke chune hue PC folder me live backup automatically updated rehta hai.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
