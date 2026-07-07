import { useEffect, useRef, useState } from 'react';

interface InlineEditableProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  as?: 'span' | 'div';
  fontWeight?: number | string;
  fontSize?: string;
}

export function InlineEditable({ value, placeholder, onSave, fontWeight, fontSize }: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{ fontWeight, fontSize, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Click para editar"
      style={{
        fontWeight,
        fontSize,
        cursor: 'text',
        borderBottom: '1px dashed transparent',
        color: value ? 'inherit' : 'var(--color-text-muted)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = 'var(--color-accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {value || placeholder || '—'}
    </span>
  );
}
