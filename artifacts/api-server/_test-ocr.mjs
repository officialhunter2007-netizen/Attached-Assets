import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

// Resolve the workspace anthropic package directly via its file path so we
// don't need module-resolution magic.
const wsRoot = "/home/runner/workspace";
const Anthropic = (await import(path.join(wsRoot, "node_modules/.pnpm/@anthropic-ai+sdk@0.78.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/index.mjs"))).default;
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const buf = fs.readFileSync("../../attached_assets/lec3c++_1777035191832.pdf");
const src = await PDFDocument.load(new Uint8Array(buf));
const sub = await PDFDocument.create();
const pages = await sub.copyPages(src, [0, 1, 2, 3]);
pages.forEach(p => sub.addPage(p));
const chunkBytes = Buffer.from(await sub.save());
console.log("chunk:", chunkBytes.length, "bytes");

const t0 = Date.now();
try {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: chunkBytes.toString("base64") } },
        { type: "text", text: "Extract all text from this PDF, page by page. Start each page with --- صفحة X --- on its own line. Verbatim copy in original languages." },
      ],
    }],
  });
  const text = (msg.content || []).map(c => c.type === "text" ? c.text : "").join("\n").trim();
  console.log(`Claude OK in ${Date.now() - t0}ms — ${text.length} chars`);
  console.log("Sample:\n", text.slice(0, 700));
  console.log("Tokens:", JSON.stringify(msg.usage));
} catch (e) {
  console.error("ERR status:", e.status, "msg:", e.message);
  if (e.error) console.error("body:", JSON.stringify(e.error).slice(0, 500));
}
