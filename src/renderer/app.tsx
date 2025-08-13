import React, { useEffect, useMemo, useRef, useState } from "react";

// malý helper pro styl
const S = {
  wrap: {
    padding: 24,
    fontFamily: "system-ui, sans-serif",
  } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 600, marginBottom: 8 } as React.CSSProperties,
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    opacity: 0.8,
    display: "block",
    marginBottom: 4,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  } as React.CSSProperties,
  btn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
  } as React.CSSProperties,
  btnPri: {
    padding: "8px 12px",
    borderRadius: 6,
    background: "#3b82f6",
    color: "#fff",
    border: "1px solid #1e40af",
    cursor: "pointer",
  } as React.CSSProperties,
  bar: {
    width: "100%",
    height: 8,
    background: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
  } as React.CSSProperties,
  barIn: (p: number) =>
    ({
      width: `${Math.round(p * 100)}%`,
      height: "100%",
      background: "#3b82f6",
      transition: "width .2s",
    } as React.CSSProperties),
  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  } as React.CSSProperties,
};

type AgentEvent = Parameters<
  Parameters<typeof window.electronAPI.onAgentEvent>[0]
>[0];

function uuid() {
  // jednoduchý UUID v prohlížeči pro MVP
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  // vstupy
  const [prompt, setPrompt] = useState("");
  const [patientId, setPatientId] = useState("");
  const [templateIds, setTemplateIds] = useState("discharge_summary"); // CSV

  // běh
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const taskIdRef = useRef<string | null>(null);

  // progress = poslední event s progress
  const progress = useMemo(() => {
    const last = [...events]
      .reverse()
      .find((e) => typeof e.progress === "number");
    return last?.progress ?? (running ? 0.02 : 0);
  }, [events, running]);

  useEffect(() => {
    const off = window.electronAPI.onAgentEvent((e) => {
      // filtruj na aktuální task, pokud běží
      if (taskIdRef.current && e.taskId !== taskIdRef.current) return;
      setEvents((prev) => [...prev, e]);

      if (
        e.type === "finished" ||
        e.type === "error" ||
        e.type === "cancelled"
      ) {
        setRunning(false);
      }
    });
    return () => off();
  }, []);

  const runAgent = async () => {
    const id = uuid();
    taskIdRef.current = id;
    setEvents([
      {
        taskId: id,
        type: "event",
        step: "agent.started",
        message: "Start",
        ts: Date.now(),
        progress: 0,
      } as AgentEvent,
    ]);
    setRunning(true);

    // z MVP UI vytvoříme jednoduchý "task"
    const task = {
      id,
      kind: "transcribe_and_fill", // pro teď dummy – v routeru později odvodíme z promptu/příloh
      patientId: patientId || undefined,
      payload: {
        prompt,
        templateIds: templateIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    };

    await window.electronAPI.runAgent(task);
  };

  const cancelAgent = async () => {
    if (taskIdRef.current) {
      await window.electronAPI.cancelAgent(taskIdRef.current);
    }
  };

  const loadRuns = async () => {
    const r = await window.electronAPI.listAgentRuns(10);
    setRuns(r);
  };

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>ByroMed AI — Agent Playground</h1>

      {/* Vstupy */}
      <div style={S.card}>
        <label style={S.label}>Požadavek lékaře</label>
        <textarea
          style={{ ...S.input, minHeight: 120 }}
          placeholder="Např.: Vytvoř propouštěcí zprávu pro pacienta Novák podle šablony discharge_summary…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div style={{ ...S.row, marginTop: 8 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={S.label}>Patient ID (volitelné)</label>
            <input
              style={S.input}
              placeholder="uuid pacienta"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={S.label}>Template IDs (CSV)</label>
            <input
              style={S.input}
              placeholder="např.: discharge_summary, lekarska_zprava_nalez"
              value={templateIds}
              onChange={(e) => setTemplateIds(e.target.value)}
            />
          </div>
        </div>

        <div style={{ ...S.row, marginTop: 10 }}>
          <button style={S.btnPri} onClick={runAgent} disabled={running}>
            Spustit agenta
          </button>
          <button style={S.btn} onClick={cancelAgent} disabled={!running}>
            Zrušit
          </button>
          <button style={S.btn} onClick={loadRuns}>
            Načíst poslední běhy
          </button>
          <button style={S.btn} onClick={() => setEvents([])}>
            Vyčistit log
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 12 }}>
          <div style={S.bar}>
            <div style={S.barIn(progress)} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            {Math.round(progress * 100)} %
          </div>
        </div>
      </div>

      {/* Live event log */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Event log</div>
        <ul style={{ maxHeight: 260, overflow: "auto", fontSize: 13 }}>
          {events.map((e, i) => (
            <li
              key={i}
              style={{ borderTop: "1px solid #e2e8f0", padding: "6px 0" }}
            >
              <span style={{ opacity: 0.6 }}>
                {new Date(e.ts ?? Date.now()).toLocaleTimeString()}
              </span>{" "}
              — <b>{e.step ?? e.type}</b>
              {e.message ? ` – ${e.message}` : ""}
              {typeof e.progress === "number"
                ? ` (${Math.round((e.progress || 0) * 100)}%)`
                : ""}
            </li>
          ))}
        </ul>
      </div>

      {/* Historie běhů (posledních 10) */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Poslední běhy</div>
        <ul style={{ fontSize: 13 }}>
          {runs.map((r) => (
            <li
              key={r.id}
              style={{ borderTop: "1px solid #e2e8f0", padding: "6px 0" }}
            >
              <span style={S.mono}>{r.kind}</span> — <b>{r.status}</b> —{" "}
              {new Date(r.startedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
