import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Mic, MicOff, MessageSquare, Users, Play, X, Crown,
  ChevronLeft, Download, AlertTriangle, Clock, Check,
  Pencil, Plus, Terminal, Eye, ChevronDown, Send, FileCode2,
  Folder, FolderOpen, Trash2, FolderTree, Square, MoreVertical, FolderPlus,
  RefreshCw, Monitor, Smartphone, Maximize2, ExternalLink, Package,
  HelpCircle, BookOpen, Lightbulb, ChevronRight, Zap, Shield, Info,
} from "lucide-react";

type Member = {
  userId: number;
  username: string;
  color: string;
  role: "host" | "member";
  canWrite: boolean;
  canRun: boolean;
  micEnabled: boolean;
  isOnline: boolean;
};

type ChatMsg = {
  userId: number;
  username: string;
  color: string;
  text: string;
  timestamp: string;
};

type RunOutput = {
  triggeredBy: number;
  triggeredByName: string;
  output: string;
  language: string;
  timestamp: string;
};

type FileMeta = { file_path: string; content: string; language: string };

type PendingRequest = { userId: number; username: string; color: string };

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  html: "html", css: "css", rs: "rust", go: "go",
  java: "java", cpp: "cpp", php: "php", json: "json",
  md: "markdown", sh: "shell", sql: "sql", c: "c",
};

function getMonacoLang(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

const SERVER_INTERACTIVE_LANGS = new Set(["python", "javascript", "bash", "c", "cpp"]);

const RUN_LANG_MAP: Record<string, string> = {
  py: "python",
  js: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp", cc: "cpp", cxx: "cpp", "c++": "cpp", h: "cpp", hpp: "cpp",
  rs: "rust",
  kt: "kotlin", kts: "kotlin",
  sh: "bash", bash: "bash",
  sql: "sql",
};

function runLangFor(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return RUN_LANG_MAP[ext] ?? null;
}

type ErrorHint = {
  severity: "error" | "warning" | "info";
  title: string;
  explanation: string;
  suggestion: string;
  pkgName?: string;
};

function analyzeOutput(output: string, lang: string): ErrorHint | null {
  const o = output;
  if (lang === "python" || o.includes("Traceback (most recent call last)")) {
    const m1 = o.match(/ModuleNotFoundError: No module named '([^']+)'/);
    if (m1) {
      const pkg = m1[1].split(".")[0];
      return { severity: "error", title: `مكتبة «${pkg}» غير مثبتة`, explanation: `البرنامج يحاول استيراد مكتبة «${pkg}» لكنها غير موجودة في البيئة الحالية.`, suggestion: `اضغط زر «تنزيل مكتبة 📦» في الشريط العلوي واكتب: ${pkg}`, pkgName: pkg };
    }
    const m2 = o.match(/ImportError: cannot import name '([^']+)' from '([^']+)'/);
    if (m2) return { severity: "error", title: `خطأ في الاستيراد`, explanation: `لا يمكن استيراد «${m2[1]}» من مكتبة «${m2[2]}». قد يكون الاسم خاطئاً أو المكتبة قديمة.`, suggestion: `راجع توثيق مكتبة «${m2[2]}» للتأكد من الاسم الصحيح.` };
    if (o.includes("SyntaxError:")) {
      const lineMatch = o.match(/line (\d+)/);
      return { severity: "error", title: `خطأ في الصياغة${lineMatch ? ` — السطر ${lineMatch[1]}` : ""}`, explanation: `يوجد خطأ في كتابة الكود. غالباً قوس مفقود أو نقطتان مفقودتان أو علامة اقتباس غير مكتملة.`, suggestion: `راجع${lineMatch ? ` السطر ${lineMatch[1]} و` : ""} الأسطر المجاورة بحثاً عن أقواس أو علامات غير مكتملة.` };
    }
    if (o.includes("IndentationError:")) return { severity: "error", title: `خطأ في المسافات البادئة`, explanation: `Python يعتمد على المسافات البادئة لتحديد بنية الكود. هناك تضارب في المسافات.`, suggestion: `استخدم نفس عدد المسافات في كل مستوى ولا تخلط بين Spaces وTabs.` };
    const m3 = o.match(/NameError: name '([^']+)' is not defined/);
    if (m3) return { severity: "error", title: `«${m3[1]}» غير معرَّف`, explanation: `البرنامج يحاول استخدام «${m3[1]}» لكنه لم يُعرَّف بعد أو يوجد خطأ إملائي.`, suggestion: `تحقق من إملاء «${m3[1]}» وتأكد من تعريفه قبل استخدامه.` };
    const m4 = o.match(/AttributeError: '([^']+)' object has no attribute '([^']+)'/);
    if (m4) return { severity: "error", title: `خاصية «${m4[2]}» غير موجودة`, explanation: `الكائن من نوع «${m4[1]}» لا يملك خاصية أو دالة باسم «${m4[2]}».`, suggestion: `استخدم dir(obj) لرؤية الخصائص المتاحة، أو راجع توثيق «${m4[1]}».` };
    if (o.includes("TypeError:")) { const d = o.match(/TypeError: (.+)/)?.[1] ?? ""; return { severity: "error", title: `خطأ في نوع البيانات`, explanation: `تعارض في أنواع البيانات: ${d.slice(0, 100)}.`, suggestion: `استخدم type() للتحقق من نوع المتغيرات قبل تمريرها للدوال.` }; }
    if (o.includes("IndexError:")) return { severity: "error", title: `الفهرس خارج النطاق`, explanation: `تحاول الوصول لعنصر بفهرس أكبر من حجم القائمة.`, suggestion: `تحقق من حجم القائمة بـ len() قبل الوصول بالفهرس، أو استخدم حلقة for مباشرةً.` };
    const m5 = o.match(/KeyError: (.+)/);
    if (m5) return { severity: "error", title: `المفتاح ${m5[1].trim()} غير موجود`, explanation: `حاولت الوصول لمفتاح غير موجود في القاموس.`, suggestion: `استخدم dict.get(key, default) بدلاً من dict[key]، أو تحقق: if key in dict.` };
    if (o.includes("FileNotFoundError:")) return { severity: "error", title: `الملف غير موجود`, explanation: `البرنامج يحاول فتح ملف لا يوجد في المسار المحدد.`, suggestion: `في الغرفة البرمجية الملفات موجودة في نفس مجلد العمل. تحقق من الاسم والمسار.` };
    if (o.includes("ZeroDivisionError:")) return { severity: "error", title: `القسمة على صفر`, explanation: `البرنامج يقسم على صفر وهو غير مسموح به رياضياً.`, suggestion: `أضف تحققاً: if divisor != 0: result = a / divisor` };
    if (o.includes("RecursionError:")) return { severity: "error", title: `تكرار لا نهائي`, explanation: `الدالة تستدعي نفسها بلا توقف — تنقصك حالة الإيقاف (base case).`, suggestion: `أضف شرط توقف للدالة التكرارية يوقف الاستدعاء عند وصول الإدخال لحالة محددة.` };
    if (o.match(/ConnectionRefusedError|ConnectionError|urllib\.error|requests\.exceptions|socket\.gaierror/)) return { severity: "warning", title: `لا يمكن الاتصال بالشبكة`, explanation: `بيئة الغرفة البرمجية لا تسمح بالاتصال بالإنترنت الخارجي.`, suggestion: `اختبر الكود ببيانات محلية أو ملفات بدلاً من جلب البيانات من الإنترنت.` };
    if (o.includes("Traceback (most recent call last)")) return { severity: "error", title: `خطأ في تشغيل البرنامج`, explanation: `توقف البرنامج بسبب خطأ. اقرأ آخر سطرين في الناتج لفهم نوع الخطأ تحديداً.`, suggestion: `ابحث عن السطر الأخير الذي يبدأ بـ "Error:" — هو الوصف الأساسي للخطأ.` };
  }
  if (lang === "javascript" || lang === "typescript") {
    const m6 = o.match(/Cannot find module '([^']+)'/);
    if (m6) { const pkg = m6[1]; const isLocal = pkg.startsWith("."); return { severity: "error", title: isLocal ? `الملف «${pkg}» غير موجود` : `حزمة «${pkg}» غير مثبتة`, explanation: isLocal ? `الملف المستورد «${pkg}» غير موجود في المسار المحدد.` : `البرنامج يحاول استيراد «${pkg}» لكنها غير مثبتة.`, suggestion: isLocal ? `تحقق من المسار الصحيح للملف.` : `اضغط «تنزيل مكتبة 📦» واكتب: ${pkg}`, pkgName: isLocal ? undefined : pkg }; }
    const m7 = o.match(/ReferenceError: ([^\s]+) is not defined/);
    if (m7) return { severity: "error", title: `«${m7[1]}» غير معرَّف`, explanation: `المتغير أو الدالة «${m7[1]}» يُستخدم قبل تعريفه.`, suggestion: `أعلن عن المتغير بـ const أو let قبل استخدامه.` };
    if (o.match(/TypeError: .+ is not a function/)) { const d = o.match(/TypeError: (.+) is not a function/)?.[1] ?? ""; return { severity: "error", title: `«${d.slice(0,40)}» ليست دالة`, explanation: `تحاول استدعاء شيء كدالة لكنه ليس كذلك.`, suggestion: `تحقق من نوع المتغير: console.log(typeof variable) قبل استدعائه.` }; }
    if (o.match(/TypeError: Cannot read propert/)) return { severity: "error", title: `قراءة خاصية من قيمة فارغة`, explanation: `تحاول الوصول لخاصية متغير قيمته null أو undefined.`, suggestion: `تحقق قبل الوصول: if (obj) { ... } أو استخدم optional chaining: obj?.property` };
    if (o.includes("SyntaxError:")) return { severity: "error", title: `خطأ في الصياغة`, explanation: `هناك خطأ في بنية الكود. غالباً قوس مفقود أو فاصلة خاطئة.`, suggestion: `راجع الأسطر حول الخطأ المذكور بحثاً عن أقواس غير مكتملة.` };
  }
  if (lang === "c" || lang === "cpp") {
    const m8 = o.match(/error: '([^']+)' was not declared in this scope/);
    if (m8) return { severity: "error", title: `«${m8[1]}» غير معرَّف في هذا النطاق`, explanation: `المتغير أو الدالة «${m8[1]}» يُستخدم قبل تعريفه أو بدون تضمين المكتبة الصحيحة.`, suggestion: `تأكد من تضمين المكتبة (#include) المناسبة وتعريف المتغير قبل استخدامه.` };
    if (o.match(/undefined reference to/)) return { severity: "error", title: `مرجع غير محدود (Linker Error)`, explanation: `المترجم لا يجد تعريف دالة مستخدمة. غالباً مكتبة رياضية غير مرتبطة.`, suggestion: `إذا تستخدم دوالاً رياضية (sqrt, pow…) تأكد من وجود #include <math.h> والعلَم -lm.` };
    if (o.includes("Segmentation fault")) return { severity: "error", title: `خطأ في الذاكرة (Segmentation Fault)`, explanation: `البرنامج حاول الوصول لمنطقة ذاكرة غير مسموح بها — مؤشر NULL أو مصفوفة خارج الحدود.`, suggestion: `١) تحقق من عدم تجاوز حدود المصفوفات ٢) هيّئ المؤشرات قبل الاستخدام ٣) لا تصل لذاكرة بعد تحريرها.` };
    const m9 = o.match(/fatal error: (.+): No such file or directory/);
    if (m9) return { severity: "error", title: `ملف الرأس «${m9[1]}» غير موجود`, explanation: `المكتبة التي تحاول تضمينها غير متاحة في البيئة.`, suggestion: `المكتبات المتاحة: stdio.h, stdlib.h, string.h, math.h, time.h, stdbool.h.` };
  }
  if (o.match(/\bKilled\b|killed by signal|MemoryError/i)) return { severity: "warning", title: `البرنامج استهلك موارد كثيرة وتم إيقافه`, explanation: `البرنامج استهلك ذاكرة كبيرة أو دخل في حلقة لا نهائية.`, suggestion: `تحقق من عدم وجود حلقات لا نهائية. إذا تعمل ببيانات ضخمة عالجها على دفعات صغيرة.` };
  return null;
}

function sanitizeEntryCode(lang: string, code: string): string {
  if (lang !== "java") return code;
  return code.replace(
    /\bpublic\s+(?=(?:abstract\s+|final\s+|sealed\s+|strictfp\s+)*(?:class|interface|enum|record)\b)/g,
    "",
  );
}

const MAX_FILE_BYTES = 100_000;
const MAX_TOTAL_BYTES = 256_000;

function byteLen(s: string): number {
  return new TextEncoder().encode(s).length;
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function isValidPath(path: string): boolean {
  if (!path || path.length > 300) return false;
  if (path.startsWith("/") || path.endsWith("/")) return false;
  if (path.includes("\\")) return false;
  for (const seg of path.split("/")) {
    if (!seg || seg === "." || seg === "..") return false;
  }
  return true;
}

function normalizePath(base: string, ref: string): string {
  let p = ref.trim().replace(/^\.\//, "");
  if (p.startsWith("/")) p = p.slice(1);
  else if (base) p = `${base}/${p}`;
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function buildHtmlPreview(entryPath: string, allFiles: FileMeta[]): string {
  const entry = allFiles.find((f) => f.file_path === entryPath);
  if (!entry) return "";
  const base = dirOf(entryPath);
  const fileMap = new Map<string, FileMeta>(allFiles.map((f) => [f.file_path, f]));
  const lookup = (ref: string, fromBase = base): FileMeta | undefined => {
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:") || ref.startsWith("#")) return undefined;
    const resolved = normalizePath(fromBase, ref);
    return fileMap.get(resolved) ?? fileMap.get(ref.replace(/^\.?\//, ""));
  };
  const toSvgDataUrl = (content: string): string | null => {
    const t = content.trim();
    if (!t.startsWith("<svg") && !t.startsWith("<?xml")) return null;
    try { return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(content))); } catch { return null; }
  };
  const resolvedCss = new Set<string>();
  const resolveCss = (cssContent: string, cssBase: string): string => {
    let out = cssContent.replace(/@import\s+(?:url\s*\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi, (_, p) => {
      const f = lookup(p, cssBase);
      if (!f || resolvedCss.has(f.file_path)) return "";
      resolvedCss.add(f.file_path);
      return resolveCss(f.content ?? "", dirOf(f.file_path));
    });
    out = out.replace(/url\(\s*["']?([^"')#?]+)["']?\s*\)/gi, (m, u) => {
      if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:")) return m;
      const f = lookup(u, cssBase);
      if (!f?.content) return m;
      const d = toSvgDataUrl(f.content);
      return d ? `url("${d}")` : m;
    });
    return out;
  };
  let html = entry.content ?? "";
  html = html.replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (m, href) => {
    if (!/stylesheet/i.test(m) && !/\.css(\?|$)/i.test(href)) return m;
    const f = lookup(href);
    if (!f) return m;
    resolvedCss.add(f.file_path);
    return `<style>\n${resolveCss(f.content ?? "", dirOf(f.file_path))}\n</style>`;
  });
  html = html.replace(/<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)><\/script>/gi, (m, pre, src, post) => {
    const f = lookup(src);
    if (!f) return m;
    const attrs = `${pre} ${post}`.replace(/\bsrc\s*=\s*["'][^"']*["']/gi, "").replace(/\btype\s*=\s*["']module["']/gi, "").trim();
    return `<script ${attrs}>\n${f.content ?? ""}\n</script>`;
  });
  html = html.replace(/<img\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)\/?>/gi, (m, pre, src, post) => {
    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return m;
    const f = lookup(src);
    if (!f?.content) return m;
    const d = toSvgDataUrl(f.content);
    if (!d) return m;
    const attrs = `${pre} ${post}`.replace(/\bsrc\s*=\s*["'][^"']*["']/gi, "").trim();
    return `<img ${attrs} src="${d}">`;
  });
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => {
    return m.replace(css, resolveCss(css, base));
  });
  return html;
}

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

function buildTree(files: FileMeta[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const f of files) {
    const parts = f.file_path.split("/").filter(Boolean);
    let cur = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      acc = acc ? `${acc}/${seg}` : seg;
      const isLeaf = i === parts.length - 1;
      let node = cur.children.find((c) => c.name === seg && c.isDir === !isLeaf);
      if (!node) {
        node = { name: seg, path: isLeaf ? f.file_path : acc, isDir: !isLeaf, children: [] };
        cur.children.push(node);
      }
      cur = node;
    }
  }
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root.children;
}

function FileTreeNode({
  node, depth, activeFile, expandedFolders, onToggle, onOpen, onRename, onDelete, canWrite,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string;
  expandedFolders: Record<string, boolean>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  canWrite: boolean;
}) {
  const pad = 8 + depth * 12;
  if (node.isDir) {
    const open = expandedFolders[node.path] ?? true;
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className="w-full flex items-center gap-1.5 py-1.5 text-[12px] font-medium text-white/60 hover:text-white/90 hover:bg-white/[0.03] transition-colors text-right"
          style={{ paddingRight: pad, paddingLeft: 8 }}
        >
          <ChevronLeft className="w-3 h-3 shrink-0 transition-transform" style={{ transform: open ? "rotate(-90deg)" : "none" }} />
          {open ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400/70" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children.map((c) => (
          <FileTreeNode key={c.path} node={c} depth={depth + 1} activeFile={activeFile}
            expandedFolders={expandedFolders} onToggle={onToggle} onOpen={onOpen}
            onRename={onRename} onDelete={onDelete} canWrite={canWrite} />
        ))}
      </div>
    );
  }
  const active = activeFile === node.path;
  return (
    <div
      className="group flex items-center transition-colors"
      style={{ background: active ? "rgba(16,185,129,0.08)" : "transparent" }}
    >
      <button
        onClick={() => onOpen(node.path)}
        className="flex-1 min-w-0 flex items-center gap-1.5 py-1.5 text-[12px] font-medium transition-colors text-right"
        style={{ paddingRight: pad + 16, paddingLeft: 4, color: active ? "#34D399" : "rgba(255,255,255,0.5)" }}
      >
        <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ opacity: active ? 1 : 0.5 }} />
        <span className="truncate">{node.name}</span>
      </button>
      {canWrite && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pl-1.5">
          <button onClick={() => onRename(node.path)} title="إعادة تسمية"
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-white/5">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(node.path)} title="حذف"
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/5">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function MemberItem({
  member, isMe, isHost, onPermChange, onKick, onTransfer,
}: {
  member: Member;
  isMe: boolean;
  isHost: boolean;
  onPermChange: (userId: number, field: "canWrite" | "canRun", val: boolean) => void;
  onKick: (userId: number) => void;
  onTransfer: (userId: number) => void;
}) {
  const isHostMember = member.role === "host";
  const canWrite = member.canWrite || isHostMember;
  const canRun = member.canRun || isHostMember;
  const initial = member.username?.trim()?.charAt(0)?.toUpperCase() || "؟";
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl group transition-colors"
      style={{
        background: isMe ? `${member.color}12` : "rgba(255,255,255,0.02)",
        border: `1px solid ${isMe ? member.color + "33" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div className="relative shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: `${member.color}22`, border: `1.5px solid ${member.color}`, color: member.color }}
        >
          {initial}
        </div>
        <div
          className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: member.isOnline ? "#10B981" : "#4B5563", borderColor: "#04060e" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-bold text-white/85 truncate">{member.username}</span>
          {isHostMember && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          {isMe && <span className="text-[10px] text-white/35 shrink-0">(أنا)</span>}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: canWrite ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", color: canWrite ? "#34D399" : "rgba(255,255,255,0.35)" }}
          >
            {canWrite ? "كتابة" : "قراءة"}
          </span>
          {canRun && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA" }}>
              تشغيل
            </span>
          )}
          {member.micEnabled && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded" style={{ background: "rgba(16,185,129,0.15)" }}>
              <Mic className="w-2.5 h-2.5 text-emerald-400" />
            </span>
          )}
        </div>
      </div>
      {isHost && !isMe && (
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => onPermChange(member.userId, "canWrite", !member.canWrite)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
              style={{
                background: member.canWrite ? "rgba(16,185,129,0.18)" : "transparent",
                border: member.canWrite ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                color: member.canWrite ? "#10B981" : "rgba(255,255,255,0.3)",
              }}
              title={member.canWrite ? "سحب الكتابة" : "منح الكتابة"}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPermChange(member.userId, "canRun", !member.canRun)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
              style={{
                background: member.canRun ? "rgba(59,130,246,0.18)" : "transparent",
                border: member.canRun ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
                color: member.canRun ? "#60A5FA" : "rgba(255,255,255,0.3)",
              }}
              title={member.canRun ? "سحب التشغيل" : "منح التشغيل"}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => onTransfer(member.userId)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all hover:bg-amber-500/15"
              style={{ border: "1px solid transparent", color: "rgba(245,158,11,0.7)" }}
              title="نقل الإشراف"
            >
              <Crown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onKick(member.userId)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all hover:bg-red-500/15"
              style={{ border: "1px solid transparent", color: "rgba(239,68,68,0.7)" }}
              title="طرد"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingBanner({
  requests, onAdmit, onReject,
}: {
  requests: PendingRequest[];
  onAdmit: (userId: number) => void;
  onReject: (userId: number) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div
      className="shrink-0 flex flex-col gap-1.5 p-2.5 border-b"
      style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }}
    >
      {requests.map((r) => (
        <div key={r.userId} className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
          <span className="text-xs text-amber-200 flex-1 font-bold truncate">
            <span className="text-amber-400">{r.username}</span> يطلب الدخول للغرفة
          </span>
          <button onClick={() => onAdmit(r.userId)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:bg-emerald-500/20"
            style={{ color: "#34D399", border: "1px solid rgba(16,185,129,0.35)" }}>
            <Check className="w-3.5 h-3.5" /> قبول
          </button>
          <button onClick={() => onReject(r.userId)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:bg-red-500/20"
            style={{ color: "#F87171", border: "1px solid rgba(239,68,68,0.35)" }}>
            <X className="w-3.5 h-3.5" /> رفض
          </button>
        </div>
      ))}
    </div>
  );
}

function dedupeMembers(list: Member[]): Member[] {
  const seen = new Set<number>();
  return list.filter((m) => { if (seen.has(m.userId)) return false; seen.add(m.userId); return true; });
}

type RemoteOp = {
  rangeOffset: number;
  rangeLength: number;
  text: string;
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
};

function applyOpsToText(text: string, ops: RemoteOp[]): string {
  let result = text;
  for (const op of ops) {
    result = result.slice(0, op.rangeOffset) + op.text + result.slice(op.rangeOffset + op.rangeLength);
  }
  return result;
}

export default function CodingRoom() {
  const [match, params] = useRoute<{ roomId: string }>("/coding-room/:roomId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const roomId = parseInt(params?.roomId ?? "", 10);

  const wsRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const peerRefs = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myUserIdRef = useRef<number | undefined>(undefined);

  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [myInfo, setMyInfo] = useState<{ role: "host" | "member"; color: string; canWrite: boolean; canRun: boolean } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const activeFileLang = getMonacoLang(activeFile);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [stdinText, setStdinText] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [runOutputs, setRunOutputs] = useState<RunOutput[]>([]);
  const [chatText, setChatText] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "error" | "waiting">("connecting");
  const [showChat, setShowChat] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null);
  const [newFile, setNewFile] = useState("");
  const [activeRightTab, setActiveRightTab] = useState<"output" | "preview">("output");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewEntry, setPreviewEntry] = useState<string>("");
  const [livePreview, setLivePreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [joinToast, setJoinToast] = useState<PendingRequest | null>(null);
  const joinToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hostGraceCountdown, setHostGraceCountdown] = useState<number | null>(null);
  const hostGraceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [processRunning, setProcessRunning] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstallInput, setShowInstallInput] = useState(false);
  const [installInput, setInstallInput] = useState("");
  const [installedPkgs, setInstalledPkgs] = useState<string[]>([]);
  const [errorHint, setErrorHint] = useState<ErrorHint | null>(null);
  const [showRoomGuide, setShowRoomGuide] = useState(false);
  const [liveOutput, setLiveOutput] = useState("");
  const [inputLine, setInputLine] = useState("");
  const liveOutputRef = useRef("");
  const liveEndRef = useRef<HTMLDivElement>(null);
  const processRunnerRef = useRef<{ id: number; name: string; language: string } | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [dockOpen, setDockOpen] = useState(true);
  const [addingFile, setAddingFile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"code" | "files" | "members">("code");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [mobileTerminalHeight, setMobileTerminalHeight] = useState(180);
  const mobileDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [desktopTerminalHeight, setDesktopTerminalHeight] = useState(300);
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const terminalDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const previewBlobRef = useRef<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeFileRef = useRef<string>("");
  const modelFileRef = useRef<string>("");
  const showChatRef = useRef(false);
  const myInfoRef = useRef<typeof myInfo>(null);
  const handleWsMsgRef = useRef<(raw: string) => void>(() => {});

  useEffect(() => {
    if (processRunning) {
      liveEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [liveOutput, processRunning]);

  useEffect(() => {
    if (processRunning) {
      setTimeout(() => hiddenInputRef.current?.focus(), 80);
    }
  }, [processRunning]);

  useEffect(() => {
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    if (!previewHtml) { previewBlobRef.current = ""; setPreviewBlobUrl(""); return; }
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    previewBlobRef.current = url;
    setPreviewBlobUrl(url);
  }, [previewHtml]);

  useEffect(() => {
    return () => { if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current); };
  }, []);

  useEffect(() => {
    if (!livePreview || !previewEntry || activeRightTab !== "preview" || !dockOpen) return;
    const timer = setTimeout(() => {
      const liveFiles = files.map((f) =>
        f.file_path === activeFileRef.current
          ? { ...f, content: editorRef.current?.getValue() ?? f.content }
          : f
      );
      setPreviewHtml(buildHtmlPreview(previewEntry, liveFiles));
    }, 600);
    return () => clearTimeout(timer);
  }, [files, livePreview, previewEntry, activeRightTab, dockOpen]);

  showChatRef.current = showChat;
  myInfoRef.current = myInfo;
  myUserIdRef.current = (user as any)?.id;

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  useEffect(() => {
    if (!showChat) return;
    setUnreadChat(0);
  }, [showChat]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const initWebRTC = useCallback(async (targetUserId: number, initiator: boolean) => {
    if (peerRefs.current.has(targetUserId)) return peerRefs.current.get(targetUserId) ?? null;

    try {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerRefs.current.set(targetUserId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "webrtc_signal",
            targetUserId,
            signal: { type: "candidate", candidate: e.candidate },
          }));
        }
      };

      pc.ontrack = (e) => {
        let audio = document.querySelector(`audio[data-peer="${targetUserId}"]`) as HTMLAudioElement | null;
        if (!audio) {
          audio = document.createElement("audio");
          audio.setAttribute("data-peer", String(targetUserId));
          audio.autoplay = true;
          document.body.appendChild(audio);
        }
        audio.srcObject = e.streams[0];
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsRef.current?.send(JSON.stringify({
          type: "webrtc_signal",
          targetUserId,
          signal: { type: "offer", sdp: offer },
        }));
      }
      return pc;
    } catch {
      return null;
    }
  }, []);

  const handleWebRTCSignal = useCallback(async (fromUserId: number, signal: any) => {
    try {
      let pc = peerRefs.current.get(fromUserId);
      if (!pc) {
        if (signal.type !== "offer") return;
        const newPc = await initWebRTC(fromUserId, false);
        if (!newPc) return;
        pc = newPc;
      }
      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({
          type: "webrtc_signal",
          targetUserId: fromUserId,
          signal: { type: "answer", sdp: answer },
        }));
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch {}
  }, [initWebRTC]);

  const teardownPeer = useCallback((targetUserId: number) => {
    const pc = peerRefs.current.get(targetUserId);
    if (pc) {
      try { pc.close(); } catch {}
      peerRefs.current.delete(targetUserId);
    }
    document.querySelector(`audio[data-peer="${targetUserId}"]`)?.remove();
  }, []);

  const maybeConnectPeer = useCallback((targetUserId: number, targetHasMic: boolean) => {
    const myId = myUserIdRef.current;
    if (myId == null || targetUserId === myId) return;
    const iHaveMic = !!localStreamRef.current;
    if (!iHaveMic && !targetHasMic) return;
    if (peerRefs.current.has(targetUserId)) return;
    if (myId < targetUserId) {
      initWebRTC(targetUserId, true);
    }
  }, [initWebRTC]);

  const handleWsMessage = useCallback(async (raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    const myUserId = (user as any)?.id;

    switch (msg.type) {
      case "room_state": {
        const filesFromWs: FileMeta[] = msg.files ?? [];
        const membersFromWs: Member[] = msg.members ?? [];
        setMyInfo({ role: msg.role, color: msg.color, canWrite: msg.canWrite, canRun: msg.canRun });
        setMembers(dedupeMembers(membersFromWs));
        setFiles(filesFromWs);
        if (filesFromWs.length > 0) {
          setActiveFile((prev) => {
            const target = prev && filesFromWs.find((f) => f.file_path === prev) ? prev : filesFromWs[0].file_path;
            setOpenTabs((tabs) => (tabs.includes(target) ? tabs : [...tabs, target]));
            return target;
          });
        }
        if (msg.role === "host" && Array.isArray(msg.pending)) {
          setPendingRequests(msg.pending.map((p: any) => ({
            userId: p.userId, username: p.username, color: p.color ?? "#94A3B8",
          })));
        }
        for (const m of membersFromWs) {
          if (m.userId !== myUserId && m.isOnline && m.micEnabled) {
            maybeConnectPeer(m.userId, true);
          }
        }
        setWsStatus("connected");
        setConnected(true);
        break;
      }

      case "member_joined":
        setMembers(dedupeMembers(msg.members ?? []));
        if (msg.userId !== myUserId) {
          setChatMsgs((prev) => [...prev, {
            userId: -1, username: "النظام", color: "#64748B",
            text: `${msg.username} انضم للغرفة 👋`, timestamp: new Date().toISOString(),
          }]);
          if (!showChatRef.current) setUnreadChat((c) => c + 1);
          maybeConnectPeer(msg.userId, !!msg.micEnabled);
        }
        break;

      case "member_left":
        setMembers(dedupeMembers(msg.members ?? []));
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: `عضو ${msg.reason === "kicked" ? "طُرد من" : "غادر"} الغرفة`, timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        { const pc = peerRefs.current.get(msg.userId); if (pc) { pc.close(); peerRefs.current.delete(msg.userId); } }
        document.querySelector(`audio[data-peer="${msg.userId}"]`)?.remove();
        break;

      case "host_changed":
        setMembers(dedupeMembers(msg.members ?? []));
        if (msg.newHostUserId !== myUserIdRef.current) {
          setMyInfo((prev) => prev?.role === "host" ? { ...prev, role: "member", canWrite: false, canRun: false } : prev);
        }
        break;

      case "you_are_host":
        setMyInfo((prev) => prev ? { ...prev, role: "host", canWrite: true, canRun: true } : prev);
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#F59E0B",
          text: "👑 أنت الآن مشرف الغرفة", timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;

      case "permission_changed":
        setMembers(dedupeMembers(msg.members ?? []));
        if (msg.targetUserId === myUserId) {
          setMyInfo((prev) => prev ? { ...prev, canWrite: msg.canWrite, canRun: msg.canRun } : prev);
          setChatMsgs((prev) => [...prev, {
            userId: -1, username: "النظام", color: "#3B82F6",
            text: `تم ${msg.canWrite ? "منحك" : "سحب"} إذن الكتابة ${msg.canRun ? "والتشغيل" : ""}`.trim(),
            timestamp: new Date().toISOString(),
          }]);
          if (!showChatRef.current) setUnreadChat((c) => c + 1);
        }
        break;

      case "code_change":
        if (msg.userId !== myUserId) {
          const incomingFile: string = msg.file ?? "";
          const ops: RemoteOp[] = msg.ops ?? [];
          if (ops.length === 0) break;
          if (incomingFile === activeFileRef.current && editorRef.current && monacoRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
              isApplyingRemoteRef.current = true;
              try {
                model.applyEdits(ops.map((op) => ({
                  range: new monacoRef.current.Range(
                    op.range.startLineNumber,
                    op.range.startColumn,
                    op.range.endLineNumber,
                    op.range.endColumn,
                  ),
                  text: op.text,
                  forceMoveMarkers: true,
                })));
                const newContent = model.getValue();
                setFiles((prev) => prev.map((f) =>
                  f.file_path === incomingFile ? { ...f, content: newContent } : f
                ));
              } finally {
                isApplyingRemoteRef.current = false;
              }
            }
          } else {
            setFiles((prev) => prev.map((f) =>
              f.file_path === incomingFile ? { ...f, content: applyOpsToText(f.content, ops) } : f
            ));
          }
        }
        break;

      case "cursor_move":
        break;

      case "file_created":
        setFiles((prev) => {
          if (prev.find((f) => f.file_path === msg.filePath)) return prev;
          return [...prev, { file_path: msg.filePath, content: msg.content ?? "", language: "" }];
        });
        if (msg.userId === myUserId) {
          setOpenTabs((tabs) => (tabs.includes(msg.filePath) ? tabs : [...tabs, msg.filePath]));
          setActiveFile(msg.filePath);
        }
        break;

      case "file_deleted":
        setFiles((prev) => prev.filter((f) => f.file_path !== msg.filePath));
        setOpenTabs((prev) => {
          const next = prev.filter((p) => p !== msg.filePath);
          if (activeFileRef.current === msg.filePath) {
            setActiveFile(next[next.length - 1] ?? "");
          }
          return next;
        });
        break;

      case "file_renamed": {
        const oldP: string = msg.oldPath;
        const newP: string = msg.newPath;
        setFiles((prev) => prev.map((f) => f.file_path === oldP ? { ...f, file_path: newP } : f));
        setOpenTabs((prev) => prev.map((p) => (p === oldP ? newP : p)));
        if (modelFileRef.current === oldP) modelFileRef.current = newP;
        if (activeFileRef.current === oldP) setActiveFile(newP);
        break;
      }

      case "file_delete_request": {
        if (myInfoRef.current?.role === "host") {
          if (confirm(`${msg.username} يطلب حذف الملف: ${msg.filePath}\nهل توافق؟`)) {
            wsRef.current?.send(JSON.stringify({
              type: "file_delete_approve",
              filePath: msg.filePath,
              requestUserId: msg.userId,
            }));
          }
        }
        break;
      }

      case "join_request_pending": {
        const req: PendingRequest = { userId: msg.userId, username: msg.username, color: msg.color ?? "#94A3B8" };
        setPendingRequests((prev) => {
          if (prev.find((r) => r.userId === msg.userId)) return prev;
          return [...prev, req];
        });
        setJoinToast(req);
        if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current);
        joinToastTimerRef.current = setTimeout(() => setJoinToast(null), 12000);
        break;
      }

      case "join_request_cancelled":
        setPendingRequests((prev) => prev.filter((r) => r.userId !== msg.userId));
        setJoinToast((prev) => prev?.userId === msg.userId ? null : prev);
        break;

      case "host_disconnected": {
        const secs: number = msg.graceSeconds ?? 30;
        setHostGraceCountdown(secs);
        if (hostGraceIntervalRef.current) clearInterval(hostGraceIntervalRef.current);
        hostGraceIntervalRef.current = setInterval(() => {
          setHostGraceCountdown((c) => {
            if (c === null || c <= 1) {
              if (hostGraceIntervalRef.current) clearInterval(hostGraceIntervalRef.current);
              return null;
            }
            return c - 1;
          });
        }, 1000);
        break;
      }

      case "host_reconnected":
        setHostGraceCountdown(null);
        if (hostGraceIntervalRef.current) clearInterval(hostGraceIntervalRef.current);
        break;

      case "chat_message":
        setChatMsgs((prev) => [...prev, msg]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;

      case "process_start":
        processRunnerRef.current = { id: msg.runnerId ?? -1, name: msg.runnerName ?? "؟", language: msg.language ?? "" };
        liveOutputRef.current = "";
        setLiveOutput("");
        setInputLine("");
        setProcessRunning(true);
        setActiveRightTab("output");
        setDockOpen(true);
        setMobileTab("code");
        break;

      case "process_output": {
        const chunk = String(msg.data ?? "");
        const next = (liveOutputRef.current + chunk).slice(-100_000);
        liveOutputRef.current = next;
        setLiveOutput(next);
        break;
      }

      case "process_exit": {
        setProcessRunning(false);
        const exitOutput = liveOutputRef.current || "(لا ناتج)";
        const exitLang = processRunnerRef.current?.language ?? "";
        setRunOutputs((prev) => [...prev, {
          triggeredBy: processRunnerRef.current?.id ?? -1,
          triggeredByName: processRunnerRef.current?.name ?? "؟",
          output: exitOutput,
          language: exitLang,
          timestamp: new Date().toISOString(),
        }]);
        const hint = analyzeOutput(exitOutput, exitLang);
        setErrorHint(hint);
        break;
      }

      case "install_done":
        setInstalling(false);
        if (msg.success && Array.isArray(msg.packages)) {
          setInstalledPkgs((prev) => Array.from(new Set([...prev, ...msg.packages])));
        }
        break;

      case "run_output":
        setRunOutputs((prev) => [...prev, msg]);
        setActiveRightTab("output");
        setDockOpen(true);
        setIsRunning(false);
        setMobileTab("code");
        break;

      case "run_request":
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "النظام", color: "#64748B",
          text: `${msg.username} يطلب تشغيل الكود`, timestamp: new Date().toISOString(),
        }]);
        break;

      case "room_closing":
        setClosingCountdown(msg.countdown ?? 30);
        break;

      case "room_closed":
        navigate("/coding-rooms");
        break;

      case "kicked":
      case "rejected":
        alert(msg.message ?? "تم رفض دخولك أو طردك من الغرفة");
        navigate("/coding-rooms");
        break;

      case "waiting_approval":
        setWsStatus("waiting");
        break;

      case "mic_state":
        setMembers((prev) => prev.map((m) =>
          m.userId === msg.userId ? { ...m, micEnabled: !!msg.enabled } : m
        ));
        if (msg.userId !== myUserId) {
          teardownPeer(msg.userId);
          maybeConnectPeer(msg.userId, !!msg.enabled);
        }
        break;

      case "webrtc_signal":
        handleWebRTCSignal(msg.fromUserId, msg.signal);
        break;

      case "error":
        setChatMsgs((prev) => [...prev, {
          userId: -1, username: "خطأ", color: "#EF4444",
          text: msg.message ?? "حدث خطأ", timestamp: new Date().toISOString(),
        }]);
        if (!showChatRef.current) setUnreadChat((c) => c + 1);
        break;
    }
  }, [user, handleWebRTCSignal, navigate, maybeConnectPeer, teardownPeer]);

  handleWsMsgRef.current = handleWsMessage;

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/room/${roomId}`);
      wsRef.current = ws;
      ws.onopen = () => {
        if (!destroyed) setWsStatus("connecting");
      };
      ws.onmessage = (e) => handleWsMsgRef.current(e.data);
      ws.onerror = () => {
        if (!destroyed) {
          setWsStatus("error");
          setIsRunning(false);
        }
      };
      ws.onclose = (ev) => {
        if (destroyed) return;
        setIsRunning(false);
        if (ev.code === 1008 || ev.code === 1011) {
          setConnected(false);
          setWsStatus("error");
          return;
        }
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close(1000, "leave");
      peerRefs.current.forEach((pc) => pc.close());
      peerRefs.current.clear();
      document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
      if (joinToastTimerRef.current) clearTimeout(joinToastTimerRef.current);
      if (hostGraceIntervalRef.current) clearInterval(hostGraceIntervalRef.current);
    };
  }, [match, roomId]);

  useEffect(() => {
    if (!match || isNaN(roomId)) return;
    fetch(`/api/coding-rooms/${roomId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoomInfo(d.room); })
      .catch(() => {});
  }, [match, roomId]);

  useEffect(() => {
    if (!closingCountdown || closingCountdown <= 0) return;
    const t = setTimeout(() => setClosingCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [closingCountdown]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (!activeFile) return;
    const file = files.find((f) => f.file_path === activeFile);
    if (!file) return;
    const model = editorRef.current.getModel();
    if (model) {
      const prevFile = modelFileRef.current;
      if (prevFile && prevFile !== activeFile && files.some((f) => f.file_path === prevFile)) {
        const prevContent = model.getValue();
        if (sendTimerRef.current) {
          clearTimeout(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "code_change", file: prevFile, fullContent: prevContent }));
        }
        setFiles((prev) => prev.map((f) => f.file_path === prevFile ? { ...f, content: prevContent } : f));
      }
      const target = file.content ?? "";
      if (model.getValue() !== target) {
        if (sendTimerRef.current) {
          clearTimeout(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        isApplyingRemoteRef.current = true;
        try {
          editorRef.current.pushUndoStop();
          model.setValue(target);
          editorRef.current.pushUndoStop();
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
      monacoRef.current.editor.setModelLanguage(model, getMonacoLang(activeFile));
      modelFileRef.current = activeFile;
    }
    const isEditable = !!(myInfo?.canWrite || myInfo?.role === "host");
    editorRef.current.updateOptions({ readOnly: !isEditable });
  }, [activeFile, myInfo]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("nukhba-cyber", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "4B5563", fontStyle: "italic" },
        { token: "keyword", foreground: "10B981" },
        { token: "string", foreground: "F59E0B" },
        { token: "number", foreground: "3B82F6" },
        { token: "type", foreground: "A855F7" },
      ],
      colors: {
        "editor.background": "#060912",
        "editor.foreground": "#E5E7EB",
        "editorCursor.foreground": "#10B981",
        "editor.lineHighlightBackground": "#10B98108",
        "editorLineNumber.foreground": "#374151",
        "editorLineNumber.activeForeground": "#10B981",
        "editor.selectionBackground": "#10B98130",
      },
    });
    monaco.editor.setTheme("nukhba-cyber");

    editor.onDidChangeModelContent((event: { changes: Array<{ rangeOffset: number; rangeLength: number; text: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }> }) => {
      if (isApplyingRemoteRef.current) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const currentFile = activeFileRef.current;
      if (!currentFile) return;
      const ops = event.changes.map((c: { rangeOffset: number; rangeLength: number; text: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }) => ({
        rangeOffset: c.rangeOffset,
        rangeLength: c.rangeLength,
        text: c.text,
        range: {
          startLineNumber: c.range.startLineNumber,
          startColumn: c.range.startColumn,
          endLineNumber: c.range.endLineNumber,
          endColumn: c.range.endColumn,
        },
      }));
      const content = editor.getValue();
      wsRef.current.send(JSON.stringify({
        type: "code_change",
        file: currentFile,
        ops,
        fullContent: content,
      }));
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      sendTimerRef.current = setTimeout(() => {
        sendTimerRef.current = null;
        setFiles((prev) => prev.map((f) => f.file_path === currentFile ? { ...f, content } : f));
      }, 300);
    });

  };

  const handleInstallPackages = () => {
    const pkgs = installInput.trim();
    if (!pkgs || installing || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setInstalling(true);
    setShowInstallInput(false);
    setInstallInput("");
    setActiveRightTab("output");
    setDockOpen(true);
    liveOutputRef.current = "";
    setLiveOutput("");
    wsRef.current.send(JSON.stringify({ type: "install_packages", packages: pkgs, language: activeFileLang || "python" }));
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat_message", text }));
    setChatText("");
  };

  const toggleMic = async () => {
    if (micEnabled) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setMicEnabled(false);
      wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: false }));
      peerRefs.current.forEach((pc) => pc.close());
      peerRefs.current.clear();
      document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
      for (const m of members) {
        if (m.userId !== myUserIdRef.current && m.isOnline && m.micEnabled) {
          maybeConnectPeer(m.userId, true);
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setMicEnabled(true);
        wsRef.current?.send(JSON.stringify({ type: "mic_state", enabled: true }));
        peerRefs.current.forEach((pc) => pc.close());
        peerRefs.current.clear();
        document.querySelectorAll("audio[data-peer]").forEach((el) => el.remove());
        for (const m of members) {
          if (m.userId !== myUserIdRef.current && m.isOnline) {
            maybeConnectPeer(m.userId, m.micEnabled);
          }
        }
      } catch {
        alert("تعذر الوصول إلى الميكروفون. تأكد من منح الإذن في المتصفح.");
      }
    }
  };

  const handlePermChange = (targetUserId: number, field: "canWrite" | "canRun", val: boolean) => {
    wsRef.current?.send(JSON.stringify({
      type: "permission_change",
      targetUserId,
      [field]: val,
    }));
  };

  const handleKick = (targetUserId: number) => {
    if (!confirm("هل تريد طرد هذا العضو؟")) return;
    wsRef.current?.send(JSON.stringify({ type: "kick_member", targetUserId }));
  };

  const handleTransfer = (targetUserId: number) => {
    if (!confirm("هل تريد نقل الإشراف لهذا العضو؟")) return;
    wsRef.current?.send(JSON.stringify({ type: "transfer_host", targetUserId }));
  };

  const handleCloseRoom = () => {
    if (!confirm("إغلاق الغرفة؟ سيُعطى المشتركون 30 ثانية لتحميل الكود.")) return;
    wsRef.current?.send(JSON.stringify({ type: "room_closing" }));
  };

  const handleLeave = () => {
    wsRef.current?.close(1000, "leave");
    fetch(`/api/coding-rooms/${roomId}/leave`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
    navigate("/coding-rooms");
  };

  const handleDownload = async () => {
    try {
      const r = await fetch(`/api/coding-rooms/${roomId}/download`, { credentials: "include" });
      const d = await r.json();
      const fileList: { file_path: string; content: string }[] = d.files ?? [];
      if (fileList.length === 0) { alert("لا توجد ملفات للتحميل"); return; }
      if (fileList.length === 1) {
        const blob = new Blob([fileList[0].content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileList[0].file_path.split("/").pop() ?? "code.txt";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      const combined = fileList.map((f) => `${"=".repeat(60)}\n${f.file_path}\n${"=".repeat(60)}\n${f.content}\n`).join("\n");
      const blob = new Blob([combined], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `room-${roomId}-code.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert("فشل التحميل"); }
  };

  const handleRunCode = async () => {
    if (!myInfo?.canRun && myInfo?.role !== "host") {
      wsRef.current?.send(JSON.stringify({ type: "run_code" }));
      return;
    }
    const currentFile = activeFileRef.current;
    const file = files.find((f) => f.file_path === currentFile);
    if (!file) { alert("اختر ملفاً أولاً"); return; }

    const entryContent = editorRef.current?.getValue() ?? file.content;
    const liveFiles = files.map((f) =>
      f.file_path === currentFile ? { ...f, content: entryContent } : f
    );

    if (currentFile.endsWith(".html")) {
      setPreviewEntry(currentFile);
      setPreviewHtml(buildHtmlPreview(currentFile, liveFiles));
      setActiveRightTab("preview");
      setDockOpen(true);
      wsRef.current?.send(JSON.stringify({ type: "run_output", output: "✅ تم عرض معاينة HTML", language: "html" }));
      return;
    }

    const lang = runLangFor(currentFile);
    if (!lang) {
      const ext = currentFile.split(".").pop()?.toLowerCase() ?? "";
      wsRef.current?.send(JSON.stringify({
        type: "run_output",
        output: `⚠️ صيغة الملف «.${ext}» غير قابلة للتشغيل. اللغات المدعومة: Python, JavaScript, TypeScript, Java, C, C++, Rust, Kotlin, Bash, SQL`,
        language: ext,
      }));
      setActiveRightTab("output");
      setDockOpen(true);
      return;
    }

    if (SERVER_INTERACTIVE_LANGS.has(lang) && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "run_interactive", entryFile: currentFile, language: lang }));
      return;
    }

    const codes: Array<{ file: string; code: string }> = [];
    let total = byteLen(entryContent);
    let skipped = 0;
    for (const f of liveFiles) {
      if (f.file_path === currentFile) continue;
      const size = byteLen(f.content ?? "");
      if (size > MAX_FILE_BYTES) { skipped++; continue; }
      if (total + size > MAX_TOTAL_BYTES) { skipped++; continue; }
      total += size;
      codes.push({ file: f.file_path, code: f.content ?? "" });
    }

    const emitOutput = (out: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "run_output", output: out, language: lang }));
      } else {
        setRunOutputs((prev) => [...prev, {
          triggeredBy: myUserIdRef.current ?? -1,
          triggeredByName: (user as any)?.displayName ?? "أنا",
          output: out,
          language: lang,
          timestamp: new Date().toISOString(),
        }]);
        setActiveRightTab("output");
        setDockOpen(true);
        setIsRunning(false);
      }
    };

    setIsRunning(true);
    try {
      const r = await fetch("/api/ai/run-code", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          code: sanitizeEntryCode(lang, entryContent),
          codes,
          stdin: stdinText,
        }),
      });
      const d = await r.json();
      let out = d.output ?? d.error ?? "⚠️ لا يوجد ناتج";
      if (d.error && d.output) out = `${d.output}\n${d.error}`;
      if (skipped > 0) out = `⚠️ تم تجاهل ${skipped} ملف لتجاوز حد الحجم\n${out}`;
      emitOutput(out);
    } catch {
      emitOutput("❌ خطأ في الاتصال بخادم التشغيل");
    }
  };

  const addNewFile = () => {
    const filePath = newFile.trim();
    if (!filePath) return;
    if (!isValidPath(filePath)) {
      alert("مسار غير صالح — لا يبدأ بـ / ولا يحتوي ..");
      return;
    }
    if (files.find((f) => f.file_path === filePath)) {
      openFile(filePath);
      setNewFile("");
      setAddingFile(false);
      return;
    }
    wsRef.current?.send(JSON.stringify({ type: "file_created", filePath, content: "" }));
    setNewFile("");
    setAddingFile(false);
  };

  const openFile = useCallback((path: string) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveFile(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activeFileRef.current === path) {
        const idx = prev.indexOf(path);
        const fallback = next[idx] ?? next[idx - 1] ?? next[next.length - 1] ?? "";
        setActiveFile(fallback);
      }
      return next;
    });
  }, []);

  const submitRename = () => {
    const oldPath = renamingFile;
    const target = renameValue.trim();
    setRenamingFile(null);
    setRenameValue("");
    if (!oldPath || !target || target === oldPath) return;
    if (!isValidPath(target)) { alert("مسار غير صالح"); return; }
    if (files.some((f) => f.file_path === target)) { alert("يوجد ملف بهذا الاسم"); return; }
    wsRef.current?.send(JSON.stringify({ type: "file_renamed", oldPath, newPath: target }));
  };

  const requestDeleteFile = (path: string) => {
    if (!confirm(`حذف الملف «${path}»؟`)) return;
    wsRef.current?.send(JSON.stringify({ type: "file_deleted", filePath: path }));
  };

  const handleAdmit = (targetUserId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "admit_member", targetUserId }));
    setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  const handleReject = (targetUserId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "reject_member", targetUserId }));
    setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  const myUserId = (user as any)?.id;

  if (!match) return null;

  if (wsStatus === "waiting") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: "hsl(222,28%,7%)" }} dir="rtl">
          <div className="text-center p-8 rounded-2xl max-w-sm w-full mx-4"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-black text-white mb-2">بانتظار موافقة المشرف</h2>
            <p className="text-white/40 text-sm mb-6">سيُعلمك المشرف بقبول طلبك — انتظر في هذه الصفحة</p>
            <button
              onClick={() => navigate("/coding-rooms")}
              className="px-6 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            >
              العودة للغرف
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (wsStatus === "error" && !connected) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen" dir="rtl">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">تعذر الاتصال بالغرفة</h2>
            <p className="text-white/40 text-sm mb-6">قد تكون الغرفة مغلقة أو حدث خطأ في الاتصال</p>
            <button onClick={() => navigate("/coding-rooms")}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              العودة للغرف
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canWrite = !!(myInfo?.canWrite || myInfo?.role === "host");
  const canRun = !!(myInfo?.canRun || myInfo?.role === "host");

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl" style={{ background: "#060912", fontFamily: "'Tajawal', sans-serif" }}>

      <AnimatePresence>
        {closingCountdown !== null && closingCountdown > 0 && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
            className="z-50 flex items-center justify-center gap-2 text-center py-2 text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(90deg,#DC2626,#EF4444,#DC2626)", color: "white" }}>
            <AlertTriangle className="w-4 h-4" />
            الغرفة ستُغلق خلال {closingCountdown} ثانية — حمّل الكود الآن!
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center gap-2 px-3 md:px-4 md:gap-3 h-14 shrink-0 border-b relative"
        style={{ background: "rgba(6,9,18,0.98)", borderColor: "rgba(255,255,255,0.07)" }}>
        <button onClick={handleLeave}
          className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 rounded-lg text-xs font-bold text-white/50 hover:text-white/90 transition-colors shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">خروج</span>
        </button>

        <div className="h-6 w-px bg-white/10 shrink-0 hidden md:block" />

        <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1 md:flex-none">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1 md:flex-none">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white truncate max-w-[140px] md:max-w-[200px]">
                {roomInfo?.title ?? `غرفة #${roomId}`}
              </span>
              {myInfo?.role === "host" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 hidden sm:flex"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <Crown className="w-2.5 h-2.5" /> مشرف
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: wsStatus === "connected" ? "#10B981" : wsStatus === "error" ? "#EF4444" : "#F59E0B",
                  boxShadow: `0 0 6px ${wsStatus === "connected" ? "#10B981" : wsStatus === "error" ? "#EF4444" : "#F59E0B"}`,
                }} />
              <span className="text-[10px] text-white/40 font-medium">
                {wsStatus === "connected" ? "متصل" : wsStatus === "error" ? "انقطع الاتصال" : "جاري الاتصال…"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 hidden md:block" />

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button onClick={toggleMic}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: micEnabled ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${micEnabled ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`, color: micEnabled ? "#34D399" : "rgba(255,255,255,0.5)" }}>
            {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{micEnabled ? "صوت" : "صامت"}</span>
          </button>

          <button onClick={() => { setShowChat((v) => !v); setUnreadChat(0); }}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: showChat ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${showChat ? "rgba(59,130,246,0.45)" : "rgba(255,255,255,0.1)"}`, color: showChat ? "#60A5FA" : "rgba(255,255,255,0.5)" }}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">دردشة</span>
            {unreadChat > 0 && !showChat && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#EF4444", color: "white" }}>{unreadChat > 9 ? "9+" : unreadChat}</span>
            )}
          </button>

          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">تحميل</span>
          </button>

          <div className="h-6 w-px bg-white/10" />

          {canRun ? (
            processRunning ? (
              <button onClick={() => wsRef.current?.send(JSON.stringify({ type: "kill_process" }))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-black transition-all animate-pulse"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#F87171" }}>
                <Square className="w-3.5 h-3.5" fill="currentColor" /> إيقاف
              </button>
            ) : (
              <button onClick={handleRunCode} disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-black transition-all"
                style={{ background: isRunning ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#10B981,#059669)", border: "1px solid rgba(16,185,129,0.5)", color: isRunning ? "#34D399" : "#04120c", boxShadow: isRunning ? "none" : "0 0 20px rgba(16,185,129,0.3)" }}>
                {isRunning ? (
                  <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(52,211,153,0.3)", borderTopColor: "#34D399" }} /> جاري…</>
                ) : (
                  <><Play className="w-3.5 h-3.5" fill="currentColor" /> تشغيل</>
                )}
              </button>
            )
          ) : wsStatus === "connected" ? (
            <button onClick={handleRunCode} title="طلب إذن التشغيل من المشرف"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
              <Play className="w-3.5 h-3.5" /> طلب تشغيل
            </button>
          ) : null}

          {canRun && (activeFileLang === "python" || activeFileLang === "javascript") && (
            <button
              onClick={() => setShowInstallInput(v => !v)}
              disabled={installing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: showInstallInput ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", border: `1px solid ${showInstallInput ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.3)"}`, color: "#34D399" }}
              title={activeFileLang === "javascript" ? "تنزيل حزمة npm" : "تنزيل مكتبة Python"}
            >
              {installing ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              ) : (
                <Package className="w-3.5 h-3.5" />
              )}
              <span>{installing ? "جاري..." : "تنزيل مكتبة"}</span>
            </button>
          )}

          <button
            onClick={() => setShowRoomGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hidden md:flex"
            style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "rgba(147,197,253,0.7)" }}
            title="دليل الغرفة البرمجية"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>دليل</span>
          </button>

          {myInfo?.role === "host" && (
            <button onClick={handleCloseRoom}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
              <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">إغلاق</span>
            </button>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {canRun ? (
            processRunning ? (
              <button onClick={() => wsRef.current?.send(JSON.stringify({ type: "kill_process" }))}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-black transition-all animate-pulse"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#F87171" }}>
                <Square className="w-3.5 h-3.5" fill="currentColor" /> إيقاف
              </button>
            ) : (
              <button onClick={handleRunCode} disabled={isRunning}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-black transition-all"
                style={{ background: isRunning ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg,#10B981,#059669)", border: "1px solid rgba(16,185,129,0.5)", color: isRunning ? "#34D399" : "#04120c", boxShadow: isRunning ? "none" : "0 0 16px rgba(16,185,129,0.3)" }}>
                {isRunning ? (
                  <><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(52,211,153,0.3)", borderTopColor: "#34D399" }} /> جاري…</>
                ) : (
                  <><Play className="w-3.5 h-3.5" fill="currentColor" /> تشغيل</>
                )}
              </button>
            )
          ) : wsStatus === "connected" ? (
            <button onClick={handleRunCode} title="طلب إذن التشغيل من المشرف"
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              <Play className="w-3.5 h-3.5" /> طلب تشغيل
            </button>
          ) : null}

          <button onClick={toggleMic}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ background: micEnabled ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${micEnabled ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`, color: micEnabled ? "#34D399" : "rgba(255,255,255,0.5)" }}
            title={micEnabled ? "إيقاف الصوت" : "تفعيل الصوت"}>
            {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button onClick={() => { setShowChat((v) => !v); setUnreadChat(0); }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ background: showChat ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${showChat ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.1)"}`, color: showChat ? "#60A5FA" : "rgba(255,255,255,0.5)" }}
            title="الدردشة">
            <MessageSquare className="w-4 h-4" />
            {unreadChat > 0 && !showChat && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#EF4444", color: "white" }}>{unreadChat > 9 ? "9+" : unreadChat}</span>
            )}
          </button>

          <button
            onClick={() => setShowMobileMenu((v) => !v)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ background: showMobileMenu ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {showMobileMenu && (
          <div className="absolute top-full right-0 z-50 flex flex-col p-2 gap-1 md:hidden rounded-b-xl shadow-2xl"
            style={{ background: "rgba(6,9,18,0.99)", border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", minWidth: 160 }}>
            <button onClick={() => { handleDownload(); setShowMobileMenu(false); }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-white/5 text-right"
              style={{ color: "rgba(255,255,255,0.6)" }}>
              <Download className="w-4 h-4" />
              تحميل الكود
            </button>
            {myInfo?.role === "host" && (
              <button onClick={() => { handleCloseRoom(); setShowMobileMenu(false); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-red-500/10 text-right"
                style={{ color: "#F87171" }}>
                <X className="w-4 h-4" />
                إغلاق الغرفة
              </button>
            )}
          </div>
        )}
      </header>

      {showInstallInput && canRun && (activeFileLang === "python" || activeFileLang === "javascript") && (
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: "rgba(4,6,14,0.97)", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
          <Package className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
          <input
            autoFocus
            dir="ltr"
            value={installInput}
            onChange={e => setInstallInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleInstallPackages(); if (e.key === "Escape") setShowInstallInput(false); }}
            placeholder={activeFileLang === "javascript" ? "lodash axios moment..." : "pandas numpy matplotlib..."}
            disabled={installing}
            className="flex-1 bg-transparent text-white/80 text-xs font-mono outline-none placeholder-white/20 min-w-0"
          />
          {installedPkgs.length > 0 && (
            <span className="text-[10px] font-mono shrink-0 hidden sm:block" style={{ color: "rgba(16,185,129,0.5)" }}>
              {installedPkgs.slice(-3).join(", ")}
            </span>
          )}
          <button
            onClick={handleInstallPackages}
            disabled={installing || !installInput.trim()}
            className="shrink-0 text-xs font-bold px-3 py-1 rounded-lg transition-all disabled:opacity-40"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34D399" }}
          >
            {installing ? "جاري…" : "تثبيت"}
          </button>
          <button onClick={() => setShowInstallInput(false)} className="shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        <aside className="hidden md:flex shrink-0 flex-col border-l overflow-hidden"
          style={{ background: "rgba(4,6,14,0.97)", borderColor: "rgba(255,255,255,0.06)", width: sidebarWidth }}>

          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white/70">الملفات</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>{files.length}</span>
              </div>
              {canWrite && !addingFile && (
                <button onClick={() => { setNewFile("folder/"); setAddingFile(true); }} title="ملف / مجلد جديد"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {addingFile && (
              <div className="flex items-center gap-1 px-2.5 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <input autoFocus value={newFile} onChange={(e) => setNewFile(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewFile(); } else if (e.key === "Escape") { setNewFile(""); setAddingFile(false); } }}
                  onBlur={() => { if (!newFile.trim()) setAddingFile(false); }}
                  placeholder="src/app.py"
                  dir="ltr"
                  className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg outline-none text-white placeholder:text-white/25 text-left"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)" }} />
                <button onClick={addNewFile}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition-colors shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-1.5">
              {files.length === 0 ? (
                <div className="text-xs text-white/25 text-center py-8 px-3">
                  {canWrite ? "لا توجد ملفات — اضغط + لإنشاء ملف" : "بانتظار إنشاء الملفات…"}
                </div>
              ) : (
                buildTree(files).map((node) => (
                  <FileTreeNode key={node.path} node={node} depth={0} activeFile={activeFile}
                    expandedFolders={expandedFolders}
                    onToggle={(p) => setExpandedFolders((prev) => ({ ...prev, [p]: !(prev[p] ?? true) }))}
                    onOpen={openFile}
                    onRename={(p) => { setRenamingFile(p); setRenameValue(p); }}
                    onDelete={requestDeleteFile}
                    canWrite={canWrite} />
                ))
              )}
            </div>
          </div>

          <div className="shrink-0 border-t flex flex-col" style={{ borderColor: "rgba(255,255,255,0.06)", maxHeight: "42%" }}>
            <div className="px-4 py-2.5 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white/70">الأعضاء</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>{members.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-1.5">
              {members.map((m) => (
                <MemberItem key={m.userId} member={m} isMe={m.userId === myUserId}
                  isHost={myInfo?.role === "host"} onPermChange={handlePermChange}
                  onKick={handleKick} onTransfer={handleTransfer} />
              ))}
              {members.length === 0 && (
                <div className="text-xs text-white/25 text-center py-4">لا أحد متصل بعد</div>
              )}
            </div>
          </div>
        </aside>

        <div
          className="hidden md:flex shrink-0 items-center justify-center cursor-col-resize select-none group"
          style={{ width: 8, zIndex: 20 }}
          onMouseDown={(e) => {
            e.preventDefault();
            sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
            const onMove = (ev: MouseEvent) => {
              if (!sidebarDragRef.current) return;
              const next = Math.max(180, Math.min(500, sidebarDragRef.current.startWidth + (sidebarDragRef.current.startX - ev.clientX)));
              setSidebarWidth(next);
            };
            const onUp = () => { sidebarDragRef.current = null; document.removeEventListener("mousemove", onMove); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp, { once: true });
          }}
        >
          <div className="transition-all duration-150 rounded-full group-hover:opacity-100 opacity-0"
            style={{ width: 3, height: 48, background: "rgba(16,185,129,0.6)", boxShadow: "0 0 8px rgba(16,185,129,0.4)" }} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">

          {myInfo?.role === "host" && (
            <PendingBanner requests={pendingRequests} onAdmit={handleAdmit} onReject={handleReject} />
          )}

          {myInfo?.role === "host" && joinToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[320px] max-w-[90vw]"
              style={{ filter: "drop-shadow(0 4px 24px rgba(245,158,11,0.25))" }}>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(22,18,6,0.97)", border: "1.5px solid rgba(245,158,11,0.5)" }}>
                <div className="w-3 h-3 rounded-full shrink-0 animate-pulse" style={{ background: joinToast.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-300/70 mb-0.5">طلب دخول</div>
                  <div className="text-sm font-bold text-amber-200 truncate">{joinToast.username}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { handleAdmit(joinToast.userId); setJoinToast(null); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#34D399" }}>
                    <Check className="w-3 h-3" /> قبول
                  </button>
                  <button onClick={() => { handleReject(joinToast.userId); setJoinToast(null); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#F87171" }}>
                    <X className="w-3 h-3" /> رفض
                  </button>
                </div>
                <button onClick={() => setJoinToast(null)}
                  className="w-5 h-5 shrink-0 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {hostGraceCountdown !== null && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2"
              style={{ background: "rgba(22,18,6,0.95)", border: "1px solid rgba(245,158,11,0.35)" }}>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              انقطع اتصال المشرف — ينتظر عودته ({hostGraceCountdown}ث)
            </div>
          )}

          {isMobile && mobileTab === "files" && (
            <div className="absolute inset-0 z-20 flex flex-col" style={{ background: "rgba(4,6,14,0.99)" }}>
              <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white/70">الملفات</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>{files.length}</span>
                </div>
                {canWrite && !addingFile && (
                  <button onClick={() => { setNewFile("folder/"); setAddingFile(true); }} title="ملف / مجلد جديد"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <FolderPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {addingFile && (
                <div className="flex items-center gap-1 px-2.5 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <input autoFocus value={newFile} onChange={(e) => setNewFile(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewFile(); } else if (e.key === "Escape") { setNewFile(""); setAddingFile(false); } }}
                    onBlur={() => { if (!newFile.trim()) setAddingFile(false); }}
                    placeholder="src/app.py" dir="ltr"
                    className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg outline-none text-white placeholder:text-white/25 text-left"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)" }} />
                  <button onClick={addNewFile}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition-colors shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto py-1.5">
                {files.length === 0 ? (
                  <div className="text-xs text-white/25 text-center py-8 px-3">
                    {canWrite ? "لا توجد ملفات — اضغط + لإنشاء ملف" : "بانتظار إنشاء الملفات…"}
                  </div>
                ) : (
                  buildTree(files).map((node) => (
                    <FileTreeNode key={node.path} node={node} depth={0} activeFile={activeFile}
                      expandedFolders={expandedFolders}
                      onToggle={(p) => setExpandedFolders((prev) => ({ ...prev, [p]: !(prev[p] ?? true) }))}
                      onOpen={(path) => { openFile(path); setMobileTab("code"); }}
                      onRename={(p) => { setRenamingFile(p); setRenameValue(p); }}
                      onDelete={requestDeleteFile}
                      canWrite={canWrite} />
                  ))
                )}
              </div>
            </div>
          )}

          {isMobile && mobileTab === "members" && (
            <div className="absolute inset-0 z-20 flex flex-col" style={{ background: "rgba(4,6,14,0.99)" }}>
              <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white/70">الأعضاء</span>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#34D399" }}>{members.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {members.map((m) => (
                  <MemberItem key={m.userId} member={m} isMe={m.userId === myUserId}
                    isHost={myInfo?.role === "host"} onPermChange={handlePermChange}
                    onKick={handleKick} onTransfer={handleTransfer} />
                ))}
                {members.length === 0 && (
                  <div className="text-xs text-white/25 text-center py-8">لا أحد متصل بعد</div>
                )}
              </div>
            </div>
          )}

          <div className={`${isMobile && mobileTab !== "code" ? "hidden" : "flex"} items-stretch shrink-0 border-b overflow-x-auto`} dir="ltr"
            style={{ background: "rgba(4,6,14,0.9)", borderColor: "rgba(255,255,255,0.06)" }}>
            {openTabs.length === 0 && (
              <div className="px-4 py-2.5 text-[12px] text-white/25" dir="rtl">افتح ملفًا من الشجرة</div>
            )}
            {openTabs.map((path) => {
              const active = activeFile === path;
              const name = path.split("/").pop() || path;
              return (
                <div key={path}
                  className="group flex items-center gap-1.5 pr-3 pl-1.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors relative border-r shrink-0 cursor-pointer"
                  style={{ background: active ? "rgba(16,185,129,0.08)" : "transparent", color: active ? "#34D399" : "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.05)" }}
                  onClick={() => setActiveFile(path)}
                  title={path}>
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ opacity: active ? 1 : 0.5 }} />
                  <span>{name}</span>
                  <button onClick={(e) => { e.stopPropagation(); closeTab(path); }}
                    className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                  {active && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#10B981" }} />}
                </div>
              );
            })}
          </div>

          <div
            dir="ltr"
            className="overflow-hidden relative flex-1"
            style={{ background: "#1e1e1e", minHeight: isMobile ? 80 : 0 }}
          >
            {wsStatus === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm" dir="rtl">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-white/50 text-sm">جاري الاتصال…</p>
                </div>
              </div>
            )}
            {wsStatus === "connected" && files.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" dir="rtl">
                <div className="text-center">
                  <FileCode2 className="w-12 h-12 mx-auto mb-3 text-white/15" />
                  <p className="text-white/30 text-sm font-bold mb-1">
                    {canWrite ? "لا توجد ملفات بعد" : "بانتظار إنشاء الملفات…"}
                  </p>
                  {canWrite && <p className="text-white/20 text-xs">اضغط + في شريط الملفات لإنشاء ملف جديد</p>}
                </div>
              </div>
            )}
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="javascript"
              defaultValue=""
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                lineNumbers: "on",
                roundedSelection: true,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                wordWrap: "on",
                readOnly: !canWrite,
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                folding: true,
                glyphMargin: false,
              }}
            />
          </div>

          {isMobile && (
            <div
              className="shrink-0 flex items-center justify-center select-none touch-none"
              style={{ height: 20, cursor: "row-resize", background: "rgba(4,6,14,0.98)", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", zIndex: 10 }}
              onMouseDown={(e) => {
                e.preventDefault();
                mobileDragRef.current = { startY: e.clientY, startHeight: mobileTerminalHeight };
                const onMove = (ev: MouseEvent) => {
                  if (!mobileDragRef.current) return;
                  const delta = mobileDragRef.current.startY - ev.clientY;
                  const next = Math.max(60, Math.min(window.innerHeight * 0.72, mobileDragRef.current.startHeight + delta));
                  setMobileTerminalHeight(next);
                };
                const onUp = () => { mobileDragRef.current = null; document.removeEventListener("mousemove", onMove); };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp, { once: true });
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                mobileDragRef.current = { startY: e.touches[0].clientY, startHeight: mobileTerminalHeight };
                const onMove = (ev: TouchEvent) => {
                  ev.preventDefault();
                  if (!mobileDragRef.current) return;
                  const delta = mobileDragRef.current.startY - ev.touches[0].clientY;
                  const next = Math.max(60, Math.min(window.innerHeight * 0.72, mobileDragRef.current.startHeight + delta));
                  setMobileTerminalHeight(next);
                };
                const onEnd = () => { mobileDragRef.current = null; document.removeEventListener("touchmove", onMove); };
                document.addEventListener("touchmove", onMove, { passive: false });
                document.addEventListener("touchend", onEnd, { once: true });
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
            </div>
          )}

          {!isMobile && (
            <div
              className="shrink-0 group cursor-row-resize select-none flex items-center justify-center border-t"
              style={{ height: 8, borderColor: "rgba(255,255,255,0.07)", background: "rgba(4,6,14,0.98)", zIndex: 10 }}
              onMouseDown={(e) => {
                e.preventDefault();
                terminalDragRef.current = { startY: e.clientY, startHeight: desktopTerminalHeight };
                const onMove = (ev: MouseEvent) => {
                  if (!terminalDragRef.current) return;
                  const next = Math.max(80, Math.min(window.innerHeight * 0.75, terminalDragRef.current.startHeight + (terminalDragRef.current.startY - ev.clientY)));
                  setDesktopTerminalHeight(next);
                  if (!dockOpen) setDockOpen(true);
                };
                const onUp = () => { terminalDragRef.current = null; document.removeEventListener("mousemove", onMove); };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp, { once: true });
              }}
            >
              <div className="transition-all duration-150 rounded-full group-hover:opacity-100 opacity-0"
                style={{ width: 48, height: 3, background: "rgba(16,185,129,0.6)", boxShadow: "0 0 8px rgba(16,185,129,0.4)" }} />
            </div>
          )}

          <div className={`flex flex-col overflow-hidden${!isMobile ? " shrink-0" : " shrink-0"}`}
            style={{ background: "rgba(4,6,14,0.97)", borderColor: "rgba(255,255,255,0.07)", height: isMobile ? mobileTerminalHeight : (dockOpen ? desktopTerminalHeight : "auto") }}>
            <div className="flex items-center shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {([{ key: "output", label: "التيرمنال", icon: Terminal }, { key: "preview", label: "معاينة HTML", icon: Eye }] as const).map((t) => {
                const active = activeRightTab === t.key;
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => { setActiveRightTab(t.key); setDockOpen(true); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors relative"
                    style={{ color: active && dockOpen ? "#34D399" : "rgba(255,255,255,0.4)", background: active && dockOpen ? "rgba(16,185,129,0.06)" : "transparent" }}>
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    {active && dockOpen && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#10B981" }} />}
                  </button>
                );
              })}
              <div className="flex-1" />
              <button onClick={() => setDockOpen((v) => !v)}
                className="px-3 py-2.5 text-white/40 hover:text-white/80 transition-colors"
                title={dockOpen ? "طي اللوحة" : "فتح اللوحة"}>
                <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: dockOpen ? "none" : "rotate(180deg)" }} />
              </button>
            </div>
            {dockOpen && (
              activeRightTab === "output" ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div
                    className="flex-1 overflow-y-auto p-3 font-mono text-xs"
                    style={processRunning ? { cursor: "text" } : undefined}
                    onClick={processRunning ? () => hiddenInputRef.current?.focus() : undefined}
                  >
                    {processRunning ? (
                      <>
                        <div
                          dir="ltr"
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            lineHeight: "1.65",
                            color: "rgba(255,255,255,0.88)",
                          }}
                        >
                          {liveOutput}
                          <span>{inputLine}</span>
                          <span className="terminal-cursor" />
                        </div>
                        <div ref={liveEndRef} />
                        <input
                          ref={hiddenInputRef}
                          value={inputLine}
                          onChange={(e) => setInputLine(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const data = inputLine + "\n";
                              const next = (liveOutputRef.current + data).slice(-100_000);
                              liveOutputRef.current = next;
                              setLiveOutput(next);
                              wsRef.current?.send(JSON.stringify({ type: "stdin_input", data }));
                              setInputLine("");
                            } else if (e.key === "c" && e.ctrlKey) {
                              e.preventDefault();
                              wsRef.current?.send(JSON.stringify({ type: "kill_process" }));
                            }
                          }}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          style={{
                            position: "fixed",
                            opacity: 0,
                            width: 1,
                            height: 1,
                            padding: 0,
                            border: 0,
                            pointerEvents: "none",
                          }}
                        />
                      </>
                    ) : runOutputs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-white/25 font-sans gap-2">
                        <Terminal className="w-8 h-8 text-white/10" />
                        <span className="text-xs">شغّل الكود لرؤية الناتج هنا</span>
                      </div>
                    ) : (
                      <div className="space-y-px">
                        {runOutputs.slice(-15).map((o, i) => (
                          <div key={i}>
                            <div className="text-[10px] pt-2 pb-0.5 font-sans flex items-center gap-1.5" style={{ color: "rgba(52,211,153,0.55)" }}>
                              <span className="font-bold">{o.triggeredByName}</span>
                              <span className="text-white/15">•</span>
                              <span>{new Date(o.timestamp).toLocaleTimeString("ar")}</span>
                              {o.language && <span className="px-1 py-px rounded text-[9px]" style={{ background: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>{o.language}</span>}
                            </div>
                            <pre className="text-[12px] whitespace-pre-wrap break-all leading-relaxed pb-2" style={{ color: "rgba(255,255,255,0.82)" }}>{o.output}</pre>
                            {o.language === "html" && (
                              <div className="flex items-center gap-2 mt-1 mb-2 px-2.5 py-2 rounded-lg border" style={{ background: "rgba(16,185,129,0.07)", borderColor: "rgba(16,185,129,0.22)" }}>
                                <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: "#34D399" }} />
                                <span className="text-[11.5px] font-sans leading-snug" style={{ color: "rgba(52,211,153,0.9)" }}>
                                  اضغط زر <strong>معاينة HTML</strong> في الأعلى حتى تظهر لك الصفحة
                                </span>
                              </div>
                            )}
                            <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }} />
                          </div>
                        ))}
                        {errorHint && (
                          <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${errorHint.severity === "error" ? "rgba(239,68,68,0.3)" : errorHint.severity === "warning" ? "rgba(245,158,11,0.3)" : "rgba(96,165,250,0.3)"}`, background: errorHint.severity === "error" ? "rgba(239,68,68,0.06)" : errorHint.severity === "warning" ? "rgba(245,158,11,0.06)" : "rgba(96,165,250,0.06)" }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: errorHint.severity === "error" ? "rgba(239,68,68,0.15)" : errorHint.severity === "warning" ? "rgba(245,158,11,0.15)" : "rgba(96,165,250,0.15)" }}>
                              <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: errorHint.severity === "error" ? "#F87171" : errorHint.severity === "warning" ? "#FCD34D" : "#93C5FD" }} />
                              <span className="text-xs font-black flex-1" style={{ color: errorHint.severity === "error" ? "#F87171" : errorHint.severity === "warning" ? "#FCD34D" : "#93C5FD" }}>{errorHint.title}</span>
                              <button onClick={() => setErrorHint(null)} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="px-3 py-2.5 space-y-2 font-sans">
                              <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{errorHint.explanation}</p>
                              <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                                <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(52,211,153,0.9)" }}>{errorHint.suggestion}</p>
                              </div>
                              {errorHint.pkgName && canRun && (
                                <button
                                  onClick={() => { setInstallInput(errorHint.pkgName!); setShowInstallInput(true); setErrorHint(null); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all w-full justify-center"
                                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34D399" }}
                                >
                                  <Package className="w-3 h-3" /> تنزيل «{errorHint.pkgName}» الآن
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {previewBlobUrl && (
                    <div className="flex items-center gap-1 px-2 py-1.5 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.25)" }}>
                      <button
                        onClick={() => {
                          const liveFiles = files.map((f) => f.file_path === activeFileRef.current ? { ...f, content: editorRef.current?.getValue() ?? f.content } : f);
                          setPreviewHtml(buildHtmlPreview(previewEntry, liveFiles));
                        }}
                        title="تحديث المعاينة"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLivePreview((v) => !v)}
                        title="معاينة مباشرة"
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors"
                        style={{ background: livePreview ? "rgba(16,185,129,0.15)" : "transparent", color: livePreview ? "#10B981" : "rgba(255,255,255,0.35)", border: `1px solid ${livePreview ? "rgba(16,185,129,0.35)" : "transparent"}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: livePreview ? "#10B981" : "rgba(255,255,255,0.25)" }} />
                        مباشر
                      </button>
                      <div className="flex-1" />
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setPreviewDevice("desktop")} title="عرض مكتبي" className="w-6 h-6 flex items-center justify-center rounded-md transition-colors" style={{ color: previewDevice === "desktop" ? "#60A5FA" : "rgba(255,255,255,0.3)", background: previewDevice === "desktop" ? "rgba(59,130,246,0.12)" : "transparent" }}>
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setPreviewDevice("mobile")} title="عرض موبايل (375px)" className="w-6 h-6 flex items-center justify-center rounded-md transition-colors" style={{ color: previewDevice === "mobile" ? "#A78BFA" : "rgba(255,255,255,0.3)", background: previewDevice === "mobile" ? "rgba(139,92,246,0.12)" : "transparent" }}>
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => window.open(previewBlobUrl, "_blank")} title="فتح في تبويب جديد" className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setPreviewFullscreen(true)} title="ملء الشاشة" className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden p-1.5">
                    {previewBlobUrl ? (
                      <div className="w-full h-full flex" style={{ justifyContent: previewDevice === "mobile" ? "center" : "stretch" }}>
                        <iframe
                          key={previewBlobUrl}
                          src={previewBlobUrl}
                          className="h-full rounded-lg"
                          style={{ width: previewDevice === "mobile" ? "375px" : "100%", border: "1px solid rgba(16,185,129,0.15)", background: "white", minWidth: 0 }}
                          sandbox="allow-scripts allow-forms allow-popups"
                        />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-white/25 font-sans gap-2">
                        <Eye className="w-8 h-8 text-white/10" />
                        <span className="text-xs">شغّل ملف HTML لرؤية المعاينة</span>
                      </div>
                    )}
                  </div>
                  {previewFullscreen && previewBlobUrl && (
                    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "rgba(4,6,14,0.98)" }}>
                      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ background: "rgba(6,9,18,0.99)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white/80 flex-1">معاينة المشروع</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setPreviewDevice("desktop")} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: previewDevice === "desktop" ? "#60A5FA" : "rgba(255,255,255,0.35)", background: previewDevice === "desktop" ? "rgba(59,130,246,0.12)" : "transparent" }}>
                            <Monitor className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPreviewDevice("mobile")} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: previewDevice === "mobile" ? "#A78BFA" : "rgba(255,255,255,0.35)", background: previewDevice === "mobile" ? "rgba(139,92,246,0.12)" : "transparent" }}>
                            <Smartphone className="w-4 h-4" />
                          </button>
                          <button onClick={() => window.open(previewBlobUrl, "_blank")} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPreviewFullscreen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex overflow-hidden p-2" style={{ justifyContent: previewDevice === "mobile" ? "center" : "stretch", alignItems: previewDevice === "mobile" ? "flex-start" : "stretch" }}>
                        <iframe
                          key={previewBlobUrl + "-fs"}
                          src={previewBlobUrl}
                          className="rounded-xl"
                          style={{ width: previewDevice === "mobile" ? "375px" : "100%", height: "100%", background: "white", border: "none" }}
                          sandbox="allow-scripts allow-forms allow-popups"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="shrink-0 flex border-t" dir="rtl"
          style={{ background: "rgba(4,6,14,0.99)", borderColor: "rgba(255,255,255,0.08)", height: 56 }}>
          {([
            { tab: "code" as const, Icon: FileCode2, label: "كود" },
            { tab: "files" as const, Icon: FolderTree, label: "ملفات", badge: files.length },
            { tab: "members" as const, Icon: Users, label: "أعضاء", badge: members.length },
          ]).map(({ tab, Icon, label, badge }) => {
            const active = mobileTab === tab;
            return (
              <button key={tab} onClick={() => setMobileTab(tab)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
                style={{
                  color: active ? "#10B981" : "rgba(255,255,255,0.38)",
                  borderTop: active ? "2px solid #10B981" : "2px solid transparent",
                }}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: "#10B981", color: "white" }}>{badge > 9 ? "9+" : badge}</span>
                  )}
                </div>
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {renamingFile !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setRenamingFile(null); setRenameValue(""); }}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-sm rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "rgba(10,13,22,0.98)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white/85">إعادة تسمية / نقل الملف</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed -mt-1">
              يمكنك تغيير الاسم أو نقل الملف لمجلد آخر بكتابة المسار الكامل (مثل <span dir="ltr" className="font-mono text-emerald-400/80">src/utils/helper.py</span>).
            </p>
            <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitRename(); } else if (e.key === "Escape") { setRenamingFile(null); setRenameValue(""); } }}
              dir="ltr"
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none text-white placeholder:text-white/25 text-left font-mono"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(16,185,129,0.3)" }} />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setRenamingFile(null); setRenameValue(""); }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                إلغاء
              </button>
              <button onClick={submitRename}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#04120c" }}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 w-80 h-[440px] rounded-2xl flex flex-col overflow-hidden z-50"
            style={{ background: "rgba(6,9,18,0.98)", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 40px rgba(59,130,246,0.12), 0 20px 50px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white/85">دردشة الغرفة</span>
              </div>
              <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
              {chatMsgs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
                  <MessageSquare className="w-7 h-7 text-white/10" />
                  <span className="text-xs">ابدأ المحادثة مع زملائك</span>
                </div>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${m.userId === myUserId ? "items-start" : "items-end"}`}>
                  {m.userId === -1 ? (
                    <div className="text-[10px] text-white/30 text-center w-full py-1">{m.text}</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        <span className="text-[10px] text-white/35 font-medium">{m.username}</span>
                      </div>
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl text-[13px] break-words leading-relaxed"
                        style={{ background: m.userId === myUserId ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${m.userId === myUserId ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, color: m.userId === myUserId ? "#d1fae5" : "rgba(255,255,255,0.8)" }}>
                        {m.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex gap-2">
                <input value={chatText} onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="اكتب رسالة…"
                  maxLength={500}
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none text-white placeholder:text-white/25"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                <button onClick={sendChat} disabled={!chatText.trim()}
                  className="w-11 rounded-xl flex items-center justify-center font-bold transition-all shrink-0"
                  style={{ background: chatText.trim() ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: chatText.trim() ? "#60A5FA" : "rgba(255,255,255,0.2)", border: `1px solid ${chatText.trim() ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                  <Send className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoomGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-end"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowRoomGuide(false)}
          >
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-sm flex flex-col overflow-hidden"
              style={{ background: "rgba(6,9,18,0.99)", borderRight: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-20px 0 60px rgba(0,0,0,0.6)" }}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(10,14,26,0.98)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)" }}>
                  <BookOpen className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-white">دليل الغرفة البرمجية</div>
                  <div className="text-[10px] text-white/40 mt-0.5">كل ما تحتاج معرفته للاستفادة الكاملة</div>
                </div>
                <button onClick={() => setShowRoomGuide(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

                <div className="px-4 py-4 space-y-4">

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(16,185,129,0.15)", background: "rgba(16,185,129,0.06)" }}>
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-300">اللغات المدعومة للتشغيل</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {[
                        { lang: "Python 🐍", desc: "تشغيل تفاعلي كامل + إدخال مباشر + تنزيل مكتبات (pip)", color: "#34D399" },
                        { lang: "JavaScript (Node.js) ⚡", desc: "تشغيل تفاعلي + تنزيل حزم (npm)", color: "#FCD34D" },
                        { lang: "Bash 🐚", desc: "تشغيل سكريبتات الصدفة تفاعلياً", color: "#A78BFA" },
                        { lang: "C 🔩 / C++ ⚙️", desc: "يُترجم ويُشغَّل مباشرةً (gcc / g++)", color: "#60A5FA" },
                      ].map((item) => (
                        <div key={item.lang} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                          <div>
                            <div className="text-[12px] font-bold" style={{ color: item.color }}>{item.lang}</div>
                            <div className="text-[11px] leading-relaxed mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.06)" }}>
                      <Info className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black text-amber-300">لغات كتابة فقط (لا تُشغَّل داخل الغرفة)</span>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {["Java ☕", "TypeScript 💙", "Rust 🦀", "Kotlin 🤖", "Dart 🎯", "SQL 🗄️"].map((l) => (
                          <span key={l} className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: "rgba(245,158,11,0.1)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}>{l}</span>
                        ))}
                      </div>
                      <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>يمكنك كتابة الكود والتعديل التعاوني عليه، لكن للتشغيل انسخ الكود وجرّبه في بيئة خارجية.</p>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.06)" }}>
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-black text-blue-300">الأدوار والصلاحيات</span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Crown className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                          <span className="text-[12px] font-black" style={{ color: "#F59E0B" }}>المشرف (Host)</span>
                        </div>
                        <ul className="space-y-1">
                          {["يملك كل الصلاحيات تلقائياً", "يُشغِّل الكود ويوقفه لجميع الأعضاء", "يمنح الأعضاء إذن الكتابة والتشغيل", "يُنزِّل المكتبات (pip/npm)", "يدير الملفات (إنشاء/نقل/حذف)", "يُغلق الغرفة أو ينقل الإشراف"].map((p) => (
                            <li key={p} className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                              <Check className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[12px] font-black text-blue-300">العضو (Member)</span>
                        </div>
                        <ul className="space-y-1">
                          {["يشاهد الكود والتعديلات مباشرةً", "يكتب في المحرر بإذن المشرف فقط", "يُشغِّل الكود بإذن المشرف فقط", "يتواصل عبر الدردشة والصوت", "يطلب تشغيل الكود من المشرف"].map((p) => (
                            <li key={p} className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                              <Check className="w-3 h-3 shrink-0" style={{ color: "#60A5FA" }} /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)" }}>
                      <BookOpen className="w-4 h-4" style={{ color: "#A78BFA" }} />
                      <span className="text-xs font-black" style={{ color: "#C4B5FD" }}>الميزات الكاملة</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {[
                        { icon: "✏️", text: "تعديل تعاوني مباشر — يرى الجميع تغييراتك فور الكتابة" },
                        { icon: "▶️", text: "تيرمنال حي — اكتب بيانات الإدخال أثناء تشغيل البرنامج" },
                        { icon: "📦", text: "تنزيل مكتبات pip (Python) وnpm (JavaScript) داخل الغرفة" },
                        { icon: "🗂️", text: "إدارة ملفات متعددة ومجلدات — أنشئ مشروعاً كاملاً" },
                        { icon: "🌐", text: "معاينة HTML/CSS/JS مباشرة داخل الغرفة — موبايل وسطح مكتب" },
                        { icon: "💬", text: "دردشة نصية مع جميع أعضاء الغرفة" },
                        { icon: "🎙️", text: "مكالمة صوتية WebRTC بين الأعضاء" },
                        { icon: "📥", text: "تحميل الكود كملفات على جهازك" },
                        { icon: "🔄", text: "نقل الإشراف لعضو آخر عند الحاجة" },
                      ].map((f) => (
                        <div key={f.text} className="flex items-start gap-2.5 py-1">
                          <span className="text-sm shrink-0 mt-0.5">{f.icon}</span>
                          <span className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.06)" }}>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-black text-red-300">القيود المهمة</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {[
                        { icon: "🚫", text: "لا اتصال بالإنترنت — لا يمكن fetch البيانات من مواقع خارجية" },
                        { icon: "⏱️", text: "المكتبات المثبتة مؤقتة — تُحذف عند إعادة تشغيل الخادم" },
                        { icon: "💾", text: "لا قواعد بيانات خارجية أو خوادم ويب داخل الغرفة" },
                        { icon: "🧵", text: "برنامج واحد يعمل في كل وقت لكل الغرفة" },
                        { icon: "📁", text: "الملفات تُحفظ في الغرفة ولا تُنقل تلقائياً لحسابك" },
                        { icon: "🔇", text: "الصوت يتطلب إذن المتصفح بالوصول للميكروفون" },
                      ].map((l) => (
                        <div key={l.text} className="flex items-start gap-2.5 py-0.5">
                          <span className="text-sm shrink-0 mt-0.5">{l.icon}</span>
                          <span className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{l.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.06)" }}>
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-300">نصائح للاستخدام الأمثل</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {[
                        "عند ظهور خطأ، سيظهر مباشرةً تحت الناتج تحليل يشرح السبب والحل",
                        "نزّل المكتبة أولاً ثم شغّل — المكتبات المثبتة تبقى طوال جلسة الغرفة",
                        "للمشاريع المتعددة استخدم مجلدات: src/main.py أو utils/helper.py",
                        "Ctrl+C في التيرمنال الحي يوقف البرنامج فوراً",
                        "المشرف يستطيع منح إذن الكتابة والتشغيل لكل عضو بشكل منفصل",
                        "عند انتهاء الجلسة حمّل الكود بزر التحميل قبل الخروج",
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black" style={{ background: "rgba(16,185,129,0.15)", color: "#34D399", border: "1px solid rgba(16,185,129,0.25)" }}>{i + 1}</div>
                          <span className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,9,18,0.99)" }}>
                <button onClick={() => setShowRoomGuide(false)} className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  فهمت، شكراً!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
