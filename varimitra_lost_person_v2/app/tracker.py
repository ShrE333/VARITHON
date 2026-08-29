from dataclasses import dataclass
import math

@dataclass
class Track:
    track_id: int
    bbox: tuple
    missed: int = 0

def center(b):
    x1, y1, x2, y2 = b
    return ((x1+x2)/2.0, (y1+y2)/2.0)

def distance(a, b):
    ax, ay = center(a)
    bx, by = center(b)
    return math.hypot(ax-bx, ay-by)

class SimpleFaceTracker:
    def __init__(self, max_distance=120.0, max_missed=8):
        self.max_distance = max_distance
        self.max_missed = max_missed
        self.next_id = 1
        self.tracks = {}

    def update(self, boxes):
        result = [-1] * len(boxes)
        used = set()

        for i, box in enumerate(boxes):
            best_id = None
            best_dist = float("inf")

            for tid, track in self.tracks.items():
                if tid in used:
                    continue
                d = distance(box, track.bbox)
                if d < best_dist and d <= self.max_distance:
                    best_dist = d
                    best_id = tid

            if best_id is None:
                best_id = self.next_id
                self.next_id += 1
                self.tracks[best_id] = Track(best_id, box)
            else:
                self.tracks[best_id].bbox = box
                self.tracks[best_id].missed = 0

            used.add(best_id)
            result[i] = best_id

        for tid in list(self.tracks.keys()):
            if tid not in used:
                self.tracks[tid].missed += 1
                if self.tracks[tid].missed > self.max_missed:
                    del self.tracks[tid]

        return result
