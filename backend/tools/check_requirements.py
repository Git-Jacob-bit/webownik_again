"""Sprawdza, czy requirements.txt (z hashami) przypina te same wersje co requirements.in.

Nie porównujemy plików bajt po bajcie: requirements.txt generuje pip-compile lokalnie
albo dependabot, a ich wyjście może różnić się kosmetycznie. Kompletność hashy sprawdza
osobno `pip install --require-hashes`.
"""
import re
import sys
from pathlib import Path

PIN = re.compile(r"^([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?==([^\s\;]+)")


def pins(path: Path) -> dict[str, str]:
    result = {}
    for line in path.read_text().splitlines():
        match = PIN.match(line.strip())
        if match:
            result[re.sub(r"[-_.]+", "-", match.group(1)).lower()] = match.group(2)
    return result


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    wanted = pins(root / "requirements.in")
    locked = pins(root / "requirements.txt")
    errors = [
        f"{name}: requirements.in={version}, requirements.txt={locked.get(name, 'brak')}"
        for name, version in wanted.items()
        if locked.get(name) != version
    ]
    if errors:
        print("requirements.txt nie odpowiada requirements.in — uruchom pip-compile (patrz nagłówek pliku):")
        print("\n".join(f"  {error}" for error in errors))
        return 1
    print(f"OK: {len(wanted)} bezpośrednich zależności zgodnych")
    return 0


if __name__ == "__main__":
    sys.exit(main())
