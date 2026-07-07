import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useUIState } from '../../contexts/UIStateContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIState();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div
        className={`mobile-backdrop${mobileMenuOpen ? ' open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <main className="app-main" style={{ flex: 1, padding: '1.75rem', maxWidth: '100%', overflowX: 'hidden' }}>
        <div className="mobile-topbar">
          <button className="btn" onClick={() => setMobileMenuOpen(true)} title="Abrir menú">
            ☰
          </button>
          <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>APTO ADMIN</span>
        </div>
        {children}
      </main>
    </div>
  );
}
