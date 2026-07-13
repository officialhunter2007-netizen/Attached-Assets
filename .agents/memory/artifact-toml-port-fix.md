---
name: Artifact TOML port fix
description: How to change the port an artifact service listens on (localPort + PORT env)
---

## The Rule
Artifact service ports are controlled by `.replit-artifact/artifact.toml`, not by the workflow command or package.json scripts. The system injects the `PORT` env var from `[services.env]` and tracks `localPort` as the `waitForPort` value.

**Why:** The artifact workflow is locked — `configureWorkflow` returns an error saying it's managed by an artifact. The only way to change the port is via the TOML.

## How to Apply
1. Write the updated TOML to a sibling temp file: e.g. `artifact.toml.new` in the same `.replit-artifact/` dir (use WriteFile with the full path).
2. Call `verifyAndReplaceArtifactToml({ tempFilePath: "<abs path>.new", artifactTomlPath: "<abs path>/artifact.toml" })` in CodeExecution — both paths must be **absolute**.
3. Restart the workflow. It will now wait on the new port.
4. Also update the package.json dev script if it hard-codes a different port (or relies on the env var the TOML injects).

## Related
- After `pnpm install` on a fresh import, workflows must be restarted — deps aren't auto-installed.
