import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { ComponentType } from '../engine/types';

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const name = useProjectStore((s) => s.name);
  const components = useProjectStore((s) => s.components);
  const currentView = useProjectStore((s) => s.currentView);
  const setCurrentView = useProjectStore((s) => s.setCurrentView);
  const expandedComponentIds = useProjectStore((s) => s.expandedComponentIds);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const addComponent = useProjectStore((s) => s.addComponent);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const footings = components.filter((c) => c.type === 'footing');
  const columns = components.filter((c) => c.type === 'column');
  const beams = components.filter((c) => c.type === 'beam');
  const rates = components.find((c) => c.type === 'rates');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectComponent = (id: string) => {
    if (currentView === 'sheet') {
      setCurrentView('cards');
    }
    if (!expandedComponentIds.includes(id)) {
      toggleExpanded(id);
    }
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('card--highlighted');
        // Force reflow
        void el.offsetWidth;
        el.classList.add('card--highlighted');
        setTimeout(() => {
          el.classList.remove('card--highlighted');
        }, 1300);
      }
    }, 60);
  };

  const handleAdd = (type: ComponentType) => {
    addComponent(type);
    setAddMenuOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="sidebar" aria-label="Project components navigation">
      <div className="sidebar__header">
        <span>Project tree</span>
      </div>

      <div className="sidebar__tree">
        <div className="tree-group">
          <div className="tree-group__title">
            <span>Project</span>
          </div>
          <div
            className="tree-item"
            style={{ fontWeight: 500 }}
            title={name}
            onClick={() => {
              if (currentView === 'sheet') setCurrentView('cards');
            }}
          >
            <span>{name}</span>
          </div>
        </div>

        {footings.length > 0 && (
          <div className="tree-group">
            <div className="tree-group__title">
              <span>Footings</span>
              <span className="tree-group__count">{footings.length}</span>
            </div>
            {footings.map((c) => (
              <div
                key={c.id}
                className={`tree-item ${expandedComponentIds.includes(c.id) ? 'tree-item--active' : ''}`}
                onClick={() => handleSelectComponent(c.id)}
                title={c.name}
              >
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {columns.length > 0 && (
          <div className="tree-group">
            <div className="tree-group__title">
              <span>Columns</span>
              <span className="tree-group__count">{columns.length}</span>
            </div>
            {columns.map((c) => (
              <div
                key={c.id}
                className={`tree-item ${expandedComponentIds.includes(c.id) ? 'tree-item--active' : ''}`}
                onClick={() => handleSelectComponent(c.id)}
                title={c.name}
              >
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {beams.length > 0 && (
          <div className="tree-group">
            <div className="tree-group__title">
              <span>Beams</span>
              <span className="tree-group__count">{beams.length}</span>
            </div>
            {beams.map((c) => (
              <div
                key={c.id}
                className={`tree-item ${expandedComponentIds.includes(c.id) ? 'tree-item--active' : ''}`}
                onClick={() => handleSelectComponent(c.id)}
                title={c.name}
              >
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {rates && (
          <div className="tree-group">
            <div className="tree-group__title">
              <span>Rates</span>
            </div>
            <div
              className={`tree-item ${expandedComponentIds.includes(rates.id) ? 'tree-item--active' : ''}`}
              onClick={() => handleSelectComponent(rates.id)}
              title={rates.name}
            >
              <span>{rates.name}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--hairline)', position: 'relative' }} ref={addMenuRef}>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ width: '100%', fontSize: 12, justifyContent: 'flex-start', padding: '0 8px' }}
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          aria-expanded={addMenuOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add component</span>
        </button>

        {addMenuOpen && (
          <div className="menu-dropdown" style={{ bottom: '100%', top: 'auto', left: 8, right: 'auto', marginBottom: 4 }} role="menu">
            <button type="button" className="menu-item" onClick={() => handleAdd('footing')} role="menuitem">
              Footing
            </button>
            <button type="button" className="menu-item" onClick={() => handleAdd('column')} role="menuitem">
              Column
            </button>
            <button type="button" className="menu-item" onClick={() => handleAdd('beam')} role="menuitem">
              Beam
            </button>
            <button type="button" className="menu-item" onClick={() => handleAdd('rates')} role="menuitem">
              Rates
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
