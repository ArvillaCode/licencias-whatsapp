import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function MainNav({ collapsed }: { collapsed: boolean }) {
  const { isAdmin } = useAuth();

  const items = [
    { to: '/', label: 'Dashboard', icon: '📊', end: true, show: true },
    { to: '/unidades', label: 'Unidades', icon: '🏢', end: false, show: true },
    { to: '/usuarios', label: 'Usuarios', icon: '👤', end: false, show: isAdmin },
  ].filter((item) => item.show);

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.55rem 0.7rem',
            borderRadius: 8,
            textDecoration: 'none',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            background: isActive ? 'var(--color-accent-glow)' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            justifyContent: collapsed ? 'center' : 'flex-start',
          })}
        >
          <span aria-hidden>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
