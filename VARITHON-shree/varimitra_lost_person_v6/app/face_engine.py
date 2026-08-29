import cv2
import numpy as np
import tritonclient.http as httpclient
from .config import (
    DETECTION_SIZE, DETECTION_THRESHOLD, NMS_THRESHOLD,
    TRITON_URL, TRITON_DETECTOR_MODEL, TRITON_RECOGNITION_MODEL,
)


class Face:
    def __init__(self, bbox, kps, det_score, embedding=None):
        self.bbox = np.asarray(bbox, dtype=np.float32)
        self.kps = np.asarray(kps, dtype=np.float32) if kps is not None else None
        self.det_score = float(det_score)
        self.embedding = embedding


class TritonFaceEngine:
    """SCRFD + ArcFace client. All neural inference happens in Triton."""
    def __init__(self, url=TRITON_URL):
        self.url = url
        self.client = httpclient.InferenceServerClient(url=url, verbose=False)
        if not self.client.is_server_ready():
            raise RuntimeError(f"Triton is not ready at http://{url}. Start Triton first.")
        for model in (TRITON_DETECTOR_MODEL, TRITON_RECOGNITION_MODEL):
            if not self.client.is_model_ready(model):
                raise RuntimeError(f"Triton model '{model}' is not ready")
        self.det_meta = self.client.get_model_metadata(TRITON_DETECTOR_MODEL)
        self.rec_meta = self.client.get_model_metadata(TRITON_RECOGNITION_MODEL)
        self.det_input = self.det_meta['inputs'][0]['name']
        self.det_outputs = [x['name'] for x in self.det_meta['outputs']]
        self.rec_input = self.rec_meta['inputs'][0]['name']
        self.rec_output = self.rec_meta['outputs'][0]['name']

    @staticmethod
    def _infer(client, model, input_name, tensor, output_names):
        inp = httpclient.InferInput(input_name, tensor.shape, 'FP32')
        inp.set_data_from_numpy(np.ascontiguousarray(tensor.astype(np.float32)))
        outs = [httpclient.InferRequestedOutput(n) for n in output_names]
        res = client.infer(model_name=model, inputs=[inp], outputs=outs)
        return [res.as_numpy(n) for n in output_names]

    @staticmethod
    def _distance2bbox(points, distance):
        x1 = points[:, 0] - distance[:, 0]
        y1 = points[:, 1] - distance[:, 1]
        x2 = points[:, 0] + distance[:, 2]
        y2 = points[:, 1] + distance[:, 3]
        return np.stack([x1, y1, x2, y2], axis=-1)

    @staticmethod
    def _distance2kps(points, distance):
        preds = []
        for i in range(0, distance.shape[1], 2):
            preds.append(points[:, 0] + distance[:, i])
            preds.append(points[:, 1] + distance[:, i + 1])
        return np.stack(preds, axis=-1)

    @staticmethod
    def _nms(boxes, scores, threshold):
        if len(boxes) == 0:
            return []
        x1, y1, x2, y2 = boxes[:,0], boxes[:,1], boxes[:,2], boxes[:,3]
        areas = (x2-x1+1) * (y2-y1+1)
        order = scores.argsort()[::-1]
        keep = []
        while order.size > 0:
            i = order[0]; keep.append(int(i))
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            w = np.maximum(0.0, xx2-xx1+1)
            h = np.maximum(0.0, yy2-yy1+1)
            inter = w*h
            ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-12)
            order = order[np.where(ovr <= threshold)[0] + 1]
        return keep

    @staticmethod
    def _reshape_output(a):
        a = np.asarray(a)
        if a.ndim >= 1 and a.shape[0] == 1:
            a = a[0]
        if a.ndim == 1:
            return a.reshape(-1, 1)
        return a.reshape(-1, a.shape[-1])

    def _decode_scrfd(self, outputs, input_w, input_h):
        # SCRFD buffalo_l detector has 3 score + 3 bbox + 3 kps tensors.
        groups = {1: [], 4: [], 10: []}
        for name, raw in zip(self.det_outputs, outputs):
            arr = self._reshape_output(raw)
            last = arr.shape[-1]
            if last in groups:
                groups[last].append((name, arr))
        if not groups[1] or not groups[4]:
            shapes = [(n, np.asarray(a).shape) for n,a in zip(self.det_outputs, outputs)]
            raise RuntimeError(f"Unexpected SCRFD outputs: {shapes}")

        def stride_for_count(count):
            for stride in (8,16,32,64,128):
                cells=(input_w//stride)*(input_h//stride)
                if count in (cells, cells*2): return stride
            raise RuntimeError(f"Cannot infer SCRFD stride from output count {count}")

        scores_by_stride={stride_for_count(a.shape[0]):a for _,a in groups[1]}
        bbox_by_stride={stride_for_count(a.shape[0]):a for _,a in groups[4]}
        kps_by_stride={stride_for_count(a.shape[0]):a for _,a in groups[10]}
        all_boxes=[]; all_scores=[]; all_kps=[]
        for stride in sorted(set(scores_by_stride) & set(bbox_by_stride)):
            scores=scores_by_stride[stride].reshape(-1)
            bbox_pred=bbox_by_stride[stride]*stride
            kps_pred=kps_by_stride.get(stride)
            if kps_pred is not None: kps_pred=kps_pred*stride
            height=input_h//stride; width=input_w//stride
            count=len(scores); cells=height*width
            anchors=max(1,count//cells)
            centers=np.stack(np.mgrid[:height,:width][::-1],axis=-1).astype(np.float32)*stride
            centers=centers.reshape(-1,2)
            if anchors>1: centers=np.stack([centers]*anchors,axis=1).reshape(-1,2)
            pos=np.where(scores>=DETECTION_THRESHOLD)[0]
            if not len(pos): continue
            boxes=self._distance2bbox(centers,bbox_pred)[pos]
            all_boxes.append(boxes); all_scores.append(scores[pos])
            if kps_pred is not None:
                kp=self._distance2kps(centers,kps_pred).reshape(-1,5,2)[pos]
            else:
                kp=np.zeros((len(pos),5,2),dtype=np.float32)
            all_kps.append(kp)
        if not all_boxes: return []
        boxes=np.vstack(all_boxes); scores=np.concatenate(all_scores); kps=np.vstack(all_kps)
        keep=self._nms(boxes,scores,NMS_THRESHOLD)
        return [Face(boxes[i],kps[i],scores[i]) for i in keep]

    def detect(self, image_bgr):
        dw, dh = DETECTION_SIZE
        h,w=image_bgr.shape[:2]
        scale=min(dw/w, dh/h)
        nw,nh=int(w*scale),int(h*scale)
        resized=cv2.resize(image_bgr,(nw,nh))
        canvas=np.zeros((dh,dw,3),dtype=np.uint8)
        canvas[:nh,:nw]=resized
        blob=cv2.dnn.blobFromImage(canvas,1.0/128.0,(dw,dh),(127.5,127.5,127.5),swapRB=True)
        raw=self._infer(self.client,TRITON_DETECTOR_MODEL,self.det_input,blob,self.det_outputs)
        faces=self._decode_scrfd(raw,dw,dh)
        for f in faces:
            f.bbox /= scale
            if f.kps is not None: f.kps /= scale
        return faces

    @staticmethod
    def _norm_crop(image, landmark):
        dst=np.array([[38.2946,51.6963],[73.5318,51.5014],[56.0252,71.7366],
                      [41.5493,92.3655],[70.7299,92.2041]],dtype=np.float32)
        M,_=cv2.estimateAffinePartial2D(np.asarray(landmark,dtype=np.float32),dst,method=cv2.LMEDS)
        if M is None:
            raise RuntimeError('Face alignment failed')
        return cv2.warpAffine(image,M,(112,112),borderValue=0.0)

    def embedding(self, image_bgr, face):
        if face.kps is None or not np.any(face.kps):
            x1,y1,x2,y2=np.clip(face.bbox.astype(int),[0,0,0,0],[image_bgr.shape[1],image_bgr.shape[0],image_bgr.shape[1],image_bgr.shape[0]])
            crop=image_bgr[y1:y2,x1:x2]
            if crop.size==0: raise RuntimeError('Empty face crop')
            aligned=cv2.resize(crop,(112,112))
        else:
            aligned=self._norm_crop(image_bgr,face.kps)
        blob=cv2.dnn.blobFromImage(aligned,1.0/127.5,(112,112),(127.5,127.5,127.5),swapRB=True)
        out=self._infer(self.client,TRITON_RECOGNITION_MODEL,self.rec_input,blob,[self.rec_output])[0]
        e=np.asarray(out,dtype=np.float32).reshape(-1)
        e/=max(float(np.linalg.norm(e)),1e-12)
        face.embedding=e
        return e

    @staticmethod
    def normalized_embedding(face):
        e=np.asarray(face.embedding,dtype=np.float32)
        return e/max(float(np.linalg.norm(e)),1e-12)

    def detect_and_embed(self,image_bgr):
        faces=self.detect(image_bgr)
        for f in faces:
            try: self.embedding(image_bgr,f)
            except Exception: f.embedding=None
        return [f for f in faces if f.embedding is not None]

    def enrollment_embedding(self,image_bgr):
        faces=self.detect_and_embed(image_bgr)
        if len(faces)==0: raise ValueError('No face detected. Upload a clearer front-facing photo.')
        if len(faces)>1: raise ValueError('More than one face detected. Crop to one person.')
        f=faces[0]
        x1,y1,x2,y2=[int(v) for v in f.bbox]
        crop=image_bgr[max(0,y1):max(0,y2),max(0,x1):max(0,x2)]
        blur=None
        if crop.size:
            blur=float(cv2.Laplacian(cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY),cv2.CV_64F).var())
        return self.normalized_embedding(f), {'bbox':[x1,y1,x2,y2],'det_score':f.det_score,'blur_variance':blur,'inference':'triton'}


def cosine_similarity(a,b):
    return float(np.dot(a,b))

# Backward-compatible name used by the rest of VariMitra.
FaceEngine = TritonFaceEngine
