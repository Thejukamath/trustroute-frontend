import { useState, type FormEvent } from "react";
import {
  ChevronDown,
  ArrowRight,
  Loader2,
  Wallet,
  AlertCircle,
  Timer,
  Wallet2,
  ShieldCheck,
} from "lucide-react";
import Panel from "../ui/Panel";

interface AgentFormProps {
  onRun: (task: string, budget: number, priority: string) => void;
  busy: boolean;
}

type TaskType = "weather" | "research" | "news" | "writing" | "custom";

const TASK_TYPES: { id: TaskType; label: string; example: string }[] = [
  { id: "weather", label: "🌦 Weather", example: "What is the weather in Barcelona?" },
  {
    id: "research",
    label: "📊 Research",
    example: "Research the latest AI agents in payments and summarize the findings",
  },
  { id: "news", label: "📰 News", example: "Show me the latest news about AI and payments" },
  { id: "writing", label: "✍️ Writing", example: "Write a short launch email about autonomous AI payments" },
  { id: "custom", label: "✨ Custom", example: "" },
];

const PRIORITIES = [
  { id: "Cost", icon: Wallet2, hint: "cheapest" },
  { id: "Speed", icon: Timer, hint: "fastest" },
  { id: "Reliability", icon: ShieldCheck, hint: "most trusted" },
];

export default function AgentForm({ onRun, busy }: AgentFormProps) {
  const [task, setTask] = useState("");
  const [selectedType, setSelectedType] = useState<TaskType>("custom");
  const [budget, setBudget] = useState(10);
  const [priority, setPriority] = useState("Speed");
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (id: TaskType) => {
    setSelectedType(id);
    const t = TASK_TYPES.find((x) => x.id === id);
    setTask(t && id !== "custom" ? t.example : "");
    setError(null);
  };

  const handleTaskInput = (value: string) => {
    setTask(value);
    // If the text no longer matches a template, fall back to Custom.
    const t = TASK_TYPES.find((x) => x.id === selectedType);
    if (selectedType !== "custom" && t && value !== t.example) {
      setSelectedType("custom");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      setError("Describe the task first — the agent needs something to route.");
      return;
    }
    setError(null);
    onRun(task.trim(), budget, priority);
  };

  return (
    <Panel>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90">
            Agent Console
          </p>
          <h2 className="mt-0.5 text-base font-bold text-white">Mission control</h2>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-300">Auto-funded</span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task type — dropdown */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Task type
          </label>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value as TaskType)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-gray-700 bg-gray-800/60 py-2.5 pl-3.5 pr-10 text-sm font-medium text-slate-100 outline-none transition focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.id} value={t.id} className="bg-gray-900 text-slate-100">
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Task input */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Task
          </label>
          <textarea
            value={task}
            onChange={(e) => handleTaskInput(e.target.value)}
            rows={4}
            placeholder='e.g. "Research the latest AI agents in payments"'
            className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800/60 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Budget slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Budget
            </label>
            <span className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 font-mono text-sm font-bold text-cyan-300">
              {budget.toFixed(budget % 1 === 0 ? 0 : 1)}
              <span className="ml-1 text-[10px] font-medium text-cyan-400/70">USD</span>
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.25}
            value={budget}
            onChange={(e) => setBudget(parseFloat(e.target.value))}
            className="w-full"
            disabled={busy}
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-600">
            <span>$0.50</span>
            <span>$5</span>
          </div>
        </div>

        {/* Priority selector */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Priority
          </label>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-700 bg-gray-800/60 p-1">
            {PRIORITIES.map((p) => {
              const active = priority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-600/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <p.icon className={`h-4 w-4 ${active ? "" : "opacity-60"}`} />
                  {p.id}
                  <span className={`text-[9px] font-normal ${active ? "text-white/70" : "text-slate-600"}`}>
                    {p.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300 animate-fade-in">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Strong run button */}
        <button
          type="submit"
          disabled={busy}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/60 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Agent working…
            </>
          ) : (
            <>
              🚀 Run Agent
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-600">
          <Wallet className="h-3 w-3 shrink-0" />
          Real x402 payments on Algorand TestNet · automatic provider failover
        </p>
      </form>
    </Panel>
  );
}