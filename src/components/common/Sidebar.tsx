import React from 'react';
import {
  LayoutDashboard,
  FileText,
  GitCompare,
  ScrollText,
  Cross,
  CheckSquare,
  CalendarCheck,
  Users,
  Truck,
  UserCheck,
  BarChart3,
  HardDrive,
  History,
  Settings,
  X
} from 'lucide-react';

import { UserSession, ViewType } from '../../types';

export type NavItemKey =
  | 'dashboard'
  | 'bilty'
  | 'matchup'
  | 'memo'
  | 'medical'
  | 'medicalMatchup'
  | 'monthEnd'
  | 'parties'
  | 'vehicles'
  | 'drivers'
  | 'reports'
  | 'backup'
  | 'audit'
  | 'settings';

export interface SidebarProps {
  currentView?: NavItemKey;
  activeView?: ViewType;
  onSelectView?: (view: NavItemKey) => void;
  onNavigate?: (view: ViewType, itemId?: string) => void;
  currentUser?: UserSession;
  isOpen?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  counts?: {
    biltyCount?: number;
    matchCount?: number;
    memoCount?: number;
    medicalCount?: number;
    medicalMatchCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeView,
  onSelectView,
  onNavigate,
  currentUser,
  counts = {},
  isOpen,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const effectiveView = activeView || currentView || 'dashboard';
  const effectiveMobileOpen = isOpen !== undefined ? isOpen : isMobileOpen;
  const navItems = [
    {
      group: 'MAIN DASHBOARD',
      items: [
        { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
        { key: 'bilty' as NavItemKey, label: 'Bilty Entry', icon: FileText, badge: counts.biltyCount },
        { key: 'matchup' as NavItemKey, label: 'Entries Match-Up', icon: GitCompare, badge: counts.matchCount, badgeColor: 'bg-amber-100 text-amber-800' },
        { key: 'memo' as NavItemKey, label: 'Memo', icon: ScrollText, badge: counts.memoCount },
        { key: 'medical' as NavItemKey, label: 'Medical Entries', icon: Cross, badge: counts.medicalCount },
        { key: 'medicalMatchup' as NavItemKey, label: 'Medical Match-Up', icon: CheckSquare, badge: counts.medicalMatchCount, badgeColor: 'bg-amber-100 text-amber-800' },
        { key: 'monthEnd' as NavItemKey, label: 'Month End Parties', icon: CalendarCheck },
      ],
    },
    {
      group: 'TRANSPORT MASTERS',
      items: [
        { key: 'parties' as NavItemKey, label: 'Party Master', icon: Users },
        { key: 'vehicles' as NavItemKey, label: 'Vehicle Master', icon: Truck },
        { key: 'drivers' as NavItemKey, label: 'Driver Master', icon: UserCheck },
      ],
    },
    {
      group: 'MANAGEMENT & AUDIT',
      items: [
        { key: 'reports' as NavItemKey, label: 'Reports (14)', icon: BarChart3 },
        { key: 'backup' as NavItemKey, label: 'Backup & Restore', icon: HardDrive },
        { key: 'audit' as NavItemKey, label: 'Audit Log', icon: History },
        { key: 'settings' as NavItemKey, label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleSelect = (key: NavItemKey) => {
    if (onNavigate) {
      onNavigate(key as ViewType);
    } else if (onSelectView) {
      onSelectView(key);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-extrabold shadow-sm text-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">
              TRANSPORT ENTRY
            </h1>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Logistics & Billing ERP</p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Link List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navItems.map((grp) => (
          <div key={grp.group}>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1.5">
              {grp.group}
            </div>
            <div className="space-y-0.5">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  effectiveView === item.key ||
                  (item.key === 'medicalMatchup' && effectiveView === 'medical-matchup') ||
                  (item.key === 'monthEnd' && effectiveView === 'month-end');
                return (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isActive
                            ? 'bg-blue-800 text-white'
                            : item.badgeColor || 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div
        onClick={() => {
          if (onNavigate) onNavigate('settings');
          else if (onSelectView) onSelectView('settings');
        }}
        className="cursor-pointer p-3 border-t border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition-colors text-[11px] text-slate-500 flex items-center justify-between"
        title="Click to manage PC Storage Directory & Offline settings"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-700">Offline PC Storage</span>
        </div>
        <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
          PC Folder
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="no-print hidden md:block w-64 flex-shrink-0 h-[calc(100vh-33px)] sticky top-[33px]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {effectiveMobileOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
