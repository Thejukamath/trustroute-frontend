// Spend policy — enforced BEFORE the client signs any payment.
//
//   dailyBudget            max USD spent per rolling 24h across all services
//   maxPerRequest          max USD for a single payment
//   allowedServices        allowlist of service ids ("weather,news"); empty = all
//   blockedServices        denylist; always wins over the allowlist
//   requireApprovalAbove   USD threshold above which the user is asked to confirm
//
// Config comes from VITE_* env vars. Every value defaults to permissive so a
// demo never silently blocks — but the knobs are real and effective.

import { PaymentReceipt, getReceipts } from "./receipts";
import { X402_DECIMALS } from "./x402";

export interface PolicyConfig {
  dailyBudget: number; // USD
  maxPerRequest: number; // USD
  allowedServices: string[]; // [] = allow all
  blockedServices: string[]; // [] = block none
  requireApprovalAbove: number; // USD
}

const num = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const POLICY: PolicyConfig = {
  dailyBudget: num(import.meta.env.VITE_DAILY_BUDGET, 1.0),
  maxPerRequest: num(import.meta.env.VITE_MAX_PER_REQUEST, 0.1),
  allowedServices: (import.meta.env.VITE_ALLOWED_SERVICES ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  blockedServices: (import.meta.env.VITE_BLOCKED_SERVICES ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  requireApprovalAbove: num(import.meta.env.VITE_REQUIRE_APPROVAL_ABOVE, 0),
};

export type PolicyResult =
  | { allowed: true; needsApproval: boolean; remaining: number }
  | { allowed: false; reason: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function spentToday(): number {
  const now = Date.now();
  return getReceipts()
    .filter((r: PaymentReceipt) => now - r.timestamp < DAY_MS)
    .reduce((sum, r) => sum + Number(r.amountUsd), 0);
}

export function serviceIdFromUrl(url: string): string {
  // /api/services/weather  →  weather   ·   /api/research → research
  const m = url.match(/\/api\/services\/([^/?#]+)/);
  if (m) return m[1];
  if (url.includes("/api/research")) return "research";
  return "unknown";
}

export function runSpendPolicy(
  amountAtomic: string, // atomic USDC units
  url: string,
  overrides?: Partial<PolicyConfig>
): PolicyResult {
  const cfg = { ...POLICY, ...overrides };
  const service = serviceIdFromUrl(url);

  if (cfg.blockedServices.includes(service)) {
    return { allowed: false, reason: `Blocked by policy: ${service} is on the denied list.` };
  }
  if (cfg.allowedServices.length > 0 && !cfg.allowedServices.includes(service)) {
    return { allowed: false, reason: `Blocked by policy: ${service} is not in the allowed list.` };
  }

  const amountUsd = Number(amountAtomic) / 10 ** X402_DECIMALS;
  if (amountUsd > cfg.maxPerRequest) {
    return {
      allowed: false,
      reason: `Blocked by policy: ${service} costs $${amountUsd.toFixed(4)} but maxPerRequest is $${cfg.maxPerRequest.toFixed(2)}.`,
    };
  }

  let remaining = cfg.dailyBudget - (overrides?.dailyBudget === undefined ? spentToday() : 0);
  if (cfg.dailyBudget > 0 && remaining < amountUsd) {
    return {
      allowed: false,
      reason: `Blocked by policy: $${amountUsd.toFixed(4)} would exceed the $${cfg.dailyBudget.toFixed(2)} daily budget.`,
    };
  }

  return {
    allowed: true,
    needsApproval: cfg.requireApprovalAbove > 0 && amountUsd >= cfg.requireApprovalAbove,
    remaining,
  };
}