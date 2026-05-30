import { initials } from '../../utils/format';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar = ({ name, url, size = 'md', className = '' }: AvatarProps) => {
  const cls = `${sizes[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${className}`;

  if (url) {
    return <img src={url} alt={name} className={`${cls} object-cover`} />;
  }

  return (
    <div
      className={cls}
      style={{
        background: 'linear-gradient(135deg, #00c8c8, #0080ff)',
        color: '#0a0f1e',
      }}
    >
      {initials(name)}
    </div>
  );
};
