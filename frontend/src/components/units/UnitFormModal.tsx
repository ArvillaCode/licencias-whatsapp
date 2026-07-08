import { useState, type FormEvent } from 'react';
import { useCreateUnit } from '../../hooks/useUnits';

export function UnitFormModal({ onClose }: { onClose: () => void }) {
  const createUnit = useCreateUnit();
  const [address, setAddress] = useState('');
  const [apartmentNo, setApartmentNo] = useState('');
  const [name, setName] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await createUnit.mutateAsync({ address, apartmentNo, name: name || undefined });
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card-surface animate-scale-in"
        style={{ width: 380, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
      >
        <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Nueva unidad</h2>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Dirección</span>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} required autoFocus />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}># Apto</span>
          <input className="input" value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} required />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Nombre (opcional)
          </span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.4rem' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={createUnit.isPending}>
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}
