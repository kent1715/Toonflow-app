/**
 * sync-skills-db.ts
 *
 * Synchronizes skill markdown files from data/skills/ into the SQLite database.
 * Also syncs the 4 built-in prompt types from initDB.ts data.
 *
 * This script:
 *   1. Reads all top-level .md files from data/skills/ (NOT subdirectories)
 *   2. Maps each file to the correct o_prompt record by `type` field
 *   3. Updates o_prompt.data with the latest file content
 *   4. Also updates the 4 built-in prompt types (eventExtraction, scriptAssetExtraction,
 *      videoPromptGeneration, audioBindPrompt) from initDB.ts data
 *   5. Creates new o_prompt records for entries that don't exist yet
 *   6. Does NOT delete any project/user data
 *   7. Preserves user customizations in `useData` field
 *
 * Usage:
 *   npx tsx scripts/sync-skills-db.ts
 *   yarn sync-skills
 */

import db from "@/utils/db";
import fs from "fs";
import path from "path";

// ─── Skill file → o_prompt type mapping ──────────────────────────────────────

const SKILL_TYPE_MAP: Record<string, string> = {
  "production_agent_supervision.md": "productionAgent:supervisionAgent",
  "production_agent_decision.md": "productionAgent:decisionAgent",
  "script_agent_supervision.md": "scriptAgent:supervisionAgent",
  "script_agent_decision.md": "scriptAgent:decisionAgent",
  "production_execution_director_plan.md": "productionAgent:directorPlanAgent",
  "production_execution_derive_assets.md": "productionAgent:deriveAssetsAgent",
  "production_execution_generate_assets.md": "productionAgent:generateAssetsAgent",
  "production_execution_storyboard_table.md": "productionAgent:storyboardTableAgent",
  "production_execution_storyboard_panel.md": "productionAgent:storyboardPanelAgent",
  "production_execution_storyboard_gen.md": "productionAgent:storyboardGenAgent",
  "script_execution_skeleton.md": "scriptAgent:storySkeletonAgent",
  "script_execution_adaptation.md": "scriptAgent:adaptationStrategyAgent",
  "script_execution_script.md": "scriptAgent:scriptAgent",
};

// ─── Built-in prompt data from initDB.ts ─────────────────────────────────────

const BUILTIN_PROMPTS: Array<{ name: string; type: string; data: string }> = [
  {
    name: "Ekstraksi Event",
    type: "eventExtraction",
    data: `# Instruksi Ekstraksi Event\n\nKamu adalah asisten analisis teks novel. Pengguna menyediakan teks asli per bab, kamu mengekstrak informasi event terstruktur dari bab tersebut.\n\n## ⚠️ Batasan Output (Prioritas tertinggi, melanggar satu pun berarti gagal)\n\n1. **Seluruh balasan** kamu hanya satu baris，以 \`|\` 开头、以 \`|\` 结尾，tepat 7 field\n2. **Karakter pertama** balasan harus \`|\`，**Karakter terakhir** harus \`|\`\n3. \`|\` Sebelum \`|\` tidak boleh ada karakter apapun — tidak ada kata pengantar, tidak ada penjelasan, tidak ada "berdasarkan...", tidak ada "berikut adalah..."\n4. \`|\` Setelah \`|\` tidak boleh ada karakter apapun — tidak ada ringkasan, tidak ada keterangan ekstraksi, tidak ada saran adaptasi\n5. Jangan output baris header, garis pemisah, judul Markdown, emoji, penanda blok kode\n\n## Format Output\n\n\`\`\`\n| Bab X {Judul Bab} | {Karakter Terlibat} | {Event Inti} | {Hubungan Alur Utama} | {Kepadatan Informasi} | {Perkiraan Durasi} | {Intensitas Emosi} |\n\`\`\`\n\n### Spesifikasi Field\n\n| Field | Format yang Diperlukan | Contoh |\n|------|----------|------|\n| Bab | \`Bab X {Judul Bab}\` | \`Bab 1 Krisis Karier dan Harapan\` |\n| Karakter Terlibat | Karakter dengan porsi peran aktual, dipisahkan koma | \`林逸、白有容\` |\n| Event Inti | 30-60 kata, harus mengandung aksi+hasil | \`林逸因解密风潮事业崩塌，颓废Sedang许愿触发魔法系统绑定\` |\n| Hubungan Alur Utama | **Harus** berupa \`Kuat/Sedang/Lemah (alasan 3-8 kata)\` | \`Kuat (pembangunan motivasi+aktivasi sistem)\` |\n| Kepadatan Informasi | \`Tinggi\` / \`Sedang\` / \`Rendah\` | \`Tinggi\` |\n| Perkiraan Durasi | **Harus** berupa \`X秒\`，禁止用分钟 | \`50 detik\` |\n| Intensitas Emosi | 文字标签，\`+\` 连接，禁止星级/数字 | \`Peralihan+Misteri\` |\n\n**Hubungan Alur Utama判定**：强＝直接推动主角弧线；Sedang＝补充世界观/人物关系/伏笔；弱＝过渡/气氛。\n\n**Perkiraan Durasi参考**：Tinggi密度+TinggiEmosi→45-60秒；Sedang→35-45秒；Rendah→25-35秒。\n\n**Label Emosi yang Tersedia**：\`Konflik\`、\`Horor\`、\`Emosional\`、\`Peralihan\`、\`Tinggi潮\`、\`Datar\`、\`Komedi\`、\`Misteri\`、\`Emosional崩溃\`。\n\n## 输出Contoh\n\n以下两个Contoh展示的是**完整回复**——除这一行外没有任何其他内容：\n\n\`\`\`\n| Bab 1 Krisis Karier dan Harapan | 林逸 | 职业魔术师林逸因解密打假风潮导致事业崩塌，颓废Sedang感慨"如果会魔法就好了"，意外触发神奇魔法系统绑定 | Kuat (pembangunan motivasi karakter utama+aktivasi sistem) | Tinggi | 50 detik | Peralihan+Misteri |\n\`\`\`\n\`\`\`\n| Bab 12 Istirahat di Pegunungan | Ling Xuan, Su Wanqing | Ling Xuan dan Su Wanqing beristirahat di pegunungan, Su Wanqing mengenang masa lalu, hubungan mereka sedikit membaikdantapi tidak ada kemajuan substansial | Lemah (transisi atmosfer) | Rendah | 25 detik | Datar+Emosional |\n\`\`\`\n\n## Aturan Ekstraksi\n\n- Setia pada teks asli, jangan berspekulasi, jangan mengarang, jangan menambahkan plot yang tidak ada dalam teks asli\n- 角色使用文Sedang主要称呼，保持一致\n- Saat ada beberapa alur event paralel, pilih yang berdampak paling besar pada karakter utama, sisanya disingkat\n- 对话密集Bab，关注对话推动了什么结果，而非复述对话内容`,
  },
  {
    name: "Ekstraksi Aset Skrip",
    type: "scriptAssetExtraction",
    data: `---\nname: universal_agent\ndescription: Asisten yang berfokus pada ekstraksi aset (karakter, adegan, prop) dari konten skrip dan menghasilkan daftar aset terstruktur.\n---\n\n# Script Assets Extract\n\nKamu adalah asisten analisis konten skrip profesional, berfokus pada identifikasi dan ekstraksi semua aset (karakter, adegan, prop) dari teks skrip, serta menghasilkan deskripsi terstruktur dan prompt untuk setiap aset yang dapat digunakan dalam proses produksi hilir.\n\n## Kapan Digunakan\n\nPengguna menyediakan konten skrip, kamu perlu membaca per bagian dan mengekstrak semua aset yang terlibat (karakter, lokasi adegan, prop), menghasilkan daftar aset terstruktur. Deskripsi aset yang dihasilkan akan digunakan untuk pembuatan gambar AI dan proses produksi selanjutnya.\n\n## Korespondensi dengan Sistem\n\n- Tipe aset:\n  - \`role\` — Karakter (berkorespondensi \`o_assets.type = "role"\`）\n  - \`scene\` — Adegan (berkorespondensi \`o_assets.type = "scene"\`）\n  - \`tool\` — Prop (berkorespondensi \`o_assets.type = "tool"\`）\n- Penggunaan hilir: Pembuatan prompt aset → Pembuatan gambar aset AI → Pembuatan storyboard\n\n## Persyaratan Output\n\n**Harus melalui pemanggilan \`resultTool\` tool untuk mengembalikan hasil**，, dilarang output daftar aset langsung dalam bentuk teks biasa, tabel Markdown, atau blok kode JSON.\n\`resultTool\` 的 schema 会对Field类型dan枚举值做强校验，调用时请严格按照下方Field定义填写，确保数据结构正确、Field完整、类型匹配。\n\nSetiap objek aset mengandung field berikut:\n\n| Field | Tipe | Wajib | Keterangan |\n| ---- | ---- | ---- | ---- |\n| \`name\` | string | 是 | 资产名称，使用剧本中的原始称呼,不做其他多余描述 |\n| \`desc\` | string | 是 | Deskripsi aset, deskripsi visual 30-80 kata |\n| \`prompt\` | string | 是 | Prompt pembuatan, bahasa Inggris, digunakan untuk pembuatan gambar AI |\n| \`type\` | enum | 是 | Tipe aset:\`role\` / \`scene\` / \`tool\`  |\n\n## Aturan Ekstraksi\n\n### Karakter (role)\n\n- Ekstrak semua karakter yang memiliki nama dalam skrip\n- \`desc\`：Mengandung elemen visual seperti ciri fisik, gaya pakaian, postur dan aura\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan ciri penampilan karakter, cocok untuk pembuatan gambar karakter AI\n- 同一角色有多个称呼时，取最常用的作为 \`name\`\n- Figuran tanpa nama (seperti "pejalan kaki", "tentara") dapat dilewati, kecuali penampilan mereka memiliki signifikansi visual penting untuk plot\n\n### Adegan (scene)\n\n- Ekstrak semua adegan/lokasi yang muncul dalam skrip\n- \`desc\`：Mengandung elemen visual seperti struktur ruang, atmosfer pencahayaan, furnitur kunci, nada warna\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan gaya visual keseluruhan adegan, cocok untuk pembuatan gambar adegan AI\n- 同一Adegan的不同状态（如白天/夜晚）不重复提取，在 \`desc\` 中注明即可\n\n### Prop (tool)\n\n- Ekstrak prop/barang penting yang muncul dalam skrip\n- \`desc\`：Mengandung elemen visual seperti bentuk penampilan, warna dan material, referensi ukuran, efek khusus\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan detail penampilan prop, cocok untuk pembuatan gambar prop AI\n- Hanya ekstrak prop yang memiliki signifikansi visual independen atau fungsi plot, barang umum dapat dilewati\n\n\n## Spesifikasi Pembuatan Prompt\n\n- Gunakan format kata kunci/frasa yang dipisahkan koma\n- Prioritaskan deskripsi **ciri visual**, hindari konsep abstrak\n- Sertakan kata kunci gaya (seperti anime style, manga style, dll., sesuai gaya proyek)\n- 角色 prompt Contoh：\`a young man, sharp eyebrows, black hair, pale skin, wearing a gray Taoist robe, slender build, cold expression\`\n- Adegan prompt Contoh：\`dark cave interior, glowing crystals on walls, misty atmosphere, dim blue lighting, stone altar in center\`\n- 道具 prompt Contoh：\`ancient jade pendant, oval shape, translucent green, carved dragon pattern, glowing faintly\`\n\n## Alur Ekstraksi\n\n1. Baca seluruh skrip, identifikasi semua karakter, adegan, dan prop yang muncul\n2. Untuk setiap aset, hasilkan \`name\`、\`desc\`、\`prompt\`、\`type\`\n3. Deduplikasi: aset yang sama tidak diekstrak ulang\n4. **Harus melalui pemanggilan \`resultTool\` 工具输出完整资产列表**，不要分多次调用，一次性将所有资产放入 \`assetsList\` 数组中提交\n\n## Prinsip Ekstraksi\n\n1. **Setia pada skrip**: Semua ekstraksi berdasarkan konten aktual dalam skrip, jangan mengarang aset yang tidak ada\n2. **Visual diutamakan**: Deskripsi dan prompt berfokus pada ciri visual, memudahkan pembuatan gambar AI\n3. **Ringkas dan praktis**: Hanya ekstrak aset yang bermakna aktual untuk produksi, hindari ekstraksi berlebihan\n4. **Klasifikasi akurat**: Ketat klasifikasikan sesuai role/scene/tool, jangan campur\n5. **Kualitas prompt**: Prompt bahasa Inggris harus spesifik dan dapat dieksekusi, dapat langsung digunakan untuk pembuatan gambar AI\n\n## Catatan Penting\n\n- Daftar aset **jangan mengandung konten skrip itu sendiri**, hanya ekstrak aset yang digunakan\n- Barang bawaan karakter jika memiliki fungsi plot independen, harus diekstrak secara terpisah sebagai prop\n- Furnitur tetap dalam adegan tidak perlu diekstrak terpisah sebagai prop, kecuali objek tersebut memiliki fungsi plot independen`,
  },
  {
    name: "Pengikatan Suara",
    type: "audioBindPrompt",
    data: `Kamu adalah asisten pencocokan suara.\n你的任务是：根据给定角色资产的名称与描述，从候选音频列表Sedang选出最合适的音色。\nAturan pencocokan:\n1. Prioritaskan pencocokan semantik berdasarkan karakteristik jenis kelamin, usia, kepribadian karakter dengan deskripsi suara;\n2. Satu karakter hanya dapat dicocokkan dengan satu suara;\n3. 若候选列表Sedang没有合适的音色，则无需返回 audioId；`,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter from markdown content to get the `name` field.
 */
function parseFrontmatterName(content: string): string | null {
  const match = content.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match?.[1]) return null;

  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const keyMatch = line.match(/^name\s*:\s*(.*)$/);
    if (keyMatch) {
      return (keyMatch[1] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
    }
  }
  return null;
}

/**
 * Derive a human-readable name from a filename.
 * e.g. "production_agent_supervision" → "Production Agent Supervision"
 */
function deriveNameFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

async function syncSkills() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Skill Sync — Filesystem → Database");
  console.log("═══════════════════════════════════════════════════════════\n");

  const skillsDir = path.resolve(process.cwd(), "data/skills");
  const modelPromptFile = path.resolve(process.cwd(), "data/modelPrompt/video/universalMulti-parameterMode.md");

  // Check skills directory
  if (!fs.existsSync(skillsDir)) {
    console.error(`❌ Skills directory not found at: ${skillsDir}`);
    process.exit(1);
  }

  // Read top-level .md files only (NOT subdirectories)
  const allDirents = fs.readdirSync(skillsDir, { withFileTypes: true });
  const files = allDirents
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name);

  console.log(`📁 Direktori skill: ${skillsDir}`);
  console.log(`📄 Ditemukan ${files.length} file skill (top-level only)\n`);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // ── Step 1: Sync skill .md files ────────────────────────────────────────

  console.log("🔄 Sinkronisasi file skill...\n");

  for (const file of files) {
    const promptType = SKILL_TYPE_MAP[file];
    if (!promptType) {
      console.log(`⏭️  Lewati: ${file} (tidak ada mapping)`);
      skipped++;
      continue;
    }

    const filePath = path.join(skillsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract name from frontmatter or derive from filename
    const frontmatterName = parseFrontmatterName(content);
    const name = frontmatterName || deriveNameFromFilename(file);

    try {
      const existing = await db("o_prompt").where("type", promptType).first();

      if (existing) {
        // Update existing record — only update `data` field, preserve `useData`
        if (existing.data === content) {
          console.log(`⏭️  Unchanged: ${file} → ${promptType}`);
          skipped++;
        } else {
          await db("o_prompt").where("type", promptType).update({
            data: content,
            name: name,
          });
          console.log(`✅ Diperbarui: ${file} → ${promptType}`);
          updated++;
        }
      } else {
        // Insert new record
        const maxRow = await db("o_prompt").max("id as maxId").first();
        const newId = (maxRow?.maxId ?? 0) + 1;
        await db("o_prompt").insert({
          id: newId,
          name: name,
          type: promptType,
          data: content,
          useData: content,
        });
        console.log(`➕ Ditambahkan: ${file} → ${promptType}`);
        inserted++;
      }
    } catch (err: any) {
      console.log(`❌ Gagal: ${file} → ${err.message}`);
      errors++;
    }
  }

  // ── Step 2: Sync built-in prompts from initDB.ts data ───────────────────

  console.log("\n🔄 Sinkronisasi prompt bawaan dari initDB.ts...\n");

  for (const prompt of BUILTIN_PROMPTS) {
    try {
      const existing = await db("o_prompt").where("type", prompt.type).first();

      if (existing) {
        if (existing.data === prompt.data) {
          console.log(`⏭️  Unchanged: ${prompt.type}`);
          skipped++;
        } else {
          await db("o_prompt").where("type", prompt.type).update({
            data: prompt.data,
            name: prompt.name,
          });
          console.log(`✅ Diperbarui: ${prompt.type}`);
          updated++;
        }
      } else {
        const maxRow = await db("o_prompt").max("id as maxId").first();
        const newId = (maxRow?.maxId ?? 0) + 1;
        await db("o_prompt").insert({
          id: newId,
          name: prompt.name,
          type: prompt.type,
          data: prompt.data,
          useData: prompt.data,
        });
        console.log(`➕ Ditambahkan: ${prompt.type}`);
        inserted++;
      }
    } catch (err: any) {
      console.log(`❌ Gagal: ${prompt.type} → ${err.message}`);
      errors++;
    }
  }

  // ── Step 3: Sync videoPromptGeneration from modelPrompt file ────────────

  console.log("\n🔄 Sinkronisasi videoPromptGeneration dari modelPrompt...\n");

  if (fs.existsSync(modelPromptFile)) {
    try {
      const videoPromptContent = fs.readFileSync(modelPromptFile, "utf-8");
      const videoPromptName = "Generasi Prompt Video";
      const videoPromptType = "videoPromptGeneration";

      const existing = await db("o_prompt").where("type", videoPromptType).first();

      if (existing) {
        if (existing.data === videoPromptContent) {
          console.log(`⏭️  Unchanged: ${videoPromptType}`);
          skipped++;
        } else {
          // Only update `data` field (seed), preserve `useData` (user customization)
          await db("o_prompt").where("type", videoPromptType).update({
            data: videoPromptContent,
            name: existing.name || videoPromptName,
          });
          console.log(`✅ Diperbarui: ${videoPromptType}`);
          updated++;
        }
      } else {
        const maxRow = await db("o_prompt").max("id as maxId").first();
        const newId = (maxRow?.maxId ?? 0) + 1;
        await db("o_prompt").insert({
          id: newId,
          name: videoPromptName,
          type: videoPromptType,
          data: videoPromptContent,
          useData: videoPromptContent,
        });
        console.log(`➕ Ditambahkan: ${videoPromptType}`);
        inserted++;
      }
    } catch (err: any) {
      console.log(`❌ Gagal: videoPromptGeneration → ${err.message}`);
      errors++;
    }
  } else {
    console.log(`⚠️  File modelPrompt tidak ditemukan: ${modelPromptFile}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Ringkasan Sinkronisasi");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log(`   ✅ Diperbarui: ${updated}`);
  console.log(`   ➕ Ditambahkan: ${inserted}`);
  console.log(`   ⏭️  Dilewati: ${skipped}`);
  console.log(`   ❌ Gagal: ${errors}`);

  // Show current o_prompt records
  const allPrompts = await db("o_prompt").select("type", "name").orderBy("type");
  console.log(`\n   📊 Total o_prompt records: ${allPrompts.length}`);
  console.log("\n   ── Current o_prompt types ──────────────────────────");
  for (const row of allPrompts) {
    console.log(`     ${row.type} → ${row.name || "(unnamed)"}`);
  }

  console.log("\n✨ Sinkronisasi selesai!\n");

  await db.destroy();
  process.exit(0);
}

syncSkills().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
