import {
  CloudSun,
  BarChart3,
  Newspaper,
  PenLine,
  Code2,
  SearchCheck,
  SpellCheck,
  type LucideIcon,
} from "lucide-react";

// Service → icon + accent mapping for report cards and transaction rows.
// Matches on the service id ("weather") OR the display name ("Weather API").
export function matchService(input: string): { key: string; icon: LucideIcon; accent: string } {
  const s = input?.toLowerCase() ?? "";
  if (s.includes("weather")) return { key: "weather", icon: CloudSun, accent: "text-cyan-300" };
  if (s.includes("research")) return { key: "research", icon: BarChart3, accent: "text-indigo-300" };
  if (s.includes("news")) return { key: "news", icon: Newspaper, accent: "text-sky-300" };
  if (s.includes("writ")) return { key: "writing", icon: PenLine, accent: "text-violet-300" };
  if (s.includes("code") || s.includes("implement")) return { key: "code", icon: Code2, accent: "text-emerald-300" };
  if (s.includes("review")) return { key: "review", icon: SearchCheck, accent: "text-amber-300" };
  if (s.includes("grammar")) return { key: "grammar", icon: SpellCheck, accent: "text-rose-300" };
  return { key: "service", icon: BarChart3, accent: "text-slate-300" };
}