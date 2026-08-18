import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

// Base section card — every block of the dashboard uses this surface.
export default function Panel({ children, className = "", glow = false }: PanelProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/30 animate-fade-up transition-colors duration-300 sm:p-6 ${
        glow ? "glow-hover border-gray-700/70" : "hover:border-gray-700/70"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  icon,
  label,
  title,
  right,
}: {
  icon?: ReactNode;
  label: string;
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
          {label}
        </p>
        {title && <h3 className="mt-0.5 text-sm font-bold text-white">{title}</h3>}
      </div>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </div>
  );
}