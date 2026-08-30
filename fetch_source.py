from pathlib import Path
from urllib.request import Request, urlopen

FILES = {
    "main.py": "https://raw.githubusercontent.com/ShrE333/VARITHON/lav/main.py",
    "rag.py": "https://raw.githubusercontent.com/ShrE333/VARITHON/lav/rag.py",
    "requirements.txt": "https://raw.githubusercontent.com/ShrE333/VARITHON/lav/requirements.txt",
    "heritage.json": "https://raw.githubusercontent.com/ShrE333/VARITHON/lav/heritage.json",
    "cache.json": "https://raw.githubusercontent.com/ShrE333/VARITHON/lav/cache.json",
}

def download(url: str, path: Path):
    req = Request(url, headers={"User-Agent": "VARITHON-Render-Build/1.0"})
    with urlopen(req, timeout=60) as response:
        path.write_bytes(response.read())

if __name__ == "__main__":
    base = Path(__file__).resolve().parent
    for name, url in FILES.items():
        print(f"Fetching {name}...")
        download(url, base / name)
    print("VARITHON lav backend source fetched successfully.")
