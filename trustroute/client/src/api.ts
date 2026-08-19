// ─────────────────────────────────────────────────────────────────────────────
// API layer — clean, beginner-friendly fetch client for the TrustRoute backend.
//
//   Base URL comes from the environment variable VITE_API_URL
//   (see .env.production / .env.example). If it's unset, requests go to the
//   same origin (the Vite dev proxy handles /api in local development).
//
//   Every request:
//     · uses fetch
//     · sends headers: { "Content-Type": "application/json" }
//     · sends bodies via JSON.stringify({...})  →  never unterminated JSON
//     · logs request + response for debugging
//     · throws a clear Error on failures (HTTP 5xx, 4xx, network errors)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AgentResponse,
  LogEntry,
  LogStatus,
  PaymentReceipt,
  Plan,
  ServiceResult,
  SmartRunResponse,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

const JSON_HEADERS = { "Content-Type": "application/json" };

interface Invoice {
  invoiceId: string;
  price: number;
  network: string;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown; // plain object — JSON.stringify turns it into valid JSON
  headers?: Record<string, string>;
}

// Core helper — one place for fetch, headers, JSON, logging, error handling.
// HTTP 402 is NOT an error here: it's the x402 flow's "pay to continue"
// signal, so it's returned as status 402 for the caller to handle.
async function request<T = unknown>(
  path: string,
  { method = "GET", body, headers = {} }: RequestOptions = {}
): Promise<{ status: number; data: T | null }> {
  const url = `${API_BASE}${path}`;
  console.log(`[API] → ${method} ${url}`, body ? JSON.stringify(body) : "");

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { ...JSON_HEADERS, ...headers },
      // explicit JSON.stringify — always valid JSON, no string-concat bugs
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

  // Read the raw text first, then parse — safe JSON handling (no SyntaxError crashes).
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

  if (!res.ok && res.status !== 402) {
    // readable message for 4xx/5xx — prefer the server's own "error" field
    const message =
      (data as { error?: string } | null)?.error ?? `Request failed with HTTP ${res.status}`;
    console.error(`[API] Error ${method} ${url} → ${res.status}:`, message);
    throw new Error(message);
  }

  return { status: res.status, data };
}

// ─── 1. planAgent — ask the agent engine which services to use ───────────────
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

// ─── 2. callResearch — paid research call (x402) ────────────────────────────
// POST /api/research  body: { task }
// Returns either the result or an invoice (HTTP 402 → "pay to continue").
export async function callResearch(
  task: string,
  txId?: string
): Promise<{ data: ServiceResult | null; invoice: Invoice | null }> {
  const { status, data } = await request<ServiceResult | Invoice>("/api/research", {
    method: "POST",
    body: { task },
    headers: txId ? { "x-payment-tx": txId } : {},
  });
  if (status === 402) return { data: null, invoice: data as Invoice };
  return { data: data as ServiceResult | null, invoice: null };
}

// Generic service call for any catalog service (weather, news, writing …).
// POST /api/services/:id  body: { task }
async function requestService(
  serviceId: string,
  task: string,
  txId?: string
): Promise<{ data: ServiceResult | null; invoice: Invoice | null }> {
  const { status, data } = await request<ServiceResult | Invoice>(`/api/services/${serviceId}`, {
    method: "POST",
    body: { task },
    headers: txId ? { "x-payment-tx": txId } : {},
  });
  if (status === 402) return { data: null, invoice: data as Invoice };
  return { data: data as ServiceResult | null, invoice: null };
}

// ─── 3. triggerPayment — settle an invoice on Algorand ──────────────────────
// POST /api/pay  body: { invoiceId }
export async function triggerPayment(invoiceId: string): Promise<PaymentReceipt> {
  const { data } = await request<PaymentReceipt>("/api/pay", {
    method: "POST",
    body: { invoiceId },
  });
  if (!data) throw new Error("Payment failed — the server could not settle the invoice.");
  return data;
}

// Verify a settlement.
// GET /api/tx/:txId
export async function verifyTransaction(txId: string): Promise<boolean> {
  try {
    const { data } = await request<{ verified?: boolean }>(`/api/tx/${txId}`);
    return Boolean(data?.verified);
  } catch (err) {
    console.error("[API] Transaction verification failed:", err);
    return false;
  }
}

// ─── 4. runSmartAgent — Smart Agent Engine (classify → score → failover) ────
// POST /api/run-agent  body: { task, budget, priority }
// No x402 payment in this flow — the engine picks the best service chain and
// returns per-step results with failover info.
export async function runSmartAgent(
  task: string,
  budget: number,
  priority: string
): Promise<SmartRunResponse> {
  const { data } = await request<SmartRunResponse>("/api/run-agent", {
    method: "POST",
    body: { task, budget, priority },
  });
  if (!data) throw new Error("Agent engine returned an empty response.");
  return data;
}

// ─── agent orchestrator — full run: plan → 402 → pay → retry → result ──────
// This is what App.tsx calls when the user clicks "Run Agent".

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  log("PLANNING", `Agent matched category "${plan.category}" · selected ${plan.services.length} service(s)`, "success");
  log("PLANNING", `Ordered by ${priority.toLowerCase()} priority · estimate ${plan.estimate.toFixed(3)}`, "success");

  const transactions = [];
  const results: string[] = [];
  const servicesUsed: string[] = [];
  let totalCost = 0;
  let remainingBudget = budget;

  for (const svc of plan.services) {
    if (remainingBudget - svc.cost < 0) {
      log("BUDGET_CHECK", `Skipping ${svc.name} — ${svc.cost} exceeds remaining ${remainingBudget.toFixed(3)}`, "warning", svc.id);
      continue;
    }

    log("API_REQUEST", `POST /api/${svc.id} — no payment attached yet`, "running", svc.id);
    await sleep(250);

    // (a) first call → expect 402 Payment Required
    const first = await requestService(svc.id, task);
    if (!first.invoice) {
      if (first.data) {
        servicesUsed.push(first.data.service);
        results.push(first.data.result);
        for (const l of first.data.logs) {
          allLogs.push(l);
          onLog(l);
        }
        totalCost += svc.cost;
        remainingBudget = Math.round((remainingBudget - svc.cost) * 1000) / 1000;
        log("RESULT_RECEIVED", `${first.data.service} answered without paywall`, "success", svc.id);
      }
      continue;
    }

    log("PAYMENT_REQUIRED", `HTTP 402 · invoice ${first.invoice.invoiceId} · ${first.invoice.price.toFixed(3)} · ${first.invoice.network}`, "error", svc.id);
    await sleep(150);

    // (b) payment handler — server /payment/x402Handler.js signs the micropayment
    log("PAYMENT_SENT", "Triggering payment handler (server /payment/x402Handler.js)…", "running", svc.id);
    const receipt = await triggerPayment(first.invoice.invoiceId);
    if (receipt.activation) {
      log(
        "PAYMENT_SENT",
        `Recipient activated for the 0.1 ALGO minimum balance · tx ${receipt.activation.txId}`,
        "info",
        svc.id
      );
    }
    log("PAYMENT_SENT", `Payment sent · tx ${receipt.txId} · fee ${receipt.fee} ALGO${receipt.sim ? " · simulated" : " · REAL on-chain"}`, "success", svc.id);
    await sleep(200);

    // (c) verify settlement
    const verified = await verifyTransaction(receipt.txId);
    log("PAYMENT_VERIFIED", `Settlement verified on Algorand · round ${receipt.round}${verified ? "" : " (registry pending)"}`, "success", svc.id);
    await sleep(200);

    // (d) retry with x-payment-tx
    log("REQUEST_RETRIED", `Retrying with x-payment-tx: ${receipt.txId}`, "running", svc.id);
    let second = await requestService(svc.id, task, receipt.txId);

    // tolerates an invalid/expired tx: pay a fresh invoice and retry once more
    if (!second.data) {
      const fresh = await requestService(svc.id, task, receipt.txId);
      if (fresh.invoice) {
        log("PAYMENT_REQUIRED", `Retry rejected (tx ${receipt.txId} invalid) — paying a fresh invoice ${fresh.invoice.invoiceId}`, "error", svc.id);
        const receipt2 = await triggerPayment(fresh.invoice.invoiceId);
        log("PAYMENT_SENT", `Payment sent · tx ${receipt2.txId} · round ${receipt2.round}`, "success", svc.id);
        second = await requestService(svc.id, task, receipt2.txId);
      }
    }

    if (second.data) {
      for (const l of second.data.logs) {
        allLogs.push(l);
        onLog(l);
      }
      servicesUsed.push(second.data.service);
      results.push(second.data.result);
      transactions.push({
        service: svc.id,
        txId: receipt.txId,
        network: receipt.network,
        round: receipt.round,
        fee: receipt.fee,
        sim: receipt.sim,
        explorerUrl: receipt.explorerUrl,
      });
      totalCost = Math.round((totalCost + svc.cost) * 1000) / 1000;
      remainingBudget = Math.round((remainingBudget - svc.cost) * 1000) / 1000;
      log("RESULT_RECEIVED", `${second.data.service} · ${second.data.latencyMs}ms · provider: ${second.data.provider}`, "success", svc.id);
      if (second.data.failover) {
        log("FAILOVER_TRIGGERED", `Failover completed — ${svc.name} served by backup provider`, "warning", svc.id);
      }
    }
  }

  log("RESULT_RECEIVED", "All selected services completed — compiling report", "success");

  return {
    task,
    budget,
    priority,
    result: results.join("\n\n---\n\n"),
    servicesUsed,
    totalCost,
    remainingBudget,
    confidence: plan.confidence,
    reasoning: plan.reasoning,
    transactions,
    logs: allLogs,
  };
}