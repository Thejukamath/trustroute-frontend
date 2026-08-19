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
  category?: string;
  cost: number;
  reliability: number;
  latency: number;
  primary: string;
  backup: string;
}

export interface Plan {
  category: string;
  categories: string[];
  multi: boolean;
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

export type RunState = "idle" | "loading" | "done" | "error";