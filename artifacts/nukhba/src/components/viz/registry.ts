import type { ComponentType } from "react";
import { PythonTrace } from "./python-trace";
import { JsTrace } from "./js-trace";
import { PacketFlow } from "./packet-flow";
import { TAccount } from "./accounting-t-account";
import { RegexMatch } from "./regex-match";
import { Flowchart } from "./flowchart";
import { BarChart } from "./bar-chart";
import { ErDiagram } from "./er-diagram";
import { TreeDiagram } from "./tree-diagram";
import { MermaidDiagram } from "./mermaid-diagram";
import { Comparison } from "./comparison";

export type VizComponent = ComponentType<{ payload: any }>;

export const VIZ_REGISTRY: Record<string, VizComponent> = {
  python_trace: PythonTrace,
  js_trace: JsTrace,
  packet_flow: PacketFlow,
  // Canonical name per the R3 protocol spec is `accounting_t_account`.
  // `t_account` is kept as a backward-compatible alias because earlier
  // teacher prompts (and existing transcripts) used the shorter name.
  accounting_t_account: TAccount,
  t_account: TAccount,
  regex_match: RegexMatch,
  // Expanded library (covers IT/programming/data/databases + universal flows).
  flowchart: Flowchart,
  bar_chart: BarChart,
  er_diagram: ErDiagram,
  tree_diagram: TreeDiagram,
  mermaid_diagram: MermaidDiagram,
  comparison: Comparison,
};

export function getVizComponent(name: string): VizComponent | null {
  return VIZ_REGISTRY[name] ?? null;
}
