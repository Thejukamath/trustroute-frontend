// Payment receipts — every settled x402 payment is stored locally so the
// app (and a demo) can always show what was paid, for which service, when,
// and the on-chain transaction id.

export interface PaymentReceipt {
  service: string; // research | weather | news | ...
  amount: string; // atomic USDC units (6 decimals)
  amountUsd: string; // human decimal, e.g. "0.02"
  txId: string; // Algorand TestNet transaction id
  network: string; // algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe
  payTo: string; // receiving address
  timestamp: number; // epoch ms
}

const STORAGE_KEY = "trustroute.x402.receipts";
const MAX_RECEIPTS = 50;

export function getReceipts(): PaymentReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storeReceipt(receipt: PaymentReceipt): PaymentReceipt[] {
  const receipts = [receipt, ...getReceipts()].slice(0, MAX_RECEIPTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch {
    // storage may be unavailable (private mode) — never break a payment
  }
  return receipts;
}

export function clearReceipts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}