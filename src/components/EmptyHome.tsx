import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { ComponentType } from '../engine/types';

export function EmptyHome() {
  const addComponent = useProjectStore((s) => s.addComponent);
  const loadSampleProject = useProjectStore((s) => s.loadSampleProject);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (type: ComponentType) => {
    addComponent(type);
    setDropdownOpen(false);
  };

  return (
    <div className="empty-home">
      <h2 className="empty-home__title">Add a component</h2>
      <p className="empty-home__sub">
        Start building your Bar Bending Schedule by adding a footing, column, beam, or rates component.
      </p>

      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
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

        {dropdownOpen && (
          <div className="menu-dropdown" style={{ left: 0, right: 'auto' }} role="menu">
            <button
              type="button"
              className="menu-item"
              onClick={() => handleSelect('footing')}
              role="menuitem"
            >
              Footing
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleSelect('column')}
              role="menuitem"
            >
              Column
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleSelect('beam')}
              role="menuitem"
            >
              Beam
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleSelect('rates')}
              role="menuitem"
            >
              Rates
            </button>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          className="quiet-link"
          onClick={() => loadSampleProject()}
        >
          Load sample (Sir SRK example)
        </button>
      </div>
    </div>
  );
}
