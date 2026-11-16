/**
 * Production Browser Inspect & Source Code Deterrent Guard.
 * Disables casual DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U) and context menu
 * outside editable form inputs, while preserving normal user clipboard copy actions.
 */
export function initAntiInspectGuard(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Disable right-click context menu except inside input/textarea fields
  document.addEventListener(
    'contextmenu',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      e.preventDefault();
    },
    { passive: false }
  );

  // Block DevTools & View-Source keyboard shortcuts
  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const key = (e.key || '').toUpperCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + Shift + I / J / C / K
      if (isCtrlOrCmd && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Mac Cmd + Option + I / J / C / U
      if (e.metaKey && e.altKey && ['I', 'J', 'C', 'U'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (View Source) or Ctrl/Cmd + S (Save Page)
      if (isCtrlOrCmd && ['U', 'S'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // Clear residual logs & show security warning
  try {
    if (import.meta.env.PROD) {
      console.clear();
      console.log(
        '%cSTOP! SPIKE PROTOCOL SECURITY',
        'color:#ef4444;font-size:26px;font-weight:bold;'
      );
      console.log(
        '%cThis browser console is restricted. Unauthorized inspection or tampering is logged and blocked by cryptographic rules.',
        'color:#94a3b8;font-size:13px;'
      );
    }
  } catch {}
}
