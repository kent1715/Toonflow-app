import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    content: z.string(),
  }),
  async (req, res) => {
    const { content } = req.body;
    const systemPrompt = `Anda adalah ahli ekspresi reguler. Pengguna akan memberikan teks naskah, Anda perlu menganalisis pola pemisah episode/bab di dalamnya, dan mengembalikan string ekspresi reguler JavaScript.

Persyaratan:
1. Ekspresi reguler harus mengandung dua grup tangkapan: grup pertama mencocokkan nomor episode/bab (angka atau angka Mandarin), grup kedua mencocokkan judul/nama episode tersebut (scriptName).
2. Format yang dikembalikan adalah /ekspresi_reguler/g, contoh: /第\s*([0-9一二三四五六七八九十百千万]+)\s*集\s*([^\n\r]*)/g
3. Hanya kembalikan string ekspresi reguler itu sendiri, jangan tambahkan teks penjelasan atau format markdown lainnya.
4. Jika tidak ada pola pemisah bab yang jelas dalam teks, kembalikan string kosong.`;

    const resText = await u.Ai.Text("universalAi").invoke({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: content.slice(0, 2000),
        },
      ],
    });
    const result = (resText.text || "").trim();
    res.status(200).send(success(result));
  },
);
