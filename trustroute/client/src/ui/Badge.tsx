import type { ReactNode } from "react";

export type BadgeVariant =
  | "real"
  | "simulated"
  | "failover"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "primary"
  | "backup";

const VARIANTS: Record<BadgeVariant, string> = {
  real: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  simulated: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  failover: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  primary: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  backup: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

const DOTS: Record<BadgeVariant, string> = {
  real: "bg-emerald-400",
  simulated: "bg-slate-400",
  failover: "bg-amber-400",
  success: "bg-emerald-400",
  error: "bg-rose-400",
  warning: "bg-amber-400",
  info: "bg-cyan-400",
  primary: "bg-cyan-400",
  backup: "bg-amber-400",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

// Small pill badge — e.g. "REAL PAYMENT", "SIMULATED", "FAILOVER ACTIVE".
export default function Badge({ variant, children, dot, pulse, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wider ${VARIANTS[variant]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${DOTS[variant]} ${pulse ? "animate-pulse" : ""}`} />
      )}
      {children}
    </span>
  );
}