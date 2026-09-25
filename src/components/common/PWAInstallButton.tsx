import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, show small badge
  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Installed App</span>
      </span>
    );
  }

  // Chromium / Android / Edge Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-sm transition-all transform active:scale-95 ${
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        title="Install Transport App to your PC or Phone desktop (100% Offline)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install PC App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold rounded-lg ${
            compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-sky-400" />
                <span>Install on iPhone / iPad</span>
              </h3>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon (box with upward arrow) in Safari.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. The app will install with complete offline PC/phone database access!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-xs font-bold text-white transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineStatusIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold animate-pulse">
        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        <span>100% Offline Mode (Local PC Database Active)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span>Offline Ready</span>
    </div>
  );
};
