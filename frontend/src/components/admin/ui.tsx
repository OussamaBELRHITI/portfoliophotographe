"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertIcon, CheckIcon } from "./icons";

/** Small shared primitives so the admin screens stay visually consistent. */

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const styles = {
    primary:
      "bg-accent text-ink shadow-sm shadow-black/40 hover:bg-accent-bright disabled:bg-line disabled:text-fg-subtle disabled:shadow-none",
    secondary:
      "border border-line-bright bg-surface-raised text-fg hover:border-fg-subtle hover:bg-line",
    ghost: "text-fg-muted hover:bg-surface-raised hover:text-fg",
    danger: "border border-red-900/70 text-red-400 hover:border-red-700 hover:bg-red-950/50 hover:text-red-300",
  }[variant];

  const sizes = {
    sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
    md: "h-10 gap-2 rounded-lg px-4 text-sm",
  }[size];

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizes} ${styles} ${className}`}
      {...props}
    />
  );
}

/** Square icon-only button with an accessible label and a native tooltip. */
export function IconButton({
  label,
  active = false,
  tone = "default",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  tone?: "default" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-fg-subtle hover:bg-red-950/50 hover:text-red-400"
      : active
        ? "bg-accent/15 text-accent hover:bg-accent/25"
        : "text-fg-subtle hover:bg-surface-raised hover:text-fg";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 ${color} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const fieldBase =
  "w-full rounded-lg border bg-ink px-3.5 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle focus:border-accent focus:ring-3 focus:ring-accent/15";

function FieldShell({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-400">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-fg-subtle">{hint}</span>
      )}
    </label>
  );
}

export function Input({
  label,
  hint,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <input
        className={`${fieldBase} h-10 ${error ? "border-red-800" : "border-line"} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <textarea
        className={`${fieldBase} py-2.5 leading-relaxed ${error ? "border-red-800" : "border-line"} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <select className={`${fieldBase} h-10 cursor-pointer border-line ${className}`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-line-bright"
      }`}
    >
      {/*
        Anchored with left-0.5 and moved by translate-x-4 (16px). The pill is 36px and the knob
        16px, so 2px inset on each side leaves exactly 16px of travel. Fractional steps like
        translate-x-4.5 are not in Tailwind 4's scale — they silently emit nothing, which
        parks the knob outside the pill.
      */}
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-emerald-900/60 bg-emerald-950/40 text-emerald-300";
  const Icon = kind === "error" ? AlertIcon : CheckIcon;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      <Icon size={18} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "muted" | "success";
}) {
  const styles = {
    neutral: "bg-surface-raised text-fg-muted ring-line-bright",
    accent: "bg-accent/15 text-accent ring-accent/30",
    muted: "bg-ink text-fg-subtle ring-line",
    success: "bg-emerald-950/60 text-emerald-300 ring-emerald-900",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${styles}`}
    >
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-fg-subtle">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-bright px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-fg-subtle">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-subtle">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
