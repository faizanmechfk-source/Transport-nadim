import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let borderClass = 'border-emerald-500 bg-white text-slate-800';
        let iconClass = 'text-emerald-500';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-rose-500 bg-white text-slate-800';
          iconClass = 'text-rose-500';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-amber-500 bg-white text-slate-800';
          iconClass = 'text-amber-500';
        } else if (toast.type === 'info') {
          Icon = Info;
          borderClass = 'border-blue-500 bg-white text-slate-800';
          iconClass = 'text-blue-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-xl border-l-4 ${borderClass} border border-slate-200 transition-all text-xs`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconClass}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <div className="font-bold text-slate-900 mb-0.5">{toast.title}</div>}
              <div className="text-slate-600 font-medium leading-relaxed">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
