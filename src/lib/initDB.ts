import { Knex } from "knex";
import { v4 as uuid } from "uuid";
import { getEmbedding } from "@/utils/agent/embedding";

interface TableSchema {
  name: string;
  builder: (table: Knex.CreateTableBuilder) => void;
  initData?: (knex: Knex) => Promise<void>;
}

export default async (knex: Knex, forceInit: boolean = false): Promise<void> => {
  const tables: TableSchema[] = [
    // Tabel pengguna
    {
      name: "o_user",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("name");
        table.text("password");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {
        await knex("o_user").insert([{ id: 1, name: "admin", password: "admin123" }]);
      },
    },
    //Tabel proyek
    {
      name: "o_project",
      builder: (table) => {
        table.integer("id");
        table.string("projectType");
        table.string("imageModel");
        table.string("imageQuality");
        table.string("videoModel");
        table.text("name");
        table.text("intro");
        table.text("type");
        table.text("artStyle");
        table.text("directorManual");
        table.text("mode");
        table.text("videoRatio");
        table.integer("createTime");
        table.integer("userId");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Tabel gaya
    {
      name: "o_artStyle",
      builder: (table) => {
        table.integer("id").notNullable();
        table.string("name");
        table.text("fileUrl");
        table.text("label");
        table.text("prompt");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {},
    },
    //Tabel konfigurasi Agent
    {
      name: "o_agentDeploy",
      builder: (table) => {
        table.integer("id").notNullable();
        table.string("model");
        table.string("key");
        table.string("modelName");
        table.text("vendorId");
        table.string("desc");
        table.string("name");
        table.integer("temperature");
        table.integer("maxOutputTokens");
        table.boolean("disabled").defaultTo(false);
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {
        await knex("o_agentDeploy").insert([
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent",
            name: "Agent Skrip",
            desc: "Digunakan untuk membaca teks asli dan menghasilkan kerangka cerita serta strategi adaptasi, disarankan menggunakan model dengan kemampuan pemahaman dan pembuatan teks yang kuat",
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent",
            name: "Agent Produksi",
            desc: "Menjadwal dan mengelola alur kerja, disarankan menggunakan model dengan kemampuan penalaran logis dan manajemen tugas yang kuat",
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "universalAi",
            name: "AI Umum",
            desc: "Digunakan untuk ekstraksi event novel, pembuatan prompt aset, ekstraksi dialog, dan fungsi pendukung lainnya, disarankan menggunakan model dengan kemampuan pemrosesan teks yang kuat",
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "ttsDubbing",
            name: "Dubbing TTS",
            desc: "Menghasilkan sulih suara karakter berdasarkan konten skrip, mendukung berbagai gaya suara dan emosi",
            disabled: true,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent:decisionAgent",
            name: "Agent Skrip:Lapisan Keputusan",
            desc: "Lapisan Keputusan",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent:supervisionAgent",
            name: "Agent Skrip:Lapisan Pengawasan",
            desc: "Lapisan Pengawasan",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent:storySkeletonAgent",
            name: "Agent Skrip:Kerangka Cerita",
            desc: "Pembuatan Kerangka Cerita",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent:adaptationStrategyAgent",
            name: "Agent Skrip:Strategi Adaptasi",
            desc: "Pembuatan Strategi Adaptasi",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "scriptAgent:scriptAgent",
            name: "Agent Skrip:Pembuatan Skrip",
            desc: "Pembuatan Skrip",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:decisionAgent",
            name: "Agent Produksi:Lapisan Keputusan",
            desc: "Lapisan Keputusan",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:supervisionAgent",
            name: "Agent Produksi:Lapisan Pengawasan",
            desc: "Lapisan Pengawasan",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:deriveAssetsAgent",
            name: "Agent Produksi:Aset Turunan",
            desc: "Aset Turunan",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:generateAssetsAgent",
            name: "Agent Produksi:Generasi Aset",
            desc: "Generasi Aset",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:directorPlanAgent",
            name: "Agent Produksi:Perencanaan Sutradara",
            desc: "Perencanaan Sutradara",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:storyboardGenAgent",
            name: "Agent Produksi:Generasi Storyboard",
            desc: "Generasi Storyboard",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:storyboardPanelAgent",
            name: "Agent Produksi:Panel Storyboard",
            desc: "Pembuatan Panel Storyboard",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
          {
            model: "",
            modelName: "",
            vendorId: null,
            key: "productionAgent:storyboardTableAgent",
            name: "Agent Produksi:Tabel Storyboard",
            desc: "Pembuatan Tabel Storyboard",
            temperature: 1,
            maxOutputTokens: 0,
            disabled: false,
          },
        ]);
      },
    },
    //Tabel pengaturan
    {
      name: "o_setting",
      builder: (table) => {
        table.text("key");
        table.text("value");
        table.primary(["key"]);
        table.unique(["key"]);
      },
      initData: async (knex) => {
        await knex("o_setting").insert([
          {
            key: "tokenKey",
            value: uuid().slice(0, 8),
          },
          {
            key: "messagesPerSummary",
            value: 10,
          },
          {
            key: "shortTermLimit",
            value: 5,
          },
          {
            key: "summaryMaxLength",
            value: 500,
          },
          {
            key: "summaryLimit",
            value: 10,
          },
          {
            key: "ragLimit",
            value: 3,
          },
          {
            key: "deepRetrieveSummaryLimit",
            value: 5,
          },
          {
            key: "modelOnnxFile",
            value: '["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"]',
          },
          {
            key: "modelDtype",
            value: "fp16",
          },
          {
            key: "switchAiDevTool",
            value: "0",
          },
        ]);
      },
    },
    //Tabel pusat tugas
    {
      name: "o_tasks",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("projectId");
        table.string("taskClass");
        table.string("relatedObjects");
        table.string("model");
        table.text("describe");
        table.string("state");
        table.integer("startTime");
        table.text("reason");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {},
    },
    //Tabel prompt
    {
      name: "o_prompt",
      builder: (table) => {
        table.integer("id").notNullable();
        table.string("name");
        table.string("type");
        table.text("data");
        table.text("useData");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {
        await knex("o_prompt").insert([
          {
            name: "Ekstraksi Event",
            type: "eventExtraction",
            data: `# Instruksi Ekstraksi Event\n\nKamu adalah asisten analisis teks novel. Pengguna menyediakan teks asli per bab, kamu mengekstrak informasi event terstruktur dari bab tersebut.\n\n## ⚠️ Batasan Output (Prioritas tertinggi, melanggar satu pun berarti gagal)\n\n1. **Seluruh balasan** kamu hanya satu baris，以 \`|\` 开头、以 \`|\` 结尾，tepat 7 field\n2. **Karakter pertama** balasan harus \`|\`，**Karakter terakhir** harus \`|\`\n3. \`|\` Sebelum `|` tidak boleh ada karakter apapun — tidak ada kata pengantar, tidak ada penjelasan, tidak ada "berdasarkan...", tidak ada "berikut adalah..."\n4. \`|\` Setelah `|` tidak boleh ada karakter apapun — tidak ada ringkasan, tidak ada keterangan ekstraksi, tidak ada saran adaptasi\n5. Jangan output baris header, garis pemisah, judul Markdown, emoji, penanda blok kode\n\n## Format Output\n\n\`\`\`\n| Bab X {Judul Bab} | {Karakter Terlibat} | {Event Inti} | {Hubungan Alur Utama} | {Kepadatan Informasi} | {Perkiraan Durasi} | {Intensitas Emosi} |\n\`\`\`\n\n### Spesifikasi Field\n\n| Field | Format yang Diperlukan | Contoh |\n|------|----------|------|\n| Bab | \`Bab X {Judul Bab}\` | \`Bab 1 Krisis Karier dan Harapan\` |\n| Karakter Terlibat | Karakter dengan porsi peran aktual, dipisahkan koma | \`林逸、白有容\` |\n| Event Inti | 30-60 kata, harus mengandung aksi+hasil | \`林逸因解密风潮事业崩塌，颓废Sedang许愿触发魔法系统绑定\` |\n| Hubungan Alur Utama | **Harus** berupa \`Kuat/Sedang/Lemah (alasan 3-8 kata)\` | \`Kuat (pembangunan motivasi+aktivasi sistem)\` |\n| Kepadatan Informasi | \`Tinggi\` / \`Sedang\` / \`Rendah\` | \`Tinggi\` |\n| Perkiraan Durasi | **Harus** berupa \`X秒\`，禁止用分钟 | \`50 detik\` |\n| Intensitas Emosi | 文字标签，\`+\` 连接，禁止星级/数字 | \`Peralihan+Misteri\` |\n\n**Hubungan Alur Utama判定**：强＝直接推动主角弧线；Sedang＝补充世界观/人物关系/伏笔；弱＝过渡/气氛。\n\n**Perkiraan Durasi参考**：Tinggi密度+TinggiEmosi→45-60秒；Sedang→35-45秒；Rendah→25-35秒。\n\n**Label Emosi yang Tersedia**：\`Konflik\`、\`Horor\`、\`Emosional\`、\`Peralihan\`、\`Tinggi潮\`、\`Datar\`、\`Komedi\`、\`Misteri\`、\`Emosional崩溃\`。\n\n## 输出Contoh\n\n以下两个Contoh展示的是**完整回复**——除这一行外没有任何其他内容：\n\n\`\`\`\n| Bab 1 Krisis Karier dan Harapan | 林逸 | 职业魔术师林逸因解密打假风潮导致事业崩塌，颓废Sedang感慨"如果会魔法就好了"，意外触发神奇魔法系统绑定 | Kuat (pembangunan motivasi karakter utama+aktivasi sistem) | Tinggi | 50 detik | Peralihan+Misteri |\n\`\`\`\n\`\`\`\n| Bab 12 Istirahat di Pegunungan | Ling Xuan, Su Wanqing | Ling Xuan dan Su Wanqing beristirahat di pegunungan, Su Wanqing mengenang masa lalu, hubungan mereka sedikit membaikdantapi tidak ada kemajuan substansial | Lemah (transisi atmosfer) | Rendah | 25 detik | Datar+Emosional |\n\`\`\`\n\n## Aturan Ekstraksi\n\n- Setia pada teks asli, jangan berspekulasi, jangan mengarang, jangan menambahkan plot yang tidak ada dalam teks asli\n- 角色使用文Sedang主要称呼，保持一致\n- Saat ada beberapa alur event paralel, pilih yang berdampak paling besar pada karakter utama, sisanya disingkat\n- 对话密集Bab，关注对话推动了什么结果，而非复述对话内容`,
          },
          {
            name: "Ekstraksi Aset Skrip",
            type: "scriptAssetExtraction",
            data: `---\nname: universal_agent\ndescription: Asisten yang berfokus pada ekstraksi aset (karakter, adegan, prop) dari konten skrip dan menghasilkan daftar aset terstruktur.\n---\n\n# Script Assets Extract\n\nKamu adalah asisten analisis konten skrip profesional, berfokus pada identifikasi dan ekstraksi semua aset (karakter, adegan, prop) dari teks skrip, serta menghasilkan deskripsi terstruktur dan prompt untuk setiap aset yang dapat digunakan dalam proses produksi hilir.\n\n## Kapan Digunakan\n\nPengguna menyediakan konten skrip, kamu perlu membaca per bagian dan mengekstrak semua aset yang terlibat (karakter, lokasi adegan, prop), menghasilkan daftar aset terstruktur. Deskripsi aset yang dihasilkan akan digunakan untuk pembuatan gambar AI dan proses produksi selanjutnya.\n\n## Korespondensi dengan Sistem\n\n- Tipe aset:\n  - \`role\` — Karakter (berkorespondensi \`o_assets.type = "role"\`）\n  - \`scene\` — Adegan (berkorespondensi \`o_assets.type = "scene"\`）\n  - \`tool\` — Prop (berkorespondensi \`o_assets.type = "tool"\`）\n- Penggunaan hilir: Pembuatan prompt aset → Pembuatan gambar aset AI → Pembuatan storyboard\n\n## Persyaratan Output\n\n**Harus melalui pemanggilan \`resultTool\` tool untuk mengembalikan hasil**，, dilarang output daftar aset langsung dalam bentuk teks biasa, tabel Markdown, atau blok kode JSON.\n\`resultTool\` 的 schema 会对Field类型dan枚举值做强校验，调用时请严格按照下方Field定义填写，确保数据结构正确、Field完整、类型匹配。\n\nSetiap objek aset mengandung field berikut:\n\n| Field | Tipe | Wajib | Keterangan |\n| ---- | ---- | ---- | ---- |\n| \`name\` | string | 是 | 资产名称，使用剧本中的原始称呼,不做其他多余描述 |\n| \`desc\` | string | 是 | Deskripsi aset, deskripsi visual 30-80 kata |\n| \`prompt\` | string | 是 | Prompt pembuatan, bahasa Inggris, digunakan untuk pembuatan gambar AI |\n| \`type\` | enum | 是 | Tipe aset:\`role\` / \`scene\` / \`tool\`  |\n\n## Aturan Ekstraksi\n\n### Karakter (role)\n\n- Ekstrak semua karakter yang memiliki nama dalam skrip\n- \`desc\`：Mengandung elemen visual seperti ciri fisik, gaya pakaian, postur dan aura\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan ciri penampilan karakter, cocok untuk pembuatan gambar karakter AI\n- 同一角色有多个称呼时，取最常用的作为 \`name\`\n- Figuran tanpa nama (seperti "pejalan kaki", "tentara") dapat dilewati, kecuali penampilan mereka memiliki signifikansi visual penting untuk plot\n\n### Adegan (scene)\n\n- Ekstrak semua adegan/lokasi yang muncul dalam skrip\n- \`desc\`：Mengandung elemen visual seperti struktur ruang, atmosfer pencahayaan, furnitur kunci, nada warna\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan gaya visual keseluruhan adegan, cocok untuk pembuatan gambar adegan AI\n- 同一Adegan的不同状态（如白天/夜晚）不重复提取，在 \`desc\` 中注明即可\n\n### Prop (tool)\n\n- Ekstrak prop/barang penting yang muncul dalam skrip\n- \`desc\`：Mengandung elemen visual seperti bentuk penampilan, warna dan material, referensi ukuran, efek khusus\n- \`prompt\`：Prompt bahasa Inggris, mendeskripsikan detail penampilan prop, cocok untuk pembuatan gambar prop AI\n- Hanya ekstrak prop yang memiliki signifikansi visual independen atau fungsi plot, barang umum dapat dilewati\n\n\n## Spesifikasi Pembuatan Prompt\n\n- Gunakan format kata kunci/frasa yang dipisahkan koma\n- Prioritaskan deskripsi **ciri visual**, hindari konsep abstrak\n- Sertakan kata kunci gaya (seperti anime style, manga style, dll., sesuai gaya proyek)\n- 角色 prompt Contoh：\`a young man, sharp eyebrows, black hair, pale skin, wearing a gray Taoist robe, slender build, cold expression\`\n- Adegan prompt Contoh：\`dark cave interior, glowing crystals on walls, misty atmosphere, dim blue lighting, stone altar in center\`\n- 道具 prompt Contoh：\`ancient jade pendant, oval shape, translucent green, carved dragon pattern, glowing faintly\`\n\n## Alur Ekstraksi\n\n1. Baca seluruh skrip, identifikasi semua karakter, adegan, dan prop yang muncul\n2. Untuk setiap aset, hasilkan \`name\`、\`desc\`、\`prompt\`、\`type\`\n3. Deduplikasi: aset yang sama tidak diekstrak ulang\n4. **Harus melalui pemanggilan \`resultTool\` 工具输出完整资产列表**，不要分多次调用，一次性将所有资产放入 \`assetsList\` 数组中提交\n\n## Prinsip Ekstraksi\n\n1. **Setia pada skrip**: Semua ekstraksi berdasarkan konten aktual dalam skrip, jangan mengarang aset yang tidak ada\n2. **Visual diutamakan**: Deskripsi dan prompt berfokus pada ciri visual, memudahkan pembuatan gambar AI\n3. **Ringkas dan praktis**: Hanya ekstrak aset yang bermakna aktual untuk produksi, hindari ekstraksi berlebihan\n4. **Klasifikasi akurat**: Ketat klasifikasikan sesuai role/scene/tool, jangan campur\n5. **Kualitas prompt**: Prompt bahasa Inggris harus spesifik dan dapat dieksekusi, dapat langsung digunakan untuk pembuatan gambar AI\n\n## Catatan Penting\n\n- Daftar aset **jangan mengandung konten skrip itu sendiri**, hanya ekstrak aset yang digunakan\n- Barang bawaan karakter jika memiliki fungsi plot independen, harus diekstrak secara terpisah sebagai prop\n- Furnitur tetap dalam adegan tidak perlu diekstrak terpisah sebagai prop, kecuali objek tersebut memiliki fungsi plot independen`,
          },
          {
            name: "Generasi Prompt Video",
            type: "videoPromptGeneration",
            data: `# Skill Generasi Prompt Video\n\nKamu adalah **Agent Generasi Prompt Video**, secara khusus bertanggung jawab untuk membaca informasi storyboard berdasarkan model video AI yang ditentukan, dan mengoutput prompt video dalam format yang sesuai dengan model tersebut.\n\n---\n\n## Format Input\n\n### 1. Model dan Mode (Wajib)\n\n\n#### Aturan Routing Mode\n\n| Kondisi | Mode Cocok | Keterangan |\n|------|----------|------|\n| Nama model \`Seedance2.0\` / \`seedance 2.0\` / \`Jimeng 2.0\` | **Seedance 2.0** | Mode tetap, terlepas dari flag multi-parameter |\n| Nama model \`Wan2.6\` / \`wan 2.6\` / \`Wanxiang 2.6\` | **Wan 2.6** | Mode tetap, gambar tunggal (frame pertama) + teks naratif, tanpa frame akhir |\n| Model lain apapun + \`multi-param:Ya\` | **Mode Multi-Parameter Umum** | Mendukung referensi multi-parameter karakter/adegan/gambar storyboard |\n| Model lain apapun + \`multi-param:Tidak\` | **Mode Frame Awal-Akhir Umum** | Frame pertama/frame pertama-akhir + deskripsi teks murni |\n\n> Nama model hanya untuk pencatatan, format prompt aktual ditentukan oleh mode yang cocok.Seedance 2.0 dan Wan 2.6 adalah kasus khusus di mana nama model tertentu langsung menentukan mode.\n\n### 2. Informasi Aset\n\n\`\`\`\nInformasi aset[id, type, name], [id, type, name], ...\n\`\`\`\n\n- \`id\`：资产唯一标识（如 \`A001\`）\n- \`type\`：资产类型，取值 \`character\`（角色）/ \`scene\`（Adegan）/ \`prop\`（道具）\n- \`name\`：资产名称（如 \`沈辞\`、\`城楼\`、\`长剑\`）\n\n### 3. Informasi Storyboard\n\n分镜以 \`<storyboardItem>\` XML 标签列表的形式传入，每条分镜结构如下：\n\n\`\`\`xml\n<storyboardItem\n  videoDesc='（Deskripsi visual, adegan, nama aset terkait, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, efek suara, ID aset terkait）'\n  prompt='Akan digenerate'\n  track='Grup'\n  duration='Durasi video yang direkomendasikan'\n  associateAssetsIds="[Daftar ID aset yang diperlukan storyboard ini]"\n  shouldGenerateImage="true"\n></storyboardItem>\n\`\`\`\n\n#### Penjelasan Field Input\n\n| Atribut | Keterangan | Sumber |\n|------|------|------|\n| \`videoDesc\` | **Input inti**: Deskripsi visual terstruktur storyboard，Mengandung deskripsi visual, adegan, nama aset terkait, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, efek suara, ID aset terkait | Diisi oleh pengguna/sistem hulu |\n| \`prompt\` | **Field yang sudah ada**: Prompt gambar storyboard yang dihasilkan hulu, sebagai konteks referensi pendukung, **tidak diubah** | Sudah diisi oleh sistem hulu |\n| \`track\` | Pengidentifikasi grup storyboard | Diisi oleh pengguna/sistem hulu |\n| \`duration\` | Durasi video yang direkomendasikan (detik) | Diisi oleh pengguna/sistem hulu |\n| \`associateAssetsIds\` | Daftar ID aset yang terkait dengan storyboard ini | Diisi oleh pengguna/sistem hulu |\n| \`shouldGenerateImage\` | 是否需要生成分镜图片，默认 \`true\` | Diisi oleh pengguna/sistem hulu |\n\n---\n\n## Tujuan Tugas\n\n读取所有 \`<storyboardItem>\` 的属性，结合资产信息，根据指定模型的提示词格式，将全部分镜整合为一个完整的视频提示词。\n\n---\n\n## Format Output\n\nIntegrasikan semua storyboard menjadi **satu prompt video lengkap** (bukan per item independen):\n\n| Mode | Cara Integrasi |\n|------|----------|\n| **Mode Multi-Parameter Umum** | \`[References]\` 汇总所有 \`@图N \` 引用；\`[Instruction]\` Deskripsikan narasi lengkap sesuai urutan waktu |\n| **Mode Frame Awal-Akhir Umum** | Lima dimensi teks murni（Visual / Motion / Camera / Audio / Narrative），不使用任何 \`@图N \` 引用，Susun berkelanjutan sesuai sumbu waktu（\`[Motion]\` 0s → total durasi，每段最Rendah 1 秒），Satu bidikan kontinu sepanjang waktu, tanpa potongan |\n| **Seedance 2.0** | \`Hasilkan video yang terdiri dari N storyboard berikut\`，每条对应 \`Storyboard N<duration-ms>\` 段落 |\n| **Wan 2.6** | 单图首帧模式，每次仅输入一条分镜，输出一段叙事式英文提示词（三段式：风格基调 → 主体动作+Adegan环境+光线氛围 → 镜头收尾），不使用 \`@图N \` 引用 |\n\n- Hanya output teks prompt video, jangan output tag XML, jangan tambahkan penjelasan\n\n---\n\n## Aturan Parsing videoDesc\n\n从 \`videoDesc\` 括号内按顿号分隔提取以下结构化Field：\n\n\`\`\`\n（{Deskripsi Visual}、{Adegan}、{Nama Aset Terkait}、{Durasi}、{Ukuran Bidikan}、{Gerakan Kamera}、{Aksi Karakter}、{Emosi}、{Atmosfer Cahaya-Bayangan}、{Dialog}、{Efek Suara}、{ID Aset Terkait}）\n\`\`\`\n\n| 序号 | Field | 用途 | Contoh |\n|------|------|------|------|\n| 1 | Deskripsi Visual | Batang naratif prompt | 沈辞独立城楼远眺苍茫大地 |\n| 2 | Adegan | Cocokkan aset adegan | 城楼 |\n| 3 | Nama Aset Terkait | Cocokkan aset karakter/prop | 沈辞/城楼 |\n| 4 | Durasi | Kontrol parameter durasi | 4s |\n| 5 | Ukuran Bidikan | Kontrol ukuran bidikan | 全景 |\n| 6 | Gerakan Kamera | Kontrol cara gerakan kamera | 静止 |\n| 7 | Aksi Karakter | Deskripsi aksi prompt | 负手而立衣袂随风飘扬 |\n| 8 | Emosi | Atmosfer emosi prompt | 坚定决绝 |\n| 9 | Atmosfer Cahaya-Bayangan | Deskripsi cahaya-bayangan prompt | 黄昏冷调侧逆光 |\n| 10 | Dialog | Segmen dialog/audio prompt | 无Dialog / 具体Dialog内容 |\n| 11 | Efek Suara | Deskripsi efek suara prompt | 风声衣袂声 |\n| 12 | ID Aset Terkait | Untuk pemetaan ID aset↔label karakter | A001/A002 |\n\n---\n\n## Aturan Penomoran Referensi Aset\n\n所有模型统一使用 \`@图N \` 格式引用资产dan分镜图，编号按输入顺序连续递增：\n\n1. **资产**：按资产信息Sedang \`[id, type, name]\` 的出现顺序，从 \`@图1 \` 开始编号（不区分 character / scene / prop）\n2. **分镜图**：每条 \`<storyboardItem>\` 对应一张分镜图，编号接续资产之后\n3. **跳过无分镜图的条目**：当 \`shouldGenerateImage="false"\` 时，该分镜未生成图片，**不分配**分镜图编号，后续编号顺延\n\n#### Contoh\n\nInput 3 aset + 2 storyboard:\n\`\`\`\n资产信息[A001, character, 沈辞], [A002, character, 苏锦], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem ...>  <!-- Storyboard 1 -->\n<storyboardItem ...>  <!-- Storyboard 2 -->\n\`\`\`\n\nHasil penomoran:\n\n| Item Input | Label Referensi | Keterangan |\n|--------|----------|------|\n| [A001, character, 沈辞] | \`@图1 \` | Karakter·Shen Ci Gambar referensi |\n| [A002, character, 苏锦] | \`@图2 \` | Karakter·Su Jin Gambar referensi |\n| [A003, scene, 城楼] | \`@图3 \` | Adegan·城楼 Gambar referensi |\n| storyboardItem Item ke-1 | \`@图4 \` | Gambar storyboard 1 |\n| storyboardItem Item ke-2 | \`@图5 \` | Gambar storyboard 2 |\n\n---\n\n## Aturan Pembuatan Prompt Model\n\n### 1. Mode Multi-Parameter Umum\n\n#### Prinsip Inti\n- Fusi multimodal MVL: bahasa alami + referensi gambar dalam ruang semantik yang sama\n- 分镜图序列负责动作/时间轴/构图，AdeganGambar referensi负责环境一致性\n- 所有资产dan分镜图统一用 \`@图N \` 引用\n- **Ketat mengikuti videoDesc**: Konten prompt ketat berdasarkan deskripsi visual, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, field efek suara dalam videoDesc, tidak mengarang konten tambahan\n- **Dialog tidak boleh hilang**: Storyboard dengan dialog dalam videoDesc harus mencerminkan deskripsi terkait dialog dalam Instruction\n- **Anotasi tipe dialog**: Bedakan dialog biasa (dialogue), monolog internal (inner monologue OS), voiceover (voiceover VO), anotasi dengan tanda kurung dalam Instruction\n\n#### Template Pembuatan Prompt\n\n\`\`\`\n[References]\n@图1 : [{角色A名}Gambar referensi]\n@图2 : [{角色B名}Gambar referensi]\n@图3 : [{Adegan名}Gambar referensi]\n@图4 : [Gambar storyboard 1]\n\n[Instruction]\nBased on the storyboard @图4 :\n@图1 {动作/状态描述（英文）},\n@图2 {动作/状态描述（英文）},\nset in the {Adegan描述（英文）} of @图3 ,\n{镜头/Gerakan Kamera描述（英文）},\n{Emosional基调（英文）},\n{Dialog描述（英文，含 dialogue/OS/VO 标注）/ No dialogue},\n{Efek Suara描述（英文）}.\n\`\`\`\n\n#### Batasan Pembuatan\n1. **Instruction harus dalam bahasa Inggris**\n2. **严格遵循 videoDesc**：提示词内容严格基于 videoDesc 的Deskripsi Visual、Durasi、Ukuran Bidikan、Gerakan Kamera、Aksi Karakter、Emosi、Atmosfer Cahaya-Bayangan、Dialog、Efek SuaraField，不编造额外信息\n3. **Aksi karakter** diekstrak dari field "aksi karakter" videoDesc, diterjemahkan ke deskripsi aksi bahasa Inggris yang ringkas\n4. **Dialog tidak boleh hilang**: Storyboard dengan dialog dalam videoDesc harus mencerminkan konten dialog dalam Instruction (pertahankan bahasa asli, jangan terjemahkan)\n5. **Dialog类型标注**：普通对白标注 \`(dialogue)\`；内心独白标注 \`(inner monologue, OS)\`；画外音标注 \`(voiceover, VO)\`\n6. **Gaya bidikan** gunakan label standar：\`cinematic\` / \`wide-angle\` / \`close-up\` / \`slow motion\` / \`surround shooting\` / \`handheld\`\n7. **Hubungan spasial** gunakan kata kerja standar：\`wearing\` / \`holding\` / \`standing on\` / \`following behind\` / \`sitting in\`\n8. 单条分镜对应单个 \`@图N \`，不做多帧跨镜描述\n9. 无需描述角色外观（由Gambar referensi负责）\n10. Tidak ada anotasi durasi (disimpulkan oleh model)\n11. **无分镜图时**：当 \`shouldGenerateImage="false"\` 时，该分镜无分镜图，\`[References]\` Sedang不列出该分镜图，\`[Instruction]\` Sedang不使用 \`@图N \` 引用该分镜图，改为纯文本描述画面内容\n\n#### KlingOmni 完整Contoh\n\nInput:\n\`\`\`\nModel:KlingOmni\n资产信息[A001, character, 沈辞], [A002, character, 苏锦], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem videoDesc='（沈辞独立城楼远眺苍茫大地、城楼、沈辞/城楼、4s、全景、静止、负手而立衣袂随风飘扬、坚定决绝、黄昏冷调侧逆光、无Dialog、风声衣袂声、A001/A003）' prompt='全景，平视略仰，城楼之上，沈辞负手而立，衣袂飘扬，黄昏冷调侧逆光...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n<storyboardItem videoDesc='（苏锦登上城楼走向沈辞、城楼、苏锦/沈辞/城楼、4s、Sedang景、跟踪、苏锦拾级而上走向沈辞、担忧、黄昏余晖渐暗、无Dialog、脚步声风声、A001/A002/A003）' prompt='Sedang景，跟踪，苏锦拾级而上走向城楼上的沈辞...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A002&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n\`\`\`\n\nOutput:\n\`\`\`\n[References]\n@图1 : [沈辞Gambar referensi]\n@图2 : [苏锦Gambar referensi]\n@图3 : [城楼Gambar referensi]\n@图4 : [Gambar storyboard 1]\n@图5 : [Gambar storyboard 2]\n\n[Instruction]\nBased on the storyboard from @图4 to @图5 :\n@图1 standing alone atop the city wall, hands clasped behind back, robes billowing in the wind, gazing across the vast land,\n@图2 ascending the steps toward @图1 , expression worried,\nset in the ancient city wall environment of @图3 ,\nwide shot transitioning to medium tracking shot, cinematic,\nresolute determination shifting to concerned anticipation, dusk cold-toned side-backlit atmosphere fading,\nno dialogue,\nwind howling, fabric flapping, footsteps on stone.\n\`\`\`\n\n---\n\n### 2. Mode Frame Awal-Akhir Umum\n\n#### Prinsip Inti\n- **Prompt teks murni**：提示词内**不使用任何 \`@图N \` 引用**（不引用角色资产、Adegan资产、也不引用分镜图），全部内容用纯文本描述\n- **Struktur lima dimensi**: Visual / Motion / Camera / Audio / Narrative\n- **Ketat mengikuti videoDesc**: Konten prompt ketat berdasarkan deskripsi visual, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, field efek suara dalam videoDesc, tidak mengarang konten tambahan\n- **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须在 \`[Audio]\` Sedang完整输出Dialog内容\n- **Dialog类型标注**：区分普通对白（dialogue, lip-sync active）、内心独白（inner monologue OS, silent lips）、画外音（voiceover VO, silent lips），并在 \`[Audio]\` Sedang明确标注\n- **不说话的主体标注 \`silent\`** — 防止误生口型\n- **Satu bidikan kontinu sepanjang waktu**: Satu bidikan dari awal hingga akhir, tidak ada potongan\n- **时间轴分段**：每段最Rendah 1 秒，用 \`0s-Xs\` 标注\n\n#### Template Pembuatan Prompt\n\n\`\`\`\n[Visual]\n{主体A名}: {外观简述}, {站位/姿态}, {说话状态 speaking/silent}.\n{主体B名}: {外观简述}, {站位/姿态}, {说话状态}.\n{Adegan描述}, {道具描述}.\n{视觉风格标签}.\n\n[Motion]\n0s-{X}s: {主体A名} {动作描述段1}.\n{X}s-{Y}s: {主体B名} {动作描述段2}.\n\n[Camera]\n{镜头类型}, {Gerakan Kamera方式}, {全程单一连贯镜头描述}.\n\n[Audio]\n{Xs-Ys}: "{Dialog内容}" — {说话者名} ({dialogue / inner monologue OS / voiceover VO}), {lip-sync active / silent lips}.\n{Deskripsi efek suara}.\n\n[Narrative]\n{情节点概述}, {叙事位置}.\n\`\`\`\n\n#### Batasan Pembuatan\n1. **Semua dalam bahasa Inggris**\n2. **不使用任何 \`@图N \` 引用**：提示词内不引用角色资产、Adegan资产、分镜图，全部内容用纯文本描述\n3. **Subjek dideskripsikan dengan teks**: Deskripsikan secara ringkas ciri penampilan subjek dalam [Visual] (seperti pakaian, gaya rambut, dan ciri pengenal kunci lainnya)\n4. **严格遵循 videoDesc**：提示词内容严格基于 videoDesc Sedang的Deskripsi Visual、Durasi、Ukuran Bidikan、Gerakan Kamera、Aksi Karakter、Emosi、Atmosfer Cahaya-Bayangan、Dialog、Efek SuaraField，不编造额外信息\n5. **Setiap subjek harus dianotasi status bicaranya**：\`speaking\` / \`silent\` / \`speaking simultaneously\`\n6. **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须在 \`[Audio]\` Sedang完整输出Dialog内容（保持原始语言，不翻译）\n7. **Dialog类型标注**：普通对白标注 \`dialogue, lip-sync active\`；内心独白标注 \`inner monologue (OS), silent lips\`；画外音标注 \`voiceover (VO), silent lips\`\n8. **Sumbu waktu Motion** setiap segmen minimum 1 detik, tidak melebihi total durasi\n9. **Satu bidikan kontinu sepanjang waktu**: Paragraf Camera mendeskripsikan satu bidikan dari awal hingga akhir, tidak pernah memotong\n10. **Gaya visual** merujuk pada bagian "Batasan Gaya Visual" dalam Assistant\n11. **Tipe bidikan** dipilih dari berikut：\`Wide establishing shot / Over-the-shoulder / Medium shot / Close-up / Wide shot / POV / Dutch angle / Crane up / Dolly right / Whip pan / Handheld / Slow motion\`\n\n#### Seedance 1.5 Pro 完整Contoh\n\nInput:\n\`\`\`\nModel:Seedance1.5\n资产信息[A001, character, 沈辞], [A002, character, 苏锦], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem videoDesc='（沈辞独立城楼远眺苍茫大地、城楼、沈辞/城楼、4s、全景、静止、负手而立衣袂随风飘扬、坚定决绝、黄昏冷调侧逆光、无Dialog、风声衣袂声、A001/A003）' prompt='全景，平视略仰，城楼之上，沈辞负手而立，衣袂飘扬，黄昏冷调侧逆光...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n<storyboardItem videoDesc='（苏锦登上城楼走向沈辞、城楼、苏锦/沈辞/城楼、4s、Sedang景、跟踪、苏锦拾级而上走向沈辞、担忧、黄昏余晖渐暗、无Dialog、脚步声风声、A001/A002/A003）' prompt='Sedang景，跟踪，苏锦拾级而上走向城楼上的沈辞...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A002&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n\`\`\`\n\nOutput:\n\`\`\`\n[Visual]\nShen Ci: male, dark flowing robes, hair tied up, standing alone atop city wall, hands clasped behind back, robes billowing, silent.\nSu Jin: female, light-colored dress, hair partially down, ascending steps toward Shen Ci, expression worried, silent.\nAncient city wall, vast open land beyond, dusk sky fading.\nCinematic, photorealistic, 4K, high contrast, desaturated tones, shallow depth of field.\n\n[Motion]\n0s-4s: Shen Ci stands still on city wall edge, robes flutter in wind, hair sways gently. Gaze fixed on distant horizon.\n4s-8s: Su Jin climbs the last few steps onto the wall, walks toward Shen Ci. Shen Ci remains still, unaware. Su Jin slows as she approaches.\n\n[Camera]\nWide establishing shot, static for first 4 seconds capturing the lone figure. Then smooth transition to medium tracking shot following the woman ascending steps, single continuous take throughout, no cuts.\n\n[Audio]\n0s-4s: Wind howling across wall, fabric flapping rhythmically. No dialogue.\n4s-8s: Footsteps on stone, robes rustling. No dialogue.\nShen Ci — silent. Su Jin — silent.\n\n[Narrative]\nLone figure on city wall, then arrival of a companion. Tension between determination and concern. Single continuous take.\n\`\`\`\n\n---\n\n### 3. Seedance 2.0\n\n#### Prinsip Inti\n- **结构化12维编码**：统一用 \`@图N \` 引用资产dan分镜图，Durasi \`<duration-ms>\`\n- **Deskripsi halus parameter suara 9 dimensi** (wajib diisi saat ada dialog)\n- **Kontrol durasi tingkat milidetik**: Durasi minimum storyboard tunggal 1000ms (1 detik)\n- **Prompt bahasa Mandarin**\n- **严格遵循 videoDesc**：每条分镜的描述内容严格基于 videoDesc Sedang的Deskripsi Visual、Durasi、Ukuran Bidikan、Gerakan Kamera、Aksi Karakter、Emosi、Atmosfer Cahaya-Bayangan、Dialog、Efek SuaraField生成，不编造额外内容\n- **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须完整输出Dialogdan音色描述\n- **Anotasi tipe dialog**: Bedakan dialog biasa (langsung gunakan "说："), monolog internal (gunakan "内心OS："), voiceover (gunakan "画外音VO："), dan cocokkan dengan deskripsi status gerakan mulut yang sesuai\n\n#### Template Pembuatan Prompt\n\n**Template storyboard tunggal:**\n\`\`\`\n画面风格dan类型: {风格}, {色调}, {类型}\n\nHasilkan video yang terdiri dari 1 storyboard berikut:\n\nAdegan:\nTransisi storyboard: Tidak ada\n\nStoryboard 1<duration-ms>{毫秒数}</duration-ms>: 时间：{日/夜/晨/黄昏}，Adegan图片：@图{Adegan编号} ，镜头：{Ukuran Bidikan}，{角度}，{Gerakan Kamera}，@图{角色编号} {动作/表情/视线朝向/站位描述}。{Dialog与音色描述（如有）}。{背景环境补充}。{Atmosfer Cahaya-Bayangan}。{Gerakan Kamera补充}。\n\`\`\`\n\n**Template multi-storyboard:**\n\`\`\`\n画面风格dan类型: {风格}, {色调}, {类型}\n\nHasilkan video yang terdiri dari {N} storyboard berikut:\n\nAdegan:\nTransisi storyboard: {Deskripsi transisi global}\n\nStoryboard 1<duration-ms>{毫秒数}</duration-ms>: 时间：{...}，Adegan图片：@图{Adegan编号} ，镜头：{...}，@图{角色编号} {...}。{...}。\nStoryboard 2<duration-ms>{毫秒数}</duration-ms>: ...\n...\n\`\`\`\n\n#### Aturan Pembuatan Suara (wajib diisi saat ada dialog)\n\nDialog格式：\`@图{角色编号} 说：「{Dialog内容}」音色：{9维度描述}\`\n\n9 dimensi diisi secara berurutan:\n\`\`\`\n{Jenis kelamin}, {suara usia}, {nada}, {kualitas suara}, {ketebalan suara}, {cara pengucapan}, {pernapasan}, {kecepatan bicara}, {kualitas khusus}\n\`\`\`\n\n> Ketika informasi suara tidak secara eksplisit disebutkan dalam desc, infer berdasarkan tipe karakter dari tabel referensi berikut:\n\n| Ciri Tipe Karakter | Suara Default |\n|------------|---------|\n| Karakter autoriter/dominan pria | 男声，Sedang年音色，音调Rendah沉，音色浑厚有力，声音厚重，发音标准，气息极其沉稳，语速偏慢 |\n| Karakter lembut/manis wanita | 女声，青年音色，音调Sedang等偏Tinggi，音色质感明亮清脆，声音清亮柔dan，气息充沛平稳，带温婉真诚感 |\n| Karakter muda/biasa pria | 男声，青年音色，音调Sedang等，音色干净，声音厚度适Sedang，发音清晰，气息平稳，语速适Sedang |\n| Karakter ceria/ekstrovert wanita | 女声，青年音色，音调偏Tinggi，音色清脆活泼，声音轻盈，气息充沛，语速偏快，带笑意dan感染力 |\n| Karakter antagonis/dingin | 男声，Sedang年音色，音调Rendah沉，音色质感干燥偏暗，声音带沙砾感，气息平稳，语速极慢，有威胁感 |\n\n#### Penanganan Storyboard Tanpa Dialog\n- 不写 \`说：\` dan音色段落\n- 在动作描述后标注 \`无Dialog\`\n\n#### Format Tipe Dialog\n\n| Tipe Dialog | Format | Deskripsi Gerakan Mulut |\n|----------|------|----------|\n| 普通对白 | \`@图{角色编号} 说：「{Dialog}」音色：{9维度}\` | 角色嘴部开合说话 |\n| 内心独白 | \`@图{角色编号} 内心OS：「{Dialog}」音色：{9维度}\` | 角色嘴部紧闭不动 |\n| 画外音 | \`@图{角色编号} 画外音VO：「{Dialog}」音色：{9维度}\` | 角色嘴部紧闭不动（或角色不在画面Sedang） |\n\n#### Batasan Pembuatan\n1. **Sedang文提示词**\n2. **Ketat mengikuti videoDesc**: Konten setiap storyboard ketat berdasarkan deskripsi visual, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, field efek suara dalam videoDesc, tidak mengarang informasi tambahan\n3. **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须完整输出Dialogdan音色\n4. **Anotasi tipe dialog yang benar**: Dialog biasa gunakan "说：", monolog internal gunakan "内心OS：", voiceover gunakan "画外音VO："\n5. **Durasi minimum storyboard tunggal 1000ms (1 detik)**\n6. **Durasi单位**：将 videoDesc Sedang的秒 × 1000 转为毫秒填入 \`<duration-ms>\`\n\n#### Seedance 2.0 完整Contoh\n\nInput:\n\`\`\`\nModel:Seedance2.0\n资产信息[A001, character, 沈辞], [A002, character, 苏锦], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem videoDesc='（沈辞独立城楼远眺苍茫大地、城楼、沈辞/城楼、4s、全景、静止、负手而立衣袂随风飘扬、坚定决绝、黄昏冷调侧逆光、无Dialog、风声衣袂声、A001/A003）' prompt='全景，平视略仰，城楼之上，沈辞负手而立，衣袂飘扬，黄昏冷调侧逆光...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n<storyboardItem videoDesc='（苏锦登上城楼走向沈辞、城楼、苏锦/沈辞/城楼、4s、Sedang景、跟踪、苏锦拾级而上走向沈辞、担忧、黄昏余晖渐暗、苏锦说：你又一个人在这里、脚步声风声、A001/A002/A003）' prompt='Sedang景，跟踪，苏锦拾级而上走向城楼上的沈辞...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A002&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n\`\`\`\n\nOutput:\n\`\`\`\n画面风格dan类型: 真人写实, 电影风格, 冷调, 古风\n\n生成一个由以下 2 个分镜组成的视频:\n\nAdegan:\n分镜过渡: Transisi bidikan halus，从全景过渡到Sedang景跟踪，焦点从沈辞独处转向苏锦到来。\n\nStoryboard 1<duration-ms>4000</duration-ms>: 时间：黄昏，Adegan图片：@图3 ，镜头：全景，平视略仰，静止镜头，@图1 独立城楼之上，负手而立，衣袂随风飘扬，目光远眺苍茫大地，神情肃然面容沉着，眼神坚定目光清冽，眉眼沉静气质凛然。无Dialog。背景是古城楼砖石纹理清晰，远方大地苍茫辽阔，天际线冷暖交替。黄昏斜射余晖侧逆光，冷调为主，长影拉伸，轮廓光微勾勒人物边缘，光感诗意。Bidikan diam。\n\nStoryboard 2<duration-ms>4000</duration-ms>: 时间：黄昏，Adegan图片：@图3 ，镜头：Sedang景，平视，Pengambilan tracking，@图2 拾级而上，走向城楼上的@图1 ，面部朝向@图1 方向，神情微愣面色微变，眼神Sedang带着担忧，@图2 说：「你又一个人在这里。」音色：女声，青年音色，音调Sedang等偏Tinggi，音色质感明亮清脆，声音清亮柔dan，发音方式干净，气息充沛平稳，语速适Sedang，带温婉真诚感。背景城楼台阶纹理清晰，余晖渐暗，天际线冷暖交替加深。镜头跟踪苏锦移动。\n\`\`\`\n\n---\n\n### 4. Wan 2.6\n\n#### Prinsip Inti\n- **Mode gambar tunggal frame pertama**: Diklasifikasikan sebagai mode frame awal-akhir, tetapi hanya ada frame pertama (gambar storyboard), tanpa frame akhir\n- **单条分镜输入/输出**：每次仅输入一条 \`<storyboardItem>\` 及其关联资产信息，输出也仅为一段完整的叙事式提示词\n- **叙事式英文提示词**：像写小说一样描写画面，不使用标签罗列（不写 \`4K, cinematic, high quality\` 这类堆砌）\n- **Struktur tiga bagian**: Nada gaya → Aksi subjek + Lingkungan adegan + Atmosfer cahaya → Penutup bidikan\n- **Prompt teks murni**：提示词内**不使用任何 \`@图N \` 引用**，全部内容用纯文本描述\n- **Ketat mengikuti videoDesc**: Konten prompt ketat berdasarkan deskripsi visual, durasi, ukuran bidikan, gerakan kamera, aksi karakter, emosi, atmosfer cahaya-bayangan, dialog, field efek suara dalam videoDesc, tidak mengarang konten tambahan\n- **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须在提示词Sedang体现Dialog相关描述\n- **Dialog类型标注**：区分普通对白（dialogue）、内心独白（inner monologue OS）、画外音（voiceover VO），在提示词Sedang用括号标注\n\n#### Template Pembuatan Prompt\n\nSetiap kali input satu storyboard, output satu prompt lengkap (tanpa awalan nomor), format sebagai berikut:\n\n\`\`\`\n{Nada gaya satu kalifikasi kalimat},\n{Nama subjek} {Ringkasan penampilan}, {Deskripsi aksi/sikap spesifik}, {Emosi/ekspresi diimplikasikan melalui aksi}.\n{Subjek latar adegan}, {Objek lingkungan spesifik}, {Ruang}, {Waktu/cuaca}.\n{Arah cahaya/suhu warna} {Deskripsi tekstur}, {Emosi diimplikasikan cahaya-bayangan}.\n{Deskripsi dialog (jika ada, termasuk anotasi dialogue/OS/VO) / No dialogue}.\n{Deskripsi efek suara}.\n{Cara pengambilan}, {Ukuran bidikan}, {Sudut pandang}, {Cara gerakan kamera}.\n\`\`\`\n\n#### Poin Penulisan Naratif\n\n| Prinsip | Keterangan | Contoh |\n|------|------|------|\n| Nada gaya diletakkan paling depan | Satu kalimat kualifikasi suasana keseluruhan | \`A cinematic epic scene\` / \`A melancholic cinematic scene\` |\n| Subjek + aksi terikat erat | Langsung diikuti aksi setelah subjek, detail penampilan tertanam dalam deskripsi subjek | \`A young man in dark flowing robes stands alone atop the city wall, hands clasped behind back\` |\n| Emosi diimplikasikan melalui aksi | Jangan langsung menyatakan "Dia sedih" | ❌ \`He is sad.\` → ✅ \`head drops slowly, shoulders slumped\` |\n| Lingkungan terintegrasi ke dalam narasi | Jangan daftar atribut lingkungan | ❌ \`The sky is blue. The grass is green.\` → ✅ \`hazy blue sky stretches over the emerald valley\` |\n| Cahaya menjadi kalimat tersendiri | Arah cahaya + suhu warna + tekstur + emosi | \`Warm golden hour light streams from behind, casting long shadows across the stone floor\` |\n| Bahasa bidikan menutup | Satu kalimat kunci | \`Captured in a wide establishing shot from a low-angle perspective, static camera\` |\n| Dilarang menumpuk label | 不写 \`4K, cinematic, high quality\` | \`cinematic\` 融入风格基调即可 |\n\n#### Batasan Pembuatan\n1. **Semua dalam bahasa Inggris**\n2. **不使用任何 \`@图N \` 引用**：提示词内不引用角色资产、Adegan资产、分镜图，全部内容用纯文本描述\n3. **叙事式描写**：像写小说一样构建画面，禁止标签罗列dan配置清单式写法\n4. **主体用文字描述**：简要描述主体外观特征（如服饰、发型等关键辨识特征），嵌入主体描述Sedang\n5. **严格遵循 videoDesc**：提示词内容严格基于 videoDesc Sedang的Deskripsi Visual、Durasi、Ukuran Bidikan、Gerakan Kamera、Aksi Karakter、Emosi、Atmosfer Cahaya-Bayangan、Dialog、Efek SuaraField，不编造额外信息\n6. **Dialog不可缺失**：videoDesc Sedang有Dialog的分镜，必须在提示词Sedang完整输出Dialog内容（保持原始语言，不翻译）\n7. **Dialog类型标注**：普通对白标注 \`(dialogue)\`；内心独白标注 \`(inner monologue, OS)\`；画外音标注 \`(voiceover, VO)\`\n8. **Input/output tunggal**: Setiap kali hanya memproses satu storyboard, output satu prompt, tanpa awalan nomor\n9. **Tidak perlu anotasi durasi**: Durasi dikontrol oleh sisi model, tidak menulis parameter durasi dalam prompt\n10. **Deskripsi bidikan terintegrasi ke dalam narasi**: Jangan gunakan label kurung siku, gunakan kalimat lengkap untuk mendeskripsikan bidikan\n11. **视觉风格**参考 Assistant Sedang的「视觉风格约束」部分内容\n\n#### Wan 2.6 完整Contoh\n\n**Contoh1：无Dialog分镜**\n\nInput:\n\`\`\`\nModel:Wan2.6\n资产信息[A001, character, 沈辞], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem videoDesc='（沈辞独立城楼远眺苍茫大地、城楼、沈辞/城楼、4s、全景、静止、负手而立衣袂随风飘扬、坚定决绝、黄昏冷调侧逆光、无Dialog、风声衣袂声、A001/A003）' prompt='全景，平视略仰，城楼之上，沈辞负手而立，衣袂飘扬，黄昏冷调侧逆光...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n\`\`\`\n\nOutput:\n\`\`\`\nA cinematic epic scene with a cold, desaturated palette,\nA lone man in dark flowing robes stands atop an ancient city wall, hands clasped behind his back, robes and hair billowing in the wind, gaze fixed on the vast land stretching to the horizon, jaw set firm, eyes unwavering.\nThe weathered stone battlements frame the endless expanse below, rolling terrain fading into haze beneath a heavy dusk sky, clouds layered in muted golds and slate greys.\nCold side-backlight from the setting sun carves a sharp silhouette, long shadows stretching across the stone floor, a faint warm rim outlining the figure against the cool atmosphere.\nNo dialogue.\nWind howling across the open wall, fabric flapping rhythmically.\nCaptured in a wide establishing shot from a slightly low angle, static camera, single continuous take.\n\`\`\`\n\n**Contoh2：有Dialog分镜**\n\nInput:\n\`\`\`\nModel:Wan2.6\n资产信息[A001, character, 沈辞], [A002, character, 苏锦], [A003, scene, 城楼]\n\`\`\`\n\`\`\`xml\n<storyboardItem videoDesc='（苏锦登上城楼走向沈辞、城楼、苏锦/沈辞/城楼、4s、Sedang景、跟踪、苏锦拾级而上走向沈辞、担忧、黄昏余晖渐暗、苏锦说：你又一个人在这里、脚步声风声、A001/A002/A003）' prompt='Sedang景，跟踪，苏锦拾级而上走向城楼上的沈辞...' track='main' duration='4' associateAssetsIds="[&quot;A001&quot;,&quot;A002&quot;,&quot;A003&quot;]" shouldGenerateImage="true" ></storyboardItem>\n\`\`\`\n\nOutput:\n\`\`\`\nA melancholic cinematic scene, dusk tones deepening,\nA young woman in a light-colored dress ascends the final stone steps onto the city wall, her gaze locked on the lone figure ahead, brow slightly furrowed, pace slowing as she approaches, lips parting softly.\nThe ancient city wall stretches behind her, weathered stairs leading up from below, the distant skyline dimming as the last traces of golden hour fade into twilight.\nFading warm light mingles with rising cool blue tones, the contrast between the two figures softened by the diffused remnants of sunset.\n"你又一个人在这里。" — Su Jin (dialogue).\nFootsteps on stone, wind sweeping across the battlements, fabric rustling.\nA medium tracking shot follows the woman from behind as she ascends and approaches, handheld camera with subtle movement, single continuous take.\n\`\`\`\n\n---\n\n## Pemetaan Ukuran Bidikan → Label Bidikan\n\n| Ukuran bidikan dalam videoDesc | KlingOmni（Label bahasa Inggris） | Seedance 1.5（Label bahasa Inggris） | Seedance 2.0（Sedang文描述） | Wan 2.6（Naratif bahasa Inggris） |\n|------|------|------|------|------|\n| 远景 | extreme wide shot | Extreme wide shot | 远景 | an extreme wide shot capturing the vast expanse |\n| 全景 | wide shot | Wide establishing shot | 全景 | a wide establishing shot |\n| Sedang景 | medium shot | Medium shot | Sedang景 | a medium shot |\n| 近景 | close-up | Close-up | 近景 | a close-up shot |\n| 特写 | close-up | Close-up | 特写 | a close-up capturing fine detail |\n| 大特写 | extreme close-up | Extreme close-up | 大特写 | an extreme close-up |\n\n## Pemetaan Gerakan Kamera → Label Bidikan\n\n| Gerakan kamera dalam videoDesc | KlingOmni（Label bahasa Inggris） | Seedance 1.5（Label bahasa Inggris） | Seedance 2.0（Sedang文描述） | Wan 2.6（Naratif bahasa Inggris） |\n|------|------|------|------|------|\n| 静止 | static camera | Static, no camera movement | Bidikan diam | static camera, locked off |\n| 推进 | dolly in / push in | Slow dolly forward | Bidikan perlahan mendorong maju | camera slowly pushing in |\n| 拉远 | dolly out / pull back | Slow dolly backward pull | Bidikan perlahan menarik mundur | camera gently pulling back |\n| 跟踪 | tracking shot | Tracking shot, handheld | Pengambilan tracking | tracking shot following the subject |\n| 摇镜 | pan left/right | Slow pan | Bidikan perlahan bergeser | smooth pan across the scene |\n| 甩镜 | whip pan | Whip pan | Bidikan cepat berpindah | whip pan |\n| 升降 | crane up/down | Crane up/down | Bidikan naik turun | crane rising / descending |\n| 环绕 | surround shooting | Orbiting shot | Pengambilan mengorbit | orbiting around the subject |\n\n---\n\n## Alur Eksekusi\n\n1. **解析输入**：提取模型名dan多参标志，按路由规则匹配模式；提取资产列表\n2. **构建 @图N 编号表**：资产按输入顺序从 \`@图1 \` 起编号，分镜图接续编号；\`shouldGenerateImage="false"\` 的分镜不分配分镜图编号\n3. **逐条解析 \`<storyboardItem>\`**：按 videoDesc 解析规则提取12个Field，结合 \`duration\`、\`associateAssetsIds\` 建立标签映射\n4. **Integrasikan menjadi satu prompt video lengkap**: Susun semua storyboard sesuai format model target\n5. **Output prompt video**\n\n---\n\n## Batasan\n\n- **仅输出视频提示词**：不附加任何解释、注释或额外说明，只输出视频提示词文本\n- **严格遵循 videoDesc**（全模式通用）：提示词内容严格基于 videoDesc Sedang的Deskripsi Visual、Durasi、Ukuran Bidikan、Gerakan Kamera、Aksi Karakter、Emosi、Atmosfer Cahaya-Bayangan、Dialog、Efek SuaraField生成，不编造额外内容\n- **Dialog不可缺失**（全模式通用）：videoDesc Sedang有Dialog的分镜，必须在提示词Sedang完整体现Dialog内容，不得遗漏\n- **Dialog pertahankan input asli** (berlaku untuk semua mode): Konten dialog dilarang keras diterjemahkan, harus dipertahankan dalam bahasa asli dalam videoDesc sebagaimana adanya\n- **Anotasi tipe dialog** (berlaku untuk semua mode): Harus membedakan dialog biasa (dialogue / 说), monolog internal (OS / 内心OS), voiceover (VO / 画外音VO), dan anotasi dengan benar dalam prompt\n- **时间跨度最Rendah 1 秒**（全模式通用）：所有模式Sedang涉及时间分段（Motion 时间轴 / duration-ms）的最小粒度为 1 秒（1000ms），禁止出现 0.5 秒等Rendah于 1 秒的间隔\n- **Gaya visual**: Deskripsi terkait gaya merujuk pada bagian "Batasan Gaya Visual" dalam Assistant, tidak mendefinisikan gaya secara mandiri dalam Skill ini\n- **Ketat sesuai format mode yang cocok**, jangan campur format mode yang berbeda\n- **不修改原始输入**：不改写 \`<storyboardItem>\` 的任何Field；\`prompt\` 已有的分镜图提示词仅作画面参考\n- **不编造资产或Dialog**：只使用输入Sedang的资产信息；无Dialog则标注「无Dialog」/ \`No dialogue\`\n- **Durasi单位转换**：Seedance 2.0 的 \`<duration-ms>\` 需将秒 × 1000 转为毫秒\n`,
          },
          {
            name: "Pengikatan Suara",
            type: "audioBindPrompt",
            data: `Kamu adalah asisten pencocokan suara.\n你的任务是：根据给定角色资产的名称与描述，从候选音频列表Sedang选出最合适的音色。\nAturan pencocokan:\n1. Prioritaskan pencocokan semantik berdasarkan karakteristik jenis kelamin, usia, kepribadian karakter dengan deskripsi suara;\n2. Satu karakter hanya dapat dicocokkan dengan satu suara;\n3. 若候选列表Sedang没有合适的音色，则无需返回 audioId；`,
          },
        ]);
      },
    },
    //Tabel prompt binding model
    {
      name: "o_modelPrompt",
      builder: (table) => {
        table.integer("id").notNullable();
        table.string("vendorId");
        table.string("model");
        table.text("fileName");
        table.text("path");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {},
    },
    //Tabel teks asli novel
    {
      name: "o_novel",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("chapterIndex");
        table.text("reel");
        table.text("chapter");
        table.text("chapterData");
        table.integer("projectId");
        table.integer("eventState");
        table.text("event");
        table.text("errorReason");
        table.integer("createTime");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Tabel event novel
    {
      name: "o_event",
      builder: (table) => {
        table.integer("id").notNullable();
        table.string("name");
        table.string("detail");
        table.integer("createTime");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Tabel Event-Bab
    {
      name: "o_eventChapter",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("eventId").unsigned().references("id").inTable("o_event");
        table.integer("novelId").unsigned().references("id").inTable("o_novel");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Skrip
    {
      name: "o_script",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("name");
        table.text("content");
        table.integer("projectId");
        table.integer("extractState");
        table.integer("createTime");
        table.text("errorReason");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Tabel aset
    {
      name: "o_assets",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("name");
        table.text("prompt");
        table.text("remark");
        table.text("type");
        table.text("describe");
        table.integer("scriptId"); //Skripid
        table.integer("imageId").unsigned().references("id").inTable("o_image");
        table.integer("assetsId");
        table.integer("projectId");
        table.integer("flowId"); //ID alur kerja
        table.integer("startTime");
        table.string("promptState");
        table.integer("audioBindState");
        table.text("promptErrorReason");
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {},
    },
    //Tabel gambar yang dihasilkan
    {
      name: "o_image",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("filePath");
        table.text("type");
        table.integer("assetsId");
        table.text("model");
        table.text("resolution");
        table.text("state");
        table.text("errorReason");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Storyboard
    {
      name: "o_storyboard",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("scriptId");
        table.text("prompt");
        table.text("filePath");
        table.text("duration");
        table.text("state");
        table.integer("trackId");
        table.text("reason");
        table.text("track");
        table.text("videoDesc");
        table.integer("shouldGenerateImage"); // 0 Tidak  1 Ya
        table.integer("projectId");
        table.integer("flowId"); //ID alur kerja
        table.integer("index");
        table.integer("createTime");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //flowData-Skrip
    {
      name: "o_agentWorkData",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("projectId");
        table.integer("episodesId");
        table.string("key"); //Indeks lain pengguna
        table.string("data");
        table.integer("createTime");
        table.integer("updateTime");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Video
    {
      name: "o_video",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("filePath");
        table.text("errorReason");
        table.integer("time");
        table.text("state");
        table.integer("scriptId");
        table.integer("projectId");
        table.integer("videoTrackId");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    // Trek video
    {
      name: "o_videoTrack",
      builder: (table) => {
        table.integer("id").notNullable();
        table.integer("videoId");
        table.integer("projectId");
        table.integer("scriptId");
        table.text("state");
        table.text("reason");
        table.text("prompt");
        table.integer("selectVideoId");
        table.integer("duration");
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    //Tabel konfigurasi vendor
    {
      name: "o_vendorConfig",
      builder: (table) => {
        table.string("id").notNullable();
        table.text("inputValues"); // Nilai item input JSON
        table.text("models"); // Konfigurasi model JSON
        table.integer("enable"); //Apakah vendor diaktifkan
        table.primary(["id"]);
        table.unique(["id"]);
      },
      initData: async (knex) => {
        await knex("o_vendorConfig").insert([
          {
            id: "toonflow",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "deepseek",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "atlascloud",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "volcengine",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "minimax",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "openai",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "klingai",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
          {
            id: "vidu",
            inputValues: "{}",
            models: "[]",
            enable: 0,
          },
        ]);
      },
    },
    //Tabel alur kerja gambar
    {
      name: "o_imageFlow",
      builder: (table) => {
        table.integer("id").notNullable();
        table.text("flowData").notNullable();
        table.primary(["id"]);
        table.unique(["id"]);
      },
    },
    {
      name: "o_assets2Storyboard",
      builder: (table) => {
        table.integer("storyboardId").notNullable();
        table.integer("assetId").notNullable();
        table.primary(["storyboardId", "assetId"]);
        table.unique(["storyboardId", "assetId"]);
      },
    },
    {
      name: "o_scriptAssets",
      builder: (table) => {
        table.integer("scriptId").notNullable();
        table.integer("assetId").notNullable();
        table.primary(["scriptId", "assetId"]);
        table.unique(["scriptId", "assetId"]);
      },
    },
    {
      name: "o_skillList",
      builder: (table) => {
        table.text("id").notNullable();
        table.text("md5").notNullable();
        table.text("path").notNullable();
        table.text("name").notNullable(); //Nama file
        table.text("description").notNullable(); //Deskripsi
        table.text("embedding"); // Embedding vektor JSON
        table.text("type").notNullable(); // "main" | "references"
        table.integer("createTime").notNullable();
        table.integer("updateTime").notNullable();
        table.integer("state").notNullable(); // 1 Normal, 0 Sedang menghasilkan deskripsi, -1 Deskripsi kosong. -2 Atribusi kosong, -3 Perubahan md5, -4 File tidak ada
        table.primary(["id"]);
      },
      initData: async (knex) => {
        const list = [
          {
            id: "4fb36012e56e395b425569987f5dab0e",
            md5: "fca3c269c5f325a65dafa663c9bb9773",
            path: "production_agent_decision.md",
            name: "production_agent_decision",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "017b6338d7aa227cd614ec1fb25fd83e",
            md5: "2610b80abe4bd048fe61c73adc7388ac",
            path: "production_agent_execution.md",
            name: "production_agent_execution",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "f03c8e67b61580de9ea5b9d166521b67",
            md5: "d41d8cd98f00b204e9800998ecf8427e",
            path: "production_agent_supervision.md",
            name: "production_agent_supervision",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "50b49d8af5d364665b463c23f6a4d8bb",
            md5: "fbba66e0df2426996277b299710c3033",
            path: "script_agent_decision.md",
            name: "script_agent_decision",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "427727727e1095c54b6840cd21382d82",
            md5: "7e5911242af7233854d533278c6a8ccb",
            path: "script_agent_execution.md",
            name: "script_agent_execution",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "02848fb0dd582fd926502c77ecf9679c",
            md5: "7a8b6a311b015cd47bf17cc52b935348",
            path: "script_agent_supervision.md",
            name: "script_agent_supervision",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "a1e818cc03a0b355b239ac1fb0512969",
            md5: "1fd22029e8047aa30b0dfd703cb837ed",
            path: "universal_agent.md",
            name: "universal_agent",
            description: "",
            embedding: "",
            type: "main",
            createTime: 1774447310118,
            updateTime: 1774447310118,
            state: -1,
          },
          {
            id: "3e5efec258c8d8e6a39bcef12f8ee058",
            md5: "efccb0464cfd472861b49ebf737d4820",
            path: "references/event_extract.md",
            name: "event_extract",
            description:
              "Asisten analisis teks yang dirancang khusus untuk adaptasi novel ke drama pendek, mengekstrak informasi terstruktur per bab termasuk karakter terlibat, event inti, hubungan alur utama, kepadatan informasi, perkiraan durasi, dan intensitas emosi, output dalam format tabel Markdown dilengkapi statistik ringkasan, mendukung perencanaan konten dan estimasi durasi produksi drama pendek.",
            embedding: "",
            type: "references",
            createTime: 1774447310118,
            updateTime: 1774450165911,
            state: 1,
          },
          {
            id: "52c51fa8655f899a1b7aae9b6aad7251",
            md5: "783678aaab829b34e7c30a414c356bf6",
            path: "references/novel_character_extract.md",
            name: "novel_character_extract",
            description:
              "Asisten ekstraksi karakter yang dirancang khusus untuk analisis konten novel, mengidentifikasi dan mengoutput secara terstruktur informasi deskripsi visual semua karakter penting dari teks asli, termasuk field penampilan, pakaian, postur, varian status, untuk produksi seni dan pembuatan gambar karakter AI.",
            embedding: "",
            type: "references",
            createTime: 1774447310118,
            updateTime: 1774450080903,
            state: 1,
          },
          {
            id: "6d46cdca10b2f49e07e515885d1387a0",
            md5: "10544d12c4ef011e6b3b63a99b8c7fa8",
            path: "references/novel_props_extract.md",
            name: "novel_props_extract",
            description:
              "Asisten analisis yang berfokus pada ekstraksi informasi prop dari teks asli novel, dapat mengidentifikasi berbagai jenis prop seperti senjata, artefak, obat, menghasilkan tabel deskripsi visual terstruktur yang mengandung penampilan, material, ukuran, fungsi, dan varian status, untuk produksi seni dan gambar AI.",
            embedding: "",
            type: "references",
            createTime: 1774447310118,
            updateTime: 1774450094771,
            state: 1,
          },
          {
            id: "1864df75d1d65f76e275046649ecaef8",
            md5: "65603aa495a541f54c55b7f30e149f45",
            path: "references/novel_scene_extract.md",
            name: "novel_scene_extract",
            description:
              "Asisten analisis yang berfokus pada ekstraksi dan penstrukturan informasi adegan dari teks asli novel, dapat mengidentifikasi berbagai lokasi adegan, mengoutput tabel aset adegan terstandarisasi yang mengandung field deskripsi ruang, atmosfer pencahayaan, furnitur kunci, nada warna, untuk produksi seni dan pembuatan gambar konsep adegan AI.",
            embedding: "",
            type: "references",
            createTime: 1774447310118,
            updateTime: 1774450161878,
            state: 1,
          },
          {
            id: "7fbce6f90d7d85496ba9817e9622e640",
            md5: "830559e8f2cd5d0fa8e6df48a164fe2d",
            path: "references/video_dialogue_extract.md",
            name: "video_dialogue_extract",
            description:
              "Dokumen konfigurasi asisten AI yang secara khusus mengekstrak informasi dialog, narasi, dan efek suara terstruktur dari prompt storyboard video, mendefinisikan format output lengkap (termasuk field nomor bidikan, karakter, tipe dialog, arahan akting), aturan ekstraksi, dan alur pemrosesan, untuk mengkonversi deskripsi storyboard video menjadi tabel dialog terstandarisasi.",
            embedding: "",
            type: "references",
            createTime: 1774447310118,
            updateTime: 1774450180712,
            state: 1,
          },
          {
            id: "31fb5c5a1f514ec1e66b4eba9f22d4db",
            md5: "43e63450efe0c9af8a3a40b036d36cb4",
            path: "references/pipeline.md",
            name: "pipeline",
            description:
              "Dokumen penjelasan pipeline empat tahap untuk proyek adaptasi drama pendek，mencakup alur eksekusi serial ekstraksi event, kerangka cerita, strategi adaptasi, penulisan skrip，mendefinisikan norma kolaborasi lapisan keputusan, lapisan eksekusi, lapisan pengawasan, serta format interaksi dispatch, review, perbaikan, dan standar pengendalian kualitas.",
            embedding: "",
            type: "references",
            createTime: 1774451946248,
            updateTime: 1774451984533,
            state: 1,
          },
          {
            id: "27dc2dfc901de2180227d0269217583a",
            md5: "7d353be4bab7a794436d9abff2b9c6ee",
            path: "references/adaptation_format.md",
            name: "adaptation_format",
            description:
              "Dokumen ini menetapkan format standar output strategi adaptasi, termasuk norma penulisan tiga modul utama: prinsip adaptasi inti, keputusan penghapusan, dan strategi penyajian worldbuilding, menjelaskan dimensi dan elemen yang perlu dicakup oleh setiap modul, untuk memandu pekerjaan adaptasi sastra ke media seperti drama pendek vertikal.",
            embedding: "",
            type: "references",
            createTime: 1774452010535,
            updateTime: 1774452022083,
            state: 1,
          },
          {
            id: "d49fa09504fe784a8e6eb102756c6d56",
            md5: "2ef08a7479f29d74986999ceb02092c8",
            path: "references/event_format.md",
            name: "event_format",
            description:
              "Dokumen ini menetapkan format output standar tabel event dalam proyek adaptasi film-TV, termasuk header file, tabel event, spesifikasi pengisian field (bab, karakter, event inti, hubungan alur utama, intensitas emosi, perkiraan durasi), dan template statistik ringkasan，untuk memandu pekerjaan tahap pertama mengekstrak event dari karya asli dan mengevaluasi jumlah episode adaptasi dan rasio kompresi.",
            embedding: "",
            type: "references",
            createTime: 1774452010535,
            updateTime: 1774452030858,
            state: 1,
          },
          {
            id: "797906c2ddf0750f050bcdeae23eae3d",
            md5: "f5e7fe6db7e05db69d5dc327c4c538f2",
            path: "references/script_format.md",
            name: "script_format",
            description:
              "Dokumen ini adalah spesifikasi format output skrip drama pendek vertikal, mendefinisikan persyaratan format standar termasuk header file, struktur beat, skrip storyboard, deskripsi visual, dialog, anotasi transisi, dilengkapi parameter kontrol durasi dan daftar periksa mandiri, untuk pembuatan video AI dan produksi sutradara.",
            embedding: "",
            type: "references",
            createTime: 1774452010535,
            updateTime: 1774452042934,
            state: 1,
          },
          {
            id: "1abd8675c0c3e62b20c0b151d2ec0fb1",
            md5: "a587532c737ce15022e1522021f099bb",
            path: "references/skeleton_format.md",
            name: "skeleton_format",
            description:
              "Dokumen ini mendefinisikan format output terstandarisasi file kerangka cerita (skeleton.md)，mencakup inti cerita, alur tersembunyi pertumbuhan karakter, struktur tiga babak, template keputusan per episode, catatan penghapusan global, desain titik kunci berbayar, dan daftar periksa mandiri, untuk memandu penulis skrip mengkonversi daftar event bab menjadi skema adaptasi serial yang utuh strukturnya.",
            embedding: "",
            type: "references",
            createTime: 1774452010535,
            updateTime: 1774452057184,
            state: 1,
          },
          {
            id: "0b7828d7a6ab458a4b201122f08d6c16",
            md5: "120b3c856f1b2a8a429e11319e8c95fe",
            path: "references/quality_criteria.md",
            name: "quality_criteria",
            description:
              "Dokumen ini adalah manual standar audit kualitas untuk proyek film-TV/drama pendek, mencakup aturan audit detail empat modul utama: tabel event, kerangka cerita, strategi adaptasi, dan skrip, menetapkan persyaratan audit seperti norma format, unifikasi nama karakter, kewajaran durasi, keeksekusian visual, dan konsistensi atmosfer adegan，untuk memastikan keakuratan konten dan kelayakan produksi output di setiap tahap.",
            embedding: "",
            type: "references",
            createTime: 1774452068093,
            updateTime: 1774452087877,
            state: 1,
          },
          {
            id: "5c1772b5f9c420d9eae9ca02914ba087",
            md5: "c710ab7d237e1f0c5aa3d208e0f5b484",
            path: "references/plan.md",
            name: "plan",
            description:
              "Dokumen ini mendefinisikan spesifikasi pembuatan rencana eksekusi agen AI, termasuk ikhtisar tugas, daftar langkah (berisi nomor, nama, konten detail, output yang diharapkan, dan ketergantungan), dan anotasi urutan eksekusi，dan menyediakan template balasan standar，untuk mengurai kebutuhan pengguna menjadi langkah konkret yang dapat langsung dimasukkan ke tool sub-agen untuk dieksekusi.",
            embedding: "",
            type: "references",
            createTime: 1774452098447,
            updateTime: 1774452109574,
            state: 1,
          },
          {
            id: "75a45cf996015ca819582873887ec301",
            md5: "6045d76873fd58b8b87a914a21a38439",
            path: "references/derive_assets_extraction.md",
            name: "derive_assets_extraction",
            description:
              "Dokumen ini adalah panduan operasi teknis, menjelaskan cara mengekstrak berbagai varian status visual setiap aset yang muncul dalam plot berdasarkan konten skrip dan daftar aset yang ada, serta membaca dan menulis data melalui fungsi tool，untuk referensi pembuatan gambar selanjutnya.",
            embedding: "",
            type: "references",
            createTime: 1774452119499,
            updateTime: 1774452129516,
            state: 1,
          },
          {
            id: "fce75f69d704c19bebcb356bc1bd6e81",
            md5: "a3b3432854970f22949ba47236a6532f",
            path: "references/storyboard_generation.md",
            name: "storyboard_generation",
            description:
              "Panduan tool untuk menghasilkan panel storyboard terstruktur berdasarkan skrip dan daftar aset, mencakup prinsip pemisahan storyboard, spesifikasi pengisian field, dan alur pemanggilan tool, untuk mengkonversi skrip menjadi data storyboard yang mengandung deskripsi visual, bahasa bidikan, dialog, dan prompt gambar AI.",
            embedding: "",
            type: "references",
            createTime: 1774452119499,
            updateTime: 1774452140873,
            state: 1,
          },
        ];
        await Promise.all(
          list.map(async (item) => {
            const embedding = await getEmbedding(item.description);
            item.embedding = JSON.stringify(embedding);
          }),
        );
        await knex("o_skillList").insert(list);
      },
    },
    {
      name: "o_skillAttribution",
      builder: (table) => {
        table.text("skillId").notNullable().references("id").inTable("o_skillList").onDelete("CASCADE");
        table.text("attribution").notNullable(); // "production_agent_decision.md" | "production_agent_execution.md" | "production_agent_supervision.md" | "script_agent_decision.md" | "script_agent_execution.md" | "script_agent_supervision.md" | "universal_agent.md"
        table.primary(["skillId", "attribution"]);
        table.index(["attribution"]);
      },
      initData: async (knex) => {
        await knex("o_skillAttribution").insert([
          {
            skillId: "52c51fa8655f899a1b7aae9b6aad7251",
            attribution: "universal_agent.md",
          },
          {
            skillId: "6d46cdca10b2f49e07e515885d1387a0",
            attribution: "universal_agent.md",
          },
          {
            skillId: "1864df75d1d65f76e275046649ecaef8",
            attribution: "universal_agent.md",
          },
          {
            skillId: "3e5efec258c8d8e6a39bcef12f8ee058",
            attribution: "universal_agent.md",
          },
          {
            skillId: "7fbce6f90d7d85496ba9817e9622e640",
            attribution: "universal_agent.md",
          },
          {
            skillId: "31fb5c5a1f514ec1e66b4eba9f22d4db",
            attribution: "script_agent_decision.md",
          },
          {
            skillId: "27dc2dfc901de2180227d0269217583a",
            attribution: "script_agent_execution.md",
          },
          {
            skillId: "d49fa09504fe784a8e6eb102756c6d56",
            attribution: "script_agent_execution.md",
          },
          {
            skillId: "797906c2ddf0750f050bcdeae23eae3d",
            attribution: "script_agent_execution.md",
          },
          {
            skillId: "1abd8675c0c3e62b20c0b151d2ec0fb1",
            attribution: "script_agent_execution.md",
          },
          {
            skillId: "0b7828d7a6ab458a4b201122f08d6c16",
            attribution: "script_agent_supervision.md",
          },
          {
            skillId: "5c1772b5f9c420d9eae9ca02914ba087",
            attribution: "production_agent_decision.md",
          },
          {
            skillId: "75a45cf996015ca819582873887ec301",
            attribution: "production_agent_execution.md",
          },
          {
            skillId: "fce75f69d704c19bebcb356bc1bd6e81",
            attribution: "production_agent_execution.md",
          },
        ]);
      },
    },
    //Tabel memori (message=pesan asli, summary=ringkasan terkompresi)
    {
      name: "memories",
      builder: (table) => {
        table.text("id").notNullable();
        table.text("isolationKey").notNullable(); // Kunci isolasi memori
        table.text("type").notNullable(); // 'message' | 'summary'
        table.text("role"); // 'user' | 'assistant'
        table.text("name");
        table.text("content").notNullable();
        table.text("embedding"); // Embedding vektor JSON
        table.text("relatedMessageIds"); // Daftar ID message terkait summary JSON
        table.integer("summarized").defaultTo(0); // Apakah message telah dirangkum 0/1
        table.integer("createTime").notNullable();
        table.primary(["id"]);
        table.index(["isolationKey", "type"]);
        table.index(["isolationKey", "summarized"]);
      },
    },
    {
      name: "o_assetsRole2Audio",
      builder: (table) => {
        table.integer("assetsRoleId").notNullable();
        table.integer("assetsAudioId").notNullable();
        table.primary(["assetsAudioId", "assetsRoleId"]);
        table.unique(["assetsAudioId", "assetsRoleId"]);
      },
    },
  ];

  for (const t of tables) {
    const tableExists = await knex.schema.hasTable(t.name);
    if (!tableExists || forceInit) {
      if (tableExists && forceInit) {
        await knex.schema.dropTable(t.name);
        console.log("[Inisialisasi DB] Tabel yang sudah ada dihapus dan dibangun ulang:", t.name);
      } else {
        console.log("[Inisialisasi DB] Membuat tabel data:", t.name);
      }
      await knex.schema.createTable(t.name, t.builder);
      if (t.initData) {
        await t.initData(knex);
        console.log("[Inisialisasi DB] Inisialisasi data tabel:", t.name);
      }
    }
  }
};
