import { Loader2, CircleDollarSign } from "lucide-react";
import type { LogEntry } from "../types";
import Panel, { PanelHeader } from "../ui/Panel";
import Badge from "../ui/Badge";
import { shortTx } from "./TransactionsPanel";

interface ActivePaymentCardProps {
  logs: LogEntry[];
  active: boolean;
}

// Pulls the latest confirmed tx out of the live log stream.
function latestTxId(logs: LogEntry[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const m = logs[i].message.match(/tx\s+([A-Z0-9]{20,})/i);
    if (m) return m[1];
  }
  return null;
}

export default function ActivePaymentCard({ logs, active }: ActivePaymentCardProps) {
  const txId = latestTxId(logs);

  if (!active && !txId) return null;

  return (
    <Panel className={active ? "border-indigo-500/30" : ""}>
      <PanelHeader
        icon={<CircleDollarSign className="h-4 w-4 text-indigo-400" />}
        label="Active Transaction"
        title={active ? "Settling payment…" : "Last settlement"}
        right={
          <Badge variant={active ? "primary" : "real"} dot pulse={active}>
            {active ? "IN FLIGHT" : "CONFIRMED"}
          </Badge>
        }
      />

      {active ? (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-3">
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0 animate-glint rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 opacity-90 blur-[6px]" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-[#0d1526]">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-bold text-white">
              {txId ? shortTx(txId) : "awaiting tx…"}
            </p>
            <p className="text-[10px] text-slate-500">Algorand TestNet · broadcasting</p>
          </div>
        </div>
      ) : txId ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
          <p className="truncate font-mono text-xs font-bold text-white" title={txId}>
            {shortTx(txId)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Verified on-chain · explorer link in Transactions
          </p>
        </div>
      ) : null}

      {active && (
        <p className="mt-3 text-center text-[10px] text-slate-600">
          The agent pays per service — watch the timeline for each x402 step
        </p>
      )}
    </Panel>
  );
}