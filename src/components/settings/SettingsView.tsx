import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Database,
  Trash2,
  RotateCcw,
  Shield,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  MapPin,
  Navigation,
  HardDrive
} from 'lucide-react';
import { CompanySettings, RecycleBinItem, UserRole, UserSession } from '../../types';
import { db } from '../../database/db';
import { CityRouteSettingsTab } from './CityRouteSettingsTab';
import { AutoBackupScheduleCard } from './AutoBackupScheduleCard';
import { SelectStorageTab } from './SelectStorageTab';

interface SettingsViewProps {
  currentUser: UserSession;
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onSwitchUserRole: (role: UserRole) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
}

type TabType = 'company' | 'cities' | 'routes' | 'storage' | 'prefixes' | 'backup' | 'recycle' | 'roles';

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onSwitchUserRole,
  onShowToast,
  onRequestConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [recycleItems, setRecycleItems] = useState<RecycleBinItem[]>([]);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const loadRecycleBin = async () => {
    setLoadingRecycle(true);
    const items = await db.getRecycleBinItems();
    setRecycleItems(items);
    setLoadingRecycle(false);
  };

  useEffect(() => {
    if (activeTab === 'recycle') {
      loadRecycleBin();
    }
  }, [activeTab]);

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const toSave: CompanySettings = {
        ...formData,
        operatingCities: Array.isArray(formData.operatingCities)
          ? formData.operatingCities
          : (Array.isArray(settings.operatingCities) ? settings.operatingCities : []),
        deletedCityNames: Array.isArray(formData.deletedCityNames)
          ? formData.deletedCityNames
          : (Array.isArray(settings.deletedCityNames) ? settings.deletedCityNames : []),
        quickRoutes: Array.isArray(formData.quickRoutes)
          ? formData.quickRoutes
          : (Array.isArray(settings.quickRoutes) ? settings.quickRoutes : []),
      };
      await db.saveCompanySettings(toSave);
      onUpdateSettings(toSave);
      onShowToast('Company settings updated successfully', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backupJson = await db.exportCompleteBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TransportEntry_Backup_${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Database backup downloaded successfully', 'success');
    } catch (err: any) {
      onShowToast('Failed to create backup: ' + err.message, 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      onShowToast('Please select a valid JSON backup file', 'error');
      return;
    }

    onRequestConfirm(
      'Restore Database Backup?',
      'This will merge or overwrite current data with the backup contents. An automatic safety snapshot will be taken first. Do you want to continue?',
      async () => {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const success = await db.restoreCompleteBackup(content);
            if (success) {
              onShowToast('Database restored successfully! Refreshing...', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else {
              onShowToast('Invalid backup file format.', 'error');
            }
          };
          reader.readAsText(restoreFile);
        } catch (err: any) {
          onShowToast('Restore failed: ' + err.message, 'error');
        }
      },
      true
    );
  };

  const handleResetToSeed = () => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can reset the database', 'error');
      return;
    }

    onRequestConfirm(
      'Reset Entire Database to Seed Data?',
      'DANGER: This will purge custom entries and restore pristine default demo data. Are you sure?',
      async () => {
        await db.resetToSeedData();
        onShowToast('Database reset to sample state. Reloading...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      },
      true
    );
  };

  const handleRestoreRecycleItem = async (item: RecycleBinItem) => {
    try {
      await db.restoreFromRecycleBin(item.id, item.type);
      onShowToast(`Restored ${item.type} #${item.identifier}`, 'success');
      loadRecycleBin();
    } catch (err: any) {
      onShowToast('Restore failed: ' + err.message, 'error');
    }
  };

  const handlePermanentDelete = (item: RecycleBinItem) => {
    if (currentUser.role !== 'admin') {
      onShowToast('Only Administrator can permanently delete data', 'error');
      return;
    }

    onRequestConfirm(
      `Permanently purge ${item.type} #${item.identifier}?`,
      'This action CANNOT be undone. The record will be wiped from local storage.',
      async () => {
        await db.permanentDelete(item.id, item.type);
        onShowToast(`Permanently deleted ${item.type} #${item.identifier}`, 'success');
        loadRecycleBin();
      },
      true
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>SYSTEM SETTINGS & DATA MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business identity, print headers, backup/restore data, manage recycling bin and permissions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'company', label: 'Company Profile & Letterhead', icon: Building2 },
          { id: 'cities', label: 'Operating Cities & Shortcuts', icon: MapPin },
          { id: 'routes', label: 'Quick City Routes', icon: Navigation },
          { id: 'storage', label: 'Select Storage (PC Path & Offline)', icon: HardDrive },
          { id: 'prefixes', label: 'Numbering & Prefixes', icon: Settings },
          { id: 'backup', label: 'Auto-Backup & Data Recovery', icon: Database },
          { id: 'recycle', label: 'Recycle Bin (Soft Deletes)', icon: Trash2 },
          { id: 'roles', label: 'User Roles & Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompanySettings} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="font-bold text-slate-900 border-b pb-2 text-sm">
            Company Profile & Print Header Settings
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Agency Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-1.5 border rounded font-bold text-slate-900 text-sm"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tagline / Sub-heading</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Registered Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">City, State & PIN</label>
              <input
                type="text"
                value={formData.cityState}
                onChange={(e) => setFormData({ ...formData, cityState: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 border rounded font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 bg-white border rounded font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Name & Branch</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Account & IFSC</label>
              <input
                type="text"
                value={`${formData.bankAccountNumber} / ${formData.bankIfsc}`}
                onChange={(e) => {
                  const parts = e.target.value.split('/');
                  setFormData({
                    ...formData,
                    bankAccountNumber: parts[0]?.trim() || '',
                    bankIfsc: parts[1]?.trim() || '',
                  });
                }}
                className="w-full px-3 py-1.5 bg-white border rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Terms & Conditions (Printed on Consignment Note)</label>
            <textarea
              rows={3}
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              className="w-full p-2.5 border rounded text-xs"
            />
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Company Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: OPERATING CITIES & SHORTCUTS */}
      {activeTab === 'cities' && (
        <CityRouteSettingsTab
          currentUser={currentUser}
          settings={settings}
          formData={formData}
          setFormData={setFormData}
          onSaveSettings={async (updated) => {
            await db.saveCompanySettings(updated);
            onUpdateSettings(updated);
          }}
          onShowToast={onShowToast}
          onRequestConfirm={onRequestConfirm}
          subTab="cities"
        />
      )}

      {/* TAB: QUICK CITY ROUTES (CORRIDORS) */}
      {activeTab === 'routes' && (
        <CityRouteSettingsTab
          currentUser={currentUser}
          settings={settings}
          formData={formData}
          setFormData={setFormData}
          onSaveSettings={async (updated) => {
            await db.saveCompanySettings(updated);
            onUpdateSettings(updated);
          }}
          onShowToast={onShowToast}
          onRequestConfirm={onRequestConfirm}
          subTab="routes"
        />
      )}

      {/* TAB: SELECT STORAGE (PC PATH & FULL OFFLINE DIRECTORY) */}
      {activeTab === 'storage' && (
        <SelectStorageTab
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onShowToast={onShowToast}
          onRequestConfirm={onRequestConfirm}
        />
      )}

      {/* TAB 2: PREFIXES & NUMBERING */}
      {activeTab === 'prefixes' && (
        <form onSubmit={handleSaveCompanySettings} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="font-bold text-slate-900 border-b pb-2 text-sm">
            Document Numbering Series & Prefixes
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">Bilty / Consignment Note</span>
              <div>
                <label className="block text-slate-600 mb-1">Prefix</label>
                <input
                  type="text"
                  value={formData.biltyPrefix}
                  onChange={(e) => setFormData({ ...formData, biltyPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Starting Number</label>
                <input
                  type="number"
                  value={formData.biltyStartingNumber}
                  onChange={(e) => setFormData({ ...formData, biltyStartingNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">Dispatch Memo</span>
              <div>
                <label className="block text-slate-600 mb-1">Prefix</label>
                <input
                  type="text"
                  value={formData.memoPrefix}
                  onChange={(e) => setFormData({ ...formData, memoPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Starting Number</label>
                <input
                  type="number"
                  value={formData.memoStartingNumber}
                  onChange={(e) => setFormData({ ...formData, memoStartingNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">Medical Entry</span>
              <div>
                <label className="block text-slate-600 mb-1">Prefix</label>
                <input
                  type="text"
                  value={formData.medicalPrefix}
                  onChange={(e) => setFormData({ ...formData, medicalPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Starting Number</label>
                <input
                  type="number"
                  value={formData.medicalStartingNumber}
                  onChange={(e) => setFormData({ ...formData, medicalStartingNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 bg-white border rounded font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Numbering Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* Automatic Database Backup Scheduler Card */}
          <AutoBackupScheduleCard
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onShowToast={onShowToast}
            onRequestConfirm={onRequestConfirm}
          />

          {/* Manual Snapshot & External File Tools */}
          <div className="pt-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Manual Local Data Backup & File Restore</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export Complete Local JSON File</span>
                </div>
                <p className="text-slate-500">
                  Download a single complete JSON backup file containing all your Bilty records, Memos, Medical entries, Party ledger details, Fleet vehicles, Drivers, and audit records.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON Backup</span>
                </button>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Restore from External Backup File</span>
                </div>
                <p className="text-slate-500">
                  Select an exported Transport Entry backup file to restore. An automatic safety snapshot will be preserved before restoring.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  disabled={!restoreFile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Backup Now</span>
                </button>
              </div>

              <div className="sm:col-span-2 bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone: Re-seed Sample Database</span>
                </div>
                <p className="text-rose-700 text-xs">
                  This action clears all custom records and loads clean demonstration entries for testing.
                </p>
                <button
                  type="button"
                  onClick={handleResetToSeed}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold shadow-xs text-xs"
                >
                  Reset to Sample Master Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECYCLE BIN */}
      {activeTab === 'recycle' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm">Recycle Bin (Soft Deleted Records)</div>
              <p className="text-slate-500 text-xs">
                Deleted records are protected here to prevent permanent data loss. You can restore them anytime.
              </p>
            </div>
            <button
              onClick={loadRecycleBin}
              className="p-1.5 border rounded text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b">
                  <th className="p-2.5">Record Type</th>
                  <th className="p-2.5">Identifier</th>
                  <th className="p-2.5">Deleted At</th>
                  <th className="p-2.5">Deleted By</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRecycle ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Loading deleted items...</td>
                  </tr>
                ) : recycleItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Recycle Bin is empty. No deleted records found.
                    </td>
                  </tr>
                ) : (
                  recycleItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold uppercase text-slate-700">{item.type}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-700">{item.identifier}</td>
                      <td className="p-2.5 font-mono text-slate-600">{new Date(item.deletedAt).toLocaleString()}</td>
                      <td className="p-2.5 text-slate-700">{item.deletedBy}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRestoreRecycleItem(item)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px]"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item)}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[11px]"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Purge</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="font-bold text-slate-900 border-b pb-2 text-sm">
            Role-Based Access Control (RBAC) Switcher
          </div>
          <p className="text-slate-500">
            Test and enforce the three permission tiers defined in your system architecture:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                role: 'admin',
                name: 'Administrator',
                desc: 'Full access: create, edit, permanent delete, month close/reopen, restore backups.',
                badge: 'Full Privilege',
              },
              {
                role: 'operator',
                name: 'Data Entry Operator',
                desc: 'Create, edit Bilties and Memos, export reports. Cannot delete permanently or reopen locked months.',
                badge: 'Standard Operations',
              },
              {
                role: 'viewer',
                name: 'Read-Only Viewer',
                desc: 'Audit view only: view registers, preview bilties, export Excel. Cannot create or modify records.',
                badge: 'Read-Only',
              },
            ].map((r) => {
              const active = currentUser.role === r.role;
              return (
                <div
                  key={r.role}
                  onClick={() => onSwitchUserRole(r.role as UserRole)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs">{r.desc}</p>
                  {active && (
                    <div className="mt-3 flex items-center gap-1 text-blue-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active Session Role</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
