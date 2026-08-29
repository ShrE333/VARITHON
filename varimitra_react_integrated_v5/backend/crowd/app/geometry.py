import cv2
import numpy as np


def build_homography(width, height, map_quad):
    src = np.array([[0,0],[width-1,0],[width-1,height-1],[0,height-1]], dtype=np.float32)
    dst = np.array(map_quad, dtype=np.float32)
    return cv2.getPerspectiveTransform(src, dst)


def project_point(H, x, y):
    p = np.array([[[float(x), float(y)]]], dtype=np.float32)
    out = cv2.perspectiveTransform(p, H)[0][0]
    return float(out[0]), float(out[1])


def point_in_polygon(point, polygon):
    poly = np.asarray(polygon, dtype=np.float32)
    return cv2.pointPolygonTest(poly, point, False) >= 0
