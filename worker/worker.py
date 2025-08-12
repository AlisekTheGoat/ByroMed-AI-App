#!/usr/bin/env python3
import sys, json, time

def send(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def main():
    # hello handshake
    send({"type":"hello","protocol":"1.0.0","workerVersion":"0.0.1","capabilities":["asr","ocr","templater","exporter"],"ts":int(time.time()*1000)})

    line = sys.stdin.readline()
    job = json.loads(line) if line else {}
    task = job.get("task", {})
    task_id = task.get("id","unknown")

    # demo steps
    send({"type":"event","taskId":task_id,"step":"agent.parse_intent","message":"Zpracovávám požadavek","progress":0.1,"ts":int(time.time()*1000)})
    time.sleep(0.4)
    send({"type":"event","taskId":task_id,"step":"asr.check","message":"ASR modul připraven","progress":0.3,"ts":int(time.time()*1000)})
    time.sleep(0.4)
    send({"type":"event","taskId":task_id,"step":"ocr.check","message":"OCR modul připraven","progress":0.6,"ts":int(time.time()*1000)})
    time.sleep(0.4)
    send({"type":"event","taskId":task_id,"step":"agent.finished","message":"Hotovo (stub)","progress":1.0,"ts":int(time.time()*1000)})

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        send({"type":"error","taskId":"unknown","message":str(e),"ts":int(time.time()*1000)})
