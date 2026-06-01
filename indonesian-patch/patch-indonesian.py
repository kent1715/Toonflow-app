#!/usr/bin/env python3
"""
Toonflow Indonesian (id-ID) Locale Patch Script v2.0
=====================================================
Dynamically detects the Indonesian locale variable in data/web/index.html
and injects 88 missing Bahasa Indonesia translations.

Works across different Toonflow builds where minified variable names differ.

Usage:
    python patch-indonesian.py [path_to_toonflow]

Example:
    python patch-indonesian.py D:\\Toonflow-app

What gets patched (88 missing keys):
- settings.vendor.test.* (37 keys) — Vendor test dialog sub-items
- settings.modelMap.* (16 keys) — Model mapping settings
- settings.memory.modelMap.* (12 keys) — Prompt management in memory
- settings.menu.* (3 keys) — Menu items (UI, Model Map, Dev)
- settings.other.openIsInteracting (1 key)
- settings.request.refresh (1 key)
- settings.generate.modelChnageSure (1 key)
- storyboard.assetsNotExists (1 key)
- workbench.cornerScape.msg.emptyPrompt (1 key)
- workbench.generate.* (5 keys) — Video generation
- workbench.production.generate.* (2 keys) — Production state
- workbench.script.* (3 keys) — Script extraction
"""

import sys
import os
import re
import shutil

# ============================================================
# The 88 missing Indonesian translations
# ============================================================
MISSING_TRANSLATIONS = {
    # settings.generate (1 key)
    "settings.generate.modelChnageSure": "Konfirmasi Pembersihan",

    # settings.memory.modelMap (9+3 keys)
    "settings.memory.modelMap.addPrompt": "Tambah Prompt",
    "settings.memory.modelMap.addPromptTitle": "Tambah Prompt",
    "settings.memory.modelMap.editPrompt": "Edit",
    "settings.memory.modelMap.editPromptTitle": "Edit Prompt",
    "settings.memory.modelMap.promptNamePlaceholder": "Masukkan nama prompt",
    "settings.memory.modelMap.promptNameRequired": "Silakan masukkan nama prompt",
    "settings.memory.modelMap.promptSaveSuccess": "Berhasil disimpan",
    "settings.memory.modelMap.promptTypePlaceholder": "Pilih tipe",
    "settings.memory.modelMap.typeImage": "Gambar",
    "settings.memory.modelMap.typeText": "Teks",
    "settings.memory.modelMap.typeVideo": "Video",

    # settings.menu (3 keys)
    "settings.menu.devConfig": "Opsi Pengembang",
    "settings.menu.modelMap": "Pemetaan Model",
    "settings.menu.ui": "Pengaturan Antarmuka",

    # settings.modelMap (16 keys)
    "settings.modelMap.col.mode": "Mode",
    "settings.modelMap.col.prompt": "Prompt",
    "settings.modelMap.imageModel": "Model Gambar",
    "settings.modelMap.mode.audioReference": "Referensi Audio",
    "settings.modelMap.mode.endFrameOptional": "Frame Awal & Akhir (Frame Akhir Opsional)",
    "settings.modelMap.mode.imageReference": "Referensi Gambar",
    "settings.modelMap.mode.multiReference": "Multi Referensi",
    "settings.modelMap.mode.referenceSuffix": "Referensi",
    "settings.modelMap.mode.singleImage": "Gambar Tunggal",
    "settings.modelMap.mode.startEndRequired": "Frame Awal & Akhir (Keduanya Wajib)",
    "settings.modelMap.mode.startFrameOptional": "Frame Awal & Akhir (Frame Awal Opsional)",
    "settings.modelMap.mode.text": "Teks ke Gambar / Teks ke Video",
    "settings.modelMap.mode.videoReference": "Referensi Video",
    "settings.modelMap.msg.saveFailed": "Gagal menyimpan, silakan coba lagi nanti",
    "settings.modelMap.msg.saveSuccess": "Pemetaan prompt model tersimpan",
    "settings.modelMap.noModel": "Belum ada model gambar atau video yang tersedia, silakan tambahkan di \u00abLayanan Model\u00bb terlebih dahulu",
    "settings.modelMap.promptPlaceholder": "Masukkan prompt untuk mode ini",
    "settings.modelMap.save": "Simpan Konfigurasi",
    "settings.modelMap.videoModel": "Model Video",

    # settings.other (1 key)
    "settings.other.openIsInteracting": "Aktifkan",

    # settings.request (1 key)
    "settings.request.refresh": "Segarkan",

    # settings.vendor.test (37 keys)
    "settings.vendor.test.assistant": "Asisten",
    "settings.vendor.test.audio": "Audio",
    "settings.vendor.test.cancel": "Batal",
    "settings.vendor.test.clearHistory": "Bersihkan Percakapan",
    "settings.vendor.test.endFrame": "Frame Akhir (Wajib)",
    "settings.vendor.test.endFrameOptional": "Frame Akhir (Opsional)",
    "settings.vendor.test.endFrameOptionalDesc": "Frame awal wajib, frame akhir opsional",
    "settings.vendor.test.image": "Gambar",
    "settings.vendor.test.imageTitle": "Pengujian Pembuatan Gambar",
    "settings.vendor.test.imageToImage": "Gambar ke Gambar",
    "settings.vendor.test.multiRef": "Multi Referensi Gambar",
    "settings.vendor.test.multiRefDesc": "Mode multi referensi",
    "settings.vendor.test.optional": "Opsional",
    "settings.vendor.test.prompt": "Prompt",
    "settings.vendor.test.promptPlaceholder": "Masukkan prompt",
    "settings.vendor.test.referenceImage": "Gambar Referensi",
    "settings.vendor.test.result": "Hasil Pembuatan",
    "settings.vendor.test.selectMode": "Pilih Mode Pengujian",
    "settings.vendor.test.send": "Kirim",
    "settings.vendor.test.singleImageDesc": "Membuat video berdasarkan satu gambar referensi",
    "settings.vendor.test.singleImageMode": "Referensi Gambar Tunggal",
    "settings.vendor.test.startEndRequiredDesc": "Frame awal dan frame akhir keduanya wajib disediakan",
    "settings.vendor.test.startFrame": "Frame Awal (Wajib)",
    "settings.vendor.test.startFrameOptional": "Frame Awal (Opsional)",
    "settings.vendor.test.startFrameOptionalDesc": "Frame akhir wajib, frame awal opsional",
    "settings.vendor.test.startStart": "Mulai Pengujian",
    "settings.vendor.test.supportFormat": "Mendukung JPG / PNG / WEBP",
    "settings.vendor.test.textEmptyHint": "Kirim pesan untuk memulai pengujian",
    "settings.vendor.test.textInputPlaceholder": "Masukkan pesan, Ctrl+Enter untuk mengirim",
    "settings.vendor.test.textTitle": "Pengujian Percakapan Teks",
    "settings.vendor.test.textToImage": "Teks ke Gambar",
    "settings.vendor.test.textToVideo": "Teks ke Video",
    "settings.vendor.test.textToVideoDesc": "Membuat video hanya dari deskripsi teks",
    "settings.vendor.test.uploadAudio": "Klik atau seret untuk mengunggah audio",
    "settings.vendor.test.uploadImage": "Klik atau seret untuk mengunggah gambar",
    "settings.vendor.test.uploadVideo": "Klik atau seret untuk mengunggah video",
    "settings.vendor.test.video": "Video",
    "settings.vendor.test.videoPromptPlaceholder": "Masukkan deskripsi video (opsional)",
    "settings.vendor.test.videoTitle": "Pengujian Pembuatan Video",
    "settings.vendor.test.you": "Anda",

    # storyboard (1 key)
    "storyboard.assetsNotExists": "Aset tidak ada",

    # workbench.cornerScape (1 key)
    "workbench.cornerScape.msg.emptyPrompt": "Data yang dipilih {emptyPromptNames} prompt-nya kosong, silakan buat prompt terlebih dahulu",

    # workbench.generate (5 keys)
    "workbench.generate.generateSuccess": "Video berhasil dibuat",
    "workbench.generate.modeChange": "Bersihkan Konten",
    "workbench.generate.modeChangeConfirm": "Mengubah mode akan menghapus gambar dan prompt yang dipilih saat ini",
    "workbench.generate.prompt": "Prompt Video",
    "workbench.generate.promptEmpty": "Data yang dipilih untuk pembuatan video ada yang prompt-nya kosong, lanjutkan pembuatan?",

    # workbench.production.generate (2 keys)
    "workbench.production.generate.statePending": "Menunggu Produksi",
    "workbench.production.generate.stateSuccess": "Berhasil Dibuat",

    # workbench.script (3 keys)
    "workbench.script.import.getAiRegex": "Regex AI",
    "workbench.script.msg.extractFailed": "Ekstraksi aset gagal",
    "workbench.script.msg.extracting": "Mengekstrak aset",
}


def find_closing_brace(content, start_pos):
    """Find the matching closing brace for an object starting at start_pos.
    start_pos should point to the character AFTER the opening '{'.
    Returns the position AFTER the closing '}'.
    """
    brace_count = 1
    pos = start_pos
    while brace_count > 0 and pos < len(content):
        ch = content[pos]
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
        pos += 1
    return pos


def detect_id_id_variable_via_i18n_config(content):
    """
    Strategy 1 (Primary): Find the main vue-i18n messages config.
    
    Looks for: messages:{"zh-CN":<var>,...,"id-ID":<var>}
    This is the most reliable detection because the i18n config always
    references locale variables by name.
    
    Returns: (variable_name, variable_start, variable_end) or None
    """
    print("  [Strategy 1] Searching for vue-i18n messages config...")
    
    # Pattern: messages:{ ... "id-ID":<varname> ... }
    # The main i18n config will have multiple locale entries including zh-CN and id-ID
    # We look for the largest messages object that contains both
    pattern = r'messages\s*:\s*\{'
    
    for m in re.finditer(pattern, content):
        pos = m.start()
        # Get a chunk of content after "messages:{"
        chunk_start = m.end()
        # Read up to find the closing brace of the messages object
        # But we need to be careful - messages:{} might be deeply nested
        # Let's look ahead for "id-ID" within a reasonable distance
        lookahead = content[chunk_start:chunk_start + 500]
        
        if '"id-ID"' not in lookahead and "'id-ID'" not in lookahead:
            continue
        
        # This messages object contains id-ID. Extract the variable name.
        # Find "id-ID":<varname> or "id-ID": <varname>
        id_id_pattern = r'"id-ID"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)'
        id_match = re.search(id_id_pattern, lookahead)
        if not id_match:
            id_id_pattern2 = r"'id-ID'\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"
            id_match = re.search(id_id_pattern2, lookahead)
        
        if id_match:
            varname = id_match.group(1)
            # Also check that zh-CN is in this same messages object (to avoid
            # matching component-level locale configs that only have 2-3 entries)
            if '"zh-CN"' in lookahead or "'zh-CN'" in lookahead:
                print(f"    Found id-ID variable in main i18n config: {varname}")
                return varname
    
    return None


def detect_id_id_variable_via_indonesian_strings(content):
    """
    Strategy 2 (Fallback): Find unique Indonesian strings in the locale,
    then trace back to find the variable that contains them.
    
    Returns: (variable_name, variable_start, variable_end) or None
    """
    print("  [Strategy 2] Searching for unique Indonesian strings...")
    
    # Unique Indonesian strings that are very likely only in the id-ID locale
    probe_strings = [
        '"Pengaturan ToonFlow"',   # settings.title
        '"Proyek Saya"',           # workbench.project.title
        '"Silakan pilih proyek"',  # workbench.selectProject
        '"Kelola semua proyek drama pendek Anda"',  # workbench.project.subtitle
    ]
    
    for probe in probe_strings:
        idx = content.find(probe)
        if idx < 0:
            continue
        
        print(f"    Found probe string: {probe}")
        
        # Walk backwards to find the variable assignment <varname>={
        # Look within 10000 chars before the probe string
        search_back = content[max(0, idx - 10000):idx]
        var_pattern = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\{'
        var_matches = list(re.finditer(var_pattern, search_back))
        
        if not var_matches:
            continue
        
        # The last match before the probe string is likely the variable
        last_match = var_matches[-1]
        varname = last_match.group(1)
        
        # Verify this variable contains other Indonesian strings
        var_start_in_chunk = last_match.start()
        var_start_abs = idx - len(search_back) + var_start_in_chunk
        
        # Find the closing brace of this variable
        var_body_start = var_start_abs + len(last_match.group(0))
        var_end = find_closing_brace(content, var_body_start)
        var_body = content[var_start_abs:var_end]
        
        # Verify by checking for more Indonesian strings in the body
        verification_strings = ["Bahasa", "Pengaturan", "Proyek", "Gambar", "Video"]
        found_count = sum(1 for s in verification_strings if s in var_body)
        
        if found_count >= 3:
            print(f"    Found id-ID variable: {varname} (verified with {found_count}/5 Indonesian markers)")
            return varname
    
    return None


def find_variable_definition(content, varname):
    """Find the definition of a variable: varname={...}
    Returns (start_pos, end_pos) where start_pos includes 'varname={'
    and end_pos is after the closing '}'.
    """
    # Escape varname for regex
    escaped = re.escape(varname)
    pattern = escaped + r'\s*=\s*\{'
    
    matches = list(re.finditer(pattern, content))
    if not matches:
        return None, None
    
    # If multiple matches, prefer the one that looks like a locale object
    for m in matches:
        start = m.start()
        body_start = m.end()
        
        # Quick check: does the body contain Indonesian strings?
        quick_look = content[body_start:body_start + 500]
        if any(s in quick_look for s in ['"Pengaturan', '"Proyek', '"Silakan', '"Kelola', '"Bahasa']):
            end = find_closing_brace(content, body_start)
            return start, end
    
    # If no verified match, take the first one
    m = matches[0]
    start = m.start()
    body_start = m.end()
    end = find_closing_brace(content, body_start)
    return start, end


def list_candidate_locale_variables(content):
    """
    Strategy 3 (Last resort): List candidate variables that look like locale objects.
    Returns list of (varname, preview_snippet).
    """
    print("  [Strategy 3] Listing candidate locale variables...")
    
    candidates = []
    
    # Look for variable assignments that contain known locale keys
    locale_markers = [
        'settings.vendor.test.textTitle',
        'settings.modelMap.imageModel',
        'modelMap',
    ]
    
    # Search for objects containing "id-ID" as a key reference
    # Pattern: "id-ID":<varname>
    pattern = r'"id-ID"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)'
    for m in re.finditer(pattern, content):
        varname = m.group(1)
        pos = m.start()
        context = content[max(0, pos - 100):pos + 100]
        candidates.append((varname, context.replace('\n', ' ')))
    
    # Also search for objects containing Indonesian probe strings
    for probe in ['"Pengaturan ToonFlow"', '"Proyek Saya"', '"Silakan pilih proyek"']:
        idx = content.find(probe)
        if idx >= 0:
            search_back = content[max(0, idx - 5000):idx]
            var_pattern = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\{'
            var_matches = list(re.finditer(var_pattern, search_back))
            if var_matches:
                varname = var_matches[-1].group(1)
                if not any(c[0] == varname for c in candidates):
                    var_start = idx - len(search_back) + var_matches[-1].start()
                    snippet = content[var_start:var_start + 200].replace('\n', ' ')
                    candidates.append((varname, snippet))
    
    return candidates


def build_injection_string(translations):
    """Build the JS flat dotted-key entries to inject."""
    flat_entries = []
    for key, value in translations.items():
        escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
        flat_entries.append(f'"{key}":"{escaped_value}"')
    return ',' + ','.join(flat_entries)


def check_already_patched(content):
    """Check if the patch has already been applied."""
    # Look for one of the unique injected keys
    markers = [
        '"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"',
        '"settings.modelMap.imageModel":"Model Gambar"',
        '"workbench.generate.generateSuccess":"Video berhasil dibuat"',
        '"settings.menu.ui":"Pengaturan Antarmuka"',
    ]
    for marker in markers:
        if marker in content:
            return True
    return False


def main():
    print("=" * 60)
    print("Toonflow Indonesian (id-ID) Locale Patch v2.0")
    print("=" * 60)
    print()
    
    # Determine project path
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = '.'
    
    html_path = os.path.join(project_path, 'data', 'web', 'index.html')
    backup_path = html_path + '.bak'
    
    # Check if file exists
    if not os.path.exists(html_path):
        print(f"ERROR: File not found: {html_path}")
        print(f"Usage: python {sys.argv[0]} [path_to_toonflow_project]")
        sys.exit(1)
    
    # Read the file
    print(f"Reading: {html_path}")
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"File size: {len(content):,} chars")
    print()
    
    # Check if already patched
    if check_already_patched(content):
        print("WARNING: Patch appears to already be applied!")
        print("Found existing Indonesian translations for missing keys.")
        response = input("Re-apply anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # ========================================
    # Dynamic detection of id-ID locale variable
    # ========================================
    print("Detecting Indonesian locale variable...")
    print()
    
    varname = None
    
    # Strategy 1: Find via i18n messages config
    varname = detect_id_id_variable_via_i18n_config(content)
    
    # Strategy 2: Find via unique Indonesian strings
    if varname is None:
        varname = detect_id_id_variable_via_indonesian_strings(content)
    
    # Strategy 3: List candidates for manual selection
    if varname is None:
        print()
        print("ERROR: Could not automatically detect the id-ID locale variable!")
        print()
        print("Candidate locale variables found:")
        print("-" * 60)
        candidates = list_candidate_locale_variables(content)
        if candidates:
            for i, (vname, snippet) in enumerate(candidates[:10], 1):
                print(f"  {i}. Variable: {vname}")
                print(f"     Context: {snippet[:150]}...")
                print()
        else:
            print("  No candidates found.")
        
        print("Please specify the variable name manually:")
        print(f"  Set environment variable: TOONFLOW_ID_VAR=<varname>")
        print(f"  Then re-run this script.")
        sys.exit(1)
    
    print()
    print(f"Target variable: {varname}")
    print()
    
    # Allow manual override via environment variable
    env_var = os.environ.get('TOONFLOW_ID_VAR')
    if env_var:
        print(f"Override: Using variable name from TOONFLOW_ID_VAR={env_var}")
        varname = env_var
        print()
    
    # Find the variable definition
    print(f"Locating variable definition: {varname}={{...}}")
    var_start, var_end = find_variable_definition(content, varname)
    
    if var_start is None:
        print(f"ERROR: Could not find variable definition for '{varname}'!")
        print("The variable name was detected but its definition could not be located.")
        sys.exit(1)
    
    var_content = content[var_start:var_end]
    print(f"  Found at position {var_start}-{var_end} ({var_end - var_start:,} chars)")
    
    # Quick verification: check that this looks like the right locale
    verification_markers = ['"Pengaturan', '"Proyek', '"Silakan', '"Kelola', '"Gambar']
    found_markers = sum(1 for m in verification_markers if m in var_content)
    print(f"  Indonesian markers found: {found_markers}/{len(verification_markers)}")
    
    if found_markers == 0:
        print()
        print("WARNING: The detected variable doesn't contain expected Indonesian strings!")
        print("This might be the wrong variable.")
        response = input("Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    print()
    
    # Build injection string
    inject_str = build_injection_string(MISSING_TRANSLATIONS)
    print(f"Injecting {len(MISSING_TRANSLATIONS)} missing keys ({len(inject_str):,} chars)")
    
    # Apply the patch - insert before the closing brace
    insert_pos = var_end - 1  # just before the final '}'
    
    # Verify we're inserting at the right place
    if content[insert_pos] != '}':
        print(f"ERROR: Expected '}}' at position {insert_pos}, found {repr(content[insert_pos])}")
        sys.exit(1)
    
    new_content = content[:insert_pos] + inject_str + content[insert_pos:]
    
    # Verify the patch
    print()
    print("Verifying patch...")
    test_keys = [
        ('"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"', 'Vendor test title'),
        ('"settings.modelMap.imageModel":"Model Gambar"', 'Model map image'),
        ('"workbench.generate.generateSuccess":"Video berhasil dibuat"', 'Generate success'),
        ('"settings.menu.ui":"Pengaturan Antarmuka"', 'Menu UI'),
        ('"workbench.production.generate.statePending":"Menunggu Produksi"', 'Production pending'),
    ]
    all_ok = True
    for tk, desc in test_keys:
        if tk in new_content:
            print(f"  OK: {desc}")
        else:
            print(f"  FAIL: {desc}")
            all_ok = False
    
    if not all_ok:
        print()
        print("ERROR: Verification failed! Not saving.")
        sys.exit(1)
    
    # Create backup
    shutil.copy2(html_path, backup_path)
    print(f"\nBackup created: {backup_path}")
    
    # Save patched file
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print()
    print("=" * 60)
    print("PATCH APPLIED SUCCESSFULLY!")
    print("=" * 60)
    print(f"  Variable patched: {varname}")
    print(f"  Original size:    {len(content):,} chars")
    print(f"  Patched size:     {len(new_content):,} chars")
    print(f"  Size increase:    {len(new_content) - len(content):,} chars")
    print(f"  Keys injected:    {len(MISSING_TRANSLATIONS)}")
    print()
    print(f"To restore original:")
    print(f'  Windows: copy "{backup_path}" "{html_path}"')
    print(f'  Or run:  python restore-original.py')
    print()
    print("To apply the language in Toonflow:")
    print("  1. Start Toonflow")
    print("  2. Go to Settings (Pengaturan) -> Language (Bahasa)")
    print('  3. Select "Bahasa Indonesia"')


if __name__ == '__main__':
    main()
