import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorForIndex } from '../../styles/chartPalette';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(value);
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function MonthlyTrendChart({ data, seriesNames }: { data: Array<Record<string, number>>; seriesNames: string[] }) {
  const chartData = data.map((row) => ({ ...row, monthLabel: MONTH_LABELS[row.month - 1] }));
  const hasData = data.some((row) => seriesNames.some((name) => row[name] != null));

  return (
    <div className="card-surface animate-fade-in-up" style={{ padding: '1.1rem', height: 340, animationDelay: '150ms' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: 'var(--font-size-md)' }}>Tendencia mensual por tipo de gasto</h3>
      {!hasData ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Todavía no hay pagos registrados este año.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="88%">
          <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="monthLabel" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
            <YAxis
              stroke="var(--color-text-secondary)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={formatCompact}
              domain={[0, (dataMax: number) => Math.ceil((dataMax * 1.1) / 100) * 100]}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
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
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
