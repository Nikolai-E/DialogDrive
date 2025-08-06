import * as React from 'react';

export const PinToggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }>= ({ value, onChange }) => {
  return (
    <button type="button" onClick={() => onChange(!value)} className={value ? 'text-yellow-500' : 'text-muted-foreground'} aria-pressed={value} aria-label="Toggle pin">
      {value ? '📌' : '📍'}
    </button>
  );
};
