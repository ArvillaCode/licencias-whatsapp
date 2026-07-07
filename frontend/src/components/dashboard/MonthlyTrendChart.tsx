import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorForIndex } from '../../styles/chartPalette';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function MonthlyTrendChart({ data, seriesNames }: { data: Array<Record<string, number>>; seriesNames: string[] }) {
  const chartData = data.map((row) => ({ ...row, monthLabel: MONTH_LABELS[row.month - 1] }));

  return (
    <div className="card-surface" style={{ padding: '1.1rem', height: 340 }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--font-size-md)' }}>Tendencia mensual por tipo de gasto</h3>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="monthLabel" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
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
          {seriesNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colorForIndex(i)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
