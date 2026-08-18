import { useEffect, useRef, useState } from "react";
import { Rocket } from "lucide-react";
import Header from "./components/Header";
import AgentForm from "./components/AgentForm";
import LoadingState from "./components/LoadingState";
import ResultSection from "./components/ResultSection";
import ErrorCard from "./components/ErrorCard";
import MetricsPanel from "./components/MetricsPanel";
import TransactionsPanel from "./components/TransactionsPanel";
import PaymentTimeline from "./components/PaymentTimeline";
import ActivePaymentCard from "./components/ActivePaymentCard";
import FailoverAlert from "./components/FailoverAlert";
import { runAgent } from "./api";
import type { AgentResponse, LogEntry, RunState } from "./types";

export default function App() {
  const [state, setState] = useState<RunState>("idle");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [runId, setRunId] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "done" || state === "error") {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state]);

  const handleRun = async (task: string, budget: number, priority: string) => {
    setState("loading");
    setError(null);
    setResponse(null);
    setLiveLogs([]);
    setRunId((n) => n + 1);

    try {
      const data = await runAgent(task, budget, priority, (log) =>
        setLiveLogs((prev) => [...prev, log])
      );
      setResponse(data);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResponse(null);
    setError(null);
    setLiveLogs([]);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#000714] via-[#020b1f] to-[#030712] text-slate-200">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div className="absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_72%)]" />
      </div>

      {/* single-column layout — stacked vertically, nothing side-by-side */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-12 sm:px-6">
        <Header />

        <div className="space-y-6">
          {/* 1 — Agent Control Panel */}
          <AgentForm onRun={handleRun} busy={state === "loading"} />

          {/* 2 — Metrics Dashboard */}
          <MetricsPanel />

          {/* status strip */}
          {state !== "idle" && (
            <div className="flex justify-center animate-fade-in">
              {state === "loading" && (
                <span className="flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/[0.1] px-4 py-1.5 text-xs font-semibold text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
                  <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400" />
                  AGENT ACTIVE — routing x402 payments…
                </span>
              )}
              {state === "done" && (
                <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/[0.1] px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  MISSION COMPLETE — result delivered
                </span>
              )}
              {state === "error" && (
                <span className="flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/[0.1] px-4 py-1.5 text-xs font-semibold text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  AGENT FAULTED — see details below
                </span>
              )}
            </div>
          )}

          <div ref={resultsRef} className="scroll-mt-8">
            {/* 3/4/5 — execution, report, timeline */}
            {state === "loading" && (
              <div className="space-y-6">
                <ActivePaymentCard logs={liveLogs} active />
                <LoadingState key={runId} logs={liveLogs} />
              </div>
            )}

            {/* 4 — Agent Report · 5 — Failover · 6 — Timeline · 7 — Transactions */}
            {state === "done" && response && (
              <div className="space-y-6">
                <ResultSection key={runId} response={response} onReset={handleReset} />
                {response.logs.some((l) => l.step === "FAILOVER_TRIGGERED") && (
                  <FailoverAlert
                    messages={response.logs
                      .filter((l) => l.step === "FAILOVER_TRIGGERED")
                      .map((f) => f.message)}
                  />
                )}
                <PaymentTimeline logs={response.logs} />
                <TransactionsPanel transactions={response.transactions} />
              </div>
            )}

            {state === "error" && <ErrorCard message={error} onReset={handleReset} />}

            {state === "idle" && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center shadow-xl shadow-black/30 animate-fade-up">
                <div className="relative">
                  <div className="absolute inset-0 animate-glint rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 opacity-60 blur-xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/30">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Your dashboard is ready</p>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs text-slate-500">
                    Run your first agent to see live x402 payments on Algorand
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-slate-400">
                    💰 Real TestNet ALGO
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-slate-400">
                    📡 Live metrics
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-slate-400">
                    🔁 Auto failover
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-14 flex flex-col items-center gap-1.5 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-slate-500">TrustRoute · autonomous AI service payments</p>
          <p className="text-[11px] text-slate-600">Powered by Algorand + x402 · © 2026</p>
        </footer>
      </div>
    </div>
  );
}