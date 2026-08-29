import argparse

from app.face_engine import FaceEngine
from app.registry import CaseRegistry
from app.video_scanner import VideoScanner


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Video path, RTSP URL, or webcam index.")
    parser.add_argument("--camera-id", required=True)
    parser.add_argument("--location", required=True)
    parser.add_argument("--gpu", action="store_true")
    parser.add_argument("--no-display", action="store_true")
    args = parser.parse_args()

    try:
        source = int(args.source)
    except ValueError:
        source = args.source

    engine = FaceEngine(gpu=args.gpu)
    registry = CaseRegistry()
    scanner = VideoScanner(engine, registry)
    scanner.scan(
        source=source,
        camera_id=args.camera_id,
        camera_location=args.location,
        display=not args.no_display,
    )


if __name__ == "__main__":
    main()
