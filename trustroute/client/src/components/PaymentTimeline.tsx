import {
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  TriangleAlert,
  Sparkles,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import type { LogEntry, LogStatus } from "../types";
import Badge from "../ui/Badge";

const STATUS_STYLE: Record<LogStatus, string> = {
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  running: "text-cyan-400",
  info: "text-slate-400",
};

const STATUS_GLOW: Record<LogStatus, string> = {
  success: "shadow-[0_0_14px_rgba(52,211,153,0.45)] border-emerald-400/40",
  error: "shadow-[0_0_14px_rgba(251,113,133,0.45)] border-rose-400/40",
  warning: "shadow-[0_0_14px_rgba(251,191,36,0.45)] border-amber-400/40",
  running: "shadow-[0_0_14px_rgba(34,211,238,0.5)] border-cyan-400/40",
  info: "border-white/10",
};

const STATUS_CONNECTOR: Record<LogStatus, string> = {
  success: "bg-gradient-to-b from-emerald-400/70 to-emerald-400/20",
  error: "bg-gradient-to-b from-rose-400/70 to-rose-400/20",
  warning: "bg-gradient-to-b from-amber-400/70 to-amber-400/20",
  running: "bg-gradient-to-b from-cyan-400/70 to-indigo-500/30",
  info: "bg-gradient-to-b from-slate-500/60 to-slate-500/10",
};

const ICONS: Record<string, React.ReactNode> = {
  API_REQUEST: <Info className="h-3.5 w-3.5" />,
  PLANNING: <Sparkles className="h-3.5 w-3.5" />,
  BUDGET_CHECK: <TriangleAlert className="h-3.5 w-3.5" />,
  PAYMENT_REQUIRED: <XCircle className="h-3.5 w-3.5" />,
  PAYMENT_SENT: <Loader2 className="h-3.5 w-3.5" />,
  PAYMENT_VERIFIED: <ShieldCheck className="h-3.5 w-3.5" />,
  REQUEST_RETRIED: <Loader2 className="h-3.5 w-3.5" />,
  RESULT_RECEIVED: <CheckCircle2 className="h-3.5 w-3.5" />,
  FAILOVER_TRIGGERED: <ArrowRightLeft className="h-3.5 w-3.5" />,
};

const STEP_LABEL: Record<string, string> = {
  API_REQUEST: "API Request",
  PLANNING: "Agent Decision",
  BUDGET_CHECK: "Budget Guard",
  PAYMENT_REQUIRED: "402 Payment Required",
  PAYMENT_SENT: "Payment Sent",
  PAYMENT_VERIFIED: "Payment Verified",
  REQUEST_RETRIED: "Request Retried",
  RESULT_RECEIVED: "Result Received",
  FAILOVER_TRIGGERED: "Failover Triggered",
};

interface PaymentTimelineProps {
  logs: LogEntry[];
  live?: boolean;
  compact?: boolean;
}

export default function PaymentTimeline({ logs, live, compact }: PaymentTimelineProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl shadow-black/30 animate-fade-up transition-colors duration-300 hover:border-gray-700/70 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
              Payment Timeline
            </p>
            <h3 className={`mt-0.5 font-bold text-white ${compact ? "text-sm" : "text-base"}`}>
              {live ? "Live settlement trace" : "x402 settlement trace"}
            </h3>
          </div>
        </div>
        {live && (
          <Badge variant="real" dot pulse>
            LIVE
          </Badge>
        )}
      </div>

      <ol className={`relative ${compact ? "" : "max-h-[420px] overflow-y-auto pr-1"}`}>
        {logs.length === 0 && (
          <p className="py-4 text-center text-xs text-slate-500">No events yet — the agent is warming up…</p>
        )}
        {logs.map((log, i) => {
          const isLast = i === logs.length - 1;
          const isFailover = log.step === "FAILOVER_TRIGGERED";
          return (
            <li
              key={i}
              className="relative flex gap-3 pb-5 last:pb-0 animate-step-in"
              style={{ animationDelay: live ? "0ms" : `${Math.min(i * 35, 350)}ms` }}
            >
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 h-full w-[2px] rounded-full ${STATUS_CONNECTOR[log.status]} shadow-[0_0_6px_rgba(34,211,238,0.2)]`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-[#0d1526] transition-all duration-500 ${STATUS_STYLE[log.status]} ${STATUS_GLOW[log.status]}`}
              >
                <span className={log.status === "running" ? "animate-spin" : ""}>
                  {ICONS[log.step] ?? <Info className="h-3.5 w-3.5" />}
                </span>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-white">
                    {STEP_LABEL[log.step] ?? log.step}
                  </span>
                  {isFailover && <Badge variant="failover">FAILOVER ACTIVE</Badge>}
                  {log.service && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-px text-[10px] text-slate-400">
                      {log.service}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-slate-500">
                    +{log.timestamp.toFixed(1)}s
                  </span>
                </div>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-400">{log.message}</p>
              </div>
            </li>
          );
        })}

        {/* pending row — live mode */}
        {live && (
          <li className="relative flex gap-3 pt-1 animate-step-in">
            <span className="absolute -top-6 left-[11px] h-6 w-[2px] rounded-full bg-gradient-to-b from-slate-500/40 to-slate-500/10" />
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0d1526]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <span className="text-xs font-medium text-slate-500">Awaiting next event…</span>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}