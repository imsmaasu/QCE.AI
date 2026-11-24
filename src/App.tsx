import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from './store/projectStore';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { EmptyHome } from './components/EmptyHome';
import { ComponentCard } from './components/ComponentCard';
import { SheetView } from './components/SheetView';
import { UndoSnackbar } from './components/UndoSnackbar';
import { DrawingPanel } from './components/drawing/DrawingPanel';
import { VersionHistory } from './components/VersionHistory';
import { ComponentType } from './engine/types';
import './styles/main.css';

export default function App() {
  const components = useProjectStore((s) => s.components);
  const currentView = useProjectStore((s) => s.currentView);
  const theme = useProjectStore((s) => s.theme);
  const addComponent = useProjectStore((s) => s.addComponent);

  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Sidebar is closed by default, state remembered in localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qce-sidebar-open');
      return saved === 'true'; // false by default
    }
    return false;
  });
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('qce-sidebar-open', String(next));
      }
      return next;
    });
  };

  // Sync theme attribute with document, respecting OS prefers-color-scheme for 'system'
  useEffect(() => {
    function applyTheme() {
      if (theme === 'system') {
        const isDark = typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    }

    applyTheme();

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // Click outside listener for Add dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddComponent = (type: ComponentType) => {
    addComponent(type);
    setAddDropdownOpen(false);
  };

  return (
    <>
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onOpenVersionHistory={() => setVersionHistoryOpen(true)}
      />

      <div className="workspace">
        <Sidebar isOpen={sidebarOpen} />

        <main className="content-area" id="main-content" aria-label="Main Content Area">
          {currentView === 'sheet' ? (
            <SheetView />
          ) : components.length === 0 ? (
            <EmptyHome />
          ) : (
            <div className="main-layout-container">
              <div className="cards-column">
                {components.map((c) => (
                  <ComponentCard key={c.id} component={c} />
                ))}

                {/* Add Component button at bottom of cards */}
                <div style={{ position: 'relative', alignSelf: 'center', marginTop: '12px' }} ref={addMenuRef}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                    aria-expanded={addDropdownOpen}
                    aria-haspopup="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add component</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {addDropdownOpen && (
                    <div className="menu-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', right: 'auto' }} role="menu">
                      <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAddComponent('footing')}
                        role="menuitem"
                      >
                        Footing
                      </button>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAddComponent('column')}
                        role="menuitem"
                      >
                        Column
                      </button>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAddComponent('beam')}
                        role="menuitem"
                      >
                        Beam
                      </button>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={() => handleAddComponent('rates')}
                        role="menuitem"
                      >
                        Rates
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right-side sticky Drawing Panel */}
              <aside className="drawing-panel-container" aria-label="Live drawing panel">
                <DrawingPanel />
              </aside>
            </div>
          )}
        </main>
      </div>

      <UndoSnackbar />
      <VersionHistory
        isOpen={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
      />
    </>
  );
}
