export function KpiTile({
  label,
  value,
  tone,
  index = 0,
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'default';
  index?: number;
}) {
  return (
    <div
      className="card-surface animate-fade-in-up"
      style={{ padding: '1.1rem 1.25rem', flex: '1 1 200px', minWidth: 180, animationDelay: `${index * 60}ms` }}
    >
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 700,
          marginTop: '0.3rem',
          color: tone === 'accent' ? 'var(--color-accent)' : 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
