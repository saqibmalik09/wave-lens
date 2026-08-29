'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground relative overflow-x-clip py-10 px-4">
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      {children}
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl relative z-10">
      {children}
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 mb-4 shadow-lg shadow-purple-600/25">
        <span className="font-bold text-white text-xl">W</span>
      </div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
        Wave Lens Studio
      </h1>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground ml-1">{children}</label>;
}

export function TextInput({
  icon: Icon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative group">
      {Icon && (
        <Icon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      )}
      <input
        {...props}
        className={cn(
          'w-full bg-background/50 border border-input focus:border-primary/50 rounded-lg py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all ring-0 focus:ring-2 focus:ring-primary/10 shadow-sm disabled:opacity-50',
          Icon ? 'pl-9 pr-3' : 'px-3',
          className,
        )}
      />
    </div>
  );
}

export function PrimaryButton({
  loading,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-md shadow-purple-600/20 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2',
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-600">
      {message}
    </div>
  );
}

export function OutlineButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'h-9 px-4 rounded-lg border border-border bg-background/60 hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/40 via-background to-background" />
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card/90 backdrop-blur p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning';
}) {
  const tones = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-emerald-500/15 text-emerald-700',
    warning: 'bg-amber-500/15 text-amber-700',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}
