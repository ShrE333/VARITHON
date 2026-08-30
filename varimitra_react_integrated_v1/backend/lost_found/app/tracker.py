import math
class SimpleFaceTracker:
    def __init__(self,max_distance=120,max_missed=8): self.max_distance=max_distance; self.max_missed=max_missed; self.next_id=1; self.tracks={}
    @staticmethod
    def center(b): x1,y1,x2,y2=b; return ((x1+x2)/2,(y1+y2)/2)
    def update(self,boxes):
        ids=[]; used=set()
        for b in boxes:
            bc=self.center(b); best=None; bestd=1e9
            for tid,t in self.tracks.items():
                if tid in used: continue
                tc=self.center(t['bbox']); d=math.hypot(bc[0]-tc[0],bc[1]-tc[1])
                if d<bestd and d<=self.max_distance: best,bestd=tid,d
            if best is None: best=self.next_id; self.next_id+=1; self.tracks[best]={'bbox':b,'missed':0}
            else: self.tracks[best]={'bbox':b,'missed':0}
            used.add(best); ids.append(best)
        for tid in list(self.tracks):
            if tid not in used:
                self.tracks[tid]['missed']+=1
                if self.tracks[tid]['missed']>self.max_missed: del self.tracks[tid]
        return ids
