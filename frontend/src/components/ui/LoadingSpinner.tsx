export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const s = { sm: 16, md: 24, lg: 40 }[size];
  return (
    <svg
      width={s} height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ animationDuration: '0.7s' }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(0,200,200,0.2)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#00c8c8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="lg" />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Carregando...</p>
    </div>
  </div>
);
