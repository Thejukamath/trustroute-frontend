import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import axios from "axios";
import Badge from "../ui/Badge";
import { API_BASE } from "../api";

interface Health {
  mode?: { mode: string; reason: string };
}

export default function Header() {
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<Health>(`${API_BASE}/health`, { timeout: 15_000 })
      .then((res) => setMode(res.data.mode?.mode ?? null))
      .catch(() => setMode(null));
  }, []);

  return (
    <header className="flex flex-col items-center gap-4 pt-10 pb-6 text-center animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-0 animate-glint rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 opacity-70 blur-xl" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/30">
            <Route className="h-5 w-5 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-white">Trust</span>
          <span className="text-gradient-animated">Route</span>
          <span className="ml-1 align-middle text-lg">🚀</span>
        </h1>
      </div>

      <p className="text-sm text-slate-400 sm:text-base">
        Autonomous AI Payments · x402 + Algorand
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant={mode === "real" ? "real" : "simulated"} dot pulse={mode === "real"}>
          {mode === "real" ? "REAL PAYMENTS" : "SIMULATED PAYMENTS"}
        </Badge>
        <Badge variant="primary" dot>
          TESTNET
        </Badge>
        <Badge variant="info">x402 Protocol</Badge>
        <Badge variant="success">Algorand</Badge>
      </div>
    </header>
  );
}