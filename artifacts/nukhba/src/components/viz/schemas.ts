import { z } from "zod";

const nodeSchema = z.object({ id: z.string(), label: z.string() }).passthrough();
const edgeSchema = z.object({ from: z.string(), to: z.string(), label: z.string().optional() }).passthrough();

const traceStepSchema = z
  .object({
    line: z.number(),
    vars: z.record(z.union([z.string(), z.number()])).optional(),
    output: z.string().optional(),
  })
  .passthrough();

const codeTraceSchema = z
  .object({
    code: z.string().optional(),
    stdin: z.string().optional(),
    steps: z.array(traceStepSchema).optional(),
  })
  .passthrough();

const treeNodeSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      label: z.string().optional(),
      children: z.array(treeNodeSchema).optional(),
    })
    .passthrough(),
);

const entrySchema = z.object({ label: z.string().optional(), amount: z.union([z.string(), z.number()]).optional() }).passthrough();

const entitySchema = z.object({ name: z.string().optional(), fields: z.array(z.any()).optional() }).passthrough();
const relationSchema = z.object({ from: z.string().optional(), to: z.string().optional(), label: z.string().optional() }).passthrough();

const barSchema = z.object({ label: z.string().optional(), value: z.union([z.string(), z.number()]).optional() }).passthrough();

const comparisonItemSchema = z.object({ name: z.string().optional(), values: z.array(z.string()).optional() }).passthrough();

/**
 * One lenient Zod schema per VIZ template — "lenient" on purpose: the AI
 * teacher authors these payloads and near-miss shapes (missing optional
 * field, extra key) are common and harmless. The goal isn't to reject
 * anything imperfect, it's to catch structurally wrong payloads (wrong
 * type entirely, e.g. a string where an object was expected) BEFORE they
 * reach a component's render logic and throw past the SSE boundary where
 * there's no error boundary to catch it.
 */
export const VIZ_PAYLOAD_SCHEMAS: Record<string, z.ZodType<any>> = {
  python_trace: codeTraceSchema,
  js_trace: codeTraceSchema,
  packet_flow: z
    .object({
      nodes: z.array(nodeSchema).optional(),
      edges: z.array(edgeSchema).optional(),
      src: z.string().optional(),
      dst: z.string().optional(),
      hops: z.array(z.union([z.string(), z.object({ label: z.string().optional(), id: z.string().optional() }).passthrough()])).optional(),
    })
    .passthrough(),
  accounting_t_account: z
    .object({ name: z.string().optional(), debits: z.array(entrySchema).optional(), credits: z.array(entrySchema).optional() })
    .passthrough(),
  t_account: z
    .object({ name: z.string().optional(), debits: z.array(entrySchema).optional(), credits: z.array(entrySchema).optional() })
    .passthrough(),
  regex_match: z.object({ regex: z.string().optional(), flags: z.string().optional(), input: z.string().optional() }).passthrough(),
  flowchart: z.object({ title: z.string().optional(), nodes: z.array(nodeSchema).optional(), edges: z.array(edgeSchema).optional() }).passthrough(),
  bar_chart: z.object({ title: z.string().optional(), unit: z.string().optional(), bars: z.array(barSchema).optional() }).passthrough(),
  er_diagram: z
    .object({ title: z.string().optional(), entities: z.array(entitySchema).optional(), relations: z.array(relationSchema).optional() })
    .passthrough(),
  tree_diagram: z.object({ title: z.string().optional(), root: treeNodeSchema.optional() }).passthrough(),
  mermaid_diagram: z
    .object({ code: z.string().optional(), steps: z.array(z.string()).optional(), pendingId: z.string().optional() })
    .passthrough(),
  comparison: z
    .object({ title: z.string().optional(), axes: z.array(z.string()).optional(), items: z.array(comparisonItemSchema).optional() })
    .passthrough(),
};

export function validateVizPayload(template: string, payload: unknown): { ok: true; data: any } | { ok: false; error: string } {
  const schema = VIZ_PAYLOAD_SCHEMAS[template];
  if (!schema) return { ok: true, data: payload };
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
