# agent/agent.py
import os
import sys
import json
import time

RUN_ID = os.environ.get("BYROMED_RUN_ID", "")

def emit(step, level="info", message="", progress=None, payload=None):
    ev = {
        "step": step,
        "level": level,
        "message": message,
    }
    if progress is not None:
        ev["progress"] = progress
    if payload is not None:
        ev["payload"] = payload
    sys.stdout.write(json.dumps(ev) + "\n")
    sys.stdout.flush()

def main():
    # Načti inicializační JSON (runId/text/language)
    init_line = sys.stdin.readline()
    try:
        init = json.loads(init_line) if init_line else {}
    except Exception:
        init = {}

    text = init.get("text") or ""
    lang = init.get("language") or "auto"

    # Simulace kroků (shodně s UI mockem)
    steps = [
        ("hello", "info", "Agent inicializován"),
        ("router", "info", "Analýza záměru (rule-based)"),
        ("asr.check", "info", "Kontrola audio limitů"),
        ("asr.transcribe", "info", f"Přepis ({lang})…"),
        ("ocr.check", "info", "Kontrola PDF/obrázků"),
        ("ocr.parse", "info", "OCR analýza (PaddleOCR)…"),
        ("templating", "info", "Render šablony…"),
        ("export", "success", "Export PDF hotov"),
    ]

    for i, (step, level, message) in enumerate(steps):
        emit(step, level, message, progress=(i + 1) / (len(steps) + 1))
        # simulace práce
        time.sleep(0.6 if step != "asr.transcribe" else 1.2)

    # finále
    emit("finished", "success", "Dokončeno", progress=1.0, payload={"echoText": text})

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        # Uctivý exit pro SIGTERM/SIGINT
        pass
