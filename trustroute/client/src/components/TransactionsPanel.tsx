import { ExternalLink, ReceiptText } from "lucide-react";
import type { Transaction } from "../types";
import Panel, { PanelHeader } from "../ui/Panel";
import Badge from "../ui/Badge";
import { matchService } from "../ui/serviceMeta";

interface TransactionsPanelProps {
  transactions: Transaction[];
}

export function shortTx(txId: string): string {
  if (txId.length <= 14) return txId;
  return `${txId.slice(0, 8)}…${txId.slice(-6)}`;
}

export function TxRow({ tx, index }: { tx: Transaction; index?: number }) {
  const meta = matchService(tx.service);
  const Icon = meta.icon;
  return (
    <div
      className="glow-hover rounded-xl border border-gray-700/60 bg-gray-800/50 p-3 transition-colors hover:border-gray-600 animate-step-in"
      style={{ animationDelay: `${(index ?? 0) * 60}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <Icon className={`h-4 w-4 ${meta.accent}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            {tx.service}
          </p>
          <p className="truncate font-mono text-[10px] text-cyan-300" title={tx.txId}>
            {shortTx(tx.txId)}
          </p>
        </div>
        <Badge variant={tx.sim ? "simulated" : "real"}>
          {tx.sim ? "SIMULATED" : "REAL PAYMENT"}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>{tx.network}</span>
        {tx.round != null && <span>round {tx.round}</span>}
        {tx.fee != null && <span>fee {tx.fee} ALGO</span>}
        {tx.explorerUrl && (
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 font-medium text-cyan-300 transition hover:bg-cyan-400/20 hover:text-cyan-200"
          >
            <ExternalLink className="h-3 w-3" />
            View on Explorer
          </a>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPanel({ transactions }: TransactionsPanelProps) {
  return (
    <Panel>
      <PanelHeader
        icon={<ReceiptText className="h-4 w-4 text-indigo-400" />}
        label="Settlements"
        title="Transactions"
        right={
          transactions.length > 0 ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-px font-mono text-[10px] text-slate-400">
              {transactions.length}
            </span>
          ) : undefined
        }
      />
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-xs font-semibold text-slate-300">No transactions yet</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Run an agent and on-chain payments will appear here
          </p>
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {transactions.map((tx, i) => (
            <TxRow key={`${tx.txId}-${i}`} tx={tx} index={i} />
          ))}
        </div>
      )}
    </Panel>
  );
}