import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, fullWidth = false, style, className, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: 'rgba(2, 6, 23, 0.5)',
          border: '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '12px 14px',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'all 0.2s',
          width: '100%',
          boxSizing: 'border-box',
          ...style
        }}
        className={className}
        {...props}
      />
    </div>
  );
};

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  fullWidth?: boolean;
  options: (SelectOption | SelectOptionGroup)[];
}

export const Select: React.FC<SelectProps> = ({ label, fullWidth = false, options, style, className, ...props }) => {
  const isGroup = (opt: SelectOption | SelectOptionGroup): opt is SelectOptionGroup => {
    return 'options' in opt;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <select
        style={{
          background: 'rgba(2, 6, 23, 0.5)',
          border: '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '12px 14px',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'all 0.2s',
          width: '100%',
          boxSizing: 'border-box',
          cursor: 'pointer',
          ...style
        }}
        className={className}
        {...props}
      >
        {options.map((opt, i) => {
          if (isGroup(opt)) {
            return (
              <optgroup key={i} label={opt.label}>
                {opt.options.map((subOpt) => (
                  <option key={subOpt.value} value={subOpt.value}>
                    {subOpt.label}
                  </option>
                ))}
              </optgroup>
            );
          }
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
};
