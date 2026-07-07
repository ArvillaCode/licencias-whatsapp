import { useRef, useState } from 'react';
import type { Evidence } from '../../types/models';

export function EvidenceUploader({
  evidences,
  onUpload,
  onDelete,
  uploading,
}: {
  evidences: Evidence[];
  onUpload: (files: File[]) => void;
  onDelete: (id: number) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Evidence | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {evidences.map((ev) => (
          <div
            key={ev.id}
            className="card-surface"
            style={{ position: 'relative', width: 84, height: 84, overflow: 'hidden', cursor: 'pointer' }}
          >
            <img
              src={`/uploads/evidence/${ev.monthlyRecordId}/${ev.fileName}`}
              alt={ev.originalName}
              onClick={() => setPreview(ev)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              onClick={() => onDelete(ev.id)}
              title="Eliminar foto"
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                background: 'rgba(8,12,20,0.75)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                width: 22,
                height: 22,
                lineHeight: '22px',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 84,
            height: 84,
            flexDirection: 'column',
            gap: '0.25rem',
            borderStyle: 'dashed',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>＋</span>
          <span style={{ fontSize: 'var(--font-size-xs)' }}>{uploading ? 'Subiendo…' : 'Evidencia'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onUpload(files);
            e.target.value = '';
          }}
        />
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <img
            src={`/uploads/evidence/${preview.monthlyRecordId}/${preview.fileName}`}
            alt={preview.originalName}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}
