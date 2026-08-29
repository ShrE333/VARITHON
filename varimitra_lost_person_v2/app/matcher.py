from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic

from .config import (
    CANDIDATE_THRESHOLD,
    HIGH_CONFIDENCE_THRESHOLD,
    MATCH_WINDOW_SECONDS,
    MIN_MATCHES_IN_WINDOW
)
from .face_engine import cosine_similarity

@dataclass
class Match:
    case_id: str
    name: str
    similarity: float
    level: str

class TemporalMatcher:
    def __init__(self):
        self.history = defaultdict(deque)
        self.last_alert = {}

    def best_match(self, embedding, active_cases):
        best = None

        for case in active_cases:
            sim = cosine_similarity(embedding, case["_embedding"])
            if best is None or sim > best.similarity:
                best = Match(
                    case_id=case["case_id"],
                    name=case["name"],
                    similarity=sim,
                    level="HIGH" if sim >= HIGH_CONFIDENCE_THRESHOLD else "CANDIDATE"
                )

        if best is None or best.similarity < CANDIDATE_THRESHOLD:
            return None
        return best

    def register(self, match, track_id):
        now = monotonic()
        key = (match.case_id, track_id)

        q = self.history[key]
        q.append((now, match.similarity))

        while q and now-q[0][0] > MATCH_WINDOW_SECONDS:
            q.popleft()

        if len(q) < MIN_MATCHES_IN_WINDOW:
            return False

        last = self.last_alert.get(key, -1e9)
        if now-last < MATCH_WINDOW_SECONDS:
            return False

        self.last_alert[key] = now
        return True
