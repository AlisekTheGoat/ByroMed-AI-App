import { AgentEvent } from "../Types";

function LevelBadge({ level }: { level: AgentEvent["level"] }) {
  const map: Record<string, string> = {
    info: "text-status-info",
    success: "text-status-success",
    warning: "text-status-warning",
    error: "text-status-error",
  };
  return <span className={`text-xs ${map[level]}`}>{level.toUpperCase()}</span>;
}

export default function EventLog({ events }: { events: AgentEvent[] }) {
  return (
    <div className="card-primary">
      <div className="text-primary font-semibold mb-3">Event log</div>
      <div className="max-h-[45vh] overflow-auto space-y-2 pr-1">
        {events.length === 0 && (
          <div className="text-secondary text-sm">Zatím žádné události.</div>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            className="border-b border-light-border dark:border-dark-border pb-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-primary text-sm font-medium">{e.step}</div>
              <LevelBadge level={e.level} />
            </div>
            <div className="text-secondary text-sm">{e.message}</div>
            <div className="text-secondary text-xs mt-1">
              {new Date(e.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
