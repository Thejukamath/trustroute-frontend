// ─────────────────────────────────────────────────────────────────────────────
// x402 payment client — the real protocol, run entirely in the browser.
//
//   "The check is in the mail"  is not a payment. Here, the browser actually
//   SIGNS the micropayment with the user's Algorand wallet (VITE_AVM_MNEMONIC
//   or VITE_AVM_PRIVATE_KEY), the facilitator settles it, and the backend
//   answers. No mock invoices, no server-side signing.
//
//   Flow (per protected endpoint):
//     1. plain fetch    →  HTTP 402 + Payment-Required
//     2. decode         →  requirement { amount, network, payTo }
//     3. spend policy   →  enforced BEFORE signing (spendPolicy.ts)
//     4. user confirm   →  if policy requires approval
//     5. sign payload   →  ExactAvmScheme signer (browser crypto)
//     6. retry fetch    →  Payment-Signature header
//     7. settle         →  Payment-Response header → receipt stored locally
//
//   No real wallet configured → paidFetch throws a clear error BEFORE any
//   network call that would otherwise hit a 402.
// ─────────────────────────────────────────────────────────────────────────────

import { ExactAvmScheme, toClientAvmSigner } from "@x402/avm";
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/http";
import * as algosdk from "algosdk";
import { runSpendPolicy, serviceIdFromUrl, type PolicyConfig } from "./spendPolicy";
import { storeReceipt } from "./receipts";

// Algorand TestNet — the x402 toolchain identifies Algorand networks by the
// FULL base64 genesis hash (not the short CAIP-2 segment); the facilitator
// registry uses this exact string.
export const X402_GENESIS_HASH = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
export const X402_NETWORK = `algorand:${X402_GENESIS_HASH}`;
export const X402_DECIMALS = 6; // USDC
export const X402_ASA = "10458941";

const MNEMONIC = (import.meta.env.VITE_AVM_MNEMONIC ?? "").trim();
const PRIVATE_KEY = (import.meta.env.VITE_AVM_PRIVATE_KEY ?? "").trim();

// ─── key material → base64 (browser has no Buffer) ───────────────────────────
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

let client: x402HTTPClient | null = null;
let walletConfigured: boolean | null = null;

/** True when a signing key is present in the environment. */
export function isWalletConfigured(): boolean {
  if (walletConfigured === null) {
    walletConfigured = Boolean(MNEMONIC || PRIVATE_KEY);
  }
  return walletConfigured;
}

function getClient(): x402HTTPClient {
  if (client) return client;
  if (!isWalletConfigured()) {
    throw new Error(
      "No Algorand wallet configured for payments. Copy client/.env.example to client/.env and set VITE_AVM_MNEMONIC (or VITE_AVM_PRIVATE_KEY), then run `npm run setup-wallet` on the server side for a fresh pair."
    );
  }

  const world = new x402Client();
  const signer = PRIVATE_KEY
    ? toClientAvmSigner(PRIVATE_KEY)
    : toClientAvmSigner(bytesToBase64(algosdk.mnemonicToSecretKey(MNEMONIC).sk));

  world.register(X402_NETWORK, new ExactAvmScheme(signer));
  client = new x402HTTPClient(world);
  return client;
}

// ─── amounts ─────────────────────────────────────────────────────────────────
// The exact scheme quotes every requirement in money strings. Those arrive as
// already-atomic values ("20000" → 20,000 µUSDC = $0.02). A few callers may
// send a decimal USD ("0.02") — normalize both to atomic.
export function toAtomic(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (String(raw).includes(".") && n < 1e6) return Math.round(n * 10 ** X402_DECIMALS);
  return Math.round(n);
}

function toUsd(atomic: number): string {
  return (atomic / 10 ** X402_DECIMALS).toFixed(2);
}

// ─── logging ─────────────────────────────────────────────────────────────────
export interface PayLog {
  step: string;
  message: string;
  status: "running" | "success" | "error" | "warning" | "info";
  service?: string;
}

export type PayLogFn = (log: PayLog) => void;

const shortAddr = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "…");
const shortTx = (t: string) => (t.length > 18 ? `${t.slice(0, 10)}…${t.slice(-6)}` : t);

// ─── the request itself ──────────────────────────────────────────────────────
export interface PaidResponse {
  status: number;
  data: unknown; // ServiceResult | agent run output | ...
  payment?: {
    txId?: string;
    network: string;
    payTo: string;
    amountAtomic: number;
    amountUsd: string;
  };
}

interface PaidFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  onLog?: PayLogFn;
  /** overrides for the env spend policy, per request */
  policyOverride?: Partial<PolicyConfig>;
}

export async function paidFetch(
  url: string,
  { method = "POST", body, signal, onLog = () => {}, policyOverride }: PaidFetchOptions = {}
): Promise<PaidResponse> {
  const log = onLog;
  const service = serviceIdFromUrl(url);
  const makeInit = (extraHeaders: Record<string, string> = {}): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(100_000),
  });

  // 1) plain request — free endpoints answer directly, paid ones answer 402
  const first = await fetch(url, makeInit());
  if (first.status !== 402) {
    const data = await first.json().catch(() => null);
    if (!first.ok) {
      throw new Error(
        (data as { error?: string } | null)?.error ?? `Request failed with HTTP ${first.status}`
      );
    }
    return { status: first.status, data };
  }

  // 2) decode Payment-Required (headers; body is an error message)
  const core = getClient();
  const bodyText = await first.text();
  log({
    step: "PAYMENT_REQUIRED",
    message: `HTTP 402 · x402 payment required`,
    status: "error",
    service,
  });

  const paymentRequired = core.getPaymentRequiredResponse(
    (name: string) => first.headers.get(name),
    bodyText ? JSON.parse(bodyText) : null
  );
  const requirement = pickRequirement(paymentRequired.accepts);
  if (!requirement) {
    throw new Error("The server wants payment, but sent no payment options.");
  }

  // 3) spend policy BEFORE signing anything
  const amountAtomic = toAtomic(requirement.amount);
  const policy = runSpendPolicy(String(amountAtomic), url, policyOverride);
  if (!policy.allowed) {
    log({ step: "SPEND_POLICY", message: policy.reason, status: "error", service });
    throw new Error(policy.reason);
  }
  const amountUsd = toUsd(amountAtomic);

  // 4) user approval when the threshold demands it
  if (policy.needsApproval) {
    const ok = window.confirm(
      `${service} costs $${amountUsd} USDC (Algorand TestNet) → ${requirement.payTo}\n\nApprove this payment?`
    );
    if (!ok) {
      log({ step: "SPEND_POLICY", message: `${service}: payment declined by user.`, status: "warning", service });
      throw new Error("Payment declined.");
    }
  }

  // 5) sign
  log({
    step: "PAYMENT_SENT",
    message: `Signing USDC $${amountUsd} · ${amountAtomic} µUSDC → ${shortAddr(requirement.payTo)}`,
    status: "running",
    service,
  });

  let payload;
  try {
    payload = await core.createPaymentPayload(paymentRequired);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not build the payment: ${detail}`);
  }

  // 6) retry with the signature
  const signedHeaders = core.encodePaymentSignatureHeader(payload);
  const second = await fetch(url, makeInit(signedHeaders));

  // 7) settlement + receipt
  // Parse defensively: a settlement-header hiccup must never erase an already
  // paid, successful response.
  let txId: string | undefined;
  try {
    const settle = core.getPaymentSettleResponse((name: string) => second.headers.get(name) as string);
    if (settle) {
      const tx = settle.transaction as
        | { id?: string; txId?: string; transactionId?: string }
        | string
        | undefined;
      txId = typeof tx === "string" ? tx : (tx?.id ?? tx?.txId ?? tx?.transactionId);
    }
  } catch {
    // fall through to the raw header read below
  }
  if (!txId) {
    const raw = second.headers.get("PAYMENT-RESPONSE");
    txId = raw ? String(raw).replace(/^"(.*)"$/, "$1").slice(0, 64) : undefined;
  }

  const data = await second.json().catch(() => null);
  if (!second.ok) {
    // the facilitator's rejection reason (e.g. "insufficient funds") lives in
    // the PAYMENT-RESPONSE/PAYMENT-REQUIRED header, not the JSON body
    let detail: string | null = null;
    const rawHeader = second.headers.get("PAYMENT-RESPONSE") ?? second.headers.get("PAYMENT-REQUIRED");
    if (rawHeader) {
      try {
        const decoded = JSON.parse(atob(String(rawHeader)));
        if (decoded?.error) detail = String(decoded.error).slice(0, 300);
      } catch {
        /* header is not base64 JSON — ignore */
      }
    }
    const message =
      detail ??
      (data as { error?: string } | null)?.error ??
      `Payment was sent but the request failed (HTTP ${second.status}).`;
    throw new Error(message);
  }

  const receipt = {
    service,
    amount: String(amountAtomic),
    amountUsd,
    txId: txId ?? "",
    network: requirement.network ?? X402_NETWORK,
    payTo: requirement.payTo,
    timestamp: Date.now(),
  };
  storeReceipt(receipt);

  log({
    step: "PAYMENT_VERIFIED",
    message: `Settled on-chain · USDC $${amountUsd} · tx ${txId ? shortTx(txId) : "?"}`,
    status: "success",
    service,
  });

  return {
    status: second.status,
    data,
    payment: {
      txId,
      network: requirement.network ?? X402_NETWORK,
      payTo: requirement.payTo,
      amountAtomic,
      amountUsd,
    },
  };
}

// Prefer the algorand offer; otherwise pick the cheapest payment option.
function pickRequirement(accepts: unknown): { amount: string | number; network?: string; payTo: string } | null {
  if (!Array.isArray(accepts) || accepts.length === 0) return null;
  const list = accepts as Array<{ amount?: unknown; network?: string; payTo?: string }>;
  const ours = list.find((a) => String(a.network ?? "").startsWith("algorand"));
  const choice = (ours ? [ours] : list).sort(
    (a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0)
  )[0];
  if (!choice || choice.amount == null || !choice.payTo) return null;
  const amount = choice.amount as string | number;
  return { amount, network: choice.network, payTo: choice.payTo };
}