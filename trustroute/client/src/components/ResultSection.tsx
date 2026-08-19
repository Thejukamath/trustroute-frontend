import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Gauge,
  Layers,
  Receipt,
  CircleDollarSign,
  BadgeCheck,
} from "lucide-react";
import type { AgentResponse } from "../types";
import Badge from "../ui/Badge";
import { matchService } from "../ui/serviceMeta";

interface ResultSectionProps {
  response: AgentResponse;
  onReset: () => void;
}

function useTypewriter(text: string, speed = 12) {
  const [chunk, setChunk] = useState(0);
  useEffect(() => {
    setChunk(0);
    const id = setInterval(() => {
      setChunk((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, chunk);
}

// Highlight numbers + percentages inside a text fragment (JSX-only, no HTML).
function Num({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:\.\d+)?%?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\d+(?:\.\d+)?%?$/.test(p) ? (
          <b key={i} className="font-mono font-semibold text-cyan-300">
            {p}
          </b>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function RichLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-white">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <Num key={i} text={p} />
        )
      )}
    </>
  );
}

// Render result as a structured report: headings → summary → bullets.
function RichResult({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => {
        const bullet = /^[•\-*]\s+/.test(line) && !line.startsWith("**");
        const heading = line.startsWith("**") && line.endsWith("**");
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (heading) {
          return (
            <p
              key={i}
              className="pt-1 text-xs font-bold uppercase tracking-wider text-indigo-300 first:pt-0"
            >
              {line.replace(/\*\*/g, "").replace(/^:\s*/, "")}
            </p>
          );
        }
        return (
          <div key={i} className={`flex gap-2 text-[13px] leading-relaxed text-slate-200 ${bullet ? "pl-1" : ""}`}>
            {bullet ? (
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" />
            ) : null}
            <span className={bullet ? "" : "flex-1"}>
              <RichLine text={line.replace(/^[•\-*]\s+/, "")} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ResultSection({ response, onReset }: ResultSectionProps) {
  const typed = useTypewriter(response.result);
  const done = typed === response.result;
  const spentPct = response.budget > 0 ? Math.min(100, (response.totalCost / response.budget) * 100) : 0;

  const providers = useMemo(() => {
    const seen = new Set<string>();
    const list: { provider: string; backup: boolean }[] = [];
    for (const log of response.logs) {
      if (log.step !== "RESULT_RECEIVED") continue;
      const seg = log.message.split("·").map((s) => s.trim()).filter(Boolean);
      if (seg[1] && !seen.has(seg[1])) {
        seen.add(seg[1]);
        list.push({ provider: seg[1], backup: list.length > 0 });
      }
    }
    return list;
  }, [response.logs]);

  const serviceChips = response.servicesUsed.map((s, i) => ({ name: s, meta: matchService(s), i }));

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/30 animate-fade-up transition-colors duration-300 hover:border-gray-700/70 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
                Agent Report
              </p>
              <h3 className="mt-0.5 text-base font-bold text-white">Mission completed</h3>
            </div>
            <Badge variant="success" dot className="ml-2">
              DONE
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

        {/* provider + service badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {providers.map((p, i) => (
            <Badge key={i} variant={p.backup ? "backup" : "primary"} dot>
              {p.provider}
              {p.backup ? " · backup" : " · primary"}
            </Badge>
          ))}
          {serviceChips.map(({ name, meta, i }) => {
            const Icon = meta.icon;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300"
              >
                <Icon className={`h-3 w-3 ${meta.accent}`} />
                {name}
              </span>
            );
          })}
        </div>

        {/* result body */}
        <div className={`mt-4 rounded-xl border border-gray-700/60 bg-gray-950/60 p-4 ${!done ? "typing-caret" : ""}`}>
          <RichResult text={typed} />
        </div>

        {/* insight stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Gauge className="h-3 w-3" /> Confidence
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-cyan-300">{response.confidence}%</p>
          </div>
          <div className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Layers className="h-3 w-3" /> Services Used
            </div>
            <p className="mt-1 text-lg font-bold text-white">{response.servicesUsed.length}</p>
            <p className="truncate text-[10px] text-slate-500">{response.servicesUsed.join(", ")}</p>
          </div>
          <div className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <CircleDollarSign className="h-3 w-3" /> Total Cost
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white">{response.totalCost}</p>
            <p className="text-[10px] text-slate-500">of {response.budget} budget</p>
          </div>
          <div className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Receipt className="h-3 w-3" /> Remaining
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
              {response.remainingBudget.toFixed(3)}
            </p>
          </div>
        </div>

        {/* budget consumed */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Budget consumed</span>
            <span className="font-mono">
              {spentPct.toFixed(1)}% · {response.totalCost} / {response.budget}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all duration-1000"
              style={{ width: `${spentPct}%` }}
            />
</div>
        </div>
      </div>
  );
}