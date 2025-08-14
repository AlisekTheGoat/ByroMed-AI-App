export type AgentStep =
  | "hello"
  | "router"
  | "asr.check"
  | "asr.transcribe"
  | "ocr.check"
  | "ocr.parse"
  | "templating"
  | "export"
  | "finished"
  | "error"
  | "canceled";

export type AgentLevel = "info" | "success" | "warning" | "error";

export interface AgentEvent {
  id: string;
  runId: string;
  ts: number; // epoch ms
  step: AgentStep;
  level: AgentLevel;
  message: string;
  payload?: Record<string, unknown>;
  progress?: number; // 0..1 optional (jemné updaty)
}

export type AgentStatus = "running" | "success" | "error" | "canceled";

export type UILanguage = "auto" | "cs-CZ" | "en-US";

export interface AgentInput {
  text?: string;
  files: File[];
  language: UILanguage;
}

export interface AgentRun {
  id: string;
  status: AgentStatus;
  startedAt: number;
  finishedAt?: number;
  input: AgentInput;
  events: AgentEvent[];
}

export interface AgentRunSummary {
  id: string;
  status: AgentStatus;
  startedAt: number;
  finishedAt?: number;
  title?: string;
}

export const now = () => Date.now();
export const rid = () => Math.random().toString(36).slice(2, 10);
