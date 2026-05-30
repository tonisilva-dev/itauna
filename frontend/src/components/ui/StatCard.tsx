import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
  onClick?: () => void;
}

export const StatCard = ({
  label, value, icon: Icon, iconColor = '#57d8ff', iconBg = 'rgba(87,216,255,.12)',
  change, changeLabel, loading, onClick,
}: StatCardProps) => (
  <div
    className={`card card-hover stat-card-premium ${onClick ? 'cursor-pointer' : ''}`}
    style={{
      padding: 'clamp(12px,3vw,20px)',
      ['--icon-glow-color' as any]: iconColor,
    }}
    onClick={onClick}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 'clamp(8px,2vw,14px)' }}>
      {/* Label + value */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'clamp(0.56rem, 1.5vw, 0.68rem)', /* Label levemente menor para caber textos inteiros */
          fontWeight: 600,
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </p>

        {loading ? (
          <div style={{ height: 28, width: 80, borderRadius: 8, marginTop: 6, background: 'rgba(255,255,255,0.07)', animation: 'pulse 2s infinite' }} />
        ) : (
          <p style={{
            fontSize: 'clamp(0.92rem, 2.6vw, 1.25rem)', /* Redimensionado proporcionalmente */
            fontWeight: 700,
            color: '#fff',
            marginTop: 'clamp(2px,0.5vw,6px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap', /* Elimina totalmente as quebras de linha em valores */
            wordBreak: 'keep-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {value}
          </p>
        )}
      </div>

      {/* Icon */}
      <div style={{
        width: 'clamp(34px,7vw,44px)',
        height: 'clamp(34px,7vw,44px)',
        borderRadius: 12,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: iconBg,
      }}>
        <Icon style={{ width: 'clamp(14px,3vw,20px)', height: 'clamp(14px,3vw,20px)', color: iconColor }} />
      </div>
    </div>

    {change !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {change >= 0
          ? <TrendingUp  style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0 }} />
          : <TrendingDown style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />}
        <span style={{ fontSize: 'clamp(0.7rem,1.8vw,0.8rem)', fontWeight: 600, color: change >= 0 ? '#10b981' : '#ef4444' }}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
        {changeLabel && (
          <span style={{ fontSize: 'clamp(0.65rem,1.8vw,0.78rem)', color: 'rgba(255,255,255,0.35)' }}>
            {changeLabel}
          </span>
        )}
      </div>
    )}
  </div>
);
