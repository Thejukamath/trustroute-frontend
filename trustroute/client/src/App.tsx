import Header from "./components/Header";
import MetricsPanel from "./components/MetricsPanel";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#000714] via-[#020b1f] to-[#030712] text-slate-200">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div className="absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_72%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-12 sm:px-6">
        <Header />

        <div className="space-y-6">
          <MetricsPanel />
        </div>

        <footer className="mt-14 flex flex-col items-center gap-1.5 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-slate-500">TrustRoute · autonomous AI service payments</p>
          <p className="text-[11px] text-slate-600">Powered by Algorand + x402 · © 2026</p>
        </footer>
      </div>
    </div>
  );
}