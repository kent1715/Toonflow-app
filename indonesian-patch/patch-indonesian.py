#!/usr/bin/env python3
"""
Toonflow Indonesian (id-ID) Locale Patch Script
=================================================
Patch data/web/index.html to add 88 missing Bahasa Indonesia translations
to the vue-i18n locale object (variable fSi).

Usage:
    python patch-indonesian.py [path_to_toonflow]

Example:
    python patch-indonesian.py D:\\Toonflow-app

This script will:
1. Find the fSi={...} variable in data/web/index.html
2. Inject 88 missing flat dotted-key translations before the closing brace
3. Create a backup of the original file as data/web/index.html.bak

What gets patched (88 missing keys):
- settings.vendor.test.* (37 keys) — Vendor test dialog sub-items
- settings.modelMap.* (16 keys) — Model mapping settings  
- settings.memory.modelMap.* (9 keys) — Prompt management in memory
- settings.menu.* (3 keys) — Menu items (UI, Model Map, Dev)
- settings.other.openIsInteracting (1 key)
- settings.request.refresh (1 key)
- settings.generate.modelChnageSure (1 key)
- storyboard.assetsNotExists (1 key)
- workbench.cornerScape.msg.emptyPrompt (1 key)
- workbench.generate.* (5 keys) — Video generation
- workbench.production.generate.* (2 keys) — Production state
- workbench.script.* (3 keys) — Script extraction

DO NOT run this more than once — check for backup file first.
"""

import sys
import os
import shutil

# ============================================================
# The 88 missing Indonesian translations
# ============================================================
MISSING_TRANSLATIONS = {
    # settings.generate (1 key)
    "settings.generate.modelChnageSure": "Konfirmasi Pembersihan",

    # settings.memory.modelMap (9 keys)
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
    "settings.vendor.test.startTest": "Mulai Pengujian",
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


def find_fsi_boundaries(content):
    """Find the fSi={...} variable definition boundaries in the minified HTML."""
    fSi_start = content.find('fSi={')
    if fSi_start < 0:
        return None, None
    
    # Navigate to find the matching closing brace
    pos = fSi_start + 5  # skip 'fSi={'
    brace_count = 1
    while brace_count > 0 and pos < len(content):
        if content[pos] == '{':
            brace_count += 1
        elif content[pos] == '}':
            brace_count -= 1
        pos += 1
    
    return fSi_start, pos


def build_injection_string(translations):
    """Build the JS flat dotted-key entries to inject."""
    flat_entries = []
    for key, value in translations.items():
        escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
        flat_entries.append(f'"{key}":"{escaped_value}"')
    return ',' + ','.join(flat_entries)


def main():
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
    
    # Check if already patched
    if os.path.exists(backup_path):
        print(f"WARNING: Backup file exists: {backup_path}")
        print("This suggests the patch may have already been applied.")
        response = input("Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # Read the file
    print(f"Reading: {html_path}")
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"File size: {len(content):,} chars")
    
    # Find fSi definition
    fSi_start, fSi_end = find_fsi_boundaries(content)
    if fSi_start is None:
        print("ERROR: Could not find 'fSi={' in the HTML file!")
        print("The Toonflow version may have changed the variable name.")
        sys.exit(1)
    
    print(f"Found fSi definition at position {fSi_start}-{fSi_end} ({fSi_end - fSi_start:,} chars)")
    
    # Check if already patched (look for one of the injected keys)
    if '"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"' in content:
        print("WARNING: Patch appears to already be applied!")
        print("Found existing 'settings.vendor.test.textTitle' key in Indonesian.")
        response = input("Re-apply anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # Build injection string
    inject_str = build_injection_string(MISSING_TRANSLATIONS)
    print(f"Injecting {len(MISSING_TRANSLATIONS)} missing keys ({len(inject_str):,} chars)")
    
    # Apply the patch - insert before the closing brace of fSi
    insert_pos = fSi_end - 1  # just before the final '}'
    
    # Verify we're inserting at the right place
    if content[insert_pos] != '}':
        print(f"ERROR: Expected '}}' at position {insert_pos}, found {repr(content[insert_pos])}")
        sys.exit(1)
    
    new_content = content[:insert_pos] + inject_str + content[insert_pos:]
    
    # Verify the patch
    test_keys = [
        '"settings.vendor.test.textTitle":"Pengujian Percakapan Teks"',
        '"settings.modelMap.imageModel":"Model Gambar"',
        '"workbench.generate.generateSuccess":"Video berhasil dibuat"',
        '"settings.menu.ui":"Pengaturan Antarmuka"',
    ]
    all_ok = True
    for tk in test_keys:
        if tk in new_content:
            print(f"  OK: {tk[:60]}...")
        else:
            print(f"  FAIL: {tk[:60]}...")
            all_ok = False
    
    if not all_ok:
        print("ERROR: Verification failed! Not saving.")
        sys.exit(1)
    
    # Create backup
    shutil.copy2(html_path, backup_path)
    print(f"Backup created: {backup_path}")
    
    # Save patched file
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"\nPATCH APPLIED SUCCESSFULLY!")
    print(f"Original size: {len(content):,} chars")
    print(f"Patched size:  {len(new_content):,} chars")
    print(f"Size increase: {len(new_content) - len(content):,} chars")
    print(f"\nTo restore original: copy {backup_path} back to {html_path}")
    print(f"  Windows: copy \"{backup_path}\" \"{html_path}\"")
    
    # Also verify the i18n config still references fSi correctly
    if '"id-ID":fSi' in new_content:
        print(f"\nOK: i18n config still references fSi for id-ID locale")
    else:
        print(f"\nWARNING: Could not verify 'id-ID':fSi reference in i18n config")


if __name__ == '__main__':
    main()
