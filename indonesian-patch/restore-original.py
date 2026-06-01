#!/usr/bin/env python3
"""
Restore original data/web/index.html from backup.

Usage:
    python restore-original.py [path_to_toonflow]
"""

import sys
import os
import shutil

def main():
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = '.'
    
    html_path = os.path.join(project_path, 'data', 'web', 'index.html')
    backup_path = html_path + '.bak'
    
    if not os.path.exists(backup_path):
        print(f"ERROR: Backup not found: {backup_path}")
        sys.exit(1)
    
    shutil.copy2(backup_path, html_path)
    print(f"Restored: {backup_path} -> {html_path}")
    
    # Remove backup
    os.remove(backup_path)
    print(f"Removed backup: {backup_path}")

if __name__ == '__main__':
    main()
