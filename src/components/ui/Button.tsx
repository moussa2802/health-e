import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'accent' | 'soft' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  accent:  'bg-accent text-white hover:bg-accent/90',
  soft:    'bg-paper text-ink border border-line hover:bg-paper-dark',
  ghost:   'bg-transparent text-ink-soft hover:bg-paper',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-5 py-2.5 gap-2',
  lg: 'text-base px-7 py-3 gap-2.5',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center font-semibold
      rounded-pill transition-all duration-200 ease-bounce
      disabled:opacity-50 disabled:cursor-not-allowed
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}
    {...props}
  >
    {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
    {children}
  </button>
);

export default Button;
