import { TriangleAlert, ArrowRightLeft } from "lucide-react";
import Badge from "../ui/Badge";

interface FailoverAlertProps {
  messages: string[];
}

export default function FailoverAlert({ messages }: FailoverAlertProps) {
  return (
    <div className="rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-400/[0.14] via-amber-400/[0.06] to-gray-900 p-5 shadow-xl shadow-amber-900/20 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/15">
          <TriangleAlert className="h-4.5 w-4.5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-amber-300">
              ⚠️ Failover Active — switched to backup provider
            </p>
            <Badge variant="failover" dot pulse>
              FAILOVER
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-amber-200/90">
            A primary provider failed during execution — the agent rerouted autonomously and the task completed on the backup provider.
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-amber-400/15 pt-3">
        {messages.map((m, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-300 animate-step-in" style={{ animationDelay: `${i * 60}ms` }}>
            <ArrowRightLeft className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/80" />
            <span className="min-w-0">{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}