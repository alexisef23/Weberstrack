import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

// ─── Button ──────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'secondary' | 'gold';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants: Record<string, string> = {
      default:   'btn btn-primary',
      outline:   'btn btn-outline',
      ghost:     'btn btn-ghost',
      danger:    'btn btn-danger',
      secondary: 'btn bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
      gold:      'btn btn-gold',
    };
    const sizes: Record<string, string> = {
      xs:      'h-7 px-2.5 text-xs rounded-lg',
      sm:      'h-8 px-3 text-xs',
      default: 'h-10 px-4',
      lg:      'h-12 px-6 text-base rounded-[14px]',
      icon:    'h-9 w-9 p-0 rounded-[10px]',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variants[variant], sizes[size], 'select-none', className)}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ─── Card ────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat' | 'colored';
  accentColor?: 'primary' | 'gold' | 'success' | 'danger';
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', accentColor, hover, children, ...props }, ref) => {
    const base = variant === 'flat'
      ? 'bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl'
      : 'glass rounded-2xl';
    const accentClass = accentColor ? `stat-card ${accentColor}` : '';
    return (
      <div
        ref={ref}
        className={cn(base, accentClass, hover && 'cursor-pointer hover:border-[var(--primary-light)] transition-colors', 'p-5', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ─── Input ───────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftElement, rightElement, error, label, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-600 text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 text-[var(--text-4)] pointer-events-none flex items-center">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input',
              leftElement && 'pl-10',
              rightElement && 'pr-10',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(220,38,38,.15)]',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 text-[var(--text-4)] flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── Avatar ──────────────────────────────────────────────────────
interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
export function Avatar({ name = '?', src, size = 'md', className }: AvatarProps) {
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-400)] text-white flex-shrink-0', sizeClass, className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover rounded-full" /> : initials}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
interface BadgeProps {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELIVERED';
  children?: React.ReactNode;
  className?: string;
}
export function StatusBadge({ status, children, className }: BadgeProps) {
  const map: Record<string, string> = {
    PENDING:   'badge badge-pending',
    APPROVED:  'badge badge-approved',
    REJECTED:  'badge badge-rejected',
    DELIVERED: 'badge bg-[rgba(12,144,224,.12)] text-[var(--brand-700)]',
  };
  const dot: Record<string, string> = {
    PENDING:   'dot dot-pending',
    APPROVED:  'dot dot-approved',
    REJECTED:  'dot dot-rejected',
    DELIVERED: 'dot bg-[var(--brand-500)]',
  };
  const label: Record<string, string> = {
    PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado', DELIVERED: 'Entregado',
  };
  if (!status) return null;
  return (
    <span className={cn(map[status] ?? 'badge', className)}>
      <span className={dot[status] ?? 'dot'} />
      {children ?? label[status] ?? status}
    </span>
  );
}

// ─── Divider ─────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-[var(--border)]', className)} />;
}

// ─── Section Title ───────────────────────────────────────────────
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('section-title', className)}>{children}</p>;
}

// ─── Shimmer skeleton ────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer h-4 rounded', className)} />;
}

// ─── Empty State ─────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="empty-state">
      {icon ?? <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-4)] mb-2">{icon}</div>}
      <p className="font-semibold text-[var(--text-2)] text-base">{title}</p>
      {description && <p className="text-[var(--text-4)] text-sm max-w-xs">{description}</p>}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={cn('relative w-10 h-6 rounded-full transition-colors duration-200', checked ? 'bg-[var(--primary)]' : 'bg-[var(--border-2)]')}
      >
        <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-1')} />
      </div>
      {label && <span className="text-sm text-[var(--text-2)]">{label}</span>}
    </label>
  );
}
