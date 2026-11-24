import { useEffect, useRef } from 'react';
import { VERSIONS, VersionItem } from '../data/versions';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ isOpen, onClose }: VersionHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentVersion = VERSIONS.find((v) => v.status === 'present')!;
  const pastVersions = VERSIONS.filter((v) => v.status === 'past');
  const futureVersions = VERSIONS.filter((v) => v.status === 'future');

  let cardIndex = 0;

  return (
    <div
      className="vh-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="QCE Changelog & Roadmap"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="vh-panel" ref={panelRef}>
        {/* Sticky Header */}
        <header className="vh-header">
          <div className="vh-header__title-wrap">
            <span className="vh-header__brand">QCE</span>
            <span className="vh-header__divider">/</span>
            <h1 className="vh-header__title">Changelog & Roadmap</h1>
          </div>
          <div className="vh-header__actions">
            <button
              type="button"
              className="btn btn--ghost vh-btn-back"
              onClick={onClose}
              aria-label="Back to App"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to App</span>
            </button>
            <button
              type="button"
              className="btn-icon vh-btn-close"
              onClick={onClose}
              aria-label="Close changelog"
              title="Close (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="vh-content">
          {/* Subtitle / Intro */}
          <div className="vh-intro">
            <p className="vh-intro__text">
              Track the development milestones of QCE — from the original Excel reference formulas to interactive 2D drafting and beyond.
            </p>
          </div>

          {/* Section: Current Version */}
          <section className="vh-section">
            <div className="vh-section__header">
              <span className="vh-section__badge vh-section__badge--current">Current</span>
              <h2 className="vh-section__title">Present Version</h2>
            </div>
            <div className="vh-cards-grid">
              <VersionCard item={currentVersion} index={cardIndex++} />
            </div>
          </section>

          {/* Section: Released Versions */}
          <section className="vh-section">
            <div className="vh-section__header">
              <span className="vh-section__badge vh-section__badge--past">Released</span>
              <h2 className="vh-section__title">Past Releases</h2>
            </div>
            <div className="vh-cards-grid">
              {pastVersions.map((item) => (
                <VersionCard key={item.version} item={item} index={cardIndex++} />
              ))}
            </div>
          </section>

          {/* Section: Upcoming Roadmap */}
          <section className="vh-section">
            <div className="vh-section__header">
              <span className="vh-section__badge vh-section__badge--future">Upcoming</span>
              <h2 className="vh-section__title">Roadmap</h2>
            </div>
            <div className="vh-cards-grid">
              {futureVersions.map((item) => (
                <VersionCard key={item.version} item={item} index={cardIndex++} />
              ))}
            </div>
          </section>

          {/* Special Thanks Card */}
          <section className="vh-section vh-section--thanks">
            <div className="vh-special-thanks" style={{ animationDelay: `${cardIndex * 60}ms` }}>
              <div className="vh-thanks__icon-wrap" aria-hidden="true">
                <span className="vh-thanks__icon">🎓</span>
              </div>
              <div className="vh-thanks__badge">Special Thanks</div>
              <h3 className="vh-thanks__name">Engr. Shahrukh Khan</h3>
              <p className="vh-thanks__role">
                Instructor — Cost and Estimation<br />
                NED University of Engineering & Technology, Karachi
              </p>
              <blockquote className="vh-thanks__quote">
                “This tool was built to honor your teaching. Every formula in this app comes directly from your Excel sheets and your lectures.”
              </blockquote>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function VersionCard({ item, index }: { item: VersionItem; index: number }) {
  const isPresent = item.status === 'present';
  const isPast = item.status === 'past';

  return (
    <article
      className={`vh-card vh-card--${item.status}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top row */}
      <div className="vh-card__top">
        <div className="vh-card__version-group">
          <span className="vh-card__version-pill">{item.version}</span>
          <span className="vh-card__label">{item.label}</span>
          {isPresent && <span className="vh-card__you-are-here">You are here</span>}
        </div>
        <div className="vh-card__meta">
          <span className={`vh-card__status-dot vh-card__status-dot--${item.status}`} />
          <span className="vh-card__date">{item.date}</span>
        </div>
      </div>

      {/* Summary */}
      <h3 className="vh-card__summary">{item.summary}</h3>

      {/* Features list */}
      <ul className="vh-card__features" aria-label={`Features in ${item.version}`}>
        {item.features.map((feature, fIdx) => (
          <li key={fIdx} className="vh-card__feature-item">
            <span className="vh-card__feature-icon" aria-hidden="true">
              {isPast ? '✓' : isPresent ? '◉' : '◇'}
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
