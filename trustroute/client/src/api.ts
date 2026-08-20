// ─────────────────────────────────────────────────────────────────────────────
// API layer — clean, beginner-friendly fetch client for the TrustRoute backend.
//
//   Base URL comes from the environment variable VITE_API_URL
//   (see .env.production / .env.example). If it's unset, requests go to the
//   same origin (the Vite dev proxy handles /api in local development).
//
//   Payments are REAL x402 micropayments signed in the browser (x402.ts):
//   the client hits the endpoint, gets HTTP 402 + a price, enforces the
//   spend policy, signs the payment with the user's wallet, and retries
//   with the Payment-Signature header — all inside one paidFetch() call.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AgentResponse,
  LogEntry,
  LogStatus,
  Plan,
  ServiceResult,
} from "./types";
import { paidFetch } from "./x402";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Core helper for FREE endpoints (the planner). Paid endpoints go through
// paidFetch() in x402.ts instead.
async function request<T = unknown>(
  path: string,
  { method = "GET", body, headers = {} }: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; data: T | null }> {
  const url = `${API_BASE}${path}`;
  console.log(`[API] → ${method} ${url}`, body ? JSON.stringify(body) : "");

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { ...JSON_HEADERS, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      // 100s covers Render free-tier cold starts (the instance can take
      // 30–60s+ to wake up after sleeping).
      signal: AbortSignal.timeout(100_000),
    });
  } catch (err) {
    console.error(`[API] Network error on ${method} ${url}:`, err);
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    if (timedOut) {
      throw new Error(
        "The backend took too long to respond (Render cold start?). Try again in a moment."
      );
    }
    throw new Error("Cannot reach the backend — check your connection or the server.");
  }

  const text = await res.text();
  console.log(`[API] ← ${res.status} ${method} ${url}`, text ? text.slice(0, 300) : "(empty body)");

  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      console.error(`[API] Response was not valid JSON:`, text.slice(0, 300));
    }
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Request failed with HTTP ${res.status}`;
    console.error(`[API] Error ${method} ${url} → ${res.status}:`, message);
    throw new Error(message);
  }

  return { status: res.status, data };
}

// ─── planAgent — ask the agent engine which services to use (free) ──────────
// POST /api/plan  body: { task, budget, priority }
export async function planAgent(
  task: string,
  budget: number,
  priority: string
): Promise<Plan> {
  const { data } = await request<Plan>("/api/plan", {
    method: "POST",
    body: { task, budget, priority },
  });
  if (!data) throw new Error("Plan endpoint returned an empty response.");
  return data;
}

/** Paid endpoint URL for one planned service. */
function endpointFor(serviceId: string): string {
  // research has a route of its own; every catalog service mounts at /api/services/:id
  return `${API_BASE}${serviceId === "research" ? "/api/research" : `/api/services/${serviceId}`}`;
}

// ─── agent orchestrator — plan → pay (real x402) → compile ──────────────────
// This is what App.tsx calls when the user clicks "Run Agent".
export async function runAgent(
  task: string,
  budget: number,
  priority: string,
  onLog: (log: LogEntry) => void
): Promise<AgentResponse> {
  const t0 = Date.now();
  const stamp = () => Math.round(((Date.now() - t0) / 1000) * 10) / 10;
  const allLogs: LogEntry[] = [];
  const log = (step: string, message: string, status: LogStatus, service?: string) => {
    const entry: LogEntry = { step, message, timestamp: stamp(), status, service };
    allLogs.push(entry);
    onLog(entry);
  };

  log("API_REQUEST", "POST /api/plan — dispatching task to the agent decision engine", "running");
  const plan = await planAgent(task, budget, priority);
  if (plan.multi) {
    log("PLANNING", `Multi-task detected → executing ${plan.categories.join(" + ")}`, "success");
  } else {
    log("PLANNING", `Agent matched category "${plan.category}" · selected ${plan.services.length} service(s)`, "success");
  }
  log("PLANNING", `Ordered by ${priority.toLowerCase()} priority · estimate ${plan.estimate.toFixed(3)}`, "success");

  const transactions = [];
  const servicesUsed: string[] = [];
  // { result, category } — keeps each section labelled with its own
  // category so multi-task output renders as separate ## sections.
  const sections: { result: string; category: string }[] = [];
  let totalCost = 0;
  let remainingBudget = budget;

  for (const svc of plan.services) {
    if (remainingBudget - svc.cost < 0) {
      log("BUDGET_CHECK", `Skipping ${svc.name} — ${svc.cost} exceeds remaining ${remainingBudget.toFixed(3)}`, "warning", svc.id);
      continue;
    }

    const url = endpointFor(svc.id);
    log("API_REQUEST", `POST ${url.replace(API_BASE, "")} — paying the x402 request (one call does it)`, "running", svc.id);

    try {
      const { data, payment } = await paidFetch(url, {
        body: { task },
        onLog: (e) => log(e.step, e.message, e.status, e.service ?? svc.id),
      });

      const sr = data as ServiceResult | null;
      if (!sr || !sr.result) {
        log("RESULT_RECEIVED", `${svc.name} returned no usable result`, "warning", svc.id);
        continue;
      }

      for (const l of sr.logs) {
        allLogs.push(l);
        onLog(l);
      }

      servicesUsed.push(sr.service);
      sections.push({ result: sr.result, category: svc.category ?? "general" });
      transactions.push({
        service: svc.id,
        txId: payment?.txId ?? sr.transactionId ?? "",
        network: payment?.network ?? sr.network,
        explorerUrl: payment?.txId
          ? `https://testnet.explorer.perawallet.app/tx/${payment.txId}`
          : undefined,
      });

      totalCost = Math.round((totalCost + svc.cost) * 1000) / 1000;
      remainingBudget = Math.round((remainingBudget - svc.cost) * 1000) / 1000;

      log("RESULT_RECEIVED", `${sr.service} · ${sr.latencyMs}ms · provider: ${sr.provider}`, "success", svc.id);
      if (sr.failover) {
        log("FAILOVER_TRIGGERED", `Failover completed — ${svc.name} served by backup provider`, "warning", svc.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("ERROR", message, "error", svc.id);
    }
  }

  log("RESULT_RECEIVED", "All selected services completed — compiling report", "success");

  const heading = (category: string) =>
    ({
      weather: "Weather Report",
      news: "News Results",
      research: "Research Insights",
      finance: "Market Data",
      writing: "Draft",
      code: "Code Output",
      grammar: "Grammar Check",
      general: "Results",
    })[category] ?? "Results";

  const result =
    plan.multi && sections.length > 1
      ? sections.map((s) => `### ${heading(s.category)}\n\n${s.result}`).join("\n\n")
      : sections.map((s) => s.result).join("\n\n---\n\n");

  return {
    task,
    budget,
    priority,
    result,
    servicesUsed,
    totalCost,
    remainingBudget,
    confidence: plan.confidence,
    reasoning: plan.reasoning,
    transactions,
    logs: allLogs,
  };
}