import React from 'react';

/* Spinner pontilhado — 8 pontos em círculo com fade sequencial */
export const DotsSpinner = ({ size = 44 }: { size?: number }) => {
  const radius   = size * 0.41;
  const dotSize  = size * 0.09;
  const count    = 8;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <style>{`@keyframes dot-fade{0%,100%{opacity:.12}50%{opacity:1}}`}</style>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          position: 'absolute', width: dotSize, height: dotSize, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', top: '50%', left: '50%',
          transform: `rotate(${i * (360 / count)}deg) translate(0, -${radius}px)`,
          transformOrigin: '50% 50%',
          animation: `dot-fade 1s ${i * (1 / count)}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
};

/* Spinner inline pequeno — para uso em botões e linhas */
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const px = { sm: 20, md: 30, lg: 44 }[size];
  return <DotsSpinner size={px} />;
};

/* Loader de página inteira */
export const PageLoader = ({ label = 'Carregando...' }: { label?: string }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 20,
    minHeight: '100svh', width: '100%',
  }}>
    <DotsSpinner size={44} />
    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', fontWeight: 500 }}>
      {label}
    </p>
  </div>
);
