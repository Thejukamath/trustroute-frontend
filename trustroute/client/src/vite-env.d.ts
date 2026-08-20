/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute URL of the deployed backend, e.g. https://trustroute-backend.onrender.com */
  readonly VITE_API_URL?: string;

  /** x402 payer wallet — 25-word Algorand TestNet mnemonic (never commit real keys) */
  readonly VITE_AVM_MNEMONIC?: string;

  /** x402 payer wallet — alternative: base64 64-byte key (seed + pubkey) */
  readonly VITE_AVM_PRIVATE_KEY?: string;

  /** Algorand address of the payer (computed from the mnemonic/key when blank) */
  readonly VITE_AVM_ADDRESS?: string;

  /** x402 facilitator URL */
  readonly VITE_FACILITATOR_URL?: string;

  /** Spend policy (USD). 0 / blank = disabled. */
  readonly VITE_DAILY_BUDGET?: string;
  readonly VITE_MAX_PER_REQUEST?: string;
  readonly VITE_ALLOWED_SERVICES?: string;   // comma-separated service ids
  readonly VITE_BLOCKED_SERVICES?: string;    // comma-separated service ids
  readonly VITE_REQUIRE_APPROVAL_ABOVE?: string; // USD threshold for a confirm()
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}