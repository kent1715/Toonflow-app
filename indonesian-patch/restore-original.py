#!/usr/bin/env python3
"""
Restore original data/web/index.html from backup.

Usage:
    python restore-original.py [path_to_toonflow]
"""

import sys
import os
import shutil
import glob

def main():
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = '.'
    
    html_path = os.path.join(project_path, 'data', 'web', 'index.html')
    
    # Look for backup files - try version-specific first, then generic
    backup_patterns = [
        html_path + '.before-id-patch-v4.0.bak',
        html_path + '.before-id-patch-v3.0.bak',
        html_path + '.before-id-patch-v2.0.bak',
        html_path + '.before-id-patch-v1.0.bak',
        html_path + '.bak',
    ]
    
    backup_path = None
    for pattern in backup_patterns:
        if os.path.exists(pattern):
            backup_path = pattern
            break
    
    if backup_path is None:
        # Try glob for any .bak file
        bak_files = sorted(glob.glob(html_path + '*.bak'), reverse=True)
        if bak_files:
            backup_path = bak_files[0]
    
    if backup_path is None:
        print("ERROR: No backup file found!")
        print(f"  Looked for: {html_path}*.bak")
        sys.exit(1)
    
    shutil.copy2(backup_path, html_path)
    print(f"Restored: {backup_path} -> {html_path}")
    
    # Ask before removing backup
    response = input(f"Remove backup file {backup_path}? (y/N): ").strip().lower()
    if response == 'y':
        os.remove(backup_path)
        print(f"Removed: {backup_path}")
    else:
        print(f"Backup kept: {backup_path}")

if __name__ == '__main__':
    main()
