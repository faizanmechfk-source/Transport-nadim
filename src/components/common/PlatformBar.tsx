import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Laptop,
  Maximize,
  Minimize,
  X,
  Search,
  Database,
  UserCheck,
  Shield,
  Clock,
  Printer,
  ChevronDown
} from 'lucide-react';
import { NativeBridge, PlatformType } from '../../services/nativeBridge';
import { Role, UserSession } from '../../types';
import { db } from '../../database/db';
import { PWAInstallButton, OfflineStatusIndicator } from './PWAInstallButton';

interface PlatformBarProps {
  onOpenSearch: () => void;
  onOpenBackup: () => void;
  currentUser: UserSession;
  onUserChange: (user: UserSession) => void;
}

export const PlatformBar: React.FC<PlatformBarProps> = ({
  onOpenSearch,
  onOpenBackup,
  currentUser,
  onUserChange,
}) => {
  const [platform, setPlatform] = useState<PlatformType>('web');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  useEffect(() => {
    setPlatform(NativeBridge.getPlatform());
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoleSwitch = (role: Role) => {
    let name = 'Admin User';
    if (role === 'operator') name = 'Billing Operator';
    if (role === 'viewer') name = 'Auditor / Viewer';
    const newUser: UserSession = { id: `usr-${role}`, name, role };
    db.setCurrentUser(newUser);
    onUserChange(newUser);
    setIsRoleMenuOpen(false);
  };

  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800 text-xs select-none sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Left: App Identity & Platform Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-blue-400">
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">TE</span>
            <span className="hidden sm:inline">TRANSPORT ENTRY</span>
          </div>

          <div className="h-3.5 w-px bg-slate-700 hidden sm:block"></div>

          {/* Platform Badge */}
          <div className="flex items-center gap-1 bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
            {platform === 'windows-desktop' && (
              <>
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span>Windows EXE Desktop</span>
              </>
            )}
            {platform === 'android-webview' && (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Android WebView</span>
              </>
            )}
            {platform === 'web' && (
              <>
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Web / Desktop Ready</span>
              </>
            )}
          </div>
          {/* Offline Indicator & PWA Install */}
          <OfflineStatusIndicator />
          <PWAInstallButton compact />
        </div>

        {/* Center: Search & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition-colors"
            title="Global Quick Search (Bilty, Memo, Parties, Vehicles)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Quick Search</span>
            <kbd className="hidden lg:inline-block bg-slate-900 text-slate-400 px-1 py-0.2 rounded text-[10px] border border-slate-800">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={onOpenBackup}
            className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700 transition-colors"
            title="Database Backup & Snapshot"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Backup</span>
          </button>
        </div>

        {/* Right: Role Switcher, Clock, Window Controls */}
        <div className="flex items-center gap-2">
          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-1 text-slate-400 font-mono text-[11px] mr-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{currentTime}</span>
          </div>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 text-[11px] transition-colors"
            >
              <Shield className={`w-3.5 h-3.5 ${currentUser.role === 'admin' ? 'text-purple-400' : currentUser.role === 'operator' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="font-medium capitalize">{currentUser.role}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isRoleMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-slate-800 rounded-md shadow-lg border border-slate-700 py-1 z-50 text-slate-200">
                <div className="px-3 py-1 text-[10px] text-slate-400 border-b border-slate-700 uppercase font-semibold">
                  Switch Role / Permissions
                </div>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-700 ${currentUser.role === 'admin' ? 'text-purple-400 font-bold' : ''}`}
                >
                  <span>Admin (Full Access)</span>
                  {currentUser.role === 'admin' && <UserCheck className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('operator')}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-700 ${currentUser.role === 'operator' ? 'text-blue-400 font-bold' : ''}`}
                >
                  <span>Operator (Entry/Edit)</span>
                  {currentUser.role === 'operator' && <UserCheck className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('viewer')}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-700 ${currentUser.role === 'viewer' ? 'text-slate-400 font-bold' : ''}`}
                >
                  <span>Viewer (Read Only)</span>
                  {currentUser.role === 'viewer' && <UserCheck className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Fullscreen & Print button */}
          <button
            onClick={() => NativeBridge.printPage()}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
            title="Print Current Screen"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => NativeBridge.toggleFullscreen()}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>

          {/* Windows Desktop Wrapper Window Buttons */}
          {platform === 'windows-desktop' && (
            <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5 ml-1">
              <button
                onClick={() => NativeBridge.windowMinimize()}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Minimize Window"
              >
                <Minimize className="w-3 h-3" />
              </button>
              <button
                onClick={() => NativeBridge.windowMaximize()}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Maximize Window"
              >
                <Maximize className="w-3 h-3" />
              </button>
              <button
                onClick={() => NativeBridge.windowClose()}
                className="p-1 hover:bg-rose-900 text-rose-400 hover:text-white rounded"
                title="Close Application"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
