import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function UnitComparisonChart({ data }: { data: Array<{ unit: string; total: number }> }) {
  return (
    <div className="card-surface" style={{ padding: '1.1rem', height: 340 }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--font-size-md)' }}>Total pagado por unidad (año)</h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="unit"
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={150}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text-primary)',
              fontSize: 13,
            }}
          />
          <Bar dataKey="total" fill="var(--color-accent)" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
