import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import AgentInput from "./components/AgentInput";
import RunHistory from "./components/RunHistory";
import EventLog from "./components/EventLog";
import RunProgress from "./components/RunProgress";
import { AgentEvent, AgentRun, now, rid } from "./Types";
import { getAgentAdapter } from "./lib/agentAdapter";

export default function App() {
  const adapter = useMemo(() => getAgentAdapter(), []);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  // Subscribe na eventy
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = adapter.onEvent((e: AgentEvent) => {
      setRuns((prev) => {
        const idx = prev.findIndex((r) => r.id === e.runId);
        if (idx === -1) return prev;
        const next = prev.slice();
        const run = { ...next[idx] };
        run.events = [...run.events, e];
        if (e.step === "finished") run.status = "success";
        if (e.step === "error") run.status = "error";
        run.finishedAt =
          e.step === "finished" || e.step === "error" ? now() : run.finishedAt;
        next[idx] = run;
        return next;
      });
    });
    return () => unsubRef.current?.();
  }, [adapter]);

  // Start běhu
  async function startRun(input: {
    text?: string;
    files: File[];
    language: "auto" | "cs-CZ" | "en-US";
  }) {
    // Tady v první iteraci posíláme jen text/lang; přílohy zatím pouze validujeme na frontendu,
    // real upload / path handing doplníme s IPC.
    const localId = rid();
    const newRun: AgentRun = {
      id: localId,
      status: "running",
      startedAt: now(),
      input,
      events: [],
    };
    setRuns((r) => [...r, newRun]);
    setCurrentId(localId);

    try {
      const { runId } = await adapter.run(input);
      // přemapujeme lokální id na skutečné, pokud je k dispozici
      if (runId && runId !== localId) {
        setRuns((prev) => {
          const idx = prev.findIndex((x) => x.id === localId);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = { ...next[idx], id: runId };
          return next;
        });
        setCurrentId(runId);
      }
    } catch (e) {
      // fail-safe
      setRuns((prev) => {
        const idx = prev.findIndex((x) => x.id === localId);
        if (idx === -1) return prev;
        const next = prev.slice();
        next[idx] = {
          ...next[idx],
          status: "error",
          finishedAt: now(),
          events: [
            ...next[idx].events,
            {
              id: rid(),
              runId: next[idx].id,
              ts: now(),
              step: "error",
              level: "error",
              message: "Start běhu selhal.",
            },
          ],
        };
        return next;
      });
    }
  }

  const currentRun = useMemo(
    () => runs.find((r) => r.id === currentId) || null,
    [runs, currentId]
  );

  return (
    <div className="h-full bg-light-bg dark:bg-dark-bg text-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">ByroMed AI</div>
            <div className="text-secondary">single-agent · many-tools</div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Layout */}
      <main className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sidebar: historie */}
        <aside className="lg:col-span-1 h-[calc(100vh-140px)]">
          <RunHistory
            runs={runs}
            selectedId={currentId}
            onSelect={(id) => setCurrentId(id)}
          />
        </aside>

        {/* Main */}
        <section className="lg:col-span-2 space-y-4">
          <RunProgress run={currentRun} />
          <EventLog events={currentRun?.events ?? []} />
          <AgentInput
            disabled={currentRun?.status === "running"}
            onSubmit={startRun}
          />
        </section>
      </main>
    </div>
  );
}
