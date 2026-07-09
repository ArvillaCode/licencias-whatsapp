import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { MainNav } from './MainNav';

const EDITABLE_DATA_ITEMS = [
  { to: '/configuracion/tipos-recibo', label: 'Tipos de Recibo/Gasto', icon: '🧾' },
  { to: '/configuracion/medios-pago', label: 'Medios de Pago', icon: '💳' },
  { to: '/configuracion/responsables', label: 'Responsables', icon: '🙋' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIState();
  const { user, logout, can } = useAuth();
  const [showEditable, setShowEditable] = useState(true);
  const showCatalogs = can('catalogs');

  return (
    <aside
      className={`card-surface sidebar animate-fade-in${mobileMenuOpen ? ' mobile-open' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a')) setMobileMenuOpen(false);
      }}
      style={{
        width: sidebarCollapsed ? 64 : 240,
        transition: 'width 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0.9rem',
        height: '100vh',
        borderRadius: 0,
        borderRight: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
        {!sidebarCollapsed && (
          <span style={{ fontWeight: 700, letterSpacing: '0.03em', color: 'var(--color-accent)' }}>APTO ADMIN</span>
        )}
        <button
          className="btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
          style={{ padding: '0.4rem 0.55rem' }}
        >
          {sidebarCollapsed ? '»' : '«'}
        </button>
      </div>

      <MainNav collapsed={sidebarCollapsed} />

      {showCatalogs && (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
        {!sidebarCollapsed && (
          <button
            onClick={() => setShowEditable((s) => !s)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.2rem 0.4rem',
              width: '100%',
              textAlign: 'left',
            }}
          >
            Datos editables {showEditable ? '▾' : '▸'}
          </button>
        )}
        {(showEditable || sidebarCollapsed) && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem' }}>
            {EDITABLE_DATA_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.45rem 0.7rem',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-sm)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-glow)' : 'transparent',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                })}
                title={item.label}
              >
                <span aria-hidden>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <ThemeToggle collapsed={sidebarCollapsed} />
        {!sidebarCollapsed && user && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', padding: '0 0.2rem' }}>
            {user.email}
          </div>
        )}
        <button
          className="btn btn-danger"
          onClick={() => logout()}
          style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          title="Cerrar sesión"
        >
          <span aria-hidden>⏻</span>
          {!sidebarCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
