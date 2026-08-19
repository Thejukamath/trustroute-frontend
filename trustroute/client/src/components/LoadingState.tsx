import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import type { LogEntry } from "../types";
import PaymentTimeline from "./PaymentTimeline";

const PHASES = [
  "AI is selecting services and making payments…",
  "Scanning the service marketplace…",
  "Routing task to top-ranked providers…",
  "Detecting paywalls and negotiating x402…",
  "Settling micropayments on Algorand…",
  "Collecting results and auditing receipts…",
];

interface LoadingStateProps {
  logs: LogEntry[];
}

export default function LoadingState({ logs }: LoadingStateProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % PHASES.length), 1700);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl shadow-black/30 animate-fade-up">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,#6366f1,#22d3ee,#a855f7,#6366f1)] opacity-80 blur-[6px]" />
          <div className="absolute inset-[3px] rounded-full bg-[#0a0f1e]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Route className="h-5 w-5 animate-pulse-soft text-cyan-300" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-white">{PHASES[idx]}</p>
          <p className="mt-1.5 text-xs text-slate-500">
            Routing task → negotiating paywalls → settling on-chain
          </p>
        </div>

        <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-1/3 animate-slide rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
        </div>
      </div>

      {logs.length > 0 && <PaymentTimeline logs={logs} live compact />}
    </div>
  );
}