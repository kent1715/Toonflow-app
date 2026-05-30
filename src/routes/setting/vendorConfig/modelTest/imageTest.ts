import express from "express";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    modelName: z.string(),
    id: z.string(),
    imageBase64: z.string().optional(),
    prompt: z.string(),
  }),
  async (req, res) => {
    const { modelName, imageBase64, id, prompt } = req.body;

    try {
      const vendorConfigData = await u.db("o_vendorConfig").where("id", id).first();

      if (!vendorConfigData) {
        return res.status(500).send(error("未找到该供应商配置"));
      }

      if (!vendorConfigData.models) {
        return res.status(500).send(error("未找到模型列表"));
      }

      const runPayload: any = {
        prompt,
        size: "1K",
        aspectRatio: "16:9",
      };

      // hanya kirim referenceList jika imageBase64 benar-benar ada
      if (imageBase64) {
        runPayload.referenceList = [
          {
            type: "image",
            base64: imageBase64,
          },
        ];
      }

      const reqFn = await u.Ai.Image(`${id}:${modelName}`).run(runPayload);

      // 1) jika adapter langsung mengembalikan base64/data URI
      if (typeof reqFn?.base64 === "string" && reqFn.base64.length > 0) {
        const result =
          reqFn.base64.startsWith("data:image/")
            ? reqFn.base64
            : `data:image/jpeg;base64,${reqFn.base64}`;
        return res.status(200).send(success(result));
      }

      // 2) jika adapter langsung mengembalikan URL/path
      if (typeof reqFn?.url === "string" && reqFn.url.length > 0) {
        return res.status(200).send(success(reqFn.url));
      }

      // 3) fallback: simpan file lokal, baca, lalu return base64
      const fileName = `testImage-${Date.now()}.jpg`;
      const saveResult = await reqFn.save(fileName);

      let savedPath =
        typeof saveResult === "string" && saveResult.length > 0
          ? saveResult
          : path.resolve(process.cwd(), fileName);

      const fileBuffer = await fs.readFile(savedPath);
      const resultBase64 = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;

      return res.status(200).send(success(resultBase64));
    } catch (err) {
      console.error(err);
      const msg = u.error(err).message;
      console.error(msg);
      return res.status(500).send(error(msg));
    }
  },
);