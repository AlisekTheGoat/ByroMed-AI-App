import { AgentRun } from "../Types";

type Props = {
  runs: AgentRun[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

const statusDot: Record<AgentRun["status"], string> = {
  running: "bg-status-info",
  success: "bg-status-success",
  error: "bg-status-error",
  canceled: "bg-status-warning",
};

export default function RunHistory({ runs, selectedId, onSelect }: Props) {
  return (
    <div className="card-primary h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-primary font-semibold">Historie běhů</div>
        <div className="text-secondary text-xs">{runs.length}</div>
      </div>
      <div className="mt-3 space-y-2 overflow-auto">
        {runs.length === 0 && (
          <div className="text-secondary text-sm">Žádné běhy zatím.</div>
        )}
        {runs
          .slice()
          .reverse()
          .map((r) => (
            <button
              key={r.id}
              className={`w-full text-left p-3 rounded-xl border transition ${
                selectedId === r.id
                  ? "bg-light-surface dark:bg-dark-surface border-accent-default dark:border-accent-dark"
                  : "bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border hover:opacity-90"
              }`}
              onClick={() => onSelect(r.id)}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${statusDot[r.status]}`}
                />
                <span className="text-primary text-sm font-medium">
                  {r.input.text?.slice(0, 40) || "Bez popisu"}
                </span>
              </div>
              <div className="text-secondary text-xs mt-1">
                {new Date(r.startedAt).toLocaleString()}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
