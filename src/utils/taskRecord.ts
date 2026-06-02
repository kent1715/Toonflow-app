import db from "@/utils/db";

const taskStateMap = {
  "0": "Sedang berjalan",
  "1": "Selesai",
  "-1": "Gagal",
};
/**
 * Mencatat tugas dan mengembalikan fungsi selesai
 * @param projectId  ID Proyek
 * @param taskClass  Klasifikasi tugas
 * @param modelName   Nama model
 * @param opts       Opsi: objek terkait, deskripsi tugas
 */
export default async function taskRecord(
  projectId: number,
  taskClass: string,
  modelName: string,
  opts: {
    describe?: string;
    content?: any;
  } = {},
) {
  const { content, describe = "" } = opts;

  let opteorContent: string | undefined;
  if (content === undefined || content === null) {
    opteorContent = undefined;
  } else if (typeof content === "string") {
    opteorContent = content;
  } else if (typeof content === "function") {
    throw new Error("Tipe tidak didukung");
  } else {
    try {
      opteorContent = JSON.stringify(content);
    } catch (e) {
      opteorContent = content.toString();
    }
  }

  const [id] = await db("o_tasks").insert({
    projectId,
    taskClass,
    relatedObjects: opteorContent,
    model: modelName,
    describe,
    state: taskStateMap[0],
    startTime: Date.now(),
  });

  /** Tugas berhasil panggil done(1), gagal panggil done(-1, 'alasan') */
  return async function done(state: 1 | -1, reason?: string) {
    await db("o_tasks")
      .where("id", id)
      .update({
        state: taskStateMap[state],
        reason: state === -1 ? (reason ?? "") : null,
      });
  };
}
