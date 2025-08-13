#!/usr/bin/env python3
import sys, json, time, math

def send(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def estimate_eta(task):
    payload = task.get("payload", {}) or {}
    audio_dur = payload.get("audioDurationSec", 0) or 0
    docs = payload.get("docPaths", []) or []
    # jednoduchý model: ASR ~ 0.5x délky audia (small model na CPU), OCR ~ 0.3s/stránka (hrubý odhad)
    eta_asr = 0.5 * audio_dur if audio_dur > 0 else 0
    eta_ocr = 0.3 * len(docs)
    base_overhead = 1.5  # routing, IO
    return max(1.0, eta_asr + eta_ocr + base_overhead)

def main():
    # hello handshake
    send({"type":"hello","protocol":"1.0.0","workerVersion":"0.0.2","capabilities":["asr","ocr","templater","exporter"],"ts":int(time.time()*1000)})

    line = sys.stdin.readline()
    job = json.loads(line) if line else {}
    task = job.get("task", {})
    task_id = task.get("id","unknown")
    kind = task.get("kind","unknown")

    # ETA
    total_eta = estimate_eta(task)
    t0 = time.time()

    def step(step_name, message, progress):
        elapsed = time.time() - t0
        eta_left = max(0.0, total_eta - elapsed)
        send({
            "type":"event","taskId":task_id,
            "step":step_name,"message":message,"progress":progress,
            "ts":int(time.time()*1000),
            "payload":{"etaSec": eta_left}
        })

    step("agent.parse_intent","Zpracovávám požadavek",0.05)
    time.sleep(0.3)

    if kind == "transcribe_and_fill":
      step("asr.init","Inicializuji ASR",0.15); time.sleep(0.2)
      step("asr.transcribe","Přepisuji audio…",0.45); time.sleep(0.6)  # zde později faster-whisper
      step("db.fetch","Načítám data pacienta…",0.55); time.sleep(0.2)
      step("templater.fill","Plním šablonu(y)…",0.75); time.sleep(0.2)
      step("export.pdf","Exportuji PDF/DOCX…",0.9); time.sleep(0.2)

    elif kind == "ocr_and_summarize":
      step("ocr.init","Inicializuji OCR",0.15); time.sleep(0.2)
      step("ocr.read","Čtu dokumenty…",0.55); time.sleep(0.6)
      step("summarize","Tvořím shrnutí…",0.8); time.sleep(0.2)

    elif kind == "template_fill_only":
      step("templater.fill","Plním šablonu…",0.6); time.sleep(0.3)

    else:
      step("agent.route","Směruji úlohu…",0.2); time.sleep(0.2)

    send({"type":"finished","taskId":task_id,"step":"agent.finished","message":"Hotovo (stub)","progress":1.0,"ts":int(time.time()*1000)})
    
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        send({"type":"error","taskId":"unknown","message":str(e),"ts":int(time.time()*1000)})
