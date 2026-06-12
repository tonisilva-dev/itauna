import React from 'react';
import type { ReactNode } from 'react';
import './CarouselNavigation.css';

export interface SlideBadge {
  icon: string | ReactNode;
  label: string;
}

interface SlidePanelProps {
  title?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  badges?: SlideBadge[];
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number | string;
}

export const SlidePanel: React.FC<SlidePanelProps> = ({
  title,
  eyebrow,
  subtitle,
  badges,
  actions,
  children,
  maxWidth = 900,
}) => {
  const hasBadges = badges && badges.length > 0;

  return (
    <div className="sp-root">
      <div className="sp-inner" style={{ maxWidth }}>

        {/* ── CABEÇALHO ── */}
        <div className="sp-head">
          <div className="sp-head-left">
            <div className="sp-brand">
              <span className="sp-dot" />
              <span className="sp-eyebrow">{eyebrow ?? 'Itaúna'}</span>
            </div>
            {title && <h1 className="sp-title">{title}</h1>}
            {subtitle && <p className="sp-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="sp-actions">{actions}</div>}
        </div>

        {/* ── BADGES / STATS ── */}
        {hasBadges && (
          <div className="sp-badges-row">
            {badges!.map((b, i) => (
              <div key={i} className="sp-badge">
                <span className="sp-badge-icon">
                  {b.icon}
                </span>
                <span className="sp-badge-label">{b.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── CONTEÚDO ── */}
        <div className="sp-body">
          <div className="sp-content">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
};
