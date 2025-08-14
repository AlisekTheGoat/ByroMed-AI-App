import { AgentEvent, AgentRun } from "../Types";

function computeProgress(events: AgentEvent[]) {
  const order = [
    "hello",
    "router",
    "asr.check",
    "asr.transcribe",
    "ocr.check",
    "ocr.parse",
    "templating",
    "export",
    "finished",
  ];
  const idx = Math.max(
    0,
    ...events.map((e) => Math.max(0, order.indexOf(e.step)))
  );
  const base = (idx + 1) / order.length;
  const fine = Math.max(...events.map((e) => e.progress ?? 0), 0);
  return Math.max(base, fine);
}

export default function RunProgress({ run }: { run: AgentRun | null }) {
  if (!run) return null;
  const pct = Math.round((computeProgress(run.events) || 0) * 100);

  const statusColor =
    run.status === "running"
      ? "bg-status.info"
      : run.status === "success"
      ? "bg-status.success"
      : run.status === "error"
      ? "bg-status.error"
      : "bg-status.warning";

  return (
    <div className="card-primary">
      <div className="flex items-center justify-between">
        <div className="text-primary font-semibold">Průběh běhu</div>
        <div className="text-secondary text-sm">{run.id}</div>
      </div>
      <div className="mt-3 h-3 w-full bg-light-bg dark:bg-dark-bg rounded">
        <div
          className={`h-3 rounded ${statusColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-secondary text-sm">{pct}%</div>
    </div>
  );
}
