import React, { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

export default function App() {
  const [events, setEvents] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const taskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onAgentEvent((e) => {
      setEvents((prev) => [...prev, e]);
    });
    return () => unsubscribe(); // správný cleanup typu () => void
  }, []);

  const run = async () => {
    const id = uuid();
    taskIdRef.current = id;
    setEvents([]);
    await window.electronAPI.runAgent({
      id,
      kind: "hello",
      payload: { prompt: input },
    });
  };

  return (
    <div className="h-screen p-4">
      <div className="max-w-3xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">ByroMed AI — MVP</h1>

        <div className="card p-3">
          <label className="block text-sm mb-1">Požadavek lékaře</label>
          <textarea
            className="input min-h-[120px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Např.: Vytvoř propouštěcí zprávu pro pacienta Novák, přilož audio..."
          />
          <div className="mt-2 flex gap-2">
            <button className="btn btn-primary" onClick={run}>
              Spustit agenta
            </button>
            <button className="btn" onClick={() => setEvents([])}>
              Vyčistit log
            </button>
          </div>
        </div>

        <div className="card p-3">
          <div className="text-sm font-medium mb-2">Průběh</div>
          <ul className="text-sm max-h-[300px] overflow-auto">
            {events.map((e, i) => (
              <li key={i} className="border-b border-[--border] py-1">
                <span className="opacity-60">
                  {new Date(e.ts ?? Date.now()).toLocaleTimeString()}
                </span>{" "}
                — <strong>{e.step ?? e.type}</strong>{" "}
                {e.message ? `– ${e.message}` : ""}
                {typeof e.progress === "number"
                  ? ` (${Math.round(e.progress * 100)}%)`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
