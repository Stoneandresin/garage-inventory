import subprocess
from pathlib import Path

def test_overlay_js():
    script = Path(__file__).parent / 'test_scan_overlay.js'
    subprocess.run(['node', str(script)], check=True)
