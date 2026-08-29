import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--config', default='cameras.json')
p.add_argument('--gpu', action='store_true')
p.add_argument('--display', action='store_true')
a = p.parse_args()

cfg = json.loads(Path(a.config).read_text(encoding='utf-8'))

def command(cam):
    cmd = [sys.executable, 'scan_video.py', '--source', str(cam['source']), '--camera-id', cam['camera_id'], '--location', cam['location']]
    if a.gpu:
        cmd.append('--gpu')
    if not a.display:
        cmd.append('--no-display')
    return cmd

workers = {}
for cam in cfg:
    if not cam.get('enabled', True):
        continue
    print('Starting:', cam['camera_id'], cam['location'])
    workers[cam['camera_id']] = {'cam': cam, 'proc': subprocess.Popen(command(cam)), 'restart_at': 0.0}

if not workers:
    raise SystemExit('No enabled cameras in config.')

try:
    while True:
        now = time.monotonic()
        for camera_id, item in workers.items():
            proc = item['proc']
            if proc is not None and proc.poll() is not None:
                print(f"Worker stopped: {camera_id} exit={proc.returncode}; restarting in 3 seconds")
                item['proc'] = None
                item['restart_at'] = now + 3.0
            elif proc is None and now >= item['restart_at']:
                print('Restarting:', camera_id)
                item['proc'] = subprocess.Popen(command(item['cam']))
        time.sleep(1)
except KeyboardInterrupt:
    print('Stopping camera workers...')
    for item in workers.values():
        if item['proc'] is not None:
            item['proc'].terminate()
