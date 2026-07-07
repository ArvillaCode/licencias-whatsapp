import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="btn"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
    >
      <span aria-hidden>{theme === 'dark' ? '🌙' : '☀️'}</span>
      {!collapsed && <span>{theme === 'dark' ? 'Tema oscuro' : 'Tema claro'}</span>}
    </button>
  );
}
