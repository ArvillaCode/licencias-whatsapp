import { useState } from 'react';
import { useDashboardSummary } from '../../hooks/useDashboard';
import { KpiTile } from './KpiTile';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ExpenseBreakdownChart } from './ExpenseBreakdownChart';
import { UnitComparisonChart } from './UnitComparisonChart';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

export function DashboardView() {
  const [year, setYear] = useState(currentYear);
  const { data, isLoading, isError } = useDashboardSummary(year);

  const seriesNames = data?.expenseBreakdown.map((e) => e.name) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>Dashboard</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-secondary)' }}>
            Resumen de recibos y gastos de todas las unidades
          </p>
        </div>
        <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando dashboard…</div>}
      {isError && <div style={{ color: 'var(--color-danger)' }}>No se pudo cargar el dashboard.</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <KpiTile label="Meses pendientes" value={String(data.kpis.pendingCount)} tone={data.kpis.pendingCount > 0 ? 'accent' : 'default'} />
            <KpiTile
              label={`Total pagado este mes`}
              value={data.kpis.totalPaidThisMonth.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            />
            <KpiTile label="Próximos vencimientos" value={String(data.kpis.upcomingDueDates.length)} />
          </div>

          {data.kpis.upcomingDueDates.length > 0 && (
            <div className="card-surface" style={{ padding: '1rem 1.25rem' }}>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Próximos vencimientos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {data.kpis.upcomingDueDates.map((d) => (
                  <div key={d.billId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                    <span>{d.unit} — {d.type}</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(d.dueDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
            <MonthlyTrendChart data={data.monthlyTrend} seriesNames={seriesNames} />
            <ExpenseBreakdownChart data={data.expenseBreakdown} />
          </div>

          <UnitComparisonChart data={data.unitComparison} />
        </>
      )}
    </div>
  );
}
