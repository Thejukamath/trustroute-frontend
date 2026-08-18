import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, Activity, BarChart3, Layers } from "lucide-react";
import axios from "axios";
import Panel, { PanelHeader } from "../ui/Panel";
import Badge from "../ui/Badge";
import { matchService } from "../ui/serviceMeta";
import { API_BASE } from "../api";

interface Metrics {
  totalPayments: number;
  totalSpent: number;
  totalSpend?: number;
  successRate: number;
  servicesUsed: Record<string, number>;
}

const EMPTY: Metrics = { totalPayments: 0, totalSpent: 0, successRate: 0, servicesUsed: {} };

// Animated count-up.
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    from.current = value;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from.current + (target - from.current) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [live, setLive] = useState(false);
  const calls = Math.round(useCountUp(metrics.totalPayments));
  const spend = useCountUp(metrics.totalSpent);
  const rate = Math.round(useCountUp(metrics.successRate));

  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      axios
        .get<Metrics>(`${API_BASE}/api/metrics`, { timeout: 15_000 })
        .then((res) => {
          if (!mounted) return;
          setMetrics(res.data);
          setLive(res.data.totalPayments > 0);
        })
        .catch(() => mounted && setLive(false));
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const services = Object.entries(metrics.servicesUsed);
  const empty = !live && services.length === 0 && metrics.totalPayments === 0;

  const cards = [
    {
      label: "Total Spend",
      icon: <CircleDollarSign className="h-4 w-4 text-indigo-400" />,
      value: empty ? "0.000" : spend.toFixed(3),
      sub: "ALGO on TestNet",
      accent: "text-white",
    },
    {
      label: "API Calls",
      icon: <Activity className="h-4 w-4 text-cyan-400" />,
      value: String(calls),
      sub: "payments settled",
      accent: "text-white",
    },
    {
      label: "Success Rate",
      icon: <BarChart3 className="h-4 w-4 text-emerald-400" />,
      value: `${rate}%`,
      sub: "settled / attempted",
      accent: "text-emerald-400",
    },
  ];

  return (
    <Panel>
      <PanelHeader
        icon={<BarChart3 className="h-4 w-4 text-cyan-400" />}
        label="GoPlausible Metrics"
        title="Payment dashboard"
        right={
          empty ? undefined : (
            <Badge variant="real" dot pulse>
              LIVE
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3.5 transition-colors hover:border-gray-600"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {c.icon}
              {c.label}
            </div>
            <p className={`mt-1.5 font-mono text-xl font-extrabold tabular-nums ${c.accent}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500">{c.sub}</p>
          </div>
        ))}

        {/* Services Used */}
        <div className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3.5 transition-colors hover:border-gray-600">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="h-3 w-3 text-violet-400" />
            Services Used
          </div>
          {services.length === 0 ? (
            <>
              <p className="mt-1.5 font-mono text-xl font-extrabold text-white">—</p>
              <p className="text-[10px] text-slate-500">none yet</p>
            </>
          ) : (
            <div className="mt-1.5 flex flex-col items-start gap-1">
              <p className="font-mono text-xl font-extrabold text-white">{services.length}</p>
              <div className="flex flex-wrap gap-1">
                {services.map(([name, count]) => {
                  const meta = matchService(name);
                  const Icon = meta.icon;
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300"
                    >
                      <Icon className={`h-2.5 w-2.5 ${meta.accent}`} />
                      {name} ×{count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {empty && (
        <p className="mt-3 text-center text-[11px] text-slate-600">
          Run your first agent to see live payments
        </p>
      )}
    </Panel>
  );
}