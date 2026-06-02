import { stripThink, createThinkStreamFilter } from "./stripThink";

/**
 * Sanitizer output agent — membersihkan respons agent sebelum dikirim ke pengguna
 * 
 * Fungsi:
 * 1. Menghapus blok <think...>...</think*>
 * 2. Menghapus reasoning Inggris seperti "Okay, the user wants..."
 * 3. Menghapus baris Mandarin yang bukan bagian input user
 */

// Pola untuk reasoning Inggris yang umum muncul di output AI
const ENGLISH_REASONING_PATTERNS = [
  /^(?:Okay|Alright|Sure|Let me|I need to|I should|I'll|I will|First,? |Second,? |Next,? |Now,? |So,? |The user|Based on|Looking at|I think|I believe|Let's|Hmm|Well,?)/i,
  /^(?:I|We|You|They)\s+(?:need|should|will|can|must|have to|want to|going to)\s/i,
  /^(?:To |In order to|For this|For the|This is|That is|It is|There is|There are)\s/i,
];

// Pola untuk baris yang hanya berisi Mandarin (bukan campuran)
// CJK Unified Ideographs range: \u4e00-\u9fff
// Baris dianggap Mandarin jika >70% karakternya adalah CJK dan bukan bagian data terstruktur
const MANDARIN_LINE_PATTERN = /^[\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\|，。、；：？！""''（）《》【】\d\-—…·\u00b7]+$/;

// Baris yang harus dilestarikan meskipun mengandung Mandarin
const PRESERVE_PATTERNS = [
  /^\|/,           // Baris tabel
  /^\s*[-*]\s/,    // Daftar
  /^\s*\d+\.\s/,   // Daftar bernomor
  /^```/,          // Blok kode
  /^\s*<\w/,       // Tag XML/HTML
  /^#{1,6}\s/,     // Header Markdown
];

/**
 * Periksa apakah baris adalah reasoning Inggris
 */
function isEnglishReasoning(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 10) return false;
  return ENGLISH_REASONING_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Periksa apakah baris adalah Mandarin murni (bukan data terstruktur)
 */
function isMandarinOnly(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;
  
  // Lestarikan baris yang cocok dengan pola data terstruktur
  if (PRESERVE_PATTERNS.some(pattern => pattern.test(trimmed))) return false;
  
  // Periksa apakah baris dominan Mandarin
  if (MANDARIN_LINE_PATTERN.test(trimmed)) {
    // Juga lestarikan baris pendek yang mungkin nama karakter atau istilah
    if (trimmed.length <= 6) return false;
    return true;
  }
  
  return false;
}

/**
 * Sanitasi output agent (non-streaming)
 * @param text Teks output agent mentah
 * @returns Teks yang sudah dibersihkan
 */
export function sanitizeOutput(text: string): string {
  // Langkah 1: Hapus blok <think...>...</think*>
  let cleaned = stripThink(text);
  
  // Langkah 2: Proses baris per baris
  const lines = cleaned.split("\n");
  const resultLines: string[] = [];
  let inCodeBlock = false;
  
  for (const line of lines) {
    // Lacak blok kode — jangan filter di dalam blok kode
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      resultLines.push(line);
      continue;
    }
    
    if (inCodeBlock) {
      resultLines.push(line);
      continue;
    }
    
    // Langkah 3: Hapus reasoning Inggris
    if (isEnglishReasoning(line)) {
      continue;
    }
    
    // Langkah 4: Hapus baris Mandarin murni
    if (isMandarinOnly(line)) {
      continue;
    }
    
    resultLines.push(line);
  }
  
  // Langkah 5: Bersihkan baris kosong berlebih
  cleaned = resultLines.join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  return cleaned;
}

/**
 * Sanitasi streaming — membuat filter yang bisa dipanggil per chunk
 * Berguna untuk pemrosesan real-time saat output agent mengalir
 */
export function createOutputSanitizerStream() {
  let buffer = "";
  const thinkFilter = createThinkStreamFilter();
  
  return {
    push(chunk: string): string {
      // Langkah 1: Filter blok think
      const afterThink = thinkFilter.push(chunk);
      if (!afterThink) return "";
      
      // Untuk streaming, kita buffer dan proses saat newline
      buffer += afterThink;
      
      const lastNewline = buffer.lastIndexOf("\n");
      if (lastNewline === -1) return ""; // Belum ada baris lengkap
      
      const toProcess = buffer.slice(0, lastNewline + 1);
      buffer = buffer.slice(lastNewline + 1);
      
      // Proses baris lengkap
      const lines = toProcess.split("\n");
      const filtered = lines.filter(line => 
        !isEnglishReasoning(line) && !isMandarinOnly(line)
      );
      
      return filtered.join("\n");
    },
    
    flush(): string {
      // Filter sisa buffer
      let remaining = thinkFilter.flush() + buffer;
      buffer = "";
      
      if (!remaining) return "";
      
      const lines = remaining.split("\n");
      const filtered = lines.filter(line => 
        !isEnglishReasoning(line) && !isMandarinOnly(line)
      );
      
      return filtered.join("\n").trim();
    },
  };
}
