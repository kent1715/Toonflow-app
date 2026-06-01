# Toonflow Indonesian (id-ID) Locale Patch

## Overview

This patch adds complete **Bahasa Indonesia (`id-ID`)** locale support to Toonflow by injecting it directly into the compiled frontend (`data/web/index.html`).

**Current version: v4.0** — safer injection with JavaScript syntax validation and auto-restore.

## Architecture Notes

- **Toonflow is an Electron + Express desktop app** with a **pre-compiled Vue.js frontend**
- All locale data is embedded in `data/web/index.html` as minified JavaScript
- The i18n library is **vue-i18n v11.3.0** (Composition API mode)
- There are NO separate source files like `src/locales/` or `src/App.vue` in this repository
  — these would be in the Vue.js frontend source which is compiled before distribution

## Files in This Patch

| File | Description |
|------|-------------|
| `id-ID.json` | Complete Indonesian locale with ALL 1,597 keys |
| `patch-indonesian.py` | Auto-patch script for `data/web/index.html` (v4.0) |
| `restore-original.py` | Restore script to undo the patch |

## How to Apply

### Method 1: Auto-Patch Script (Recommended)

```bash
# On your Windows machine, open Command Prompt or PowerShell:
cd D:\Toonflow-app
python indonesian-patch\patch-indonesian.py D:\Toonflow-app

# Or if already in the project directory:
python indonesian-patch\patch-indonesian.py

# Preview what the patch will do (no files modified):
python indonesian-patch\patch-indonesian.py D:\Toonflow-app --dry-run
```

The script will:
1. Detect the locale structure in your `index.html` (English & Chinese locale objects)
2. Find the vue-i18n `messages:{...}` configuration
3. Find the language selector array
4. **Inject `"id-ID":{...}` directly into the messages object** (safer than v3)
5. Add "Bahasa Indonesia" to the language selector
6. Validate JavaScript syntax after patching (using `node --check` or bracket matching)
7. **Auto-restore** if syntax validation fails
8. Create a backup before writing

### Method 2: Dry-Run First

Always recommended before first use:

```bash
python indonesian-patch\patch-indonesian.py D:\Toonflow-app --dry-run
```

This shows:
- What locale objects were detected
- Where the injection will happen
- Context around each injection point
- No files are modified

### To Restore

```bash
python indonesian-patch\restore-original.py D:\Toonflow-app
```

Or manually:
```bash
copy "D:\Toonflow-app\data\web\index.html.before-id-patch-v4.0.bak" "D:\Toonflow-app\data\web\index.html"
```

## Version History

### v4.0 (Current)
- **SAFER**: Injects `"id-ID":{...}` directly into messages object — no separate variable declaration
- **Syntax validation**: Checks JavaScript syntax after patching (node --check or bracket matching)
- **Auto-restore**: If syntax check fails, automatically reverts to backup
- **Dry-run mode**: `--dry-run` flag shows planned patches without modifying files
- **Template literal handling**: Better handling of backtick strings in brace matching
- **HTML-safe escaping**: Escapes `</script>` in JSON values

### v3.0 (Superseded)
- Created separate `IDi={...}` variable and added to messages config
- **Issue**: Injection position could break minified JS syntax

### v2.0 (Superseded)
- Dynamic detection of locale variable names
- **Issue**: Assumed existing id-ID locale

### v1.0 (Superseded)
- Hardcoded `fSi` variable name
- **Issue**: Variable names differ between builds

## Troubleshooting

### Patch fails with "Could not find Chinese settings variable"
Your `index.html` may have a different structure. Look for a variable containing `"ToonFlow设置"` and report the surrounding code.

### Patch succeeds but Toonflow won't open
This shouldn't happen with v4.0 (syntax validation + auto-restore). If it does:
1. Restore: `python restore-original.py`
2. Check the backup file: `index.html.before-id-patch-v4.0.bak`
3. Try dry-run mode first: `python patch-indonesian.py --dry-run`

### Language selector doesn't show Indonesian
The language selector detection may have failed. You can manually add to the selector array in `index.html`:
- Find: `{label:"...",tips:"...",value:"zh-CN"}`
- Add: `{label:"Bahasa Indonesia",tips:"Indonesian",value:"id-ID"}`
