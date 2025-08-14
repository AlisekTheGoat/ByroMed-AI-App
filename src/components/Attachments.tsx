import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_MAX_SECONDS_CONST,
  getAudioDurations,
  isAudio,
  isImage,
  isPdf,
  validateFileSet,
  ValidationIssue,
} from "../lib/validation";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  onIssues?: (issues: ValidationIssue[]) => void;
};

export default function Attachments({ files, onChange, onIssues }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(true);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const issues = useMemo(() => {
    const base = validateFileSet(files);
    // doplníme errors pro audio > 120 s (až po načtení metadat)
    for (const f of files) {
      if (
        isAudio(f) &&
        durations[f.name] != null &&
        durations[f.name] > AUDIO_MAX_SECONDS_CONST
      ) {
        base.push({
          type: "error",
          message: `Audio „${f.name}“ má ${Math.ceil(
            durations[f.name]
          )} s (> ${AUDIO_MAX_SECONDS_CONST} s).`,
        });
      }
    }
    return base;
  }, [files, durations]);

  useEffect(() => {
    onIssues?.(issues);
  }, [issues, onIssues]);

  useEffect(() => {
    (async () => {
      if (!files.length) {
        setDurations({});
        return;
      }
      const ds = await getAudioDurations(files);
      setDurations(ds);
    })();
  }, [files]);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const next = [...files, ...Array.from(list)];
      onChange(next);
    },
    [files, onChange]
  );

  const removeAt = (idx: number) => {
    const next = files.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-4 transition ${
          dragOver
            ? "border-accent-default dark:border-accent-dark bg-light-surface/60 dark:bg-dark-surface/40"
            : "border-light-border dark:border-dark-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-secondary text-sm">
            Přetáhni sem **audio/PDF/obrázky** nebo{" "}
            <button
              className="underline text-accent-default dark:text-accent-dark"
              onClick={() => inputRef.current?.click()}
            >
              vyber soubory
            </button>
            .
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="audio/*,application/pdf,image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => addFiles(e.currentTarget.files)}
          />
        </div>

        {!!files.length && (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((f, i) => (
              <li
                key={f.name + i}
                className="card-secondary flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-secondary text-xs px-2 py-1 rounded bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
                    {isAudio(f)
                      ? "AUDIO"
                      : isPdf(f)
                      ? "PDF"
                      : isImage(f)
                      ? "IMG"
                      : "FILE"}
                  </span>
                  <div>
                    <div className="text-primary text-sm font-medium">
                      {f.name}
                    </div>
                    <div className="text-secondary text-xs">
                      {(f.size / (1024 * 1024)).toFixed(2)} MB{" "}
                      {isAudio(f) && durations[f.name] != null && (
                        <>• {Math.ceil(durations[f.name])} s</>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="button-secondary text-xs"
                  onClick={() => removeAt(i)}
                >
                  Odebrat
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!!issues.length && (
        <div className="mt-3 space-y-1">
          {issues.map((it, idx) => (
            <div
              key={idx}
              className={`text-sm ${
                it.type === "error"
                  ? "text-status-error"
                  : "text-status-warning"
              }`}
            >
              {it.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
