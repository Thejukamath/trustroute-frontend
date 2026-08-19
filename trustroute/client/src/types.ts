export type LogStatus = "info" | "running" | "success" | "error" | "warning";

export interface LogEntry {
  step: string;
  message: string;
  timestamp: number;
  status: LogStatus;
  service?: string;
}

export interface PlanService {
  id: string;
  name: string;
  cost: number;
  reliability: number;
  latency: number;
  primary: string;
  backup: string;
}

export interface Plan {
  category: string;
  services: PlanService[];
  estimate: number;
  reasoning: string[];
  confidence: number;
  budgetExceeded: boolean;
}

export interface PaymentReceipt {
  txId: string;
  round: number;
  fee: number;
  network: string;
  sim: boolean;
  explorerUrl?: string;
  activation?: { txId: string; amountMicro: string } | null;
}

export interface Transaction {
  service: string;
  txId: string;
  network: string;
  round?: number;
  fee?: number;
  sim?: boolean;
  explorerUrl?: string;
}

export interface ServiceResult {
  result: string;
  transactionId: string;
  service: string;
  network: string;
  provider: "primary" | "backup";
  failover: boolean;
  latencyMs: number;
  logs: LogEntry[];
}

export interface AgentResponse {
  task: string;
  budget: number;
  priority: string;
  result: string;
  servicesUsed: string[];
  totalCost: number;
  remainingBudget: number;
  confidence: number;
  reasoning: string[];
  transactions: Transaction[];
  logs: LogEntry[];
}

// ─── Smart Agent Engine (POST /api/run-agent) ────────────────────────────────

export interface SmartService {
  id: string;
  name: string;
  category: string;
  cost: number;
  speed: number;
  reliability: number;
}

export interface SmartAttempt {
  service: string;
  cost: number;
  status: "trying" | "ok" | "error" | "bad_response";
  reason?: string;
  provider?: string;
  ms?: number;
}

export interface SmartStepResult {
  success: boolean;
  category: string;
  service?: SmartService | null;
  result?: string;
  latencyMs?: number;
  usedFailover?: boolean;
  error?: string;
  attempts: SmartAttempt[];
}

export interface SmartRunResponse {
  task: string;
  steps: string[];
  priority: string;
  budget: number;
  usedFailover: boolean;
  results: SmartStepResult[];
}

export type RunState = "idle" | "loading" | "done" | "error";

export type AgentMode = "x402" | "smart";