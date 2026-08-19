import {
  RefreshCw,
  CloudSun,
  Newspaper,
  Sparkles,
  PenLine,
  Bitcoin,
  HelpCircle,
  CheckCircle2,
  XCircle,
  TriangleAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { SmartRunResponse, SmartStepResult } from "../types";
import Badge from "../ui/Badge";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  weather: CloudSun,
  news: Newspaper,
  finance: Bitcoin,
  research: Sparkles,
  writing: PenLine,
  general: HelpCircle,
};

interface SmartResultSectionProps {
  response: SmartRunResponse;
  onReset: () => void;
}

const allSucceeded = (r: SmartRunResponse) => r.results.every((x) => x.success);

export default function SmartResultSection({ response, onReset }: SmartResultSectionProps) {
  const succeeded = allSucceeded(response);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/30 animate-fade-up transition-colors duration-300 hover:border-gray-700/70 sm:p-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
              Smart Agent Engine
            </p>
            <h3 className="mt-0.5 text-base font-bold text-white">
              {succeeded ? "Agent verdict delivered" : "Agent reported problems"}
            </h3>
          </div>
          <Badge variant={succeeded ? "success" : "error"} dot className="ml-2">
            {succeeded ? "DONE" : "PARTIAL"}
          </Badge>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Run another
        </button>
      </div>

      {/* meta chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5">
          {response.steps.length} step{response.steps.length > 1 ? "s" : ""}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5">
          priority: {response.priority.toLowerCase()}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5">
          budget: {response.budget} ALGO
        </span>
        {response.usedFailover && (
          <Badge variant="failover" dot pulse>
            FAILOVER USED
          </Badge>
        )}
      </div>

      {/* per-step results */}
      <div className="mt-4 space-y-3">
        {response.results.map((step, i) => (
          <StepCard key={i} step={step} index={i} />
        ))}
      </div>

      <p className="mt-4 border-t border-gray-800 pt-3 text-center text-[10px] text-slate-600">
        Smart Engine: classify task → score services by priority → failover on bad
        responses. No x402 payment in this flow.
      </p>
    </div>
  );
}

function StepCard({ step, index }: { step: SmartStepResult; index: number }) {
  const Icon = CATEGORY_ICON[step.category] ?? HelpCircle;
  const attempts = step.attempts;

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <Icon className="h-3.5 w-3.5 text-cyan-300" />
        </span>
        <span className="text-xs font-bold text-white">
          {index + 1}. {step.success ? step.service?.name ?? "Completed" : "No service succeeded"}
        </span>
        <Badge variant="info">{step.category}</Badge>
        {step.success ? (
          <Badge variant="success" dot>
            {attempts.length > 1 || step.usedFailover ? "FAILOVER" : "OK"}
          </Badge>
        ) : (
          <Badge variant="error" dot>
            FAILED
          </Badge>
        )}
        {step.success && step.latencyMs != null && (
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            {step.latencyMs}ms
          </span>
        )}
      </div>

      {step.success && step.result && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-700/50 bg-gray-950/60 p-3 text-[13px] leading-relaxed text-slate-200">
          {step.result}
        </div>
      )}

      {!step.success && step.error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-300">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {step.error}
        </p>
      )}

      {attempts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-700/40 pt-2.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Attempts
          </span>
          {attempts.map((a, i) => (
            <span
              key={i}
              title={a.reason ? `${a.reason}${a.ms != null ? ` · ${a.ms}ms` : ""}` : `${a.provider ?? "call"}${a.ms != null ? ` · ${a.ms}ms` : ""}`}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                a.status === "ok"
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : a.status === "error"
                    ? "border-rose-400/25 bg-rose-400/10 text-rose-300"
                    : a.status === "bad_response"
                      ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                      : "border-slate-400/25 bg-slate-400/10 text-slate-400"
              }`}
            >
              {a.status === "ok" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : a.status === "error" ? (
                <XCircle className="h-3 w-3" />
              ) : a.status === "bad_response" ? (
                <TriangleAlert className="h-3 w-3" />
              ) : null}
              {a.service}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}