import React from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-3.5 rounded-xl bg-[#0d1d2c]/95 backdrop-blur-md border border-[#00F0FF]/40 shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-right"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-[#00F0FF]/15 text-[#00F0FF]'
                : toast.type === 'error'
                ? 'bg-[#ffb4ab]/15 text-[#ffb4ab]'
                : 'bg-[#D4AF37]/15 text-[#D4AF37]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'success'
                ? 'check_circle'
                : toast.type === 'error'
                ? 'error'
                : 'info'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white font-headline">{toast.title}</h4>
            <p className="text-[12px] text-[#c6c6cc] mt-0.5 line-clamp-2">{toast.message}</p>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-[#c6c6cc] hover:text-white shrink-0 p-1"
            aria-label="Dismiss toast"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
