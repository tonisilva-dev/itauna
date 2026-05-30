import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: 'rgba(0,200,200,0.1)', border: '1px solid rgba(0,200,200,0.2)' }}>
      <Icon className="w-8 h-8" style={{ color: '#00c8c8' }} />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    {description && <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 320 }}>{description}</p>}
    {action && (
      <button className="btn-primary" onClick={action.onClick}>{action.label}</button>
    )}
  </div>
);
