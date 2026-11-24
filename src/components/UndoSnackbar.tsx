import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

export function UndoSnackbar() {
  const snackbar = useProjectStore((s) => s.snackbar);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const clearSnackbar = useProjectStore((s) => s.clearSnackbar);

  // Global Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      // Allow native undo inside text inputs
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Auto-dismiss snackbar after 6s
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      clearSnackbar();
    }, 6000);
    return () => clearTimeout(timer);
  }, [snackbar, clearSnackbar]);

  if (!snackbar) return null;

  return (
    <div className="undo-snackbar" role="status" aria-live="polite">
      <span>{snackbar.message}</span>
      <button
        type="button"
        className="undo-snackbar__btn"
        onClick={() => {
          snackbar.onUndo();
          clearSnackbar();
        }}
        aria-label="Undo action"
      >
        Undo
      </button>
      <button
        type="button"
        className="reset-icon-btn"
        onClick={clearSnackbar}
        aria-label="Dismiss snackbar"
        style={{ marginLeft: 4 }}
      >
        ✕
      </button>
    </div>
  );
}
