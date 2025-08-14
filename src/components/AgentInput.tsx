import { useMemo, useState } from "react";
import Attachments from "./Attachments";
import { ValidationIssue } from "../lib/validation";
import type { AgentInput as AgentInputPayload, UILanguage } from "../Types";

type Props = {
  disabled?: boolean;
  onSubmit: (input: AgentInputPayload) => void;
};

export default function AgentInput({ disabled, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [lang, setLang] = useState<UILanguage>("auto");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  const hasErrors = useMemo(
    () => issues.some((i) => i.type === "error"),
    [issues]
  );

  const canSend =
    !disabled && !hasErrors && (text.trim().length > 0 || files.length > 0);

  return (
    <div className="card-primary space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as UILanguage)}
          className="button-secondary text-sm"
        >
          <option value="auto">Auto language</option>
          <option value="cs-CZ">cs-CZ</option>
          <option value="en-US">en-US</option>
        </select>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Popiš úkol… (např. ‚Přepiš audio a vytvoř lékařskou zprávu z šablony XY‘)"
            rows={3}
            className="w-full resize-y p-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-primary focus:outline-none focus:ring-2 focus:ring-accent-default dark:focus:ring-accent-dark"
          />
        </div>
      </div>

      <Attachments files={files} onChange={setFiles} onIssues={setIssues} />

      <div className="flex items-center justify-between">
        <div className="text-secondary text-xs">
          Tip: Audio ≤ 120 s, PDF ≤ 10 MB (počet stran ověří agent).
        </div>
        <button
          className={`button-primary ${
            !canSend ? "opacity-60 cursor-not-allowed" : ""
          }`}
          disabled={!canSend}
          onClick={() =>
            onSubmit({
              text: text.trim() || undefined,
              files,
              language: lang,
            })
          }
        >
          Spustit
        </button>
      </div>
    </div>
  );
}
