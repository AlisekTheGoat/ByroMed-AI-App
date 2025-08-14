// Jednoduché validační utility pro vstupy a soubory
export type ValidationIssue = { type: "error" | "warning"; message: string };

const MAX_PDF_MB = 10;
const MAX_IMG_MB = 10;
const MAX_FILES = 5;
const AUDIO_MAX_SECONDS = 120;

const mb = (bytes: number) => bytes / (1024 * 1024);

const AUDIO_MIME = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
];
const PDF_MIME = ["application/pdf"];
const IMG_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function isAudio(file: File) {
  return AUDIO_MIME.includes(file.type);
}
export function isPdf(file: File) {
  return PDF_MIME.includes(file.type);
}
export function isImage(file: File) {
  return IMG_MIME.includes(file.type);
}

export function validateFileSet(files: File[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (files.length > MAX_FILES) {
    issues.push({
      type: "error",
      message: `Maximálně ${MAX_FILES} příloh.`,
    });
  }
  for (const f of files) {
    if (isPdf(f) && mb(f.size) > MAX_PDF_MB) {
      issues.push({
        type: "error",
        message: `PDF „${f.name}“ má ${mb(f.size).toFixed(
          1
        )} MB (> ${MAX_PDF_MB} MB).`,
      });
    }
    if (isImage(f) && mb(f.size) > MAX_IMG_MB) {
      issues.push({
        type: "error",
        message: `Obrázek „${f.name}“ má ${mb(f.size).toFixed(
          1
        )} MB (> ${MAX_IMG_MB} MB).`,
      });
    }
    if (!isAudio(f) && !isPdf(f) && !isImage(f)) {
      issues.push({
        type: "warning",
        message: `Soubor „${f.name}“ má nepodporovaný MIME (${f.type}). Běh může selhat.`,
      });
    }
    if (isPdf(f)) {
      // Pozn.: Počet stran nelze spolehlivě zjistit bez PDF parseru v prohlížeči.
      issues.push({
        type: "warning",
        message: `PDF „${f.name}“: počet stran ověří agent (limit ≤ 50).`,
      });
    }
  }
  return issues;
}

export async function getAudioDurations(
  files: File[]
): Promise<Record<string, number>> {
  const durations: Record<string, number> = {};
  await Promise.all(
    files.filter(isAudio).map(
      (file) =>
        new Promise<void>((resolve) => {
          const url = URL.createObjectURL(file);
          const audio = document.createElement("audio");
          audio.preload = "metadata";
          audio.src = url;
          audio.onloadedmetadata = () => {
            durations[file.name] = audio.duration || 0;
            URL.revokeObjectURL(url);
            resolve();
          };
          // Fallback timeout
          setTimeout(() => resolve(), 3000);
        })
    )
  );
  return durations;
}

export const AUDIO_MAX_SECONDS_CONST = AUDIO_MAX_SECONDS;
