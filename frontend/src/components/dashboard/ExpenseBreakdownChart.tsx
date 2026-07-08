import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colorForIndex } from '../../styles/chartPalette';

export function ExpenseBreakdownChart({ data }: { data: Array<{ name: string; total: number }> }) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="card-surface animate-fade-in-up" style={{ padding: '1.1rem', height: 340, animationDelay: '200ms' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--font-size-md)' }}>Distribución del gasto por tipo</h3>
      {!hasData ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Todavía no hay pagos registrados este año.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="88%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              label={({ name, percent }) => ((percent ?? 0) > 0.03 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : '')}
              labelLine={false}
              fontSize={11}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={colorForIndex(i)} stroke="var(--color-bg-elevated)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text-primary)',
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
