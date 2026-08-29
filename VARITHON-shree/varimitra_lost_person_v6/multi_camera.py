import argparse,json,subprocess,sys,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--config',default='cameras.json');p.add_argument('--display',action='store_true');a=p.parse_args()
cfg=json.loads(Path(a.config).read_text(encoding='utf-8'));workers=[]
for cam in cfg:
    if not cam.get('enabled',True):continue
    cmd=[sys.executable,'scan_video.py','--source',str(cam['source']),'--camera-id',cam['camera_id'],'--location',cam['location']]
    if not a.display:cmd.append('--no-display')
    print('Starting:',cam['camera_id'],cam['location']);workers.append((cam,subprocess.Popen(cmd)))
if not workers:raise SystemExit('No enabled cameras in config.')
try:
    while True:
        alive=[]
        for cam,proc in workers:
            rc=proc.poll()
            if rc is None:alive.append((cam,proc))
            else:print(f"Worker stopped: {cam['camera_id']} exit={rc}")
        workers=alive
        if not workers:break
        time.sleep(2)
except KeyboardInterrupt:
    print('Stopping camera workers...')
    for _,proc in workers:proc.terminate()
