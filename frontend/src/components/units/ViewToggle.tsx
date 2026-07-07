import { useUIState } from '../../contexts/UIStateContext';

export function ViewToggle() {
  const { viewMode, setViewMode } = useUIState();
  return (
    <div className="card-surface" style={{ display: 'inline-flex', padding: 4, gap: 4 }}>
      {(['cards', 'list'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className="btn"
          style={{
            border: 'none',
            background: viewMode === mode ? 'var(--color-accent)' : 'transparent',
            color: viewMode === mode ? 'var(--color-accent-text-on)' : 'var(--color-text-secondary)',
          }}
        >
          {mode === 'cards' ? '▦ Tarjetas' : '☰ Lista'}
        </button>
      ))}
    </div>
  );
}
