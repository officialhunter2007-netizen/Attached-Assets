import type { Buffer } from "node:buffer";

export async function processBookUnits(
  materialId: number,
  buf: Buffer,
  pageTexts: Map<number, string>,
  language: string,
  imageBaseDir: string,
  userId: number | null
): Promise<void> {
  console.info(`[book-units] materialId=${materialId} pages=${pageTexts.size} lang=${language} user=${userId}`);
}
