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
  badges?: SlideBadge[];
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Layout de 3 zonas — todas em fluxo flex, sem posicionamento absoluto:
 *
 *  ┌─────────────────────────────┐
 *  │  HEADER  (altura fixa)      │  eyebrow + actions
 *  ├─────────────────────────────┤
 *  │  BODY    (flex-1, scroll)   │  title + children
 *  ├─────────────────────────────┤
 *  │  FOOTER  (altura fixa)      │  badges
 *  └─────────────────────────────┘
 */
export const SlidePanel: React.FC<SlidePanelProps> = ({
  title,
  eyebrow,
  badges,
  actions,
  children,
}) => {
  const hasBadges = badges && badges.length > 0;

  return (
    <div className="sp-root">

      {/* ── HEADER ── */}
      <div className="sp-head">
        <div className="sp-brand">
          <span className="sp-dot" />
          <span className="sp-eyebrow">{eyebrow ?? 'Itaúna'}</span>
        </div>
        {actions && <div className="sp-actions">{actions}</div>}
      </div>

      {/* ── BODY ── */}
      <div className="sp-body">
        {title && <h2 className="sp-title">{title}</h2>}
        <div className="sp-content">
          {children}
        </div>
      </div>

      {/* ── FOOTER / BADGES ── */}
      {hasBadges && (
        <div className="sp-foot">
          {badges!.map((b, i) => (
            <div key={i} className="sp-badge">
              <span className="sp-badge-icon">
                {typeof b.icon === 'string' ? b.icon : b.icon}
              </span>
              <span className="sp-badge-label">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
