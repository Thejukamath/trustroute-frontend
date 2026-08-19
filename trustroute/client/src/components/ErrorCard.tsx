import { AlertTriangle, RefreshCw } from "lucide-react";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";

interface ErrorCardProps {
  message: string | null;
  onReset: () => void;
}

export default function ErrorCard({ message, onReset }: ErrorCardProps) {
  return (
    <Panel className="border-rose-400/25 bg-rose-400/[0.05] text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-400/10">
        <AlertTriangle className="h-5 w-5 text-rose-400" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <h3 className="text-sm font-bold text-white">The agent hit a wall</h3>
        <Badge variant="error">FAILED</Badge>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{message ?? "Something went wrong."}</p>
      <button
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </Panel>
  );
}