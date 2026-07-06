"""출석 singles UUID 파일명 → 01.png … 45.png 정리, 원본은 _source/singles/ 보관."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SINGLES = ROOT / "assets" / "attendance" / "singles"
ARCHIVE = ROOT / "assets" / "attendance" / "_source" / "singles"


def main() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    files = sorted(SINGLES.glob("*.png"))
    if not files:
        print("no png files")
        return

    for f in files:
        shutil.copy2(f, ARCHIVE / f.name)

    # 2단계 리네임 (충돌 방지)
    temps = []
    for i, f in enumerate(files, 1):
        tmp = SINGLES / f"_tmp_{i:02d}.png"
        f.rename(tmp)
        temps.append((i, tmp))

    for i, tmp in temps:
        dest = SINGLES / f"{i:02d}.png"
        tmp.rename(dest)
        print(f"-> {dest.name}")

    print(f"done: {len(temps)} files")


if __name__ == "__main__":
    main()
