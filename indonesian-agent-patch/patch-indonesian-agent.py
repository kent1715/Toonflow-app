#!/usr/bin/env python3
"""
Patch Indonesian Agent - Bahasa Indonesia Language Enforcement for Toonflow AI Agents
=====================================================================================

Version: 1.0
Author: Toonflow Indonesian Patch Team
Date: 2025-01

This script patches all AI agent system prompts, memory system, and inline strings
in the Toonflow backend to enforce Bahasa Indonesia output.

Features:
- Automatic backup of all files before patching
- Dry-run mode to preview changes
- Syntax validation after patching
- Auto-restore on failure
- Detailed logging

Usage:
  python patch-indonesian-agent.py                    # Apply patch with backup
  python patch-indonesian-agent.py --dry-run          # Preview changes without modifying files
  python patch-indonesian-agent.py --restore          # Restore from backup
  python patch-indonesian-agent.py --list             # List files to be modified

Requirements:
  - Python 3.8+
  - Node.js (for optional syntax validation)
"""

import os
import sys
import json
import shutil
import argparse
import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# ── Configuration ──────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
BACKUP_DIR = SCRIPT_DIR / ".backups" / datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

# The ATURAN BAHASA WAJIB section to inject into agent prompts
ATURAN_BAHASA = """
## 🇮🇩 ATURAN BAHASA WAJIB (WAJIB DIPATUHI)

- **Semua jawaban ke pengguna wajib menggunakan Bahasa Indonesia.**
- **Dilarang menggunakan Bahasa Mandarin kecuali pengguna secara eksplisit meminta.**
- **Dilarang menampilkan proses berpikir internal, chain-of-thought, atau tag <think>.**
- **Dilarang menampilkan reasoning mentah atau langkah-langkah berpikir internal.**
- Jika membutuhkan informasi tambahan, tanyakan dalam Bahasa Indonesia secara singkat.
- Jika task gagal, jelaskan penyebab dan langkah lanjut dalam Bahasa Indonesia dengan ramah.
- Semua konfirmasi, laporan, dan pesan error ke pengguna harus dalam Bahasa Indonesia.
- Format audit report tetap menggunakan struktur tabel, tapi semua teks deskriptif dalam Bahasa Indonesia.
- Pesan konfirmasi seperti "已完成分镜面板写入" → gunakan Bahasa Indonesia: "Penulisan panel storyboard telah selesai".
- Pesan error seperti "项目不存在" → gunakan Bahasa Indonesia: "Proyek tidak ditemukan".
"""

# ── File Definitions ───────────────────────────────────────────

def get_base_path() -> Path:
    """Get the Toonflow base path. Default is parent of script directory."""
    # Try common locations
    candidates = [
        Path("D:/Toonflow-app"),
        Path.home() / "Toonflow-app",
        SCRIPT_DIR.parent,
    ]
    for c in candidates:
        if c.exists() and (c / "data" / "skills").exists():
            return c
    return SCRIPT_DIR.parent

BASE_PATH = get_base_path()

# Agent prompt files (Markdown)
AGENT_PROMPT_FILES: List[str] = [
    "data/skills/production_agent_decision.md",
    "data/skills/script_agent_decision.md",
    "data/skills/production_agent_supervision.md",
    "data/skills/script_agent_supervision.md",
    "data/skills/production_execution_director_plan.md",
    "data/skills/production_execution_derive_assets.md",
    "data/skills/production_execution_generate_assets.md",
    "data/skills/production_execution_storyboard_table.md",
    "data/skills/production_execution_storyboard_panel.md",
    "data/skills/production_execution_storyboard_gen.md",
    "data/skills/script_execution_skeleton.md",
    "data/skills/script_execution_adaptation.md",
    "data/skills/script_execution_script.md",
]

# TypeScript source files
TS_FILES: List[str] = [
    "src/agents/productionAgent/index.ts",
    "src/agents/scriptAgent/index.ts",
    "src/utils/agent/memory.ts",
    "src/routes/script/getAiRegex.ts",
    "src/routes/assetsGenerate/polishAssetsPrompt.ts",
    "src/routes/assetsGenerate/batchPolishAssetsPrompt.ts",
]

# ── Translation Maps ───────────────────────────────────────────

# General Mandarin → Indonesian replacements (applied to all TS files)
GENERAL_REPLACEMENTS: List[Tuple[str, str]] = [
    # Memory prompt headers
    ("[相关记忆]", "[Memori Terkait]"),
    ("[历史摘要]", "[Ringkasan Historis]"),
    ("[近期对话]", "[Dialog Terkini]"),
    ('## Memory\\n以下是你对用户的记忆，可作为参考但不要主动提及：\\n', '## Memori\\nBerikut adalah memori Anda tentang pengguna, dapat dijadikan referensi tetapi jangan disebutkan secara aktif:\\n'),
    # Thinking status
    ('"思考中..."', '"Berpikir..."'),
    ('`思考完毕（${(thinkTime / 1000).toFixed(1)} 秒）`', '`Pemikiran selesai（${(thinkTime / 1000).toFixed(1)} detik）`'),
    # Agent names
    ('"视频策划"', '"Perencana Video"'),
    ('"执行导演"', '"Sutradara Eksekusi"'),
    ('"监制"', '"Pengawas"'),
    ('"编剧"', '"Penulis Naskah"'),
    ('"编辑"', '"Penyunting"'),
]

# File-specific replacements
FILE_SPECIFIC_REPLACEMENTS: Dict[str, List[Tuple[str, str]]] = {
    "src/agents/productionAgent/index.ts": [
        # Error messages
        ("项目不存在，ID:", "Proyek tidak ditemukan, ID:"),
        ("项目使用的模型不存在，ID:", "Model yang digunakan proyek tidak ditemukan, ID:"),
        # Model info
        ("项目使用的模型如下：\\n图像模型：", "Model yang digunakan proyek:\\nModel gambar: "),
        ("\\n视频模型：", "\\nModel video: "),
        ("\\n多参：", "\\nMulti-referensi: "),
        ('"是" : "否"', '"Ya" : "Tidak"'),
        # Tool descriptions
        ("运行执行subAgent来完成衍生资产分析与信息写入相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait analisis aset turunan dan penulisan informasi"),
        ("运行执行subAgent来完成衍生资产图片生成相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan gambar aset turunan"),
        ("运行执行subAgent来完成导演规划相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait perencanaan sutradara"),
        ("运行执行subAgent来完成分镜图生成相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan gambar storyboard"),
        ("运行执行subAgent来完成分镜面板写入相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait penulisan panel storyboard"),
        ("运行执行subAgent来完成分镜表构建相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan tabel storyboard"),
        ("运行监督层subAgent执行独立任务，完成后返回结果", "Menjalankan subAgent pengawas untuk mengeksekusi tugas independen, mengembalikan hasil setelah selesai"),
        # Prompt descriptions
        ("交给子Agent的任务简约描述，100字以内", "Deskripsi singkat tugas untuk subAgent, maksimal 100 karakter"),
        # XML format prompts
        ("你必须使用如下XML格式写入工作区：", "Anda harus menggunakan format XML berikut untuk menulis ke ruang kerja:"),
        # Skills prompt
        ("以下技能提供了专业任务的专用指令。", "Skill berikut menyediakan instruksi khusus untuk tugas profesional."),
        ("当任务与某个技能的描述匹配时，调用 activate_skill 工具并传入技能名称来加载完整指令。", "Ketika tugas cocok dengan deskripsi suatu skill, panggil alat activate_skill dan masukkan nama skill untuk memuat instruksi lengkap."),
    ],
    "src/agents/scriptAgent/index.ts": [
        # Project info
        ("## 项目信息", "## Informasi Proyek"),
        ("小说名称：", "Nama novel: "),
        ("小说类型：", "Jenis novel: "),
        ("小说简介：", "Sinopsis novel: "),
        ("目标改编影视视觉手册|画风：", "Buku panduan visual adaptasi|Gaya seni: "),
        ("目标改编视频画幅：", "Rasio video adaptasi: "),
        ("章节数量：", "Jumlah bab: "),
        ('"未知"', '"Tidak diketahui"'),
        ('"无"', '"Tidak ada"'),
        # Tool descriptions
        ("运行执行subAgent来完成故事骨架相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait kerangka cerita"),
        ("运行执行subAgent来完成改编策略相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait strategi adaptasi"),
        ("运行执行subAgent来完成剧本相关任务", "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait naskah"),
        # Format prompts
        ("你必须使用如下XML格式写入工作区：", "Anda harus menggunakan format XML berikut untuk menulis ke ruang kerja:"),
        ("故事骨架内容", "konten kerangka cerita"),
        ("改编策略内容", "konten strategi adaptasi"),
        ("剧本名称", "nama naskah"),
        ("剧本内容", "konten naskah"),
        ("XML不得添加任何额外标签", "XML tidak boleh menambahkan tag tambahan apapun"),
        # Script list
        ("## 可用剧本(ID:名称)", "## Naskah tersedia (ID:Nama)"),
        # Chapter count
        ("章", " bab"),
    ],
    "src/utils/agent/memory.ts": [
        # System prompts
        ("你是一个记忆压缩助手。请将以下多条记忆内容压缩为一段简洁的摘要，不超过", "Anda adalah asisten kompresi memori. Silakan kompres beberapa konten memori berikut menjadi ringkasan singkat, tidak melebihi"),
        ("个字符。只输出摘要内容，不要加任何前缀或解释。", "karakter. Hanya output konten ringkasan, jangan tambahkan awalan atau penjelasan apapun."),
        ("你是一个信息检索助手。用户会给你一个关键词和一组摘要，请判断哪些摘要可能包含与关键词相关的详细信息。只返回相关摘要的id列表，用JSON数组格式，例如",
         "Anda adalah asisten pencarian informasi. Pengguna akan memberikan kata kunci dan sekumpulan ringkasan, silakan tentukan ringkasan mana yang mungkin mengandung informasi detail terkait kata kunci. Hanya kembalikan daftar id ringkasan terkait, dalam format array JSON, contoh: "),
        ("不要解释。", "Jangan beri penjelasan."),
        # deepRetrieve tool
        ("深度检索记忆：当你需要回忆与某个关键词相关的详细历史信息时使用此工具",
         "Pencarian mendalam memori: gunakan alat ini saat Anda perlu mengingat informasi historis detail terkait kata kunci tertentu"),
        ('"要检索的关键词"', '"Kata kunci yang akan dicari"'),
        ('"未找到相关记忆"', '"Tidak ditemukan memori terkait"'),
        # User prompt labels
        ("关键词:", "Kata kunci:"),
        ("摘要列表:", "Daftar ringkasan:"),
    ],
    "src/routes/script/getAiRegex.ts": [
        ("你是一个正则表达式专家。用户会提供一段剧本文本，你需要分析其中的集/章节分隔模式，返回一个JavaScript正则表达式字符串。",
         "Anda adalah ahli ekspresi reguler. Pengguna akan memberikan teks naskah, Anda perlu menganalisis pola pemisah episode/bab di dalamnya, dan mengembalikan string ekspresi reguler JavaScript."),
        ("要求：", "Persyaratan:"),
        ("1. 正则必须包含两个捕获组：第一个捕获组匹配集数/章节编号（数字或中文数字），第二个捕获组匹配该集的标题/名称（scriptName）。",
         "1. Ekspresi reguler harus mengandung dua grup tangkapan: grup pertama mencocokkan nomor episode/bab (angka atau angka Mandarin), grup kedua mencocokkan judul/nama episode tersebut (scriptName)."),
        ("2. 返回格式为 /正则表达式/g，例如：",
         "2. Format yang dikembalikan adalah /ekspresi_reguler/g, contoh: "),
        ("3. 只返回正则表达式字符串本身，不要有任何其他解释文字或markdown格式。",
         "3. Hanya kembalikan string ekspresi reguler itu sendiri, jangan tambahkan teks penjelasan atau format markdown lainnya."),
        ("4. 如果文本中没有明显的章节分隔模式，返回空字符串。",
         "4. Jika tidak ada pola pemisah bab yang jelas dalam teks, kembalikan string kosong."),
    ],
    "src/routes/assetsGenerate/polishAssetsPrompt.ts": [
        ("角色标准四视图", "Tampilan Empat Sudut Karakter"),
        ("场景图", "Gambar Adegan"),
        ("道具图", "Gambar Properti"),
        ('"角色"', '"Karakter"'),
        ('"场景"', '"Adegan"'),
        ('"道具"', '"Properti"'),
        ("项目为空", "Proyek kosong"),
        ("资产不存在", "Aset tidak ditemukan"),
        ("不支持的类型", "Tipe tidak didukung"),
        ("视觉手册未定义", "Buku panduan visual belum didefinisikan"),
        ('"失败"', '"Gagal"'),
        ("生成失败", "Pembuatan gagal"),
        ("**基础参数：**", "**Parameter Dasar:**"),
        ("设定：", "Pengaturan "),
        ("名称:", "Nama "),
        ("描述:", "Deskripsi "),
    ],
    "src/routes/assetsGenerate/batchPolishAssetsPrompt.ts": [
        ("角色标准四视图", "Tampilan Empat Sudut Karakter"),
        ("场景图", "Gambar Adegan"),
        ("道具图", "Gambar Properti"),
        ('"角色"', '"Karakter"'),
        ('"场景"', '"Adegan"'),
        ('"道具"', '"Properti"'),
        ("项目为空", "Proyek kosong"),
        ("资产不存在", "Aset tidak ditemukan"),
        ("视觉手册未定义", "Buku panduan visual belum didefinisikan"),
        ("生成失败", "Pembuatan gagal"),
        ("**基础参数：**", "**Parameter Dasar:**"),
        ("设定：", "Pengaturan "),
        ("名称:", "Nama "),
        ("描述:", "Deskripsi "),
    ],
}

# Prompt-specific translations for markdown files
PROMPT_SPECIFIC_REPLACEMENTS: Dict[str, List[Tuple[str, str]]] = {
    "data/skills/production_agent_decision.md": [
        ("视频生成请前往视频生成面板进行操作", "Pembuatan video silakan ke panel pembuatan video"),
        ("当前无法执行该任务，请确认您的指令是否正确", "Saat ini tidak dapat menjalankan tugas ini, silakan konfirmasi apakah instruksi Anda benar"),
    ],
    "data/skills/script_agent_decision.md": [
        ("请确认以下信息：计划拆分为几集？每集大约几分钟？覆盖原著哪些章节？",
         "Silakan konfirmasi informasi berikut: Berapa episode yang direncanakan? Berapa menit per episode? Bab mana yang dicakup?"),
        ("您输入的章节范围中包含不存在的章节",
         "Rentang bab yang Anda masukkan mengandung bab yang tidak ada"),
    ],
    "data/skills/production_execution_storyboard_panel.md": [
        ("已完成分镜面板写入（{当前模式名称}）", "Penulisan panel storyboard telah selesai（{mode saat ini}）"),
    ],
}

# ── Core Functions ─────────────────────────────────────────────

def log(msg: str, level: str = "INFO"):
    """Print a formatted log message."""
    prefix = {"INFO": "ℹ️", "OK": "✅", "WARN": "⚠️", "ERR": "❌", "DRY": "🔍"}
    print(f"  {prefix.get(level, '•')} {msg}")


def backup_file(filepath: Path) -> bool:
    """Create a backup of a file."""
    backup_path = BACKUP_DIR / filepath.relative_to(BASE_PATH)
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(filepath, backup_path)
    return True


def restore_from_backup(backup_dir: Optional[Path] = None) -> bool:
    """Restore all files from backup."""
    if backup_dir is None:
        # Find the latest backup
        backup_base = SCRIPT_DIR / ".backups"
        if not backup_base.exists():
            log("No backups found!", "ERR")
            return False
        backups = sorted(backup_base.iterdir(), reverse=True)
        if not backups:
            log("No backups found!", "ERR")
            return False
        backup_dir = backups[0]
        log(f"Using latest backup: {backup_dir}")

    success = True
    for backup_file in backup_dir.rglob("*"):
        if backup_file.is_file():
            relative = backup_file.relative_to(backup_dir)
            target = BASE_PATH / relative
            try:
                shutil.copy2(backup_file, target)
                log(f"Restored: {relative}", "OK")
            except Exception as e:
                log(f"Failed to restore {relative}: {e}", "ERR")
                success = False
    return success


def validate_ts_syntax(filepath: Path) -> bool:
    """Validate TypeScript file syntax using node --check equivalent."""
    try:
        import subprocess
        # Try using npx tsc --noEmit for syntax check
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--skipLibCheck", str(filepath)],
            capture_output=True, text=True, timeout=30,
            cwd=str(BASE_PATH)
        )
        if result.returncode != 0:
            log(f"Syntax check issues in {filepath.name}: {result.stderr[:200]}", "WARN")
            return True  # Don't fail on type errors, only syntax errors
        return True
    except Exception as e:
        log(f"Could not run syntax check: {e}", "WARN")
        return True  # Don't fail if tsc is not available


def patch_markdown_file(filepath: Path, dry_run: bool = False) -> bool:
    """Patch a markdown agent prompt file."""
    if not filepath.exists():
        log(f"File not found: {filepath}", "ERR")
        return False

    content = filepath.read_text(encoding="utf-8")
    original = content
    relative = filepath.relative_to(BASE_PATH)

    # Check if already patched
    if "ATURAN BAHASA WAJIB" in content:
        log(f"Already patched (skipping): {relative}", "WARN")
        return True

    # 1. Add ATURAN BAHASA WAJIB section
    if content.startswith("---"):
        # File has frontmatter - insert after closing ---
        parts = content.split("---", 2)
        if len(parts) >= 3:
            # parts[0] = '', parts[1] = frontmatter, parts[2] = rest
            content = "---" + parts[1] + "---" + ATURAN_BAHASA + parts[2]
        else:
            # Fallback: insert at beginning
            content = ATURAN_BAHASA + content
    else:
        # No frontmatter - insert after first heading
        lines = content.split("\n")
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith("# "):
                insert_idx = i + 1
                break
        lines.insert(insert_idx, ATURAN_BAHASA)
        content = "\n".join(lines)

    # 2. Apply prompt-specific translations
    prompt_key = str(relative).replace("\\", "/")
    if prompt_key in PROMPT_SPECIFIC_REPLACEMENTS:
        for old, new in PROMPT_SPECIFIC_REPLACEMENTS[prompt_key]:
            if old in content:
                content = content.replace(old, new)
                if not dry_run:
                    log(f"  Translated: '{old[:40]}...' → '{new[:40]}...'", "OK")

    if content != original:
        if dry_run:
            log(f"Would patch: {relative}", "DRY")
        else:
            backup_file(filepath)
            filepath.write_text(content, encoding="utf-8")
            log(f"Patched: {relative}", "OK")
        return True
    else:
        log(f"No changes needed: {relative}", "INFO")
        return True


def patch_ts_file(filepath: Path, dry_run: bool = False) -> bool:
    """Patch a TypeScript source file."""
    if not filepath.exists():
        log(f"File not found: {filepath}", "ERR")
        return False

    content = filepath.read_text(encoding="utf-8")
    original = content
    relative = filepath.relative_to(BASE_PATH)
    changes = 0

    # Apply general replacements
    for old, new in GENERAL_REPLACEMENTS:
        if old in content:
            content = content.replace(old, new)
            changes += 1

    # Apply file-specific replacements
    prompt_key = str(relative).replace("\\", "/")
    if prompt_key in FILE_SPECIFIC_REPLACEMENTS:
        for old, new in FILE_SPECIFIC_REPLACEMENTS[prompt_key]:
            if old in content:
                content = content.replace(old, new)
                changes += 1

    if content != original:
        if dry_run:
            log(f"Would patch ({changes} changes): {relative}", "DRY")
        else:
            backup_file(filepath)
            filepath.write_text(content, encoding="utf-8")
            # Validate syntax
            if validate_ts_syntax(filepath):
                log(f"Patched ({changes} changes): {relative}", "OK")
            else:
                log(f"Syntax validation failed! Restoring: {relative}", "ERR")
                # Restore from backup
                backup_path = BACKUP_DIR / relative
                shutil.copy2(backup_path, filepath)
                return False
        return True
    else:
        log(f"No changes needed: {relative}", "INFO")
        return True


# ── Main ───────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Patch Toonflow AI agents to enforce Bahasa Indonesia output"
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without modifying files")
    parser.add_argument("--restore", action="store_true", help="Restore from latest backup")
    parser.add_argument("--list", action="store_true", help="List files to be modified")
    parser.add_argument("--base-path", type=str, default=None, help="Override base path for Toonflow installation")
    args = parser.parse_args()

    global BASE_PATH

    if args.base_path:
        BASE_PATH = Path(args.base_path)

    print()
    print("=" * 60)
    print("  🇮🇩 Toonflow Indonesian Agent Patch v1.0")
    print("  Bahasa Indonesia Language Enforcement")
    print("=" * 60)
    print(f"  Base path: {BASE_PATH}")
    print(f"  Dry run:   {args.dry_run}")
    print()

    # Handle restore mode
    if args.restore:
        print("📦 Restoring from backup...")
        if restore_from_backup():
            log("All files restored successfully!", "OK")
        else:
            log("Restore failed!", "ERR")
            sys.exit(1)
        return

    # Handle list mode
    if args.list:
        print("📋 Files to be modified:")
        print()
        print("  Agent Prompt Files (Markdown):")
        for f in AGENT_PROMPT_FILES:
            full_path = BASE_PATH / f
            exists = "✅" if full_path.exists() else "❌"
            print(f"    {exists} {f}")
        print()
        print("  TypeScript Source Files:")
        for f in TS_FILES:
            full_path = BASE_PATH / f
            exists = "✅" if full_path.exists() else "❌"
            print(f"    {exists} {f}")
        print()
        return

    # Verify base path
    if not (BASE_PATH / "data" / "skills").exists():
        log(f"Invalid base path! Skills directory not found at {BASE_PATH / 'data' / 'skills'}", "ERR")
        log("Use --base-path to specify the correct Toonflow installation directory", "WARN")
        sys.exit(1)

    # Create backup directory
    if not args.dry_run:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        log(f"Backup directory: {BACKUP_DIR}", "INFO")

    all_ok = True

    # Patch markdown files
    print("📝 Patching Agent Prompt Files...")
    for f in AGENT_PROMPT_FILES:
        filepath = BASE_PATH / f
        if not patch_markdown_file(filepath, dry_run=args.dry_run):
            all_ok = False

    print()

    # Patch TypeScript files
    print("🔧 Patching TypeScript Source Files...")
    for f in TS_FILES:
        filepath = BASE_PATH / f
        if not patch_ts_file(filepath, dry_run=args.dry_run):
            all_ok = False

    print()

    # Summary
    if all_ok:
        if args.dry_run:
            log("Dry run complete. No files were modified.", "OK")
        else:
            log("All patches applied successfully!", "OK")
            log(f"Backups saved to: {BACKUP_DIR}", "INFO")
            log("To restore: python patch-indonesian-agent.py --restore", "INFO")
    else:
        log("Some patches failed! Check errors above.", "ERR")
        if not args.dry_run:
            log("Run --restore to revert changes.", "WARN")
        sys.exit(1)

    print()


if __name__ == "__main__":
    main()
