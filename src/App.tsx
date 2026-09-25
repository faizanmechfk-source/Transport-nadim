import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Search,
  Plus,
  Bell,
  Shield,
  Truck,
  Sparkles,
  Command,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ScrollText
} from 'lucide-react';
import { CompanySettings, ToastMessage, UserRole, UserSession, ViewType } from './types';
import { db } from './database/db';
import { defaultCompanySettings } from './database/seedData';
import { NativeBridge } from './services/nativeBridge';
import { AutoBackupScheduler } from './services/autoBackupScheduler';

// Common Components
import { PlatformBar } from './components/common/PlatformBar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ToastContainer } from './components/common/Toast';
import { ConfirmModal } from './components/common/ConfirmModal';

// Module Views
import { DashboardView } from './components/dashboard/DashboardView';
import { BiltyView } from './components/bilty/BiltyView';
import { MemoView } from './components/memo/MemoView';
import { MatchupView } from './components/matchup/MatchupView';
import { MedicalView } from './components/medical/MedicalView';
import { MedicalMatchupView } from './components/medicalMatchup/MedicalMatchupView';
import { MonthEndView } from './components/monthEnd/MonthEndView';
import { ReportsView } from './components/reports/ReportsView';
import { PartyMasterView } from './components/masters/PartyMasterView';
import { VehicleMasterView } from './components/masters/VehicleMasterView';
import { DriverMasterView } from './components/masters/DriverMasterView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // User & Settings
  const [currentUser, setCurrentUser] = useState<UserSession>({
    id: 'usr_admin',
    name: 'Chief Dispatcher (Admin)',
    role: 'admin',
  });

  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  // Load persistent settings on mount
  useEffect(() => {
    db.getCompanySettings().then((s) => {
      setSettings(s);
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `${Date.now()}_${Math.random()}`,
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger: boolean = false
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      isDanger,
    });
  };

  const [memoInitialRoute, setMemoInitialRoute] = useState<{ fromCity?: string; toCity?: string } | null>(null);
  const [biltyInitialRoute, setBiltyInitialRoute] = useState<{ fromCity?: string; toCity?: string; cityFilter?: string } | null>(null);

  // Keyboard shortcuts (Ctrl+K for search, Alt+M or Ctrl+Shift+M for Create Memo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (
        (e.altKey && e.key.toLowerCase() === 'm') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm')
      ) {
        e.preventDefault();
        if (currentUser.role === 'viewer') {
          showToast('Viewer account has read-only access.', 'warning');
          return;
        }
        handleNavigate('memo', 'new');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Automated Database Backup Scheduler Loop
  useEffect(() => {
    // Initial check shortly after app startup
    const initialTimer = setTimeout(() => {
      AutoBackupScheduler.checkAndExecute(false, (summary) => {
        showToast(`Auto-Backup Snapshot Created: ${summary}`, 'success');
        // Refresh local settings state if needed
        db.getCompanySettings().then(setSettings);
      });
    }, 4000);

    // Heartbeat check every 60 seconds
    const intervalTimer = setInterval(() => {
      AutoBackupScheduler.checkAndExecute(false, (summary) => {
        showToast(`Auto-Backup Snapshot Created: ${summary}`, 'success');
        db.getCompanySettings().then(setSettings);
      });
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const handleNavigate = (view: ViewType, itemId?: string, payload?: any) => {
    setActiveView(view);
    setSelectedItemId(itemId);
    if (view === 'memo') {
      setMemoInitialRoute(payload || null);
    }
    if (view === 'bilty') {
      setBiltyInitialRoute(payload || null);
    }
    setIsSidebarOpen(false);
  };

  const handleSwitchUserRole = (role: UserRole) => {
    const names: Record<UserRole, string> = {
      admin: 'Chief Dispatcher (Admin)',
      operator: 'Booking Desk (Operator)',
      viewer: 'Auditor (Read-Only Viewer)',
    };
    setCurrentUser({
      id: `usr_${role}`,
      name: names[role],
      role,
    });
    showToast(`Switched active profile to ${names[role]}`, 'info');
  };

  const platform = NativeBridge.getPlatform();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Platform Title Bar (Windows EXE / Android / Web) */}
      <PlatformBar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenBackup={() => handleNavigate('backup')}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          currentUser={currentUser}
          isOpen={isSidebarOpen}
          onNavigate={handleNavigate}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top App Header */}
          <header className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Toggle navigation"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Transport Entry</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-xs font-bold text-blue-700 uppercase">{activeView.replace('-', ' ')}</span>
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  {settings.companyName}
                </div>
              </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2">
              {/* Quick Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                title="Global Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search Bilty, Memo, Party...</span>
                <kbd className="hidden sm:inline-block bg-white border border-slate-300 rounded px-1 text-[10px] font-mono text-slate-500">
                  Ctrl K
                </kbd>
              </button>

              {/* Quick Create Memo (Shortcut) */}
              <button
                onClick={() => {
                  if (currentUser.role === 'viewer') {
                    showToast('Viewer account has read-only access.', 'warning');
                    return;
                  }
                  handleNavigate('memo', 'new');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Create Memo (Alt+M / Ctrl+Shift+M)"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Create Memo</span>
                <kbd className="hidden md:inline-block bg-sky-700/80 border border-sky-400/40 rounded px-1 text-[9px] font-mono text-sky-100">
                  Alt M
                </kbd>
              </button>

              {/* Quick New Bilty */}
              <button
                onClick={() => {
                  if (currentUser.role === 'viewer') {
                    showToast('Viewer account has read-only access.', 'warning');
                    return;
                  }
                  handleNavigate('bilty');
                }}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Bilty</span>
              </button>

              {/* Role Indicator & Fast Switcher */}
              <div className="relative group">
                <button
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  title="Click to switch role"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span className="capitalize font-bold text-slate-800">{currentUser.role}</span>
                </button>

                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 hidden group-hover:block z-30 text-xs">
                  <div className="px-3 py-1 text-[10px] text-slate-400 uppercase font-bold border-b">Switch Role</div>
                  <button
                    onClick={() => handleSwitchUserRole('admin')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>Admin</span>
                    {currentUser.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                  <button
                    onClick={() => handleSwitchUserRole('operator')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>Operator</span>
                    {currentUser.role === 'operator' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                  <button
                    onClick={() => handleSwitchUserRole('viewer')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>Viewer (Read Only)</span>
                    {currentUser.role === 'viewer' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Module Views Router */}
          <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto">
            {activeView === 'dashboard' && (
              <DashboardView
                currentUser={currentUser}
                settings={settings}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            )}

            {activeView === 'bilty' && (
              <BiltyView
                currentUser={currentUser}
                settings={settings}
                selectedBiltyId={selectedItemId}
                initialRoute={biltyInitialRoute}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {activeView === 'memo' && (
              <MemoView
                currentUser={currentUser}
                settings={settings}
                selectedMemoId={selectedItemId}
                initialRoute={memoInitialRoute}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {activeView === 'matchup' && (
              <MatchupView
                currentUser={currentUser}
                settings={settings}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {activeView === 'medical' && (
              <MedicalView
                currentUser={currentUser}
                settings={settings}
                selectedMedicalId={selectedItemId}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {(activeView === 'medical-matchup' || activeView === 'medicalMatchup') && (
              <MedicalMatchupView
                currentUser={currentUser}
                settings={settings}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {(activeView === 'month-end' || activeView === 'monthEnd') && (
              <MonthEndView
                currentUser={currentUser}
                settings={settings}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {(activeView === 'reports' || activeView === 'audit') && (
              <ReportsView
                currentUser={currentUser}
                settings={settings}
                onShowToast={showToast}
              />
            )}

            {activeView === 'parties' && (
              <PartyMasterView
                currentUser={currentUser}
                settings={settings}
                selectedPartyId={selectedItemId}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {activeView === 'vehicles' && (
              <VehicleMasterView
                currentUser={currentUser}
                settings={settings}
                selectedVehicleId={selectedItemId}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {activeView === 'drivers' && (
              <DriverMasterView
                currentUser={currentUser}
                settings={settings}
                selectedDriverId={selectedItemId}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}

            {(activeView === 'settings' || activeView === 'recycle-bin' || activeView === 'backup') && (
              <SettingsView
                currentUser={currentUser}
                settings={settings}
                onUpdateSettings={setSettings}
                onSwitchUserRole={handleSwitchUserRole}
                onShowToast={showToast}
                onRequestConfirm={requestConfirm}
              />
            )}
          </main>
        </div>
      </div>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={(view, id) => {
            handleNavigate(view as ViewType, id);
            setIsSearchOpen(false);
          }}
        />
      )}

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDanger={confirmModal.isDanger}
      />

      {/* Reusable Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
