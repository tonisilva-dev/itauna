import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { PanicButton } from '@/components/ui/PanicButton';

export const AppLayout = () => (
  <>
    {/* Ambient background */}
    <div
      className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
      style={{ backgroundImage: "url('/login-bg-natureza.webp')", opacity: 1, filter: 'brightness(0.18) saturate(0.7)' }}
      aria-hidden="true"
    />
    <div className="bg-orbs" aria-hidden="true">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="bg-orb bg-orb-c" />
    </div>
    <div className="bg-grid"  aria-hidden="true" />
    <div className="bg-noise" aria-hidden="true" />

    {/* Shell */}
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100svh', width: '100%' }}>
      <AppHeader />
      <main style={{ flex: 1, overflow: 'hidden', width: '100%', minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </div>
      </main>
      <PanicButton />
    </div>
  </>
);
