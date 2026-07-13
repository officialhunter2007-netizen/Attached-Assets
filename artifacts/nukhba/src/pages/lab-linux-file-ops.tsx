/**
 * معمل عمليات الملفات وتحرير النصوص — وحدة 1.4.2
 * بيئة Linux محاكاة كاملة في المتصفح:
 *  - محطة طرفية تفاعلية مع تاريخ الأوامر
 *  - نظام ملفات افتراضي (CRUD كامل)
 *  - محرر nano مُحاكى
 *  - 6 مهام تتصاعد في التعقيد
 *  - شجرة ملفات حية تتحدث مع كل أمر
 */

import React, {
  useState, useRef, useEffect, useCallback, KeyboardEvent,
} from "react";
import {
  CheckCircle2, Circle, ChevronRight, ChevronDown,
  FolderOpen, Folder, FileText, Trophy, Lightbulb,
  X, Save, Terminal as TerminalIcon, RefreshCw,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUAL FILESYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

type FileNode = { type: "file"; content: string };
type DirNode  = { type: "dir";  children: Record<string, VNode> };
type VNode    = FileNode | DirNode;

function createFS(): DirNode {
  return {
    type: "dir",
    children: {
      tmp: {
        type: "dir",
        children: {
          "najm.conf": {
            type: "file",
            content:
              "# إعدادات خادم نجم للاستضافة\n" +
              "ServerName=najm.ye\n" +
              "Port=80\n" +
              "MaxClients=150\n" +
              "DocumentRoot=/var/www/najm/public\n" +
              "LogFile=/var/www/najm/logs/access.log\n" +
              "ErrorLog=/var/www/najm/logs/error.log",
          },
          "readme.txt": {
            type: "file",
            content:
              "ملاحظة: انسخ najm.conf إلى مجلد المشروع أولاً.\n" +
              "تأكد من وجود مجلدات public وlogs وbackup.",
          },
        },
      },
      var: {
        type: "dir",
        children: {
          www: { type: "dir", children: {} },
          log: {
            type: "dir",
            children: {
              syslog: {
                type: "file",
                content: "Jul 13 09:00 server: Started\nJul 13 09:01 kernel: Ready",
              },
            },
          },
        },
      },
      home: {
        type: "dir",
        children: {
          admin: {
            type: "dir",
            children: {
              ".bashrc": { type: "file", content: "# ~/.bashrc\nexport PATH=$HOME/bin:$PATH" },
            },
          },
        },
      },
      etc: {
        type: "dir",
        children: {
          hostname: { type: "file", content: "najm-server-01" },
          hosts:    { type: "file", content: "127.0.0.1\tlocalhost\n::1\tlocalhost" },
        },
      },
    },
  };
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function norm(p: string): string {
  const parts = p.split("/").filter(Boolean);
  const out: string[] = [];
  for (const s of parts) {
    if (s === ".") continue;
    if (s === "..") out.pop();
    else out.push(s);
  }
  return "/" + out.join("/");
}

function resolve(cwd: string, p: string): string {
  if (!p || p === "~") return "/home/admin";
  if (p.startsWith("~"))  return norm("/home/admin" + p.slice(1));
  if (p.startsWith("/"))  return norm(p);
  return norm(cwd + "/" + p);
}

function getNode(root: DirNode, path: string): VNode | null {
  if (path === "/") return root;
  const parts = path.split("/").filter(Boolean);
  let cur: VNode = root;
  for (const p of parts) {
    if (cur.type !== "dir" || !cur.children[p]) return null;
    cur = cur.children[p];
  }
  return cur;
}

function parentOf(root: DirNode, path: string): { dir: DirNode; name: string } | null {
  const n = norm(path);
  if (n === "/") return null;
  const parts = n.split("/").filter(Boolean);
  const name  = parts.pop()!;
  const par   = getNode(root, "/" + parts.join("/")) as DirNode | null;
  if (!par || par.type !== "dir") return null;
  return { dir: par, name };
}

function cloneFS(n: VNode): VNode {
  if (n.type === "file") return { ...n };
  return { type: "dir", children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, cloneFS(v)])) };
}

// ── Brace expansion: /var/www/{public,logs,backup} ────────────────────────────

function expandBraces(s: string): string[] {
  const m = s.match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (!m) return [s];
  return m[2].split(",").map(p => expandBraces(`${m[1]}${p.trim()}${m[3]}`)).flat();
}
function expand(args: string[]): string[] { return args.flatMap(expandBraces); }

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

type CmdResult = {
  lines: Array<{ text: string; cls?: string }>;
  fs?: DirNode;
  cwd?: string;
  nano?: { path: string; content: string };
  clear?: true;
};

function ok(...texts: string[]): CmdResult {
  return { lines: texts.map(t => ({ text: t })) };
}
function err(...texts: string[]): CmdResult {
  return { lines: texts.map(t => ({ text: t, cls: "text-red-400" })) };
}

function tokenise(raw: string): string[] {
  const toks: string[] = [];
  let cur = ""; let q: null | '"' | "'" = null;
  for (const ch of raw) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") { q = ch; }
    else if (ch === " " || ch === "\t") { if (cur) { toks.push(cur); cur = ""; } }
    else cur += ch;
  }
  if (cur) toks.push(cur);
  return toks;
}

function runCmd(raw: string, fs: DirNode, cwd: string): CmdResult {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  // echo redirect: echo "..." > file  or  echo "..." >> file
  const er = trimmed.match(/^echo\s+(.+?)\s*(>>?)\s+(\S+)$/);
  if (er) return echoRedirect(er[1].replace(/^["']|["']$/g, ""), er[2], er[3], fs, cwd);

  const toks = tokenise(trimmed);
  if (!toks.length) return { lines: [] };
  const [cmd, ...rawArgs] = toks;
  const args = expand(rawArgs);

  switch (cmd) {
    case "pwd":     return ok(cwd);
    case "whoami":  return ok("admin");
    case "hostname":return ok("najm-server-01");
    case "uname":   return ok("Linux najm-server-01 5.15.0 #1 SMP x86_64 GNU/Linux");
    case "clear":   return { lines: [], clear: true };
    case "help":    return cmdHelp();
    case "ls":      return cmdLs(args, fs, cwd);
    case "cd":      return cmdCd(args, fs, cwd);
    case "mkdir":   return cmdMkdir(args, fs, cwd);
    case "touch":   return cmdTouch(args, fs, cwd);
    case "cp":      return cmdCp(args, fs, cwd);
    case "mv":      return cmdMv(args, fs, cwd);
    case "rm":      return cmdRm(args, fs, cwd);
    case "cat":     return cmdCat(args, fs, cwd);
    case "echo":    return ok(args.join(" "));
    case "wc":      return cmdWc(args, fs, cwd);
    case "head":    return cmdHead(args, fs, cwd);
    case "tail":    return cmdTail(args, fs, cwd);
    case "stat":    return cmdStat(args, fs, cwd);
    case "file":    return cmdFile(args, fs, cwd);
    case "tree":    return cmdTree(args, fs, cwd);
    case "find":    return cmdFind(args, fs, cwd);
    case "nano": case "vim": case "vi":
      return cmdNano(args, fs, cwd);
    default:
      return err(
        `bash: ${cmd}: command not found`,
        "اكتب 'help' لعرض الأوامر المتاحة",
      );
  }
}

function cmdHelp(): CmdResult {
  return {
    lines: [
      { text: "╔══════════════════════════════════════╗", cls: "text-violet-400" },
      { text: "║       الأوامر المتاحة في المعمل       ║", cls: "text-violet-400" },
      { text: "╚══════════════════════════════════════╝", cls: "text-violet-400" },
      { text: "" },
      { text: "  ls [-la] [path]      — عرض محتوى المجلد", cls: "text-green-300/80" },
      { text: "  cd [path]            — الانتقال إلى مجلد", cls: "text-green-300/80" },
      { text: "  pwd                  — عرض المسار الحالي", cls: "text-green-300/80" },
      { text: "  mkdir [-p] path      — إنشاء مجلد (يدعم {})", cls: "text-green-300/80" },
      { text: "  touch path           — إنشاء ملف فارغ", cls: "text-green-300/80" },
      { text: "  cp src dst           — نسخ ملف/مجلد", cls: "text-green-300/80" },
      { text: "  mv src dst           — نقل أو إعادة تسمية", cls: "text-green-300/80" },
      { text: "  rm [-r] path         — حذف ملف أو مجلد", cls: "text-green-300/80" },
      { text: "  cat path             — عرض محتوى الملف", cls: "text-green-300/80" },
      { text: '  echo "text" > file   — كتابة نص في ملف', cls: "text-green-300/80" },
      { text: '  echo "text" >> file  — إضافة نص إلى ملف', cls: "text-green-300/80" },
      { text: "  nano/vim path        — تحرير ملف نصي", cls: "text-green-300/80" },
      { text: "  head/tail [-n] path  — أول/آخر أسطر الملف", cls: "text-green-300/80" },
      { text: "  wc [-l] path         — عدد أسطر/كلمات الملف", cls: "text-green-300/80" },
      { text: "  stat / file path     — معلومات الملف", cls: "text-green-300/80" },
      { text: "  tree [path]          — عرض شجري للمجلد", cls: "text-green-300/80" },
      { text: "  find path -name x    — بحث عن ملف", cls: "text-green-300/80" },
      { text: "  clear                — مسح الشاشة", cls: "text-green-300/80" },
    ],
  };
}

function cmdLs(args: string[], fs: DirNode, cwd: string): CmdResult {
  const flags = args.filter(a => a.startsWith("-")).join("");
  const paths = args.filter(a => !a.startsWith("-"));
  const tgt   = paths[0] ? resolve(cwd, paths[0]) : cwd;
  const node  = getNode(fs, tgt);
  if (!node) return err(`ls: لا يمكن الوصول إلى '${paths[0] || tgt}': لا يوجد ملف أو مجلد`);
  if (node.type === "file") return ok(paths[0] || tgt);

  const showHidden = flags.includes("a");
  const long = flags.includes("l");
  const entries = Object.entries(node.children)
    .filter(([n]) => showHidden || !n.startsWith("."))
    .sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) return { lines: [] };

  if (long) {
    const lines = entries.map(([name, n]) => {
      const isDir = n.type === "dir";
      const perm  = isDir ? "drwxr-xr-x" : "-rw-r--r--";
      const size  = isDir ? "4096" : String((n as FileNode).content.length);
      const cls   = isDir ? "text-blue-400" : "text-white/80";
      return { text: `${perm}  1 admin admin ${size.padStart(6)}  Jul 13 10:00  ${isDir ? name + "/" : name}`, cls };
    });
    return { lines };
  }

  const parts = entries.map(([name, n]) => n.type === "dir" ? name + "/" : name);
  const line = parts.map((p, i) => ({
    text: p,
    cls:  entries[i][1].type === "dir" ? "text-blue-400" : "text-white/80",
  }));
  // Combine into one line for display
  return { lines: [{ text: parts.join("   ") }] };
}

function cmdCd(args: string[], fs: DirNode, cwd: string): CmdResult {
  const tgt  = resolve(cwd, args[0] || "/home/admin");
  const node = getNode(fs, tgt);
  if (!node)              return err(`cd: ${args[0]}: لا يوجد ملف أو مجلد`);
  if (node.type !== "dir") return err(`cd: ${args[0]}: ليس مجلداً`);
  return { lines: [], cwd: tgt };
}

function cmdMkdir(args: string[], fs: DirNode, cwd: string): CmdResult {
  const flags = args.filter(a => a.startsWith("-"));
  const paths = args.filter(a => !a.startsWith("-"));
  const recursive = flags.some(f => f.includes("p"));
  if (!paths.length) return err("mkdir: مسار مطلوب");

  const newFS = cloneFS(fs) as DirNode;
  const errs: string[] = [];

  for (const p of paths) {
    const r = resolve(cwd, p);
    const parts = r.split("/").filter(Boolean);
    if (recursive) {
      let cur = newFS;
      for (const part of parts) {
        if (!cur.children[part]) cur.children[part] = { type: "dir", children: {} };
        else if (cur.children[part].type !== "dir") { errs.push(`mkdir: '${part}': ليس مجلداً`); break; }
        cur = cur.children[part] as DirNode;
      }
    } else {
      const pn = parentOf(newFS, r);
      if (!pn) { errs.push(`mkdir: تعذر إنشاء '${p}'`); continue; }
      if (pn.dir.children[pn.name]) { errs.push(`mkdir: لا يمكن إنشاء '${p}': الملف موجود`); continue; }
      const parentNode = getNode(newFS, norm(r + "/.."));
      if (!parentNode) { errs.push(`mkdir: '${p}': المجلد الأب غير موجود — استخدم -p`); continue; }
      pn.dir.children[pn.name] = { type: "dir", children: {} };
    }
  }

  return { lines: errs.map(e => ({ text: e, cls: "text-red-400" })), fs: newFS };
}

function cmdTouch(args: string[], fs: DirNode, cwd: string): CmdResult {
  const paths = args.filter(a => !a.startsWith("-"));
  if (!paths.length) return err("touch: اسم الملف مطلوب");
  const newFS = cloneFS(fs) as DirNode;
  const errs: string[] = [];
  for (const p of paths) {
    const r  = resolve(cwd, p);
    const pn = parentOf(newFS, r);
    if (!pn) { errs.push(`touch: '${p}': المجلد الأب غير موجود`); continue; }
    if (!pn.dir.children[pn.name]) pn.dir.children[pn.name] = { type: "file", content: "" };
  }
  return { lines: errs.map(e => ({ text: e, cls: "text-red-400" })), fs: newFS };
}

function cmdCp(args: string[], fs: DirNode, cwd: string): CmdResult {
  const paths = args.filter(a => !a.startsWith("-"));
  if (paths.length < 2) return err("cp: src و dst مطلوبان");
  const srcR  = resolve(cwd, paths[0]);
  let   dstR  = resolve(cwd, paths[paths.length - 1]);
  const src   = getNode(fs, srcR);
  if (!src) return err(`cp: '${paths[0]}': لا يوجد ملف أو مجلد`);

  const newFS  = cloneFS(fs) as DirNode;
  const dstNode = getNode(newFS, dstR);
  if (dstNode?.type === "dir") dstR = norm(dstR + "/" + srcR.split("/").pop()!);
  const pn = parentOf(newFS, dstR);
  if (!pn) return err(`cp: لا يمكن النسخ إلى '${paths[paths.length - 1]}': المجلد الأب غير موجود`);
  pn.dir.children[pn.name] = cloneFS(src);
  return { lines: [], fs: newFS };
}

function cmdMv(args: string[], fs: DirNode, cwd: string): CmdResult {
  const paths = args.filter(a => !a.startsWith("-"));
  if (paths.length < 2) return err("mv: src و dst مطلوبان");
  const srcR   = resolve(cwd, paths[0]);
  let   dstR   = resolve(cwd, paths[paths.length - 1]);
  const srcNode = getNode(fs, srcR);
  if (!srcNode) return err(`mv: '${paths[0]}': لا يوجد ملف أو مجلد`);

  const newFS   = cloneFS(fs) as DirNode;
  const dstNode = getNode(newFS, dstR);
  if (dstNode?.type === "dir") dstR = norm(dstR + "/" + srcR.split("/").pop()!);
  const srcPn = parentOf(newFS, srcR);
  const dstPn = parentOf(newFS, dstR);
  if (!srcPn || !dstPn) return err(`mv: تعذر النقل إلى '${paths[paths.length - 1]}'`);
  dstPn.dir.children[dstPn.name] = cloneFS(srcNode);
  delete srcPn.dir.children[srcPn.name];
  return { lines: [], fs: newFS };
}

function cmdRm(args: string[], fs: DirNode, cwd: string): CmdResult {
  const flags = args.filter(a => a.startsWith("-"));
  const paths = args.filter(a => !a.startsWith("-"));
  const rec   = flags.some(f => f.includes("r") || f.includes("R"));
  if (!paths.length) return err("rm: اسم الملف مطلوب");

  const newFS = cloneFS(fs) as DirNode;
  const errs: string[] = [];
  for (const p of paths) {
    const r    = resolve(cwd, p);
    const node = getNode(newFS, r);
    if (!node)               { errs.push(`rm: '${p}': لا يوجد ملف أو مجلد`); continue; }
    if (node.type === "dir" && !rec) { errs.push(`rm: لا يمكن حذف '${p}': هذا مجلد، استخدم -r`); continue; }
    const pn = parentOf(newFS, r);
    if (pn) delete pn.dir.children[pn.name];
  }
  return { lines: errs.map(e => ({ text: e, cls: "text-red-400" })), fs: newFS };
}

function cmdCat(args: string[], fs: DirNode, cwd: string): CmdResult {
  const paths = args.filter(a => !a.startsWith("-"));
  if (!paths.length) return err("cat: اسم الملف مطلوب");
  const lines: CmdResult["lines"] = [];
  for (const p of paths) {
    const node = getNode(fs, resolve(cwd, p));
    if (!node)               { lines.push({ text: `cat: ${p}: لا يوجد ملف أو مجلد`, cls: "text-red-400" }); continue; }
    if (node.type === "dir") { lines.push({ text: `cat: ${p}: هذا مجلد`, cls: "text-red-400" }); continue; }
    node.content.split("\n").forEach(t => lines.push({ text: t }));
  }
  return { lines };
}

function echoRedirect(text: string, op: string, rawDst: string, fs: DirNode, cwd: string): CmdResult {
  const dstR    = resolve(cwd, rawDst);
  const newFS   = cloneFS(fs) as DirNode;
  const pn      = parentOf(newFS, dstR);
  if (!pn) return err(`bash: ${rawDst}: المجلد الأب غير موجود`);
  const existing = getNode(newFS, dstR);
  const old      = (existing?.type === "file") ? existing.content : "";
  pn.dir.children[pn.name] = {
    type: "file",
    content: op === ">>" ? (old ? old + "\n" + text : text) : text,
  };
  return { lines: [], fs: newFS };
}

function cmdWc(args: string[], fs: DirNode, cwd: string): CmdResult {
  const flags = args.filter(a => a.startsWith("-")).join("");
  const paths = args.filter(a => !a.startsWith("-"));
  const lines: CmdResult["lines"] = [];
  for (const p of paths) {
    const node = getNode(fs, resolve(cwd, p));
    if (!node || node.type !== "file") { lines.push({ text: `wc: ${p}: لا يوجد ملف`, cls: "text-red-400" }); continue; }
    const l = node.content.split("\n").length;
    const w = node.content.split(/\s+/).filter(Boolean).length;
    const c = node.content.length;
    const txt = flags.includes("l") ? `${l}`.padStart(4) + ` ${p}`
              : flags.includes("w") ? `${w}`.padStart(4) + ` ${p}`
              : flags.includes("c") ? `${c}`.padStart(4) + ` ${p}`
              : `${l}`.padStart(4) + ` ${w}`.padStart(6) + ` ${c}`.padStart(6) + ` ${p}`;
    lines.push({ text: txt });
  }
  return { lines };
}

function cmdHead(args: string[], fs: DirNode, cwd: string): CmdResult {
  const ni  = args.findIndex(a => a === "-n");
  const n   = ni >= 0 ? parseInt(args[ni + 1]) || 10 : 10;
  const paths = args.filter(a => !a.startsWith("-") && isNaN(Number(a)));
  const lines: CmdResult["lines"] = [];
  for (const p of paths) {
    const node = getNode(fs, resolve(cwd, p));
    if (!node || node.type !== "file") { lines.push({ text: `head: ${p}: لا يوجد ملف`, cls: "text-red-400" }); continue; }
    node.content.split("\n").slice(0, n).forEach(t => lines.push({ text: t }));
  }
  return { lines };
}

function cmdTail(args: string[], fs: DirNode, cwd: string): CmdResult {
  const ni  = args.findIndex(a => a === "-n");
  const n   = ni >= 0 ? parseInt(args[ni + 1]) || 10 : 10;
  const paths = args.filter(a => !a.startsWith("-") && isNaN(Number(a)));
  const lines: CmdResult["lines"] = [];
  for (const p of paths) {
    const node = getNode(fs, resolve(cwd, p));
    if (!node || node.type !== "file") { lines.push({ text: `tail: ${p}: لا يوجد ملف`, cls: "text-red-400" }); continue; }
    const all = node.content.split("\n");
    all.slice(Math.max(0, all.length - n)).forEach(t => lines.push({ text: t }));
  }
  return { lines };
}

function cmdStat(args: string[], fs: DirNode, cwd: string): CmdResult {
  const lines: CmdResult["lines"] = [];
  for (const p of args.filter(a => !a.startsWith("-"))) {
    const r    = resolve(cwd, p);
    const node = getNode(fs, r);
    if (!node) { lines.push({ text: `stat: ${p}: لا يوجد ملف أو مجلد`, cls: "text-red-400" }); continue; }
    const size = node.type === "file" ? node.content.length : 4096;
    const isDir = node.type === "dir";
    lines.push(
      { text: `  File: ${r}`, cls: "text-yellow-300" },
      { text: `  Size: ${size}\t\tBlocks: ${Math.ceil(size / 512)}\tIO Block: 4096\t${isDir ? "directory" : "regular file"}` },
      { text: `Access: ${isDir ? "(0755/drwxr-xr-x)" : "(0644/-rw-r--r--)"}\tUid: (1000/admin)\tGid: (1000/admin)` },
      { text: `Modify: 2026-07-13 10:00:00.000000000 +0300` },
    );
  }
  return { lines };
}

function cmdFile(args: string[], fs: DirNode, cwd: string): CmdResult {
  const lines: CmdResult["lines"] = [];
  for (const p of args.filter(a => !a.startsWith("-"))) {
    const node = getNode(fs, resolve(cwd, p));
    if (!node) { lines.push({ text: `file: ${p}: لا يوجد ملف أو مجلد`, cls: "text-red-400" }); continue; }
    if (node.type === "dir") { lines.push({ text: `${p}: directory` }); continue; }
    const ext = p.split(".").pop() || "";
    const types: Record<string, string> = {
      sh: "Bourne-Again shell script, ASCII text executable",
      conf: "ASCII text configuration file",
      html: "HTML document, ASCII text",
      txt: "ASCII text",
      log: "ASCII text log file",
      css: "ASCII text stylesheet",
    };
    lines.push({ text: `${p}: ${types[ext] || "ASCII text"}` });
  }
  return { lines };
}

function cmdTree(args: string[], fs: DirNode, cwd: string): CmdResult {
  const tgt   = args.find(a => !a.startsWith("-")) || cwd;
  const r     = resolve(cwd, tgt);
  const node  = getNode(fs, r);
  if (!node || node.type !== "dir") return err(`tree: '${tgt}': لا يوجد مجلد`);
  const lines: CmdResult["lines"] = [{ text: r, cls: "text-blue-400" }];
  function walk(dir: DirNode, prefix: string) {
    const es = Object.entries(dir.children).sort(([a], [b]) => a.localeCompare(b));
    es.forEach(([name, child], i) => {
      const last = i === es.length - 1;
      lines.push({
        text: prefix + (last ? "└── " : "├── ") + (child.type === "dir" ? name + "/" : name),
        cls:  child.type === "dir" ? "text-blue-400" : undefined,
      });
      if (child.type === "dir") walk(child, prefix + (last ? "    " : "│   "));
    });
  }
  walk(node, "");
  const dirs  = lines.filter(l => l.text.endsWith("/")).length;
  const files = lines.length - 1 - dirs;
  lines.push({ text: `\n${dirs} مجلد, ${files} ملف`, cls: "text-white/40" });
  return { lines };
}

function cmdFind(args: string[], fs: DirNode, cwd: string): CmdResult {
  const pathArg    = args[0] || ".";
  const nameIdx    = args.findIndex(a => a === "-name");
  const namePattern = nameIdx >= 0 ? args[nameIdx + 1] : null;
  const r          = resolve(cwd, pathArg);
  const root       = getNode(fs, r);
  if (!root || root.type !== "dir") return err(`find: '${pathArg}': لا يوجد مجلد`);
  const results: string[] = [];
  function search(dir: DirNode, path: string) {
    Object.entries(dir.children).forEach(([name, child]) => {
      const cp = (path === "/" ? "" : path) + "/" + name;
      if (!namePattern || new RegExp("^" + namePattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(name))
        results.push(cp);
      if (child.type === "dir") search(child, cp);
    });
  }
  search(root, r);
  return { lines: results.map(t => ({ text: t })) };
}

function cmdNano(args: string[], fs: DirNode, cwd: string): CmdResult {
  const p = args.find(a => !a.startsWith("-"));
  if (!p) return err("nano: اسم الملف مطلوب");
  const r    = resolve(cwd, p);
  const node = getNode(fs, r);
  const content = node?.type === "file" ? node.content : "";
  return { lines: [], nano: { path: r, content } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════════

type TaskDef = {
  id: number;
  title: string;
  objective: string;
  hint: string;
  skills: string[];
  check: (fs: DirNode, cwd: string, lastCmd: string) => boolean;
};

const TASKS: TaskDef[] = [
  {
    id: 1,
    title: "إنشاء هيكل المشروع",
    objective: "أنشئ مجلد /var/www/najm مع المجلدات الفرعية: public وlogs وbackup",
    hint: "mkdir -p /var/www/najm/{public,logs,backup}",
    skills: ["mkdir", "-p", "brace expansion"],
    check: (fs) =>
      ["/var/www/najm", "/var/www/najm/public", "/var/www/najm/logs", "/var/www/najm/backup"]
        .every(d => { const n = getNode(fs, d); return n?.type === "dir"; }),
  },
  {
    id: 2,
    title: "نسخ ملف الإعداد",
    objective: "انسخ /tmp/najm.conf إلى مجلد /var/www/najm/ للمراجعة",
    hint: "cp /tmp/najm.conf /var/www/najm/",
    skills: ["cp"],
    check: (fs) => {
      const n = getNode(fs, "/var/www/najm/najm.conf");
      return !!n && n.type === "file";
    },
  },
  {
    id: 3,
    title: "فحص محتوى الملف",
    objective: "اعرض محتوى /var/www/najm/najm.conf للتحقق من الإعدادات",
    hint: "cat /var/www/najm/najm.conf",
    skills: ["cat"],
    check: (_fs, _cwd, cmd) =>
      /^cat\b/.test(cmd.trim()) && cmd.includes("najm.conf"),
  },
  {
    id: 4,
    title: "إنشاء صفحة البداية",
    objective: "أنشئ /var/www/najm/public/index.html وأضف إليه نصاً ترحيبياً",
    hint: 'touch /var/www/najm/public/index.html\necho "مرحباً بك في نجم" > /var/www/najm/public/index.html',
    skills: ["touch", "echo", ">"],
    check: (fs) => {
      const n = getNode(fs, "/var/www/najm/public/index.html");
      return !!n && n.type === "file" && (n as FileNode).content.length > 0;
    },
  },
  {
    id: 5,
    title: "إعادة التسمية والتنظيم",
    objective: "أعد تسمية najm.conf إلى server.conf (الاسم الرسمي لملفات الإعداد)",
    hint: "mv /var/www/najm/najm.conf /var/www/najm/server.conf",
    skills: ["mv"],
    check: (fs) => {
      const newFile = getNode(fs, "/var/www/najm/server.conf");
      const oldFile = getNode(fs, "/var/www/najm/najm.conf");
      return !!newFile && newFile.type === "file" && !oldFile;
    },
  },
  {
    id: 6,
    title: "تحليل الملفات",
    objective: "اكتب سطراً في logs/access.log ثم استخدم wc -l لمعرفة عدد الأسطر",
    hint: 'echo "[INFO] Server started" > /var/www/najm/logs/access.log\nwc -l /var/www/najm/logs/access.log',
    skills: ["echo", ">>", "wc"],
    check: (fs, _cwd, cmd) => {
      const log = getNode(fs, "/var/www/najm/logs/access.log");
      return !!log && log.type === "file" && (log as FileNode).content.length > 0
        && /\bwc\b/.test(cmd);
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FILE TREE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function FileTreeNode({ name, node, depth }: { name: string; node: VNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "dir";
  const pad   = depth * 12;

  if (isDir) {
    const children = Object.entries((node as DirNode).children)
      .sort(([a, av], [b, bv]) => {
        // dirs first
        const ad = av.type === "dir" ? 0 : 1;
        const bd = bv.type === "dir" ? 0 : 1;
        return ad - bd || a.localeCompare(b);
      });
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full text-left py-0.5 hover:bg-white/5 rounded px-1 transition-colors"
          style={{ paddingLeft: pad + 4 }}
        >
          {open ? <ChevronDown className="w-3 h-3 text-white/30 shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />}
          {open ? <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
          <span className="text-blue-300 text-[11px] font-mono truncate">{name}/</span>
        </button>
        {open && children.map(([n, v]) => <FileTreeNode key={n} name={n} node={v} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 py-0.5 hover:bg-white/5 rounded px-1"
      style={{ paddingLeft: pad + 4 }}
    >
      <span className="w-3 shrink-0" />
      <FileText className="w-3 h-3 text-white/30 shrink-0" />
      <span className="text-white/60 text-[11px] font-mono truncate">{name}</span>
    </div>
  );
}

function FileTree({ fs }: { fs: DirNode }) {
  // Show only /tmp and /var to keep it focused
  const relevant: Array<[string, VNode]> = [
    ["tmp", (fs.children["tmp"] as VNode) || { type: "dir", children: {} }],
    ["var", (fs.children["var"] as VNode) || { type: "dir", children: {} }],
  ];
  return (
    <div className="font-mono overflow-y-auto flex-1 min-h-0">
      {relevant.map(([name, node]) => (
        <FileTreeNode key={name} name={name} node={node} depth={0} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NANO EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function NanoEditor({
  path, content, onSave, onClose,
}: { path: string; content: string; onSave: (content: string) => void; onClose: () => void }) {
  const [text, setText] = useState(content);
  const lines = text.split("\n").length;
  const chars = text.length;

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); onSave(text); }
    if ((e.ctrlKey || e.metaKey) && e.key === "x") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[680px] max-h-[80vh] flex flex-col rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60 font-mono">
        {/* Header bar */}
        <div className="bg-white/10 px-4 py-1.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-white/50">GNU nano</span>
          <span className="text-[11px] text-white/80 font-bold">{path}</span>
          <span className="text-[11px] text-white/50">{lines} سطر | {chars} حرف</span>
        </div>
        {/* Editor */}
        <textarea
          className="flex-1 bg-[#1a1a2e] text-green-300 text-[13px] p-4 resize-none outline-none leading-relaxed min-h-[300px]"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
          spellCheck={false}
          dir="ltr"
        />
        {/* Status bar */}
        <div className="bg-white/10 px-4 py-1.5 flex items-center gap-6 shrink-0">
          <button onClick={() => onSave(text)} className="flex items-center gap-1.5 text-[11px] text-white/70 hover:text-white transition-colors">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">^O</kbd>
            <Save className="w-3 h-3" /> حفظ
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 text-[11px] text-white/70 hover:text-white transition-colors">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">^X</kbd>
            <X className="w-3 h-3" /> إغلاق
          </button>
          <span className="text-[10px] text-white/30 mr-auto">Ctrl+S للحفظ · Ctrl+X للإغلاق</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function TaskPanel({
  tasks, done, active, onHint,
}: { tasks: TaskDef[]; done: Set<number>; active: number; onHint: (id: number) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="text-[11px] text-white/40 font-bold tracking-widest uppercase mb-1">المهام</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-violet-400 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${(done.size / tasks.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-violet-300 font-bold tabular-nums">{done.size}/{tasks.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {tasks.map((t, i) => {
          const isDone    = done.has(t.id);
          const isActive  = i + 1 === active && !isDone;
          const isLocked  = i + 1 > active && !isDone;
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 transition-all ${
                isDone    ? "border-emerald-500/30 bg-emerald-500/10" :
                isActive  ? "border-violet-400/40 bg-violet-500/10" :
                isLocked  ? "border-white/5 bg-white/2 opacity-40" :
                            "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5">
                  {isDone
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : isActive
                      ? <div className="w-4 h-4 rounded-full border-2 border-violet-400 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        </div>
                      : <Circle className="w-4 h-4 text-white/20" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold mb-0.5 ${isDone ? "text-emerald-300" : isActive ? "text-violet-200" : "text-white/30"}`}>
                    {i + 1}. {t.title}
                  </div>
                  {(isActive || isDone) && (
                    <div className={`text-[10px] leading-relaxed ${isDone ? "text-emerald-200/60" : "text-white/50"}`}>
                      {t.objective}
                    </div>
                  )}
                  {isActive && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.skills.map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isActive && (
                  <button
                    onClick={() => onHint(t.id)}
                    className="shrink-0 p-1 rounded-lg hover:bg-amber-400/10 transition-colors"
                    title="تلميح"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400/60 hover:text-amber-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

type HistoryLine = { prompt: string; input: string; output: Array<{ text: string; cls?: string }> };

export default function LabLinuxFileOps() {
  const [fs,       setFs]       = useState<DirNode>(createFS);
  const [cwd,      setCwd]      = useState("/home/admin");
  const [input,    setInput]    = useState("");
  const [history,  setHistory]  = useState<HistoryLine[]>([
    {
      prompt: "",
      input: "",
      output: [
        { text: "╔════════════════════════════════════════════════════════╗", cls: "text-violet-400" },
        { text: "║    معمل: عمليات الملفات وتحرير النصوص — الوحدة 1.4.2   ║", cls: "text-violet-400" },
        { text: "╠════════════════════════════════════════════════════════╣", cls: "text-violet-400" },
        { text: "║  السيناريو: مدير نظم جديد في شركة نجم للاستضافة         ║", cls: "text-violet-300/70" },
        { text: "║  مهمتك: إعداد خادم الويب الجديد في أقل من ساعة ⏱        ║", cls: "text-violet-300/70" },
        { text: "╚════════════════════════════════════════════════════════╝", cls: "text-violet-400" },
        { text: "" },
        { text: "اكتب 'help' لعرض الأوامر · 'tree /var' لرؤية الهيكل الحالي", cls: "text-white/40" },
        { text: "" },
      ],
    },
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx,   setHistIdx]   = useState(-1);
  const [done,      setDone]      = useState<Set<number>>(new Set());
  const [nano,      setNano]      = useState<{ path: string; content: string } | null>(null);
  const [finished,  setFinished]  = useState(false);
  const termRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [history]);

  // Focus input on click anywhere in terminal
  const focusTerm = () => inputRef.current?.focus();

  // Active task index (1-based)
  const activeTask = Math.min(done.size + 1, TASKS.length + 1);

  // Check all tasks after fs/last command change
  const checkTasks = useCallback((newFs: DirNode, newCwd: string, lastCmd: string) => {
    const newDone = new Set(done);
    TASKS.forEach(t => {
      if (!newDone.has(t.id) && t.check(newFs, newCwd, lastCmd)) newDone.add(t.id);
    });
    if (newDone.size !== done.size) {
      setDone(newDone);
      if (newDone.size === TASKS.length) setFinished(true);
    }
  }, [done]);

  const prompt = `\u001b[32madmin@najm\u001b[0m:\u001b[34m${cwd}\u001b[0m$ `;
  const promptDisplay = `admin@najm:${cwd}$ `;

  const submitCmd = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) return;

    setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");

    const result = runCmd(cmd, fs, cwd);

    if (result.nano) {
      setNano(result.nano);
      setHistory(h => [...h, { prompt: promptDisplay, input: cmd, output: [] }]);
      return;
    }

    let newFs  = result.fs  || fs;
    let newCwd = result.cwd || cwd;

    if (result.clear) {
      setHistory([]);
    } else {
      // Task unlock celebration
      const celebrationLines: Array<{ text: string; cls?: string }> = [];
      const tempDone = new Set(done);
      TASKS.forEach(t => {
        if (!tempDone.has(t.id) && t.check(newFs, newCwd, cmd)) {
          celebrationLines.push(
            { text: "" },
            { text: `✅ مهمة مكتملة: ${t.title}`, cls: "text-emerald-400 font-bold" },
            { text: `   أتقنت: ${t.skills.join(" · ")}`, cls: "text-emerald-300/60" },
          );
        }
      });

      setHistory(h => [...h, {
        prompt: promptDisplay,
        input: cmd,
        output: [...result.lines, ...celebrationLines],
      }]);
    }

    if (result.fs)  setFs(result.fs);
    if (result.cwd) setCwd(result.cwd);
    checkTasks(newFs, newCwd, cmd);
  }, [input, fs, cwd, done, promptDisplay, checkTasks]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { submitCmd(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : cmdHistory[next] || "");
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab completion for paths
      const words = input.split(" ");
      const last  = words[words.length - 1];
      if (!last) return;
      const r    = resolve(cwd, last);
      const pn   = parentOf(fs, r) || { dir: fs, name: "" };
      const dir  = getNode(fs, r.split("/").slice(0, -1).join("/") || "/") as DirNode | null;
      if (dir?.type === "dir") {
        const prefix = r.split("/").pop() || "";
        const matches = Object.keys(dir.children).filter(k => k.startsWith(prefix));
        if (matches.length === 1) {
          words[words.length - 1] = last.slice(0, last.lastIndexOf("/") + 1) + matches[0];
          setInput(words.join(" "));
        }
      }
    }
  };

  const showHint = (taskId: number) => {
    const t = TASKS.find(x => x.id === taskId);
    if (!t) return;
    setHistory(h => [...h, {
      prompt: "",
      input: "",
      output: [
        { text: `💡 تلميح — ${t.title}:`, cls: "text-amber-400" },
        ...t.hint.split("\n").map(line => ({ text: `   ${line}`, cls: "text-amber-300/70" })),
      ],
    }]);
  };

  const reset = () => {
    setFs(createFS());
    setCwd("/home/admin");
    setHistory([]);
    setDone(new Set());
    setFinished(false);
    setInput("");
  };

  // Nano save
  const nanoSave = (content: string) => {
    if (!nano) return;
    const newFs = cloneFS(fs) as DirNode;
    const pn    = parentOf(newFs, nano.path);
    if (pn) pn.dir.children[pn.name] = { type: "file", content };
    setFs(newFs);
    setHistory(h => [...h, { prompt: "", input: "", output: [{ text: `[nano] حُفظ الملف: ${nano.path}`, cls: "text-green-400" }] }]);
    checkTasks(newFs, cwd, `nano ${nano.path}`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0d1a] text-white font-sans" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0 bg-[#0d0d1a]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
            <TerminalIcon className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">معمل: عمليات الملفات وتحرير النصوص</div>
            <div className="text-[10px] text-white/35">وحدة 1.4.2 · أساسيات Linux · المستوى الأول</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Linux محاكى
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> إعادة تشغيل
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Tasks panel */}
        <div className="w-64 shrink-0 border-l border-white/5 bg-[#0a0a18] flex flex-col min-h-0">
          <TaskPanel tasks={TASKS} done={done} active={activeTask} onHint={showHint} />
        </div>

        {/* Terminal */}
        <div
          className="flex-1 flex flex-col min-w-0 cursor-text"
          onClick={focusTerm}
        >
          <div
            ref={termRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed min-h-0 space-y-0.5"
            style={{ background: "#0b0b18" }}
          >
            {history.map((entry, i) => (
              <div key={i} className="select-text">
                {entry.prompt && (
                  <div className="flex items-baseline gap-1 flex-wrap" dir="ltr">
                    <span className="text-green-400 shrink-0">admin@najm</span>
                    <span className="text-white/30">:</span>
                    <span className="text-blue-400 shrink-0">{entry.prompt.split(":")[1]?.replace("$ ", "") ?? entry.prompt}</span>
                    <span className="text-white/60">$</span>
                    <span className="text-white">{entry.input}</span>
                  </div>
                )}
                {entry.output.map((line, j) => (
                  <div key={j} className={line.cls || "text-white/75"} dir="auto">
                    {line.text || "\u00a0"}
                  </div>
                ))}
              </div>
            ))}

            {/* Current input line */}
            <div className="flex items-baseline gap-1" dir="ltr">
              <span className="text-green-400 shrink-0">admin@najm</span>
              <span className="text-white/30">:</span>
              <span className="text-blue-400 shrink-0">{cwd}</span>
              <span className="text-white/60">$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 bg-transparent outline-none text-white caret-violet-400 min-w-0"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* File tree panel */}
        <div className="w-52 shrink-0 border-r border-white/5 bg-[#0a0a18] flex flex-col min-h-0">
          <div className="px-3 pt-3 pb-2 text-[10px] text-white/30 font-bold tracking-widest uppercase shrink-0">
            نظام الملفات
          </div>
          <FileTree key={JSON.stringify(fs)} fs={fs} />
        </div>
      </div>

      {/* ── Nano modal ── */}
      {nano && (
        <NanoEditor
          path={nano.path}
          content={nano.content}
          onSave={(c) => { nanoSave(c); setNano(null); }}
          onClose={() => setNano(null)}
        />
      )}

      {/* ── Completion overlay ── */}
      {finished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center max-w-sm px-8 py-10 rounded-2xl border border-violet-400/30 bg-[#0d0d1a]/95 shadow-2xl shadow-violet-900/40">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/40">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">أتقنت المعمل!</div>
            <div className="text-sm text-white/50 mb-6 leading-relaxed">
              أكملت جميع المهام بنجاح. تمكنت من إدارة الملفات والمجلدات وتحرير النصوص باحترافية على Linux.
            </div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {["mkdir", "cp / mv", "cat / wc", "nano / echo"].map(s => (
                <div key={s} className="text-[11px] px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                  ✅ {s}
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
            >
              إعادة التجربة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
