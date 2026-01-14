import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  icon, 
  className, 
  style, 
  disabled, 
  ...props 
}) => {
  let baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: variant === 'icon' ? '8px' : '10px 20px',
    borderRadius: '12px',
    fontWeight: 500,
    fontSize: '0.9rem',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    outline: 'none',
    opacity: disabled || isLoading ? 0.7 : 1,
    ...style
  };

  if (variant === 'primary') {
    baseStyle = {
      ...baseStyle,
      background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
      color: 'white',
      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
    };
  } else if (variant === 'secondary') {
    baseStyle = {
      ...baseStyle,
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-primary)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    };
  } else if (variant === 'danger') {
    baseStyle = {
      ...baseStyle,
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    };
  } else if (variant === 'ghost') {
    baseStyle = {
      ...baseStyle,
      background: 'transparent',
      color: 'var(--text-secondary)',
    };
  } else if (variant === 'icon') {
    baseStyle = {
      ...baseStyle,
      background: 'transparent',
      color: 'var(--text-secondary)',
      padding: '8px',
      borderRadius: '8px',
    };
  }

  return (
    <button 
      type="button"
      style={baseStyle} 
      className={className} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;
