import { AgentEvent, AgentRun, AgentRunSummary, now, rid } from "../Types";

type RunPayload = {
  text?: string;
  files: File[];
  language: "auto" | "cs-CZ" | "en-US";
};

type Unsubscribe = () => void;

export interface AgentAdapter {
  run(input: RunPayload): Promise<{ runId: string }>;
  cancel(runId: string): Promise<void>;
  onEvent(cb: (e: AgentEvent) => void): Unsubscribe;
  listRuns(): Promise<AgentRunSummary[]>;
}

// ---- Real adapter (Electron preload očekávané API) ----
declare global {
  interface Window {
    api?: {
      agent?: {
        run(input: {
          text?: string;
          // Pozn.: v reálném IPC často posíláme filePaths, zde zatím jen text
          language?: string;
        }): Promise<{ runId: string }>;
        cancel(runId: string): Promise<void>;
        onEvent(
          cb: (e: AgentEvent) => void
        ): { unsubscribe: () => void } | Unsubscribe;
        listRuns(): Promise<AgentRunSummary[]>;
      };
    };
  }
}
const hasReal = typeof window !== "undefined" && !!window.api?.agent;

const RealAdapter: AgentAdapter = {
  async run(input) {
    // V první iteraci posíláme jen text; přílohy zpracuje dialog/IPC později.
    const res = await window.api!.agent!.run({
      text: input.text,
      language: input.language,
    });
    return res;
  },
  async cancel(runId) {
    return window.api!.agent!.cancel(runId);
  },
  onEvent(cb) {
    const sub = window.api!.agent!.onEvent(cb);
    if (typeof sub === "function") return sub;
    if (sub && "unsubscribe" in sub) return sub.unsubscribe;
    return () => {};
  },
  async listRuns() {
    return window.api!.agent!.listRuns();
  },
};

// ---- Mock adapter (když není preload připravený) ----
const steps = [
  ["hello", "info", "Agent inicializován"],
  ["router", "info", "Analýza záměru (rule-based)"],
  ["asr.check", "info", "Kontrola audio limitů"],
  ["asr.transcribe", "info", "Běží přepis (faster-whisper)…"],
  ["ocr.check", "info", "Kontrola PDF/obrázků"],
  ["ocr.parse", "info", "OCR analýza (PaddleOCR)…"],
  ["templating", "info", "Render šablony…"],
  ["export", "success", "Export PDF hotov"],
  ["finished", "success", "Dokončeno"],
] as const;

const listeners = new Set<(e: AgentEvent) => void>();
const active = new Map<string, { cancelled: boolean }>();

const MockAdapter: AgentAdapter = {
  async run() {
    const runId = rid();
    active.set(runId, { cancelled: false });
    // simulace eventů
    (async () => {
      for (let i = 0; i < steps.length; i++) {
        const [step, level, message] = steps[i];
        if (!active.get(runId) || active.get(runId)!.cancelled) break;
        await new Promise((r) => setTimeout(r, i === 3 ? 1200 : 600));
        const ev: AgentEvent = {
          id: rid(),
          runId,
          ts: now(),
          step: step as any,
          level: level as any,
          message,
          progress: (i + 1) / steps.length,
        };
        listeners.forEach((cb) => cb(ev));
      }
    })();
    return { runId };
  },
  async cancel(runId) {
    if (active.has(runId)) active.get(runId)!.cancelled = true;
  },
  onEvent(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async listRuns() {
    return [];
  },
};

export function getAgentAdapter(): AgentAdapter {
  return hasReal ? RealAdapter : MockAdapter;
}
