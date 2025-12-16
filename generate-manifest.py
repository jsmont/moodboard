#!/usr/bin/env python3
import json
import os
from datetime import datetime, UTC
from pathlib import Path

def generate_manifest():
    static_dir = Path('static')

    # Get all files in static directory
    files = []
    if static_dir.exists():
        files = sorted([f.name for f in static_dir.iterdir() if f.is_file()])

    # Create manifest
    manifest = {
        'files': files,
        'generated': datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')
    }

    # Write to manifest.json
    with open('manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print('✓ manifest.json updated')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    generate_manifest()
