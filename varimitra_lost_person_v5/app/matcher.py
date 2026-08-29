from collections import defaultdict,deque
from time import monotonic
from .config import CANDIDATE_THRESHOLD,HIGH_CONFIDENCE_THRESHOLD,MATCH_WINDOW_SECONDS,MIN_MATCHES_IN_WINDOW
from .face_engine import cosine_similarity
class Match:
    def __init__(self,case_id,name,similarity,level): self.case_id=case_id; self.name=name; self.similarity=similarity; self.level=level
class TemporalMatcher:
    def __init__(self): self.history=defaultdict(deque); self.last_alert={}
    def best_match(self,e,cases):
        best=None
        for c in cases:
            s=cosine_similarity(e,c['_embedding'])
            if best is None or s>best.similarity: best=Match(c['case_id'],c['name'],s,'HIGH' if s>=HIGH_CONFIDENCE_THRESHOLD else 'CANDIDATE')
        return best if best and best.similarity>=CANDIDATE_THRESHOLD else None
    def register(self,m,track_id):
        now=monotonic(); k=(m.case_id,track_id); q=self.history[k]; q.append(now)
        while q and now-q[0]>MATCH_WINDOW_SECONDS: q.popleft()
        if len(q)<MIN_MATCHES_IN_WINDOW: return False
        if now-self.last_alert.get(k,-1e9)<MATCH_WINDOW_SECONDS: return False
        self.last_alert[k]=now; return True
