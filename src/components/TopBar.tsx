import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useFlashOnChange } from '../utils/useFlashOnChange';
import { fmtNum } from '../utils/units';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ sidebarOpen, onToggleSidebar }: TopBarProps) {
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  const currentView = useProjectStore((s) => s.currentView);
  const setCurrentView = useProjectStore((s) => s.setCurrentView);
  const settings = useProjectStore((s) => s.settings);
  const setCorrections = useProjectStore((s) => s.setCorrections);
  const bbsResult = useProjectStore((s) => s.bbsResult);
  const toJson = useProjectStore((s) => s.toJson);
  const loadJson = useProjectStore((s) => s.loadJson);
  const newProject = useProjectStore((s) => s.newProject);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalKg = bbsResult.grandTotalKg;
  const isTotalFlashing = useFlashOnChange(totalKg);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCycleTheme = () => {
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(nextTheme);
  };

  const handleSaveJson = () => {
    const json = toJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_BBS.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      loadJson(text);
    };
    reader.readAsText(file);
    e.target.value = '';
    setMenuOpen(false);
  };

  const handleNewProject = () => {
    newProject();
    setMenuOpen(false);
  };

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar__left">
        <button
          type="button"
          className="btn-icon"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <span className="top-bar__logo" title="AQC – Civil Quantity & Cost Estimation">
          AQC
        </span>

        <input
          id="top-bar-project-title"
          className="top-bar__name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Project title"
          placeholder="Untitled Project"
        />
      </div>

      <div className="top-bar__right">
        {/* Quiet live project total weight */}
        <span
          className={`top-bar__total ${isTotalFlashing ? 'flash-change' : ''}`}
          title="Project total steel weight"
          aria-label={`Project total steel weight: ${fmtNum(totalKg, 1)} kg`}
        >
          {fmtNum(totalKg, 1)} kg
        </span>

        {/* Sheet / Cards toggle button */}
        <button
          type="button"
          className={`btn ${currentView === 'sheet' ? 'btn--primary' : ''}`}
          onClick={() => setCurrentView(currentView === 'cards' ? 'sheet' : 'cards')}
          aria-label={currentView === 'cards' ? 'Switch to Sheet view' : 'Switch to Cards view'}
        >
          {currentView === 'cards' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>Sheet</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Cards</span>
            </>
          )}
        </button>

        {/* Settings gear popover */}
        <div style={{ position: 'relative' }} ref={settingsRef}>
          <button
            type="button"
            className={`btn-icon ${settingsOpen ? 'btn-icon--active' : ''}`}
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Calculation settings"
            title="Calculation settings"
            aria-expanded={settingsOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {settingsOpen && (
            <div className="settings-popover" role="dialog" aria-label="Calculation settings">
              <div className="settings-popover__title">Calculation Settings</div>
              <label className="settings-switch-row" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.corrections.roundUpBarCounts}
                  onChange={(e) =>
                    setCorrections({ roundUpBarCounts: e.target.checked })
                  }
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    Round up bar counts
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Always rounds up computed counts to whole numbers (default ON)
                  </div>
                </div>
              </label>

              <label className="settings-switch-row" style={{ cursor: 'pointer', marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={settings.corrections.c2StirrupHooksLikeTies}
                  onChange={(e) =>
                    setCorrections({ c2StirrupHooksLikeTies: e.target.checked })
                  }
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    C2: Stirrup hook bend deduction
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Deducts 90° bends like ties instead of adding them
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Theme cycle button (System -> Light -> Dark -> System) */}
        <button
          type="button"
          className="btn-icon"
          onClick={handleCycleTheme}
          aria-label={
            theme === 'system'
              ? 'Theme: System (click for light)'
              : theme === 'light'
              ? 'Theme: Light (click for dark)'
              : 'Theme: Dark (click for system)'
          }
          title={
            theme === 'system'
              ? 'Theme: System (click for light)'
              : theme === 'light'
              ? 'Theme: Light (click for dark)'
              : 'Theme: Dark (click for system)'
          }
        >
          {theme === 'system' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          ) : theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Project Menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Project actions"
            title="Project actions"
            aria-expanded={menuOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {menuOpen && (
            <div className="menu-dropdown" role="menu">
              <button
                type="button"
                className="menu-item"
                onClick={handleSaveJson}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Save JSON</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => fileRef.current?.click()}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Load JSON</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={handleNewProject}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <span>New project</span>
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleLoadJson}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
}
