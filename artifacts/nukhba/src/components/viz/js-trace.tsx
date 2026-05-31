import { CodeTrace } from "./python-trace";

export function JsTrace({ payload }: { payload: any }) {
  return <CodeTrace payload={payload} lang="javascript" label="JavaScript" accent="amber" />;
}
