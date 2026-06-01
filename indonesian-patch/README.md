# Toonflow Indonesian (id-ID) Locale Patch

## Overview

Toonflow already includes Bahasa Indonesia (`id-ID`) locale support at ~94.5% coverage.
This patch fills in the **88 missing translation keys** to achieve **100% coverage**.

## Architecture Notes

- **Toonflow is an Electron + Express desktop app** with a **pre-compiled Vue.js frontend**
- All locale data is embedded in `data/web/index.html` as minified JavaScript
- The i18n library is **vue-i18n v11.3.0** (Composition API mode)
- The Indonesian locale variable is `fSi` in the compiled code
- There are NO separate source files like `src/locales/` or `src/App.vue` in this repository
  — these would be in the Vue.js frontend source which is compiled before distribution

## Files in This Patch

| File | Description |
|------|-------------|
| `id-ID.json` | Complete Indonesian locale with ALL 1,597 keys (reference only) |
| `patch-indonesian.py` | Auto-patch script for `data/web/index.html` |
| `restore-original.py` | Restore script to undo the patch |

## How to Apply

### Method 1: Auto-Patch Script (Recommended)

```bash
# On your Windows machine, open Command Prompt or PowerShell:
cd D:\Toonflow-app
python patch-indonesian.py D:\Toonflow-app

# Or if already in the project directory:
python patch-indonesian.py
```

The script will:
1. Find the `fSi={...}` variable in `data/web/index.html`
2. Inject 88 missing flat dotted-key translations before the closing brace
3. Create a backup at `data/web/index.html.bak`
4. Verify the patch was applied correctly

### Method 2: Manual Verification

To verify the patch worked:
1. Start Toonflow
2. Go to Settings → Language
3. Select "Bahasa Indonesia"
4. Check that these previously-missing sections now appear in Indonesian:
   - Settings → Model Mapping (Pemetaan Model)
   - Settings → Developer Options (Opsi Pengembang)
   - Vendor test dialog (Pengujian model)

### To Restore

```bash
python restore-original.py D:\Toonflow-app
```

## 88 Missing Keys Translated

### settings.vendor.test.* (37 keys) — Vendor test dialog
| Key | Indonesian Translation |
|-----|----------------------|
| settings.vendor.test.textTitle | Pengujian Percakapan Teks |
| settings.vendor.test.imageTitle | Pengujian Pembuatan Gambar |
| settings.vendor.test.videoTitle | Pengujian Pembuatan Video |
| settings.vendor.test.textEmptyHint | Kirim pesan untuk memulai pengujian |
| settings.vendor.test.you | Anda |
| settings.vendor.test.assistant | Asisten |
| settings.vendor.test.textInputPlaceholder | Masukkan pesan, Ctrl+Enter untuk mengirim |
| settings.vendor.test.send | Kirim |
| settings.vendor.test.clearHistory | Bersihkan Percakapan |
| settings.vendor.test.prompt | Prompt |
| settings.vendor.test.promptPlaceholder | Masukkan prompt |
| settings.vendor.test.videoPromptPlaceholder | Masukkan deskripsi video (opsional) |
| settings.vendor.test.uploadImage | Klik atau seret untuk mengunggah gambar |
| settings.vendor.test.uploadVideo | Klik atau seret untuk mengunggah video |
| settings.vendor.test.uploadAudio | Klik atau seret untuk mengunggah audio |
| settings.vendor.test.supportFormat | Mendukung JPG / PNG / WEBP |
| settings.vendor.test.textToImage | Teks ke Gambar |
| settings.vendor.test.imageToImage | Gambar ke Gambar |
| settings.vendor.test.multiRef | Multi Referensi Gambar |
| settings.vendor.test.textToVideo | Teks ke Video |
| settings.vendor.test.singleImageMode | Referensi Gambar Tunggal |
| settings.vendor.test.selectMode | Pilih Mode Pengujian |
| settings.vendor.test.result | Hasil Pembuatan |
| settings.vendor.test.startTest | Mulai Pengujian |
| settings.vendor.test.cancel | Batal |
| settings.vendor.test.referenceImage | Gambar Referensi |
| settings.vendor.test.startFrame | Frame Awal (Wajib) |
| settings.vendor.test.endFrame | Frame Akhir (Wajib) |
| settings.vendor.test.startFrameOptional | Frame Awal (Opsional) |
| settings.vendor.test.endFrameOptional | Frame Akhir (Opsional) |
| settings.vendor.test.optional | Opsional |
| settings.vendor.test.image | Gambar |
| settings.vendor.test.video | Video |
| settings.vendor.test.audio | Audio |
| settings.vendor.test.multiRefDesc | Mode multi referensi |
| settings.vendor.test.textToVideoDesc | Membuat video hanya dari deskripsi teks |
| settings.vendor.test.singleImageDesc | Membuat video berdasarkan satu gambar referensi |
| settings.vendor.test.startEndRequiredDesc | Frame awal dan frame akhir keduanya wajib disediakan |
| settings.vendor.test.endFrameOptionalDesc | Frame awal wajib, frame akhir opsional |
| settings.vendor.test.startFrameOptionalDesc | Frame akhir wajib, frame awal opsional |

### settings.modelMap.* (16 keys) — Model mapping
| Key | Indonesian Translation |
|-----|----------------------|
| settings.modelMap.imageModel | Model Gambar |
| settings.modelMap.videoModel | Model Video |
| settings.modelMap.noModel | Belum ada model gambar atau video yang tersedia, silakan tambahkan di «Layanan Model» terlebih dahulu |
| settings.modelMap.promptPlaceholder | Masukkan prompt untuk mode ini |
| settings.modelMap.save | Simpan Konfigurasi |
| settings.modelMap.col.mode | Mode |
| settings.modelMap.col.prompt | Prompt |
| settings.modelMap.mode.text | Teks ke Gambar / Teks ke Video |
| settings.modelMap.mode.singleImage | Gambar Tunggal |
| settings.modelMap.mode.multiReference | Multi Referensi |
| settings.modelMap.mode.startEndRequired | Frame Awal & Akhir (Keduanya Wajib) |
| settings.modelMap.mode.endFrameOptional | Frame Awal & Akhir (Frame Akhir Opsional) |
| settings.modelMap.mode.startFrameOptional | Frame Awal & Akhir (Frame Awal Opsional) |
| settings.modelMap.mode.videoReference | Referensi Video |
| settings.modelMap.mode.imageReference | Referensi Gambar |
| settings.modelMap.mode.audioReference | Referensi Audio |
| settings.modelMap.mode.referenceSuffix | Referensi |
| settings.modelMap.msg.saveSuccess | Pemetaan prompt model tersimpan |
| settings.modelMap.msg.saveFailed | Gagal menyimpan, silakan coba lagi nanti |

### settings.memory.modelMap.* (12 keys) — Prompt management
| Key | Indonesian Translation |
|-----|----------------------|
| settings.memory.modelMap.addPrompt | Tambah Prompt |
| settings.memory.modelMap.addPromptTitle | Tambah Prompt |
| settings.memory.modelMap.editPrompt | Edit |
| settings.memory.modelMap.editPromptTitle | Edit Prompt |
| settings.memory.modelMap.promptNamePlaceholder | Masukkan nama prompt |
| settings.memory.modelMap.promptNameRequired | Silakan masukkan nama prompt |
| settings.memory.modelMap.promptSaveSuccess | Berhasil disimpan |
| settings.memory.modelMap.promptTypePlaceholder | Pilih tipe |
| settings.memory.modelMap.typeText | Teks |
| settings.memory.modelMap.typeImage | Gambar |
| settings.memory.modelMap.typeVideo | Video |

### settings.menu.* (3 keys) — Menu items
| Key | Indonesian Translation |
|-----|----------------------|
| settings.menu.ui | Pengaturan Antarmuka |
| settings.menu.modelMap | Pemetaan Model |
| settings.menu.devConfig | Opsi Pengembang |

### Other missing keys (8 keys)
| Key | Indonesian Translation |
|-----|----------------------|
| settings.generate.modelChnageSure | Konfirmasi Pembersihan |
| settings.other.openIsInteracting | Aktifkan |
| settings.request.refresh | Segarkan |
| storyboard.assetsNotExists | Aset tidak ada |
| workbench.cornerScape.msg.emptyPrompt | Data yang dipilih {emptyPromptNames} prompt-nya kosong, silakan buat prompt terlebih dahulu |
| workbench.generate.generateSuccess | Video berhasil dibuat |
| workbench.generate.modeChange | Bersihkan Konten |
| workbench.generate.modeChangeConfirm | Mengubah mode akan menghapus gambar dan prompt yang dipilih saat ini |
| workbench.generate.prompt | Prompt Video |
| workbench.generate.promptEmpty | Data yang dipilih untuk pembuatan video ada yang prompt-nya kosong, lanjutkan pembuatan? |
| workbench.production.generate.statePending | Menunggu Produksi |
| workbench.production.generate.stateSuccess | Berhasil Dibuat |
| workbench.script.import.getAiRegex | Regex AI |
| workbench.script.msg.extractFailed | Ekstraksi aset gagal |
| workbench.script.msg.extracting | Mengekstrak aset |

## Technical Details

### How the Patch Works

The vue-i18n locale object `fSi` in the compiled HTML uses a combination of:
1. **Nested object references** (e.g., `components:V6i, settings:z6i, workbench:Z6i, login:Y6i`)
2. **Flat dotted-key strings** (e.g., `"workbench.script.msg.exportSuccess":"Skrip berhasil diekspor"`)

The flat dotted keys **merge/override** with the nested objects at runtime. By adding the missing
keys as flat dotted strings, they will correctly resolve in the vue-i18n message lookup,
even when the structured sections are defined via sub-variables.

### Why No src/locales/ or src/App.vue Files

The Toonflow repository does NOT include the Vue.js frontend source code. The frontend is
pre-compiled and bundled into `data/web/index.html` as minified JavaScript. There are no
`.vue` files, no `src/locales/` directory, and no separate locale JSON files in the repo.
The only way to modify the UI translations is to patch the compiled `data/web/index.html`.

### Supported Languages (Already in Toonflow)

| Code | Language | Status |
|------|----------|--------|
| zh-CN | 简体中文 (Chinese Simplified) | Default |
| zh-TW | 繁體中文 (Chinese Traditional) | Complete |
| en | English | Partial |
| th-TH | ไทย (Thai) | Partial |
| vi-VN | Tiếng Việt (Vietnamese) | Partial |
| ja-JP | 日本語 (Japanese) | Partial |
| ru-RU | Русский (Russian) | Partial |
| id-ID | Bahasa Indonesia | **100% (after this patch)** |
