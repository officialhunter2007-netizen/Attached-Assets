import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/use-auth";
import Editor, { type OnMount } from "@monaco-editor/react";
import { CodeEditor, type Lang as CMEditorLang } from "./dynamic-env/code-editor";
import {
  Play, RotateCcw, Terminal, Circle, X, Plus, FileCode, Zap, Check, Eye,
  AlertTriangle, Maximize2, Monitor, Smartphone, Tablet, Globe, ArrowLeft,
  ArrowRight, Lock, Share2, Layers, Home, FolderOpen, Folder, FolderPlus,
  ChevronRight, PanelLeftClose, PanelLeft, Keyboard, Code2,
  Copy, Trash2, MessageSquare, Expand, Minimize, ZoomIn, ZoomOut, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function useIsMobile() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640 || /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini/i.test(navigator.userAgent);
  }, []);
}

const LANGUAGES = [
  { id: "html",       label: "HTML",       ext: "html",  icon: "🌐", monacoLang: "html" },
  { id: "css",        label: "CSS",        ext: "css",   icon: "🎨", monacoLang: "css" },
  { id: "javascript", label: "JavaScript", ext: "js",    icon: "⚡", monacoLang: "javascript" },
  { id: "typescript", label: "TypeScript", ext: "ts",    icon: "💙", monacoLang: "typescript" },
  { id: "python",     label: "Python",     ext: "py",    icon: "🐍", monacoLang: "python" },
  { id: "java",       label: "Java",       ext: "java",  icon: "☕", monacoLang: "java" },
  { id: "cpp",        label: "C++",        ext: "cpp",   icon: "⚙️", monacoLang: "cpp" },
  { id: "c",          label: "C",          ext: "c",     icon: "🔩", monacoLang: "c" },
  { id: "dart",       label: "Dart",       ext: "dart",  icon: "🎯", monacoLang: "dart" },
  { id: "kotlin",     label: "Kotlin",     ext: "kt",    icon: "🤖", monacoLang: "kotlin" },
  { id: "bash",       label: "Bash",       ext: "sh",    icon: "🐚", monacoLang: "shell" },
  { id: "sql",        label: "SQL",        ext: "sql",   icon: "🗄️", monacoLang: "sql" },
];

const WEB_LANGS = new Set(["html", "css", "javascript"]);

const EXT_TO_LANG: Record<string, string> = {
  html: "html", htm: "html", css: "css",
  py: "python", js: "javascript", ts: "typescript", java: "java",
  cpp: "cpp", cc: "cpp", cxx: "cpp", c: "c",
  kt: "kotlin", dart: "dart",
  sql: "sql", sh: "bash", bash: "bash",
};

const DEFAULT_CODE: Record<string, string> = {
  html: `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>صفحتي الأولى</title>\n  <style>\n    body {\n      font-family: 'Segoe UI', Tahoma, sans-serif;\n      background: #1a1a2e;\n      color: #e2e8f0;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      min-height: 100vh;\n      margin: 0;\n    }\n    .card {\n      background: #16213e;\n      border-radius: 16px;\n      padding: 2rem;\n      text-align: center;\n      box-shadow: 0 10px 30px rgba(0,0,0,0.3);\n    }\n    h1 { color: #F59E0B; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>مرحباً من نُخبة! 🎓</h1>\n    <p>ابدأ ببناء صفحتك الأولى</p>\n  </div>\n</body>\n</html>`,
  css: `/* أنماط CSS في نُخبة 🎓 */\nbody {\n  font-family: 'Segoe UI', Tahoma, sans-serif;\n  background: linear-gradient(135deg, #1a1a2e, #16213e);\n  color: #e2e8f0;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  margin: 0;\n}\n\n.container {\n  background: rgba(255,255,255,0.05);\n  border: 1px solid rgba(255,255,255,0.1);\n  border-radius: 16px;\n  padding: 2rem;\n  text-align: center;\n}\n\nh1 {\n  color: #F59E0B;\n  font-size: 2rem;\n}`,
  javascript: `// مرحباً بك في بيئة نُخبة 🎓\nconsole.log("مرحباً من نُخبة!");\n`,
  typescript: `// TypeScript في نُخبة 🎓\nconst greeting: string = "مرحباً من نُخبة!";\nconsole.log(greeting);\n`,
  python:     `# مرحباً بك في بيئة نُخبة 🎓\nprint("مرحباً من نُخبة!")\n`,
  java:       `public class Main {\n    public static void main(String[] args) {\n        System.out.println("مرحباً من نُخبة! 🎓");\n    }\n}\n`,
  cpp:        `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "مرحباً من نُخبة! 🎓" << endl;\n    return 0;\n}\n`,
  c:          `#include <stdio.h>\n\nint main() {\n    printf("مرحباً من نُخبة! 🎓\\n");\n    return 0;\n}\n`,
  dart:       `void main() {\n    print("مرحباً من نُخبة! 🎓");\n}\n`,
  kotlin:     `fun main() {\n    println("مرحباً من نُخبة! 🎓")\n}\n`,
  bash:       `#!/bin/bash\n# مرحباً بك\necho "مرحباً من نُخبة! 🎓"\n`,
  sql:        `-- استعلام SQL تجريبي\nSELECT 'مرحباً من نُخبة! 🎓' AS greeting;\nSELECT 1+1 AS result;\n`,
};

const EDITOR_THEMES = [
  { id: "nukhba-neon-gold",    label: "Nukhba Neon Gold",   color: "#F59E0B" },
  { id: "nukhba-neon-emerald", label: "Nukhba Emerald",     color: "#10B981" },
  { id: "nukhba-cyber-purple", label: "Cyber Purple",       color: "#A78BFA" },
  { id: "vs-dark",             label: "VS Dark Classic",    color: "#007acc" },
];

const SHORTCUTS = [
  { key: "Ctrl/⌘ + S",     desc: "حفظ + إشعار" },
  { key: "Ctrl/⌘ + Enter", desc: "تشغيل الكود" },
  { key: "Ctrl/⌘ + B",     desc: "إخفاء/إظهار المستكشف" },
  { key: "Ctrl/⌘ + /",     desc: "تعليق/إلغاء تعليق السطر" },
  { key: "Shift+Alt + F",  desc: "تنسيق الكود" },
  { key: "Alt + ↑/↓",      desc: "نقل السطر للأعلى/الأسفل" },
  { key: "Shift+Alt + ↑/↓", desc: "نسخ السطر للأعلى/الأسفل" },
  { key: "F1",             desc: "لوحة الأوامر" },
  { key: "Ctrl/⌘ + F",     desc: "بحث داخل الملف" },
  { key: "Ctrl/⌘ + H",     desc: "بحث واستبدال" },
  { key: "Ctrl/⌘ + P",     desc: "فتح ملف بسرعة" },
  { key: "Shift + /",      desc: "عرض الاختصارات (هذه النافذة)" },
  { key: "Ctrl/⌘ + =/-",  desc: "تكبير/تصغير الخط" },
  { key: "Ctrl/⌘ + Z",     desc: "تراجع" },
  { key: "Ctrl/⌘ + Y",     desc: "إعادة" },
];

const LANGUAGE_SNIPPETS: Record<string, Array<{ label: string; body: string; desc: string }>> = {
  html: [
    { label: "html:5",  body: `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>$1</title>\n</head>\n<body>\n  $2\n</body>\n</html>`, desc: "قالب HTML5 كامل" },
    { label: "div.class", body: `<div class="$1">\n  $2\n</div>`, desc: "عنصر div مع كلاس" },
    { label: "a",  body: `<a href="$1">$2</a>`, desc: "رابط" },
    { label: "img", body: `<img src="$1" alt="$2" />`, desc: "صورة" },
    { label: "ul>li*3", body: `<ul>\n  <li>$1</li>\n  <li>$2</li>\n  <li>$3</li>\n</ul>`, desc: "قائمة غير مرتبة" },
    { label: "form", body: `<form action="$1" method="post">\n  <input type="text" name="$2" placeholder="$3">\n  <button type="submit">$4</button>\n</form>`, desc: "نموذج" },
    { label: "table", body: `<table>\n  <thead>\n    <tr><th>$1</th><th>$2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>$3</td><td>$4</td></tr>\n  </tbody>\n</table>`, desc: "جدول" },
    { label: "meta:og", body: `<meta property="og:title" content="$1">\n<meta property="og:description" content="$2">\n<meta property="og:image" content="$3">`, desc: "Open Graph meta" },
  ],
  css: [
    { label: "flex-center", body: `display: flex;\njustify-content: center;\nalign-items: center;`, desc: "توسيط flexbox" },
    { label: "grid-cols", body: `display: grid;\ngrid-template-columns: repeat($1, 1fr);\ngap: $2px;`, desc: "شبكة CSS" },
    { label: "media-mobile", body: `@media (max-width: 640px) {\n  $1\n}`, desc: "استعلام جوال" },
    { label: "animation", body: "animation: $1 0.3s ease infinite;", desc: "تحريك" },
    { label: "var", body: "var(--$1)", desc: "متغير CSS" },
    { label: "gradient", body: "background: linear-gradient(135deg, $1, $2);", desc: "تدرج لوني" },
    { label: "shadow", body: "box-shadow: 0 $1px 20px rgba(0,0,0,$2);", desc: "ظل" },
    { label: "transition", body: `transition: all $1s ease;`, desc: "انتقال" },
  ],
  javascript: [
    { label: "cl",   body: "console.log($1);",       desc: "طباعة للكونسول" },
    { label: "fn",   body: "function $1($2) {\n  $3\n}",    desc: "دالة عادية" },
    { label: "afn",  body: "const $1 = ($2) => {\n  $3\n};", desc: "دالة سهمية" },
    { label: "for",  body: "for (let $1 = 0; $1 < $2.length; $1++) {\n  $3\n}", desc: "حلقة for" },
    { label: "forEach", body: "$1.forEach(($2) => {\n  $3\n});", desc: "forEach" },
    { label: "fetch", body: `fetch("$1")\n  .then(res => res.json())\n  .then(data => {\n    $2\n  })\n  .catch(err => console.error(err));`, desc: "طلب fetch" },
    { label: "class", body: "class $1 {\n  constructor($2) {\n    $3\n  }\n\n  $4() {\n    $5\n  }\n}", desc: "كلاس" },
    { label: "sel", body: `document.querySelector("$1")`, desc: "اختيار عنصر" },
    { label: "ev",  body: `$1.addEventListener("$2", ($3) => {\n  $4\n});`, desc: "مستمع أحداث" },
    { label: "prom", body: `new Promise((resolve, reject) => {\n  $1\n});`, desc: "Promise" },
    { label: "try", body: `try {\n  $1\n} catch (err) {\n  console.error(err);\n}`, desc: "try/catch" },
  ],
  typescript: [
    { label: "interface", body: "interface $1 {\n  $2: $3;\n}", desc: "واجهة TypeScript" },
    { label: "type",   body: "type $1 = $2;", desc: "نوع TypeScript" },
    { label: "enum",   body: "enum $1 {\n  $2,\n  $3,\n}", desc: "تعداد" },
    { label: "generic",body: "function $1<T>($2: T): T {\n  $3\n}", desc: "دالة جنيرك" },
    { label: "cl",   body: "console.log($1);", desc: "طباعة للكونسول" },
    { label: "afn",  body: "const $1 = ($2: $3): $4 => {\n  $5\n};", desc: "دالة سهمية بأنواع" },
    { label: "async", body: "async function $1($2): Promise<$3> {\n  $4\n}", desc: "دالة async" },
  ],
  python: [
    { label: "def", body: "def $1($2):\n    $3", desc: "دالة Python" },
    { label: "class", body: "class $1:\n    def __init__(self, $2):\n        $3", desc: "كلاس Python" },
    { label: "for", body: "for $1 in $2:\n    $3", desc: "حلقة for" },
    { label: "if",  body: "if $1:\n    $2\nelif $3:\n    $4\nelse:\n    $5", desc: "شرط if/elif/else" },
    { label: "print", body: 'print(f"$1 {$2}")', desc: "طباعة f-string" },
    { label: "list", body: "[$1 for $2 in $3]", desc: "قائمة مضمّنة" },
    { label: "dict", body: "{'$1': $2, '$3': $4}", desc: "قاموس" },
    { label: "try", body: "try:\n    $1\nexcept Exception as e:\n    print(e)", desc: "معالجة استثناءات" },
    { label: "with", body: "with open('$1', '$2') as f:\n    $3", desc: "فتح ملف" },
    { label: "main", body: "if __name__ == '__main__':\n    $1", desc: "نقطة الدخول الرئيسية" },
  ],
  java: [
    { label: "sout", body: 'System.out.println($1);', desc: "طباعة" },
    { label: "psvm", body: "public static void main(String[] args) {\n    $1\n}", desc: "الدالة الرئيسية" },
    { label: "class", body: "public class $1 {\n    $2\n}", desc: "كلاس Java" },
    { label: "for", body: "for (int $1 = 0; $1 < $2; $1++) {\n    $3\n}", desc: "حلقة for" },
    { label: "foreach", body: "for ($1 $2 : $3) {\n    $4\n}", desc: "foreach" },
    { label: "if", body: "if ($1) {\n    $2\n}", desc: "شرط if" },
    { label: "method", body: "public $1 $2($3) {\n    $4\n}", desc: "دالة Java" },
  ],
  cpp: [
    { label: "include", body: "#include <$1>", desc: "تضمين مكتبة" },
    { label: "main", body: "int main() {\n    $1\n    return 0;\n}", desc: "الدالة الرئيسية" },
    { label: "cout", body: 'cout << $1 << endl;', desc: "طباعة" },
    { label: "for", body: "for (int $1 = 0; $1 < $2; $1++) {\n    $3\n}", desc: "حلقة for" },
    { label: "class", body: "class $1 {\npublic:\n    $2\n};", desc: "كلاس C++" },
    { label: "vector", body: "vector<$1> $2;", desc: "متجه" },
    { label: "func", body: "$1 $2($3) {\n    $4\n}", desc: "دالة C++" },
  ],
  sql: [
    { label: "sel", body: "SELECT $1 FROM $2 WHERE $3;", desc: "استعلام SELECT" },
    { label: "ins", body: "INSERT INTO $1 ($2) VALUES ($3);", desc: "إدراج بيانات" },
    { label: "upd", body: "UPDATE $1 SET $2 = $3 WHERE $4;", desc: "تحديث بيانات" },
    { label: "del", body: "DELETE FROM $1 WHERE $2;", desc: "حذف بيانات" },
    { label: "join", body: "SELECT $1 FROM $2 JOIN $3 ON $2.$4 = $3.$4;", desc: "ربط جداول" },
    { label: "create", body: "CREATE TABLE $1 (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  $2 VARCHAR(255),\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);", desc: "إنشاء جدول" },
  ],
  kotlin: [
    { label: "fun", body: "fun $1($2): $3 {\n    $4\n}", desc: "دالة Kotlin" },
    { label: "class", body: "class $1($2) {\n    $3\n}", desc: "كلاس Kotlin" },
    { label: "println", body: 'println("$1")', desc: "طباعة" },
    { label: "for", body: "for ($1 in $2) {\n    $3\n}", desc: "حلقة for" },
    { label: "data class", body: "data class $1($2)", desc: "كلاس بيانات" },
  ],
  dart: [
    { label: "main", body: "void main() {\n  $1\n}", desc: "الدالة الرئيسية" },
    { label: "class", body: "class $1 {\n  $2\n}", desc: "كلاس Dart" },
    { label: "print", body: 'print("$1");', desc: "طباعة" },
    { label: "for", body: "for (var $1 in $2) {\n  $3\n}", desc: "حلقة for" },
    { label: "future", body: "Future<$1> $2() async {\n  $3\n}", desc: "دالة async" },
  ],
  bash: [
    { label: "if", body: 'if [ "$1" ]; then\n  $2\nfi', desc: "شرط bash" },
    { label: "for", body: "for $1 in $2; do\n  $3\ndone", desc: "حلقة for" },
    { label: "func", body: "$1() {\n  $2\n}", desc: "دالة bash" },
    { label: "echo", body: 'echo "$1"', desc: "طباعة" },
    { label: "var", body: "$1=\"$2\"", desc: "متغير bash" },
  ],
  c: [
    { label: "main", body: "int main() {\n    $1\n    return 0;\n}", desc: "الدالة الرئيسية" },
    { label: "printf", body: 'printf("$1\\n");', desc: "طباعة" },
    { label: "for", body: "for (int $1 = 0; $1 < $2; $1++) {\n    $3\n}", desc: "حلقة for" },
    { label: "struct", body: "struct $1 {\n    $2\n};", desc: "هيكل بيانات" },
  ],
};

interface IDEFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

interface TreeNode {
  type: "file" | "folder";
  name: string;
  path: string;
  file?: IDEFile;
  children?: TreeNode[];
}

interface StatusInfo {
  line: number;
  col: number;
  selected: number;
  errors: number;
  warnings: number;
}

interface SelectionAction {
  text: string;
  language: string;
}

function buildFileTree(files: IDEFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  function ensureFolder(parts: string[]): TreeNode[] {
    if (parts.length === 0) return root;
    const path = parts.join("/");
    if (folderMap.has(path)) return folderMap.get(path)!.children!;
    const parent = ensureFolder(parts.slice(0, -1));
    const node: TreeNode = { type: "folder", name: parts[parts.length - 1], path, children: [] };
    folderMap.set(path, node);
    parent.push(node);
    return node.children!;
  }

  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of sorted) {
    const parts = file.name.split("/");
    if (parts.length === 1) {
      root.push({ type: "file", name: file.name, path: file.name, file });
    } else {
      const folderParts = parts.slice(0, -1);
      const container = ensureFolder(folderParts);
      container.push({ type: "file", name: parts[parts.length - 1], path: file.name, file });
    }
  }

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  function sortDeep(nodes: TreeNode[]): TreeNode[] {
    sortNodes(nodes);
    for (const n of nodes) {
      if (n.children) sortDeep(n.children);
    }
    return nodes;
  }
  return sortDeep(root);
}

function getFileIcon(lang: string): string {
  return LANGUAGES.find(l => l.id === lang)?.icon || "📄";
}

function detectLangFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANG[ext] || "python";
}

function detectLanguageFromContent(html: string, subjectId?: string): string {
  const lower = (html + (subjectId || "")).toLowerCase();
  if (lower.includes("skill-html") || lower.includes("html")) return "html";
  if (lower.includes("skill-css")) return "css";
  if (lower.includes("typescript") || lower.includes("تايب")) return "typescript";
  if (lower.includes("java") && !lower.includes("javascript")) return "java";
  if (lower.includes("skill-js") || lower.includes("javascript") || lower.includes("js")) return "javascript";
  if (lower.includes("python") || lower.includes("بايثون")) return "python";
  if (lower.includes("kotlin")) return "kotlin";
  if (lower.includes("dart") || lower.includes("flutter")) return "dart";
  if (lower.includes("c++") || lower.includes("cpp")) return "cpp";
  if (lower.includes("bash") || lower.includes("shell")) return "bash";
  if (lower.includes("sql")) return "sql";
  return "python";
}

function extractStarterCode(html: string): string {
  const match = html.match(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/i);
  if (!match) return "";
  return match[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
    .trim();
}

function isWebSubject(subjectId?: string): boolean {
  if (!subjectId) return false;
  return ["skill-html", "skill-css", "skill-js"].includes(subjectId);
}

function hasWebFiles(files: IDEFile[]): boolean {
  return files.some(f => WEB_LANGS.has(f.language));
}

function findLastIndex(str: string, search: RegExp): number {
  let lastIdx = -1;
  let match;
  const re = new RegExp(search.source, search.flags.includes('g') ? search.flags : search.flags + 'g');
  while ((match = re.exec(str)) !== null) {
    lastIdx = match.index;
  }
  return lastIdx;
}

function replaceLastOccurrence(str: string, search: RegExp, replacement: string): string {
  const idx = findLastIndex(str, search);
  if (idx === -1) return str;
  const match = str.slice(idx).match(search);
  if (!match) return str;
  return str.slice(0, idx) + replacement + str.slice(idx + match[0].length);
}

const BROWSER_DOMAIN = "my-project.nukhba.dev";

function getHtmlFiles(files: IDEFile[]): IDEFile[] {
  return files.filter(f => f.language === "html" && !f.name.endsWith("/.gitkeep"));
}

function getRealFiles(files: IDEFile[]): IDEFile[] {
  return files.filter(f => !f.name.endsWith("/.gitkeep"));
}

function pathToFileName(path: string): string {
  let p = path.replace(/^\/+/, "").replace(/^https?:\/\/[^/]+\/?/, "");
  if (!p || p === "/" || p === "") return "index.html";
  if (!p.endsWith(".html") && !p.endsWith(".htm")) p += ".html";
  return p;
}

function fileNameToPath(name: string): string {
  if (name === "index.html" || name === "index.htm") return "/";
  return "/" + name;
}

function makeConsoleScript(nonce: string, hasInlineConsole: boolean): string {
  return `<script>
(function(){
  var nonce = '${nonce}';
  var errors = [];
  var MAX_LOGS = 200;
  ${hasInlineConsole ? "var consoleEl = null;" : ""}
  function safeStr(a) {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a !== 'object') return String(a);
    try { return JSON.stringify(a, null, 2); } catch(e) {
      try {
        var seen = new WeakSet();
        return JSON.stringify(a, function(k, v) {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[Circular]';
            seen.add(v);
          }
          return v;
        }, 2);
      } catch(e2) { return String(a); }
    }
  }
  function notify(){ window.parent.postMessage({type:'nukhba-preview-error', nonce:nonce, errors:errors}, '*'); }
  ${hasInlineConsole ? `function appendToConsole(type, text) {
    if (!consoleEl) consoleEl = document.getElementById('nukhba-console-output');
    if (!consoleEl) return;
    var line = document.createElement('div');
    line.style.padding = '2px 0';
    line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    if (type === 'error') { line.style.color = '#f38ba8'; line.textContent = '\\u2717 ' + text; }
    else if (type === 'warn') { line.style.color = '#fab387'; line.textContent = '\\u26A0 ' + text; }
    else { line.style.color = '#a6e3a1'; line.textContent = '\\u203A ' + text; }
    consoleEl.appendChild(line);
  }` : ""}
  window.onerror = function(msg, src, line, col) {
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: String(msg), line: line, col: col});
    ${hasInlineConsole ? "appendToConsole('error', String(msg) + (line ? ' (line ' + line + ')' : ''));" : ""}
    notify();
  };
  window.addEventListener('unhandledrejection', function(e){
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: 'Unhandled Promise: ' + String(e.reason)});
    ${hasInlineConsole ? "appendToConsole('error', 'Unhandled Promise: ' + String(e.reason));" : ""}
    notify();
  });
  var origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'log', msg: args});
    ${hasInlineConsole ? "appendToConsole('log', args);" : ""}
    notify();
    origLog.apply(console, arguments);
  };
  console.warn = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'warn', msg: args});
    ${hasInlineConsole ? "appendToConsole('warn', args);" : ""}
    notify();
    origWarn.apply(console, arguments);
  };
  console.error = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: args});
    ${hasInlineConsole ? "appendToConsole('error', args);" : ""}
    notify();
    origErr.apply(console, arguments);
  };
  window.addEventListener('load', function(){ notify(); });
})();
</script>`;
}

function makeNavInterceptor(nonce: string, availablePages: string[]): string {
  return `<script>
(function(){
  var nonce = '${nonce}';
  var pages = ${JSON.stringify(availablePages)};
  function resolveHref(href) {
    if (!href) return null;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        var u = new URL(href);
        if (u.hostname === '${BROWSER_DOMAIN}') return u.pathname || '/';
      } catch(e){}
      return null;
    }
    var base = window.__nukhba_current_path || '/';
    if (href.startsWith('/')) return href;
    var parts = base.split('/');
    parts.pop();
    href.split('/').forEach(function(seg) {
      if (seg === '..') parts.pop();
      else if (seg !== '.') parts.push(seg);
    });
    return '/' + parts.filter(Boolean).join('/');
  }
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.getAttribute('href')) return;
    var href = el.getAttribute('href');
    var resolved = resolveHref(href);
    if (resolved !== null) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({type:'nukhba-navigate', nonce:nonce, path:resolved}, '*');
    }
  }, true);
  var origPushState = history.pushState;
  var origReplaceState = history.replaceState;
  history.pushState = function(state, title, url) {
    if (url) {
      var resolved = resolveHref(String(url));
      if (resolved !== null) {
        window.parent.postMessage({type:'nukhba-navigate', nonce:nonce, path:resolved}, '*');
        return;
      }
    }
    origPushState.apply(history, arguments);
  };
  history.replaceState = function(state, title, url) {
    if (url) {
      var resolved = resolveHref(String(url));
      if (resolved !== null) {
        window.parent.postMessage({type:'nukhba-navigate', nonce:nonce, path:resolved}, '*');
        return;
      }
    }
    origReplaceState.apply(history, arguments);
  };
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName !== 'FORM') return;
    var action = form.getAttribute('action');
    if (!action) action = window.__nukhba_current_path || '/';
    var resolved = resolveHref(action);
    if (resolved !== null) {
      e.preventDefault();
      window.parent.postMessage({type:'nukhba-navigate', nonce:nonce, path:resolved}, '*');
    }
  }, true);
})();
</script>`;
}

function build404Html(path: string, availablePages: string[], nonce: string): string {
  const links = availablePages.map(p => {
    const display = p === "/" ? "index.html (الصفحة الرئيسية)" : p.replace(/^\//, "");
    return `<li style="margin:8px 0"><a href="javascript:void(0)" onclick="window.parent.postMessage({type:'nukhba-navigate',nonce:'${nonce}',path:'${p}'},'*')" style="color:#60a5fa;text-decoration:underline;font-size:15px">${display}</a></li>`;
  }).join("");
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
${makeConsoleScript(nonce, false)}
<style>body{font-family:'Segoe UI',sans-serif;background:#1e1e2e;color:#e2e8f0;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;text-align:center}
.box{background:#2b2b3d;border-radius:16px;padding:2.5rem;max-width:500px;border:1px solid rgba(255,255,255,0.1)}
h1{color:#f38ba8;font-size:4rem;margin:0} h2{color:#F59E0B;margin-top:1rem}
ul{list-style:none;padding:0;text-align:right;margin-top:1.5rem}</style></head>
<body><div class="box"><h1>404</h1><h2>الصفحة غير موجودة</h2>
<p style="color:#a0a0b0;margin:1rem 0">المسار <code style="color:#fab387;background:#1e1e2e;padding:2px 8px;border-radius:4px">${path}</code> غير موجود</p>
${availablePages.length > 0 ? `<p style="color:#a0a0b0">الصفحات المتاحة:</p><ul>${links}</ul>` : ""}
</div></body></html>`;
}

function resolveFilePath(from: string, href: string): string {
  if (href.startsWith("/")) return href.replace(/^\/+/, "");
  const fromParts = from.split("/");
  fromParts.pop();
  const hrefParts = href.split("/");
  for (const part of hrefParts) {
    if (part === "..") fromParts.pop();
    else if (part !== ".") fromParts.push(part);
  }
  return fromParts.filter(Boolean).join("/");
}

function inlineLinkedResources(doc: string, htmlFileName: string, files: IDEFile[]): string {
  const fileMap = new Map(files.map(f => [f.name.toLowerCase(), f]));
  doc = doc.replace(/<link\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) return match;
    if (!/\.css$/i.test(href)) return match;
    const resolved = resolveFilePath(htmlFileName, href).toLowerCase();
    const found = fileMap.get(resolved);
    if (found) return `<style>/* ${href} */\n${found.content}\n</style>`;
    return match;
  });
  doc = doc.replace(/<script\s[^>]*src\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) return match;
    const resolved = resolveFilePath(htmlFileName, src).toLowerCase();
    const found = fileMap.get(resolved);
    if (found) return `<script>/* ${src} */\n${found.content}\n</script>`;
    return match;
  });
  return doc;
}

function buildPageHtml(pagePath: string, files: IDEFile[], nonce: string): string {
  const htmlFiles = getHtmlFiles(files);
  const availablePages = htmlFiles.map(f => fileNameToPath(f.name));
  const targetName = pathToFileName(pagePath);
  const htmlFile = htmlFiles.find(f => f.name.toLowerCase() === targetName.toLowerCase());

  if (htmlFile) {
    let doc = htmlFile.content;
    doc = inlineLinkedResources(doc, htmlFile.name, files);

    const linkedCssNames = new Set<string>();
    const linkedJsNames = new Set<string>();
    const linkRegex = /<link\s[^>]*href\s*=\s*["']([^"']+\.css)["'][^>]*>/gi;
    const scriptRegex = /<script\s[^>]*src\s*=\s*["']([^"']+\.js)["'][^>]*>/gi;
    let m;
    const origDoc = htmlFile.content;
    while ((m = linkRegex.exec(origDoc)) !== null) {
      if (!m[1].startsWith("http")) linkedCssNames.add(resolveFilePath(htmlFile.name, m[1]).toLowerCase());
    }
    while ((m = scriptRegex.exec(origDoc)) !== null) {
      if (!m[1].startsWith("http")) linkedJsNames.add(resolveFilePath(htmlFile.name, m[1]).toLowerCase());
    }

    const realFiles = getRealFiles(files);
    const unlinkedCss = realFiles.filter(f => f.language === "css" && !linkedCssNames.has(f.name.toLowerCase()));
    const unlinkedJs = realFiles.filter(f => f.language === "javascript" && !linkedJsNames.has(f.name.toLowerCase()));

    if (unlinkedCss.length > 0) {
      const cssBlock = unlinkedCss.map(f => `/* ${f.name} */\n${f.content}`).join("\n");
      if (/<\/head>/i.test(doc)) {
        doc = replaceLastOccurrence(doc, /<\/head>/i, `<style>\n${cssBlock}\n</style>\n</head>`);
      } else if (/<body/i.test(doc)) {
        doc = doc.replace(/<body/i, `<style>\n${cssBlock}\n</style>\n<body`);
      } else {
        doc = `<style>\n${cssBlock}\n</style>\n` + doc;
      }
    }
    if (unlinkedJs.length > 0) {
      const jsBlock = unlinkedJs.map(f => `/* ${f.name} */\n${f.content}`).join("\n");
      if (/<\/body>/i.test(doc)) {
        doc = replaceLastOccurrence(doc, /<\/body>/i, `<script>\n${jsBlock}\n</script>\n</body>`);
      } else {
        doc += `\n<script>\n${jsBlock}\n</script>`;
      }
    }
    const injectedScripts = makeConsoleScript(nonce, false) + "\n" +
      makeNavInterceptor(nonce, availablePages) + "\n" +
      `<script>window.__nukhba_current_path = '${fileNameToPath(htmlFile.name)}';</script>`;
    if (/<head[\s>]/i.test(doc) || /<head>/i.test(doc)) {
      doc = doc.replace(/<head[^>]*>/i, `$&\n${injectedScripts}`);
    } else if (/<html/i.test(doc)) {
      doc = doc.replace(/<html[^>]*>/i, `$&\n<head>${injectedScripts}</head>`);
    } else {
      doc = injectedScripts + "\n" + doc;
    }
    return doc;
  }

  if (htmlFiles.length === 0) {
    const rf = getRealFiles(files);
    const cssFiles = rf.filter(f => f.language === "css");
    const jsFiles = rf.filter(f => f.language === "javascript");
    let body = "";
    let styles = "";
    let scripts = "";
    const hasInlineConsole = jsFiles.length > 0 && cssFiles.length === 0;

    if (cssFiles.length > 0) {
      styles = cssFiles.map(f => f.content).join("\n");
      body = `<div class="wrapper">
  <header class="header"><nav class="nav"><a href="#" class="logo">Logo</a><ul class="nav-list"><li class="nav-item"><a href="#" class="nav-link">الرئيسية</a></li><li class="nav-item"><a href="#" class="nav-link">حول</a></li><li class="nav-item"><a href="#" class="nav-link">تواصل</a></li></ul></nav></header>
  <main class="main content">
    <section class="hero section"><div class="container"><h1 class="title heading">معاينة CSS</h1><p class="subtitle text description">هذا نص تجريبي لعرض الأنماط - أنشئ ملف HTML لتخصيص المحتوى</p><button class="btn button primary">زر تجريبي</button><a href="#" class="link">رابط تجريبي</a></div></section>
    <section class="section cards"><div class="grid row flex-container"><div class="card box item col"><h2 class="card-title">بطاقة 1</h2><p class="card-text">محتوى تجريبي</p></div><div class="card box item col"><h2 class="card-title">بطاقة 2</h2><p class="card-text">محتوى تجريبي</p></div><div class="card box item col"><h2 class="card-title">بطاقة 3</h2><p class="card-text">محتوى تجريبي</p></div></div></section>
  </main>
  <footer class="footer"><p>نص التذييل</p></footer>
</div>`;
    }
    if (jsFiles.length > 0) {
      scripts = jsFiles.map(f => f.content).join("\n");
      if (!body) {
        body = `<div id="nukhba-console-output" style="font-family:monospace;font-size:13px;padding:12px;background:#1e1e2e;color:#a6e3a1;min-height:100vh;direction:ltr;white-space:pre-wrap;"></div>`;
      }
    }
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${makeConsoleScript(nonce, hasInlineConsole)}
<style>body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:${cssFiles.length > 0 ? '1rem' : '0'}} ${styles}</style></head>
<body>${body}${scripts ? `<script>\n${scripts}\n</script>` : ""}</body></html>`;
  }

  return build404Html(pagePath, availablePages, nonce);
}

interface PreviewLog {
  type: "log" | "warn" | "error";
  msg: string;
  line?: number;
  col?: number;
  ts?: number;
}

interface Props {
  sectionContent: string;
  subjectId?: string;
  onShareWithTeacher?: (code: string, language: string, output: string) => void;
}

function defineNukhbaThemes(monaco: any) {
  const sharedRules = (kw: string, str: string, fn: string, num: string, type: string) => [
    { token: "",                        foreground: "D4D4D4" },
    { token: "comment",                 foreground: "6A9955", fontStyle: "italic" },
    { token: "comment.line",            foreground: "6A9955", fontStyle: "italic" },
    { token: "comment.block",           foreground: "6A9955", fontStyle: "italic" },
    { token: "comment.doc",             foreground: "5C8F5C", fontStyle: "italic" },
    { token: "keyword",                 foreground: kw, fontStyle: "bold" },
    { token: "keyword.control",         foreground: kw, fontStyle: "bold" },
    { token: "keyword.operator",        foreground: kw },
    { token: "keyword.other",           foreground: kw },
    { token: "storage",                 foreground: kw, fontStyle: "bold" },
    { token: "storage.type",            foreground: kw, fontStyle: "bold" },
    { token: "storage.modifier",        foreground: kw },
    { token: "string",                  foreground: str },
    { token: "string.quoted",           foreground: str },
    { token: "string.quoted.single",    foreground: str },
    { token: "string.quoted.double",    foreground: str },
    { token: "string.template",         foreground: str },
    { token: "string.escape",           foreground: "D7BA7D" },
    { token: "string.regexp",           foreground: "D16969" },
    { token: "string.invalid",          foreground: "F44747", fontStyle: "underline" },
    { token: "constant.numeric",        foreground: num },
    { token: "constant.language",       foreground: "569CD6" },
    { token: "constant.character",      foreground: "D7BA7D" },
    { token: "number",                  foreground: num },
    { token: "number.float",            foreground: num },
    { token: "number.hex",              foreground: num },
    { token: "type",                    foreground: type },
    { token: "type.identifier",         foreground: type },
    { token: "support.type",            foreground: type },
    { token: "entity.name.type",        foreground: type },
    { token: "entity.name.class",       foreground: "4EC9B0", fontStyle: "bold" },
    { token: "entity.other.inherited",  foreground: "4EC9B0" },
    { token: "class",                   foreground: "4EC9B0", fontStyle: "bold" },
    { token: "function",                foreground: fn },
    { token: "entity.name.function",    foreground: fn },
    { token: "support.function",        foreground: fn },
    { token: "meta.function-call",      foreground: fn },
    { token: "variable",                foreground: "9CDCFE" },
    { token: "variable.other",          foreground: "9CDCFE" },
    { token: "variable.parameter",      foreground: "9CDCFE", fontStyle: "italic" },
    { token: "variable.language",       foreground: "569CD6", fontStyle: "italic" },
    { token: "meta.object-literal.key", foreground: "9CDCFE" },
    { token: "support.variable",        foreground: "9CDCFE" },
    { token: "operator",                foreground: "D4D4D4" },
    { token: "keyword.operator.new",    foreground: kw },
    { token: "delimiter",               foreground: "D4D4D4" },
    { token: "delimiter.bracket",       foreground: "FFD700" },
    { token: "delimiter.parenthesis",   foreground: "DA70D6" },
    { token: "delimiter.curly",         foreground: "D4D4D4" },
    { token: "delimiter.square",        foreground: "2F9DD1" },
    { token: "annotation",              foreground: "DCDCAA", fontStyle: "italic" },
    { token: "decorator",               foreground: "DCDCAA" },
    { token: "tag",                     foreground: "569CD6" },
    { token: "tag.id",                  foreground: "569CD6" },
    { token: "tag.class",               foreground: "4EC9B0" },
    { token: "metatag",                 foreground: kw },
    { token: "metatag.content",         foreground: str },
    { token: "attribute.name",          foreground: "9CDCFE" },
    { token: "attribute.value",         foreground: str },
    { token: "attribute.value.number",  foreground: num },
    { token: "attribute.value.unit",    foreground: num },
    { token: "namespace",               foreground: "4EC9B0" },
    { token: "regexp",                  foreground: "D16969" },
    { token: "selector",                foreground: "D7BA7D" },
    { token: "selector.class",          foreground: "D7BA7D" },
    { token: "selector.id",             foreground: "D7BA7D" },
    { token: "invalid",                 foreground: "F44747", fontStyle: "underline" },
    { token: "invalid.deprecated",      foreground: "F44747", fontStyle: "italic underline" },
    { token: "emphasis",                fontStyle: "italic" },
    { token: "strong",                  fontStyle: "bold" },
  ];

  monaco.editor.defineTheme("nukhba-neon-gold", {
    base: "vs-dark",
    inherit: false,
    rules: sharedRules("F59E0B", "CE9178", "DCDCAA", "B5CEA8", "4EC9B0"),
    colors: {
      "editor.background":                  "#0C0E1A",
      "editor.foreground":                  "#D4D4D4",
      "editorLineNumber.foreground":        "#3C3F58",
      "editorLineNumber.activeForeground":  "#F59E0B",
      "editorCursor.foreground":            "#F59E0B",
      "editorCursor.background":            "#0C0E1A",
      "editor.selectionBackground":         "#F59E0B2E",
      "editor.inactiveSelectionBackground": "#F59E0B18",
      "editor.selectionHighlightBackground":"#F59E0B18",
      "editor.wordHighlightBackground":     "#575757B8",
      "editor.wordHighlightStrongBackground":"#004972B8",
      "editor.lineHighlightBackground":     "#F59E0B0A",
      "editor.lineHighlightBorder":         "#F59E0B1E",
      "editorWhitespace.foreground":        "#3B3B3B",
      "editorIndentGuide.background1":      "#404040",
      "editorIndentGuide.activeBackground1":"#707070",
      "editorGutter.background":            "#090B14",
      "editorBracketMatch.background":      "#F59E0B22",
      "editorBracketMatch.border":          "#F59E0B88",
      "editorError.foreground":             "#F44747",
      "editorWarning.foreground":           "#CCA700",
      "editorInfo.foreground":              "#75BEFF",
      "editorHint.foreground":              "#EEE677",
      "editorSuggestWidget.background":     "#0F1221",
      "editorSuggestWidget.border":         "#F59E0B44",
      "editorSuggestWidget.foreground":     "#D4D4D4",
      "editorSuggestWidget.selectedBackground": "#F59E0B28",
      "editorSuggestWidget.highlightForeground": "#F59E0B",
      "editorHoverWidget.background":       "#0F1221",
      "editorHoverWidget.border":           "#F59E0B44",
      "editorHoverWidget.foreground":       "#D4D4D4",
      "editorWidget.background":            "#0F1221",
      "editorWidget.border":                "#F59E0B44",
      "input.background":                   "#0C0E1A",
      "input.border":                       "#3C3F58",
      "input.foreground":                   "#D4D4D4",
      "scrollbar.shadow":                   "#000000",
      "scrollbarSlider.background":         "#F59E0B20",
      "scrollbarSlider.hoverBackground":    "#F59E0B44",
      "scrollbarSlider.activeBackground":   "#F59E0B66",
      "editor.findMatchBackground":         "#F59E0B55",
      "editor.findMatchHighlightBackground":"#F59E0B22",
      "editor.findRangeHighlightBackground":"#3A3D4160",
      "minimap.background":                 "#090B14",
      "minimapSlider.background":           "#F59E0B20",
      "minimapSlider.hoverBackground":      "#F59E0B44",
    },
  });

  monaco.editor.defineTheme("nukhba-neon-emerald", {
    base: "vs-dark",
    inherit: false,
    rules: sharedRules("10B981", "89D185", "DCDCAA", "B5CEA8", "4EC9B0"),
    colors: {
      "editor.background":                  "#071210",
      "editor.foreground":                  "#D4D4D4",
      "editorLineNumber.foreground":        "#1D3A30",
      "editorLineNumber.activeForeground":  "#10B981",
      "editorCursor.foreground":            "#10B981",
      "editorCursor.background":            "#071210",
      "editor.selectionBackground":         "#10B9812E",
      "editor.inactiveSelectionBackground": "#10B98118",
      "editor.selectionHighlightBackground":"#10B98118",
      "editor.lineHighlightBackground":     "#10B9810A",
      "editor.lineHighlightBorder":         "#10B9811E",
      "editorGutter.background":            "#050D0A",
      "editorBracketMatch.background":      "#10B98122",
      "editorBracketMatch.border":          "#10B98188",
      "editorError.foreground":             "#F44747",
      "editorWarning.foreground":           "#CCA700",
      "editorSuggestWidget.background":     "#0A1A14",
      "editorSuggestWidget.border":         "#10B98144",
      "editorSuggestWidget.foreground":     "#D4D4D4",
      "editorSuggestWidget.selectedBackground": "#10B98128",
      "editorSuggestWidget.highlightForeground": "#10B981",
      "editorHoverWidget.background":       "#0A1A14",
      "editorHoverWidget.border":           "#10B98144",
      "editorWidget.background":            "#0A1A14",
      "editorWidget.border":                "#10B98144",
      "scrollbarSlider.background":         "#10B98120",
      "scrollbarSlider.hoverBackground":    "#10B98144",
      "scrollbarSlider.activeBackground":   "#10B98166",
      "editor.findMatchBackground":         "#10B98155",
      "editor.findMatchHighlightBackground":"#10B98122",
      "minimap.background":                 "#050D0A",
      "minimapSlider.background":           "#10B98120",
    },
  });

  monaco.editor.defineTheme("nukhba-cyber-purple", {
    base: "vs-dark",
    inherit: false,
    rules: sharedRules("C792EA", "F78C6C", "82AAFF", "F78C6C", "FFCB6B"),
    colors: {
      "editor.background":                  "#0D0B1E",
      "editor.foreground":                  "#D4D4D4",
      "editorLineNumber.foreground":        "#2E2A4A",
      "editorLineNumber.activeForeground":  "#C792EA",
      "editorCursor.foreground":            "#C792EA",
      "editorCursor.background":            "#0D0B1E",
      "editor.selectionBackground":         "#C792EA2E",
      "editor.inactiveSelectionBackground": "#C792EA18",
      "editor.selectionHighlightBackground":"#C792EA18",
      "editor.lineHighlightBackground":     "#C792EA0A",
      "editor.lineHighlightBorder":         "#C792EA1E",
      "editorGutter.background":            "#090714",
      "editorBracketMatch.background":      "#C792EA22",
      "editorBracketMatch.border":          "#C792EA88",
      "editorError.foreground":             "#F44747",
      "editorWarning.foreground":           "#CCA700",
      "editorSuggestWidget.background":     "#120E28",
      "editorSuggestWidget.border":         "#C792EA44",
      "editorSuggestWidget.foreground":     "#D4D4D4",
      "editorSuggestWidget.selectedBackground": "#C792EA28",
      "editorSuggestWidget.highlightForeground": "#C792EA",
      "editorHoverWidget.background":       "#120E28",
      "editorHoverWidget.border":           "#C792EA44",
      "editorWidget.background":            "#120E28",
      "editorWidget.border":                "#C792EA44",
      "scrollbarSlider.background":         "#C792EA20",
      "scrollbarSlider.hoverBackground":    "#C792EA44",
      "scrollbarSlider.activeBackground":   "#C792EA66",
      "editor.findMatchBackground":         "#C792EA55",
      "editor.findMatchHighlightBackground":"#C792EA22",
      "minimap.background":                 "#090714",
      "minimapSlider.background":           "#C792EA20",
    },
  });
}

let completionProvidersRegistered = false;
function registerCompletionProviders(monaco: any) {
  if (completionProvidersRegistered) return;
  completionProvidersRegistered = true;

  const makeProvider = (langId: string, monacoLang: string) => {
    const snippets = LANGUAGE_SNIPPETS[langId] || [];
    monaco.languages.registerCompletionItemProvider(monacoLang, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = snippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: s.desc,
          insertText: s.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: `نُخبة Snippet — ${s.desc}`,
          range,
        }));
        return { suggestions };
      },
    });
  };

  LANGUAGES.forEach(lang => {
    makeProvider(lang.id, lang.monacoLang);
  });
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl shadow-black/60 editor-frame-neon"
        style={{ background: "#0b0d17", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <Keyboard className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-sm font-bold text-white">اختصارات لوحة المفاتيح</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-1.5">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-xs text-white/70" style={{ direction: "rtl" }}>{s.desc}</span>
                <kbd className="text-[10px] font-mono bg-[#1e1e2e] border border-white/10 rounded px-2 py-0.5 text-[#F59E0B] shrink-0 ml-4">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SnippetsPanel({
  language,
  onInsert,
  onClose,
}: {
  language: string;
  onInsert: (body: string) => void;
  onClose: () => void;
}) {
  const snippets = LANGUAGE_SNIPPETS[language] || [];
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-0 right-0 bottom-0 z-40 w-56 overflow-hidden flex flex-col shadow-2xl shadow-black/60"
      style={{ background: "#0d1017", borderLeft: "1px solid rgba(245,158,11,0.2)" }}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
        <Code2 className="w-3 h-3 text-[#F59E0B]" />
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider flex-1">Snippets</span>
        <button onClick={onClose} className="text-white/30 hover:text-white/70"><X className="w-3 h-3" /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {snippets.length === 0 ? (
          <div className="text-[11px] text-white/30 text-center py-4">لا توجد snippets لهذه اللغة</div>
        ) : snippets.map((s, i) => (
          <button
            key={i}
            onClick={() => { onInsert(s.body); onClose(); }}
            className="w-full text-right px-3 py-2 hover:bg-[#F59E0B]/10 transition-colors group"
          >
            <div className="text-[11px] font-mono text-[#F59E0B] group-hover:text-[#fbbf24]">{s.label}</div>
            <div className="text-[9px] text-white/40 mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function EditorStatusBar({
  info,
  language,
  isSaved,
  fontSize,
  onFontIncrease,
  onFontDecrease,
  wordWrapOn,
  onWordWrapToggle,
  showMinimap,
  onMinimapToggle,
}: {
  info: StatusInfo;
  language: string;
  isSaved: boolean;
  fontSize: number;
  onFontIncrease: () => void;
  onFontDecrease: () => void;
  wordWrapOn: boolean;
  onWordWrapToggle: () => void;
  showMinimap: boolean;
  onMinimapToggle: () => void;
}) {
  const li = LANGUAGES.find(l => l.id === language);
  return (
    <div className="editor-status-bar flex items-center gap-2 px-3 py-0.5 text-[10px] font-mono shrink-0 overflow-x-auto">
      <span className="text-[#F59E0B]/80 flex items-center gap-1 shrink-0">
        <span>{li?.icon}</span>
        <span>{li?.label || language}</span>
      </span>
      <span className="text-white/30">|</span>
      <span className="text-white/50 shrink-0">سطر {info.line}، عمود {info.col}</span>
      {info.selected > 0 && (
        <><span className="text-white/30">|</span><span className="text-[#10B981]/80 shrink-0">{info.selected} حرف محدد</span></>
      )}
      {info.errors > 0 && (
        <><span className="text-white/30">|</span><span className="text-[#f38ba8] flex items-center gap-0.5 shrink-0"><AlertTriangle className="w-2.5 h-2.5" /> {info.errors}</span></>
      )}
      {info.warnings > 0 && (
        <><span className="text-white/30">|</span><span className="text-[#fab387] shrink-0">⚠ {info.warnings}</span></>
      )}
      <div className="flex-1" />
      <button
        onClick={onWordWrapToggle}
        className={`shrink-0 px-1.5 py-0.5 rounded transition-colors ${wordWrapOn ? "text-[#10B981]/80 hover:text-[#10B981]" : "text-white/30 hover:text-white/60"}`}
        title={wordWrapOn ? "تفعيل التفاف السطر" : "إيقاف التفاف السطر"}
      >
        {wordWrapOn ? "↵ تفاف" : "↵ لا تفاف"}
      </button>
      <span className="text-white/20">|</span>
      <button
        onClick={onMinimapToggle}
        className={`shrink-0 px-1.5 py-0.5 rounded transition-colors ${showMinimap ? "text-[#8B5CF6]/80 hover:text-[#8B5CF6]" : "text-white/30 hover:text-white/60"}`}
        title={showMinimap ? "إخفاء الخريطة المصغرة" : "إظهار الخريطة المصغرة"}
      >
        خريطة
      </button>
      <span className="text-white/20">|</span>
      <span className="text-white/40 shrink-0">مسافات: 2</span>
      <span className="text-white/20">|</span>
      <span className="text-white/30 flex items-center gap-1 shrink-0">
        <button onClick={onFontDecrease} className="hover:text-white transition-colors p-0.5" title="تصغير الخط"><ZoomOut className="w-2.5 h-2.5" /></button>
        <span>{fontSize}px</span>
        <button onClick={onFontIncrease} className="hover:text-white transition-colors p-0.5" title="تكبير الخط"><ZoomIn className="w-2.5 h-2.5" /></button>
      </span>
      <span className="text-white/20">|</span>
      <span className="text-white/40 shrink-0">UTF-8</span>
      <span className="text-white/20">|</span>
      <AnimatePresence mode="wait">
        {isSaved ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[#10B981] flex items-center gap-1 shrink-0"
          >
            <Check className="w-2.5 h-2.5" /> محفوظ ✓
          </motion.span>
        ) : (
          <motion.span key="unsaved" className="text-[#F59E0B]/60 shrink-0">غير محفوظ</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CodeEditorPanel({ sectionContent, subjectId, onShareWithTeacher }: Props) {
  const isMobile = useIsMobile();
  const starter = extractStarterCode(sectionContent);
  const detectedLang = detectLanguageFromContent(sectionContent, subjectId);
  const langInfo = (l: string) => LANGUAGES.find(x => x.id === l) || LANGUAGES[0];

  const { user } = useAuth();
  const LS_KEY = user?.id ? `nukhba::u:${user.id}::ide-files-v3` : null;
  const THEME_KEY = user?.id ? `nukhba::u:${user.id}::editor-theme` : "nukhba::editor-theme";
  const FONT_KEY = user?.id ? `nukhba::u:${user.id}::editor-font-size` : "nukhba::editor-font-size";
  const MINIMAP_KEY = user?.id ? `nukhba::u:${user.id}::minimap` : "nukhba::minimap";
  const WORDWRAP_KEY = user?.id ? `nukhba::u:${user.id}::wordwrap` : "nukhba::wordwrap";

  const initFiles = (): IDEFile[] => {
    if (LS_KEY) {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    const lang = detectedLang;
    const ext = langInfo(lang).ext;
    return [{ id: "main", name: `main.${ext}`, language: lang, content: starter || DEFAULT_CODE[lang] || "" }];
  };

  const [files, setFiles] = useState<IDEFile[]>(initFiles);
  const [activeId, setActiveId] = useState<string>(() => initFiles()[0]?.id || "main");
  const [isCreating, setIsCreating] = useState(false);
  const [createTarget, setCreateTarget] = useState<"file" | "folder">("file");
  const [createPrefix, setCreatePrefix] = useState("");
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showExplorer, setShowExplorer] = useState(!isMobile);
  const [showMobileExplorer, setShowMobileExplorer] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [openTabs, setOpenTabs] = useState<Set<string>>(() => new Set([initFiles()[0]?.id || "main"]));
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error">("success");
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLogs, setPreviewLogs] = useState<PreviewLog[]>([]);
  const [showPreviewConsole, setShowPreviewConsole] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewNonce] = useState(() => Math.random().toString(36).slice(2));
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [currentPage, setCurrentPage] = useState("/");
  const [navHistory, setNavHistory] = useState<string[]>(["/"]);
  const [navIndex, setNavIndex] = useState(0);
  const [urlBarValue, setUrlBarValue] = useState(`https://${BROWSER_DOMAIN}/`);
  const [urlBarEditing, setUrlBarEditing] = useState(false);

  const [editorTheme, setEditorTheme] = useState<string>(() => {
    try { return localStorage.getItem(THEME_KEY) || "nukhba-neon-gold"; } catch { return "nukhba-neon-gold"; }
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(FONT_KEY) || "13"); } catch { return 13; }
  });
  const [statusInfo, setStatusInfo] = useState<StatusInfo>({ line: 1, col: 1, selected: 0, errors: 0, warnings: 0 });
  const [isSaved, setIsSaved] = useState(true);
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState("");
  const [quickOpenMode, setQuickOpenMode] = useState<"files" | "search">("files");
  const [showMinimap, setShowMinimap] = useState<boolean>(() => {
    try {
      const k = user?.id ? `nukhba::u:${user.id}::minimap` : "nukhba::minimap";
      return localStorage.getItem(k) === "1";
    } catch { return false; }
  });
  const [wordWrapOn, setWordWrapOn] = useState<boolean>(() => {
    try {
      const k = user?.id ? `nukhba::u:${user.id}::wordwrap` : "nukhba::wordwrap";
      return localStorage.getItem(k) !== "0";
    } catch { return true; }
  });
  const [savedToast, setSavedToast] = useState(false);
  const savedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlBarRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeFullRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);
  const editorThemeRef = useRef(editorTheme);
  editorThemeRef.current = editorTheme;
  // Stable refs so event-listener closures always target the current active file
  // (initialised lazily — .current is updated below once activeFile is computed)
  const activeFileRef = useRef<IDEFile | undefined>(undefined);
  const runningRef = useRef(running);
  runningRef.current = running;

  const canPreview = isWebSubject(subjectId) || hasWebFiles(files);
  const htmlPages = useMemo(() => getHtmlFiles(files), [files]);
  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const navigateTo = useCallback((path: string) => {
    const normalized = path.startsWith("/") ? path : "/" + path;
    setCurrentPage(normalized);
    setNavIndex(prevIdx => {
      setNavHistory(prevHist => {
        const newHist = prevHist.slice(0, prevIdx + 1);
        newHist.push(normalized);
        return newHist;
      });
      return prevIdx + 1;
    });
    setUrlBarValue(`https://${BROWSER_DOMAIN}${normalized}`);
    setUrlBarEditing(false);
    setPreviewLogs([]);
    setPreviewKey(k => k + 1);
  }, []);

  const goBack = useCallback(() => {
    if (navIndex <= 0) return;
    const newIdx = navIndex - 1;
    setNavIndex(newIdx);
    const path = navHistory[newIdx];
    setCurrentPage(path);
    setUrlBarValue(`https://${BROWSER_DOMAIN}${path}`);
    setPreviewLogs([]);
    setPreviewKey(k => k + 1);
  }, [navIndex, navHistory]);

  const goForward = useCallback(() => {
    if (navIndex >= navHistory.length - 1) return;
    const newIdx = navIndex + 1;
    setNavIndex(newIdx);
    const path = navHistory[newIdx];
    setCurrentPage(path);
    setUrlBarValue(`https://${BROWSER_DOMAIN}${path}`);
    setPreviewLogs([]);
    setPreviewKey(k => k + 1);
  }, [navIndex, navHistory]);

  const handleUrlBarSubmit = useCallback(() => {
    let val = urlBarValue.trim();
    if (!val) return;
    if (val.startsWith("/")) { navigateTo(val); return; }
    if (/^[\w\-]+\.html?$/i.test(val) || /^[\w\-]+$/i.test(val)) {
      const path = val.endsWith(".html") || val.endsWith(".htm") ? val : val + ".html";
      navigateTo("/" + path);
      return;
    }
    if (!val.startsWith("http")) val = "https://" + val;
    try {
      const u = new URL(val);
      navigateTo(u.pathname || "/");
    } catch {
      navigateTo("/" + val.replace(/^\/+/, ""));
    }
    setUrlBarEditing(false);
  }, [urlBarValue, navigateTo]);

  const markSaved = useCallback(() => {
    setIsSaved(true);
    setUnsavedFiles(new Set());
    setSavedToast(true);
    if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
    savedToastTimerRef.current = setTimeout(() => setSavedToast(false), 1800);
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    defineNukhbaThemes(monaco);
    monaco.editor.setTheme(editorThemeRef.current);

    registerCompletionProviders(monaco);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      document.dispatchEvent(new CustomEvent("nukhba-manual-save"));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      document.dispatchEvent(new CustomEvent("nukhba-run-code"));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      document.dispatchEvent(new CustomEvent("nukhba-toggle-explorer"));
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Slash, () => {
      document.dispatchEvent(new CustomEvent("nukhba-show-shortcuts"));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
      document.dispatchEvent(new CustomEvent("nukhba-font-increase"));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
      document.dispatchEvent(new CustomEvent("nukhba-font-decrease"));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      document.dispatchEvent(new CustomEvent("nukhba-quick-open"));
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });

    editor.onDidChangeCursorSelection(() => {
      const pos = editor.getPosition();
      const sel = editor.getSelection();
      let selectedText = "";
      if (sel && !sel.isEmpty()) {
        selectedText = editor.getModel()?.getValueInRange(sel) || "";
      }
      setStatusInfo(prev => ({
        ...prev,
        line: pos?.lineNumber || 1,
        col: pos?.column || 1,
        selected: selectedText.length,
      }));

      if (selectedText.trim().length > 20 && onShareWithTeacher) {
        const model = editor.getModel();
        const lang = model?.getLanguageId() || "unknown";
        setSelectionAction({ text: selectedText, language: lang });
      } else {
        setSelectionAction(null);
      }
    });

    editor.onDidChangeModelDecorations(() => {
      const model = editor.getModel();
      if (model) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const errors = markers.filter((m: any) => m.severity === monaco.MarkerSeverity.Error).length;
        const warnings = markers.filter((m: any) => m.severity === monaco.MarkerSeverity.Warning).length;
        setStatusInfo(prev => ({ ...prev, errors, warnings }));
      }
    });

    setTimeout(() => editor.layout(), 50);
  }, [markSaved, onShareWithTeacher]);

  useEffect(() => {
    const handleRun = () => handleRunCodeRef.current();
    const handleToggleExplorer = () => { setShowExplorer(e => !e); };
    const handleShowShortcuts = () => { setShowShortcuts(true); };
    const handleFontIncrease = () => { setFontSize(s => { const n = Math.min(s + 1, 24); localStorage.setItem(FONT_KEY, String(n)); return n; }); };
    const handleFontDecrease = () => { setFontSize(s => { const n = Math.max(s - 1, 10); localStorage.setItem(FONT_KEY, String(n)); return n; }); };
    const handleManualSave = () => { markSaved(); };
    const handleQuickOpen = () => { setShowQuickOpen(q => !q); setQuickOpenQuery(""); setQuickOpenMode("files"); };

    document.addEventListener("nukhba-run-code", handleRun);
    document.addEventListener("nukhba-toggle-explorer", handleToggleExplorer);
    document.addEventListener("nukhba-show-shortcuts", handleShowShortcuts);
    document.addEventListener("nukhba-font-increase", handleFontIncrease);
    document.addEventListener("nukhba-font-decrease", handleFontDecrease);
    document.addEventListener("nukhba-manual-save", handleManualSave);
    document.addEventListener("nukhba-quick-open", handleQuickOpen);
    return () => {
      document.removeEventListener("nukhba-run-code", handleRun);
      document.removeEventListener("nukhba-toggle-explorer", handleToggleExplorer);
      document.removeEventListener("nukhba-show-shortcuts", handleShowShortcuts);
      document.removeEventListener("nukhba-font-increase", handleFontIncrease);
      document.removeEventListener("nukhba-font-decrease", handleFontDecrease);
      document.removeEventListener("nukhba-manual-save", handleManualSave);
      document.removeEventListener("nukhba-quick-open", handleQuickOpen);
    };
  }, [running, markSaved]);

  useEffect(() => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;
    const ro = new ResizeObserver(() => editor.layout());
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeId]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    monaco.editor.setTheme(editorTheme);
    try { localStorage.setItem(THEME_KEY, editorTheme); } catch {}
  }, [editorTheme]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({ fontSize });
    try { localStorage.setItem(FONT_KEY, String(fontSize)); } catch {}
  }, [fontSize]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({ minimap: { enabled: showMinimap } });
    try { localStorage.setItem(MINIMAP_KEY, showMinimap ? "1" : "0"); } catch {}
  }, [showMinimap]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({ wordWrap: wordWrapOn ? "on" : "off" });
    try { localStorage.setItem(WORDWRAP_KEY, wordWrapOn ? "1" : "0"); } catch {}
  }, [wordWrapOn]);

  const realFilesOnly = files.filter(f => !f.name.endsWith("/.gitkeep"));
  const activeFile = realFilesOnly.find(f => f.id === activeId) || realFilesOnly[0];

  useEffect(() => {
    if (!activeFile) return;
    if (activeFile.id !== activeId) setActiveId(activeFile.id);
    setOpenTabs(prev => {
      const validIds = new Set(realFilesOnly.map(f => f.id));
      const cleaned = new Set([...prev].filter(id => validIds.has(id)));
      if (activeFile) cleaned.add(activeFile.id);
      if (cleaned.size !== prev.size || !prev.has(activeFile.id)) return cleaned;
      return prev;
    });
  }, [files]);

  // Keep the stable ref current on every render
  activeFileRef.current = activeFile;

  const activeLangInfo = langInfo(activeFile?.language || "python");

  const previewHtml = useMemo(() => {
    if (!showPreview && !previewFullscreen) return "";
    return buildPageHtml(currentPage, files, previewNonce);
  }, [files, previewNonce, showPreview, previewFullscreen, currentPage]);

  useEffect(() => {
    if (!LS_KEY) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(files));
    } catch {}
    // Debounced autosave: mark saved 1.5s after the last change, not on every keystroke
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => markSaved(), 1500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [files]);

  useEffect(() => {
    if (isCreating && newNameRef.current) newNameRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.nonce || e.data.nonce !== previewNonce) return;
      const src = e.source;
      const isOurIframe = src === iframeRef.current?.contentWindow || src === iframeFullRef.current?.contentWindow;
      if (!isOurIframe) return;
      if (e.data.type === "nukhba-preview-error") {
        setPreviewLogs((e.data.errors || []).map((l: any) => ({ ...l, ts: Date.now() })));
      } else if (e.data.type === "nukhba-navigate" && e.data.path) {
        navigateTo(e.data.path);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [previewNonce, navigateTo]);

  const updateContent = (content: string) => {
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content } : f));
    setUnsavedFiles(prev => new Set([...prev, activeFile.id]));
    setIsSaved(false);
  };

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const startCreate = (type: "file" | "folder", prefix = "") => {
    setCreateTarget(type);
    setCreatePrefix(prefix);
    setIsCreating(true);
    setNewName("");
    setNameError("");
  };

  const expandAllParents = (filePath: string) => {
    const parts = filePath.split("/");
    if (parts.length <= 1) return;
    setExpandedFolders(prev => {
      const next = new Set(prev);
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i).join("/"));
      }
      return next;
    });
  };

  const createFile = () => {
    const raw = newName.trim().replace(/^\/+|\/+$/g, "").replace(/\/\/+/g, "/");
    if (!raw) { setNameError("أدخل اسم الملف"); return; }
    if (/^\.+$/.test(raw) || raw.split("/").some(s => !s || s === "." || s === "..")) {
      setNameError("اسم غير صالح"); return;
    }
    if (createTarget === "folder") {
      const folderPath = createPrefix ? `${createPrefix}/${raw}` : raw;
      const placeholder: IDEFile = { id: `${Date.now()}`, name: `${folderPath}/.gitkeep`, language: "bash", content: "" };
      setFiles(prev => [...prev, placeholder]);
      expandAllParents(`${folderPath}/dummy`);
      setIsCreating(false); setNewName(""); setNameError("");
      return;
    }
    const fullName = createPrefix ? `${createPrefix}/${raw}` : raw;
    if (files.some(f => f.name === fullName)) { setNameError("اسم مستخدم مسبقاً"); return; }
    const lang = detectLangFromExt(fullName);
    const newFile: IDEFile = { id: `${Date.now()}`, name: fullName, language: lang, content: DEFAULT_CODE[lang] || "" };
    setFiles(prev => [...prev, newFile]);
    setActiveId(newFile.id);
    setOpenTabs(prev => new Set([...prev, newFile.id]));
    expandAllParents(fullName);
    setIsCreating(false); setNewName(""); setNameError("");
    setOutput(null); setShowOutput(false);
  };

  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = files.filter(f => f.id !== id);
    const newReal = newFiles.filter(f => !f.name.endsWith("/.gitkeep"));
    if (newReal.length === 0) return;
    setFiles(newFiles);
    setOpenTabs(prev => {
      const next = new Set(prev);
      next.delete(id);
      if (activeId === id) { const fallback = newReal[0]?.id || ""; if (fallback) next.add(fallback); }
      return next;
    });
    if (activeId === id) setActiveId(newReal[0]?.id || "");
  };

  const deleteFolder = (folderPath: string) => {
    const prefix = folderPath + "/";
    const deletedIds = new Set(files.filter(f => f.name.startsWith(prefix)).map(f => f.id));
    const newFiles = files.filter(f => !f.name.startsWith(prefix));
    const newReal = newFiles.filter(f => !f.name.endsWith("/.gitkeep"));
    if (newReal.length === 0) return;
    setFiles(newFiles);
    const needsNewActive = activeFile && activeFile.name.startsWith(prefix);
    setOpenTabs(prev => {
      const next = new Set(prev);
      deletedIds.forEach(id => next.delete(id));
      if (needsNewActive) { const fallback = newReal[0]?.id || ""; if (fallback) next.add(fallback); }
      return next;
    });
    if (needsNewActive) setActiveId(newReal[0]?.id || "");
  };

  const switchFile = (id: string) => {
    setActiveId(id);
    setOpenTabs(prev => new Set([...prev, id]));
    setOutput(null);
    setShowOutput(false);
    if (isMobile) setShowMobileExplorer(false);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = new Set(openTabs);
    newTabs.delete(id);
    if (newTabs.size === 0) {
      const firstReal = realFilesOnly[0];
      if (firstReal) newTabs.add(firstReal.id);
    }
    setOpenTabs(newTabs);
    if (activeId === id) {
      const tabArr = [...newTabs];
      const realTab = tabArr.find(t => realFilesOnly.some(f => f.id === t));
      setActiveId(realTab || realFilesOnly[0]?.id || "");
    }
  };

  const handleRunCode = async () => {
    const file = activeFileRef.current;
    if (runningRef.current || !file) return;
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: file.content, language: file.language }),
      });
      const data = await res.json();
      const hasError = data.exitCode !== 0 || (!data.output && data.error);
      setOutputType(hasError ? "error" : "success");
      setOutput(
        data.output
          ? data.output + (data.error ? `\n${data.error}` : "")
          : data.error || "لا يوجد إخراج"
      );
    } catch {
      setOutputType("error");
      setOutput("خطأ في الاتصال بالخادم");
    } finally {
      setRunning(false);
    }
  };

  const handleRun = handleRunCode;
  // Always-current ref so event listeners never close over a stale handleRunCode
  const handleRunCodeRef = useRef(handleRunCode);
  handleRunCodeRef.current = handleRunCode;

  const handlePreview = () => {
    setPreviewLogs([]);
    setPreviewKey(k => k + 1);
    setShowPreview(true);
    setShowPreviewConsole(false);
    setUrlBarValue(`https://${BROWSER_DOMAIN}${currentPage}`);
  };

  const handleReset = () => {
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: DEFAULT_CODE[f.language] || "" } : f));
    setOutput(null);
    setShowOutput(false);
  };

  const sharePreview = () => {
    if (!onShareWithTeacher) return;
    const webFiles = files.filter(f => WEB_LANGS.has(f.language));
    const filesSummary = webFiles.map(f => `--- ${f.name} (${f.language}) ---\n${f.content}`).join("\n\n");
    const logsText = previewLogs.length > 0
      ? "\n\n--- سجل المعاينة ---\n" + previewLogs.map(l =>
        `[${l.type === "error" ? "خطأ" : l.type === "warn" ? "تحذير" : "سجل"}]${l.line ? ` سطر ${l.line}` : ""}: ${l.msg}`
      ).join("\n")
      : "";
    const pageInfo = htmlPages.length > 1 ? `\nالصفحة الحالية: ${currentPage}\nإجمالي الصفحات: ${htmlPages.length} (${htmlPages.map(f => f.name).join(", ")})` : "";
    onShareWithTeacher(
      filesSummary, "html",
      `معاينة الصفحة الحية:${pageInfo}\nالملفات المستخدمة: ${webFiles.map(f => f.name).join(", ")}${previewLogs.filter(l => l.type === "error").length > 0 ? `\n⚠️ يوجد ${previewLogs.filter(l => l.type === "error").length} أخطاء` : "\n✓ لا توجد أخطاء"}${logsText}`
    );
  };

  const insertSnippet = (body: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger("", "editor.action.insertSnippet", { snippet: body });
  };

  const copyConsoleOutput = () => {
    const text = previewLogs.map(l => `[${l.type.toUpperCase()}] ${l.msg}`).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const copyTerminalOutput = () => {
    if (output) navigator.clipboard.writeText(output).catch(() => {});
  };

  const errorCount = previewLogs.filter(l => l.type === "error").length;
  const warnCount = previewLogs.filter(l => l.type === "warn").length;
  const logCount = previewLogs.filter(l => l.type === "log").length;
  const isWebLang = WEB_LANGS.has(activeFile?.language || "");

  const mobileCodeMirrorLang = (): CMEditorLang => {
    const lang = activeFile?.language;
    if (lang === "javascript") return "javascript";
    if (lang === "css") return "css";
    if (lang === "html") return "html";
    return "text";
  };

  const quickOpenFiles = useMemo(() => {
    const q = quickOpenQuery.toLowerCase().trim();
    return realFilesOnly.filter(f => !q || f.name.toLowerCase().includes(q)).slice(0, 20);
  }, [realFilesOnly, quickOpenQuery]);

  type SearchMatch = { file: IDEFile; lineNo: number; line: string; matchStart: number; matchEnd: number };
  const searchMatches = useMemo((): SearchMatch[] => {
    if (quickOpenMode !== "search") return [];
    const q = quickOpenQuery.toLowerCase().trim();
    if (q.length < 2) return [];
    const results: SearchMatch[] = [];
    for (const f of realFilesOnly) {
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const idx = lower.indexOf(q);
        if (idx !== -1) {
          results.push({ file: f, lineNo: i + 1, line: lines[i], matchStart: idx, matchEnd: idx + q.length });
          if (results.length >= 60) return results;
        }
      }
    }
    return results;
  }, [realFilesOnly, quickOpenQuery, quickOpenMode]);

  const renderTree = (nodes: TreeNode[], depth: number): React.ReactNode => {
    const mobSize = isMobile;
    const iconSize = mobSize ? "w-4 h-4" : "w-3 h-3";
    const folderIconSize = mobSize ? "w-4 h-4" : "w-3.5 h-3.5";
    const rowPy = mobSize ? "py-[6px]" : "py-[3px]";
    const textSize = mobSize ? "text-[13px]" : "text-[11px]";
    const actionIconSize = mobSize ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
    const actionVisible = mobSize ? "opacity-60" : "opacity-0 group-hover:opacity-100";

    return nodes.map(node => {
      if (node.type === "folder") {
        const isExpanded = expandedFolders.has(node.path);
        const visibleChildren = (node.children || []).filter(c => c.type === "folder" || (c.file && !c.file.name.endsWith("/.gitkeep")));
        return (
          <div key={`folder-${node.path}`}>
            <div
              className={`group flex items-center gap-1 px-1 ${rowPy} cursor-pointer hover:bg-[#F59E0B]/5 ${textSize} font-mono text-[#c8c8d0] select-none transition-colors`}
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              <motion.span
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.18 }}
                className="shrink-0 inline-flex"
              >
                <ChevronRight className={`${iconSize} text-[#6e6a86]`} />
              </motion.span>
              {isExpanded
                ? <FolderOpen className={`${folderIconSize} text-[#F59E0B] shrink-0`} />
                : <Folder className={`${folderIconSize} text-[#F59E0B]/70 shrink-0`} />}
              <span className="flex-1 truncate">{node.name}</span>
              <span className={`${actionVisible} flex items-center gap-0.5 shrink-0`}>
                <button onClick={(e) => { e.stopPropagation(); startCreate("file", node.path); }} className="p-0.5 text-[#6e6a86] hover:text-white"><Plus className={actionIconSize} /></button>
                <button onClick={(e) => { e.stopPropagation(); startCreate("folder", node.path); }} className="p-0.5 text-[#6e6a86] hover:text-white"><FolderPlus className={actionIconSize} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteFolder(node.path); }} className="p-0.5 text-[#6e6a86] hover:text-red-400"><X className={actionIconSize} /></button>
              </span>
            </div>
            {isExpanded && (
              <div>
                {isCreating && createPrefix === node.path && (
                  <div className="flex items-center gap-1 py-[2px]" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
                    {createTarget === "folder" ? <Folder className={`${iconSize} text-[#F59E0B] shrink-0`} /> : <FileCode className={`${iconSize} text-[#6e6a86] shrink-0`} />}
                    <input
                      ref={newNameRef}
                      value={newName}
                      onChange={e => { setNewName(e.target.value); setNameError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); } }}
                      placeholder={createTarget === "folder" ? "subfolder" : "file.js"}
                      className={`flex-1 bg-[#1e1e2e] border border-[#F59E0B]/50 rounded px-1.5 ${mobSize ? "py-1 text-xs" : "py-0 text-[10px]"} font-mono text-white outline-none min-w-0`}
                      autoFocus
                    />
                    <button onClick={createFile} className="text-[#28c840] shrink-0 p-0.5"><Check className={actionIconSize} /></button>
                    <button onClick={() => { setIsCreating(false); setNewName(""); }} className="text-[#ff5f57] shrink-0 p-0.5"><X className={actionIconSize} /></button>
                  </div>
                )}
                {nameError && createPrefix === node.path && <div className={`${mobSize ? "text-[10px]" : "text-[9px]"} text-red-400`} style={{ paddingLeft: `${(depth + 1) * 12 + 16}px` }}>{nameError}</div>}
                {renderTree(visibleChildren, depth + 1)}
              </div>
            )}
          </div>
        );
      }
      if (!node.file || node.file.name.endsWith("/.gitkeep")) return null;
      const isActive = activeId === node.file.id;
      const hasUnsaved = unsavedFiles.has(node.file.id);
      return (
        <motion.div
          key={node.file.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={`group flex items-center gap-1 px-1 ${rowPy} cursor-pointer ${textSize} font-mono select-none transition-colors ${
            isActive ? "bg-[#F59E0B]/10 text-white" : "text-[#a0a0b0] hover:bg-[#F59E0B]/5 hover:text-white/80"
          }`}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          onClick={() => switchFile(node.file!.id)}
        >
          <span className={`${mobSize ? "text-[12px]" : "text-[10px]"} shrink-0`}>{getFileIcon(node.file.language)}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {hasUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />}
          {realFilesOnly.length > 1 && (
            <span
              onClick={(e) => deleteFile(node.file!.id, e)}
              className={`${actionVisible} hover:text-red-400 transition-all shrink-0 p-0.5`}
            >
              <X className={actionIconSize} />
            </span>
          )}
        </motion.div>
      );
    });
  };

  const editorArea = isMobile ? (
    <div className="w-full bg-[#0b0d17] relative editor-caret-glow" style={{ minHeight: showPreview ? "clamp(150px, 25vh, 220px)" : "clamp(200px, 38vh, 340px)", maxHeight: "50vh" }}>
      <CodeEditor
        value={activeFile?.content || ""}
        onChange={updateContent}
        language={mobileCodeMirrorLang()}
        minHeight={showPreview ? 150 : 200}
        className="w-full h-full"
        ariaLabel={`محرر ${activeLangInfo.label}`}
      />
    </div>
  ) : (
    <div className="flex-1 min-w-0 relative">
      <Editor
        key={activeFile?.id}
        height={showPreview ? "clamp(200px, 38vh, 340px)" : "clamp(200px, 38vh, 340px)"}
        width="100%"
        language={activeLangInfo.monacoLang}
        value={activeFile?.content || ""}
        onChange={(val) => updateContent(val || "")}
        onMount={handleEditorMount}
        theme={editorTheme}
        loading={
          <div className="flex flex-col items-center justify-center h-full py-10 gap-3">
            <div className="w-10 h-10 rounded-full nk-shimmer holographic flex items-center justify-center">
              <FileCode className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div className="text-[#6e6a86] text-xs font-mono flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
              <span>جاري تحميل المحرر...</span>
            </div>
          </div>
        }
        options={{
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          wrappingIndent: "indent",
          lineNumbers: "on",
          glyphMargin: false,
          folding: true,
          lineNumbersMinChars: 2,
          lineDecorationsWidth: 4,
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorBlinking: "phase",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 10, bottom: 10 },
          scrollbar: {
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
            useShadows: false,
            alwaysConsumeMouseWheel: false,
          },
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          parameterHints: { enabled: true },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "smart",
          hover: { enabled: true, delay: 600 },
          links: true,
          colorDecorators: true,
          occurrencesHighlight: "singleFile",
          selectionHighlight: true,
          codeLens: false,
          renderValidationDecorations: "on",
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          formatOnPaste: true,
          autoClosingBrackets: "languageDefined",
          autoClosingQuotes: "languageDefined",
          tabCompletion: "on",
          suggest: {
            showSnippets: true,
            showKeywords: true,
            showMethods: true,
            showFunctions: true,
            showVariables: true,
            showClasses: true,
            showModules: true,
            filterGraceful: true,
          },
        }}
      />
      <AnimatePresence>
        {showSnippets && (
          <SnippetsPanel
            language={activeFile?.language || "python"}
            onInsert={insertSnippet}
            onClose={() => setShowSnippets(false)}
          />
        )}
      </AnimatePresence>
      {selectionAction && onShareWithTeacher && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-2 right-2 z-30"
        >
          <button
            onClick={() => {
              onShareWithTeacher(selectionAction.text, selectionAction.language, `الكود المحدد (${selectionAction.language})`);
              setSelectionAction(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-lg transition-all active:scale-95"
            style={{
              background: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.5)",
              color: "#F59E0B",
              boxShadow: "0 0 12px rgba(245,158,11,0.3)",
            }}
            title="اسأل المعلم عن الكود المحدد"
          >
            <MessageSquare className="w-3 h-3" />
            اسأل المعلم
          </button>
        </motion.div>
      )}
    </div>
  );

  const mainContent = (
    <div ref={containerRef} className={`editor-frame-neon rounded-2xl overflow-hidden shadow-2xl shadow-black/50 w-full min-w-0 ${isZenMode ? "fixed inset-0 z-[9998] rounded-none" : ""}`} style={{ direction: "ltr" }}>

      <div className="bg-[#0d1017] px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors cursor-pointer hover:shadow-[0_0_6px_rgba(255,95,87,0.8)]" onClick={() => { if (isZenMode) setIsZenMode(false); }} />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] hover:bg-[#f5a623] transition-colors cursor-pointer hover:shadow-[0_0_6px_rgba(255,189,46,0.8)]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28c840] hover:bg-[#1fb636] transition-colors cursor-pointer hover:shadow-[0_0_6px_rgba(40,200,64,0.8)]" />
        </div>
        <FileCode className="w-3.5 h-3.5 text-[#F59E0B]/60 hidden sm:block" />
        <span className="text-[11px] sm:text-xs text-[#6e6a86] font-mono flex-1 truncate">
          Nukhba IDE — {activeFile?.name || ""}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!isMobile && (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowThemePicker(t => !t)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-[#6e6a86] hover:text-white hover:bg-white/5 transition-colors font-mono"
                  title="اختر الثيم"
                >
                  <span style={{ color: EDITOR_THEMES.find(t => t.id === editorTheme)?.color || "#F59E0B" }}>●</span>
                  <span className="hidden sm:inline">{EDITOR_THEMES.find(t => t.id === editorTheme)?.label || "Theme"}</span>
                </button>
                <AnimatePresence>
                  {showThemePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[180px]"
                      style={{ background: "#0f1221", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      {EDITOR_THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setEditorTheme(t.id); setShowThemePicker(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono transition-colors ${editorTheme === t.id ? "bg-white/8 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/80"}`}
                        >
                          <span style={{ color: t.color }}>●</span>
                          {t.label}
                          {editorTheme === t.id && <Check className="w-3 h-3 ml-auto" style={{ color: t.color }} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setShowSnippets(s => !s)}
                className={`text-[#6e6a86] hover:text-white transition-colors p-1 rounded ${showSnippets ? "text-[#F59E0B] bg-[#F59E0B]/10" : ""}`}
                title="لوحة الـ Snippets"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsZenMode(z => !z)}
                className="text-[#6e6a86] hover:text-white transition-colors p-1 rounded"
                title="وضع Zen (تركيز كامل)"
              >
                {isZenMode ? <Minimize className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className="text-[#6e6a86] hover:text-white transition-colors p-1 rounded"
                title="اختصارات لوحة المفاتيح (Shift+/)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            title="إعادة تعيين الملف"
            className="text-[#6e6a86] hover:text-white/70 transition-colors p-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-[#090b14] border-b border-white/5 flex items-center relative">
        <button
          onClick={() => isMobile ? setShowMobileExplorer(!showMobileExplorer) : setShowExplorer(!showExplorer)}
          className={`shrink-0 px-2 py-2 transition-colors ${(isMobile ? showMobileExplorer : showExplorer) ? "text-[#F59E0B]" : "text-[#6e6a86] hover:text-white/60"}`}
          title={showExplorer ? "إخفاء المستكشف (Ctrl+B)" : "إظهار المستكشف (Ctrl+B)"}
        >
          {(isMobile ? showMobileExplorer : showExplorer) ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide relative">
          {realFilesOnly.filter(f => openTabs.has(f.id)).map(file => {
            const li = langInfo(file.language);
            const displayName = file.name.includes("/") ? file.name.split("/").pop()! : file.name;
            const hasDuplicate = realFilesOnly.filter(f2 => openTabs.has(f2.id)).some(f2 => f2.id !== file.id && (f2.name.includes("/") ? f2.name.split("/").pop()! : f2.name) === displayName);
            const isActive = activeId === file.id;
            const hasUnsaved = unsavedFiles.has(file.id);
            return (
              <button
                key={file.id}
                onClick={() => switchFile(file.id)}
                className={`group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-mono whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "text-white bg-[#0b0d17]"
                    : "text-[#6e6a86] hover:text-white/60 hover:bg-white/3"
                }`}
                title={file.name}
                style={{ borderBottom: "2px solid transparent" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "linear-gradient(90deg, #F59E0B, #fbbf24)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="text-[10px]">{li.icon}</span>
                <span>{hasDuplicate ? file.name : displayName}</span>
                {hasUnsaved && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                )}
                {hasUnsaved && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0 animate-pulse" />
                )}
                <span
                  onClick={(e) => closeTab(file.id, e)}
                  className={`${isMobile ? "opacity-60" : "opacity-0 group-hover:opacity-100"} hover:text-red-400 transition-all ml-0.5 cursor-pointer`}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-1.5 sm:px-2 shrink-0 flex items-center gap-1.5">
          {canPreview && (
            <button
              onClick={handlePreview}
              className="preview-btn-pulse flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-all bg-emerald-600 text-white hover:bg-emerald-500 shadow shadow-emerald-600/20"
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">معاينة</span>
              <span className="sm:hidden">👁</span>
            </button>
          )}
          {!isWebLang && (
            <button
              onClick={handleRun}
              disabled={running}
              className={`run-btn-pulse flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-all ${
                running
                  ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                  : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow shadow-[#F59E0B]/30 active:scale-95"
              }`}
            >
              {running
                ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>...</span></>
                : <><Play className="w-3 h-3 fill-current" /><span>▶</span></>
              }
            </button>
          )}
        </div>
      </div>

      {isMobile && showMobileExplorer && (
        <div className="bg-[#090b14] border-b border-white/5 max-h-[50vh] overflow-y-auto">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/5">
            <span className="text-[10px] text-[#6e6a86] font-mono font-bold flex-1 uppercase tracking-wider">المستكشف</span>
            <button onClick={() => startCreate("file")} className="text-[#6e6a86] hover:text-white transition-colors p-0.5" title="ملف جديد"><Plus className="w-3.5 h-3.5" /></button>
            <button onClick={() => startCreate("folder")} className="text-[#6e6a86] hover:text-white transition-colors p-0.5" title="مجلد جديد"><FolderPlus className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowMobileExplorer(false)} className="text-[#6e6a86] hover:text-white transition-colors p-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="py-0.5">
            {isCreating && !createPrefix && (
              <div className="px-2 py-1 flex items-center gap-1">
                {createTarget === "folder" ? <Folder className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" /> : <FileCode className="w-3.5 h-3.5 text-[#6e6a86] shrink-0" />}
                <input
                  ref={newNameRef}
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNameError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); setNameError(""); } }}
                  placeholder={createTarget === "folder" ? "css" : "index.html"}
                  className="flex-1 bg-[#1e1e2e] border border-[#F59E0B]/50 rounded px-2 py-1 text-xs font-mono text-white outline-none min-w-0 placeholder:text-[#6e6a86]"
                  autoFocus
                />
                <button onClick={createFile} className="text-[#28c840] shrink-0 p-1"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setIsCreating(false); setNewName(""); }} className="text-[#ff5f57] shrink-0 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {nameError && !createPrefix && <div className="px-3 text-[10px] text-red-400">{nameError}</div>}
            {renderTree(fileTree, 0)}
          </div>
        </div>
      )}

      <div className="bg-[#090b14] px-3 py-1 flex items-center gap-1 border-b border-white/5 min-h-0 text-[10px] font-mono">
        <span className="text-[9px] text-[#6e6a86]/60 shrink-0">{activeLangInfo.icon}</span>
        {activeFile?.name.includes("/") ? (
          <span className="flex items-center gap-0.5 min-w-0 overflow-hidden">
            {activeFile.name.split("/").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-0.5 shrink-0">
                {i < arr.length - 1 ? (
                  <><span className="text-[#6e6a86]/60 truncate max-w-[60px]">{part}</span><ChevronRight className="w-2.5 h-2.5 text-[#6e6a86]/40 shrink-0" /></>
                ) : (
                  <span className="text-white/60 truncate max-w-[120px]">{part}</span>
                )}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-white/60 truncate flex-1">{activeFile?.name}</span>
        )}
        {canPreview && <span className="text-[9px] text-emerald-400/40 font-mono shrink-0 hidden sm:inline ml-auto">● Live</span>}
        {!canPreview && <span className="flex-1" />}
        <button
          onClick={() => { setShowQuickOpen(q => !q); setQuickOpenQuery(""); }}
          className="shrink-0 text-[#6e6a86] hover:text-white/60 p-0.5 ml-1 transition-colors"
          title="فتح ملف سريع (Ctrl+P)"
        >
          <Search className="w-2.5 h-2.5" />
        </button>
        <span className="text-[9px] text-[#6e6a86] font-mono shrink-0">{realFilesOnly.length} ملفات</span>
      </div>

      <div className={`bg-[#0b0d17] w-full overflow-hidden flex ${showPreview && !previewFullscreen ? "flex-col sm:flex-row" : ""} relative`}>
        {showExplorer && !isMobile && (
          <div className="w-[200px] min-w-[200px] bg-[#080a12] border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
            <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/5">
              <span className="text-[10px] text-[#6e6a86] font-mono font-bold flex-1 uppercase tracking-wider">المستكشف</span>
              <button onClick={() => startCreate("file")} className="text-[#6e6a86] hover:text-[#F59E0B] transition-colors p-0.5" title="ملف جديد"><Plus className="w-3 h-3" /></button>
              <button onClick={() => startCreate("folder")} className="text-[#6e6a86] hover:text-[#F59E0B] transition-colors p-0.5" title="مجلد جديد"><FolderPlus className="w-3 h-3" /></button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-0.5">
              {isCreating && !createPrefix && (
                <div className="px-2 py-1 flex items-center gap-1">
                  {createTarget === "folder" ? <Folder className="w-3 h-3 text-[#F59E0B] shrink-0" /> : <FileCode className="w-3 h-3 text-[#6e6a86] shrink-0" />}
                  <input
                    ref={newNameRef}
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setNameError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); setNameError(""); } }}
                    placeholder={createTarget === "folder" ? "css" : "index.html"}
                    className="flex-1 bg-[#1e1e2e] border border-[#F59E0B]/50 rounded px-1.5 py-0.5 text-[11px] font-mono text-white outline-none min-w-0 placeholder:text-[#6e6a86]"
                    autoFocus
                  />
                  <button onClick={createFile} className="text-[#28c840] hover:text-green-300 shrink-0"><Check className="w-3 h-3" /></button>
                  <button onClick={() => { setIsCreating(false); setNewName(""); }} className="text-[#ff5f57] hover:text-red-300 shrink-0"><X className="w-3 h-3" /></button>
                </div>
              )}
              {nameError && !createPrefix && <div className="px-3 text-[9px] text-red-400">{nameError}</div>}
              {renderTree(fileTree, 0)}
            </div>
          </div>
        )}

        <div className={`flex-1 min-w-0 flex flex-col relative ${showPreview && !previewFullscreen ? "sm:w-1/2 sm:border-r sm:border-white/5" : ""}`}>
          {editorArea}
        </div>

        {showPreview && !previewFullscreen && (
          <div className="w-full sm:w-1/2 flex flex-col border-t sm:border-t-0 border-white/5">
            <div className="bg-[#0d1017] px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-mono font-bold">LIVE PREVIEW</span>
              {htmlPages.length > 1 && (
                <span className="text-[9px] text-[#F59E0B]/80 font-mono bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">{currentPage === "/" ? "index.html" : currentPage.replace(/^\//, "")}</span>
              )}
              <div className="flex-1" />
              {errorCount > 0 && (
                <button onClick={() => setShowPreviewConsole(!showPreviewConsole)} className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                  <AlertTriangle className="w-3 h-3" /> {errorCount}
                </button>
              )}
              {warnCount > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">⚠ {warnCount}</span>}
              {logCount > 0 && (
                <button onClick={() => setShowPreviewConsole(!showPreviewConsole)} className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                  <Terminal className="w-3 h-3" /> {logCount}
                </button>
              )}
              <button onClick={() => setPreviewFullscreen(true)} className="text-[#6e6a86] hover:text-white transition-colors" title="تكبير"><Maximize2 className="w-3 h-3" /></button>
              <button onClick={handlePreview} className="text-[#6e6a86] hover:text-emerald-400 transition-colors" title="تحديث المعاينة"><RotateCcw className="w-3 h-3" /></button>
              <button onClick={() => setShowPreview(false)} className="text-[#6e6a86] hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 bg-white" style={{ minHeight: isMobile ? "200px" : "clamp(200px, 30vh, 300px)" }}>
              <iframe
                ref={iframeRef}
                key={previewKey}
                srcDoc={previewHtml}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
                style={{ minHeight: isMobile ? "200px" : "clamp(200px, 30vh, 300px)" }}
                title="معاينة الصفحة"
              />
            </div>
            <AnimatePresence>
              {showPreviewConsole && previewLogs.length > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#060910] border-t border-white/10 max-h-[120px] overflow-y-auto">
                    <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#060910]">
                      <Terminal className="w-3 h-3 text-[#6e6a86]" />
                      <span className="text-[10px] text-[#6e6a86] font-mono">CONSOLE ({previewLogs.length})</span>
                      <div className="flex-1" />
                      <button onClick={copyConsoleOutput} className="text-[#6e6a86] hover:text-white p-0.5" title="نسخ"><Copy className="w-3 h-3" /></button>
                      <button onClick={() => setPreviewLogs([])} className="text-[#6e6a86] hover:text-white p-0.5" title="مسح"><Trash2 className="w-3 h-3" /></button>
                      <button onClick={() => setShowPreviewConsole(false)} className="text-[#6e6a86] hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {previewLogs.map((log, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`text-[11px] font-mono flex items-start gap-1.5 ${log.type === "error" ? "text-[#f38ba8]" : log.type === "warn" ? "text-[#fab387]" : "text-[#a6e3a1]"}`}
                        >
                          <span className="shrink-0">{log.type === "error" ? "✗" : log.type === "warn" ? "⚠" : "›"}</span>
                          <span className="break-all">{log.msg}{log.line ? ` (سطر ${log.line})` : ""}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!isMobile && (
        <EditorStatusBar
          info={statusInfo}
          language={activeFile?.language || "python"}
          isSaved={isSaved}
          fontSize={fontSize}
          onFontIncrease={() => setFontSize(s => { const n = Math.min(s + 1, 24); try { localStorage.setItem(FONT_KEY, String(n)); } catch {} return n; })}
          onFontDecrease={() => setFontSize(s => { const n = Math.max(s - 1, 10); try { localStorage.setItem(FONT_KEY, String(n)); } catch {} return n; })}
          wordWrapOn={wordWrapOn}
          onWordWrapToggle={() => setWordWrapOn(w => !w)}
          showMinimap={showMinimap}
          onMinimapToggle={() => setShowMinimap(m => !m)}
        />
      )}

      {showPreview && previewFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setPreviewFullscreen(false); }}>
          <div className="w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10">

            <div className="bg-[#1a1a2e] px-2 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-2 border-b border-white/10 shrink-0" style={{ background: "linear-gradient(135deg, rgba(10,13,25,0.98), rgba(15,18,32,0.98))" }}>
              <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
                <button onClick={() => { setShowPreview(false); setPreviewFullscreen(false); }} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:shadow-[0_0_6px_rgba(255,95,87,0.8)] transition-all" title="إغلاق" />
                <button onClick={() => setPreviewFullscreen(false)} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:shadow-[0_0_6px_rgba(255,189,46,0.8)] transition-all" title="تصغير" />
                <button className="w-3 h-3 rounded-full bg-[#28c840] hover:shadow-[0_0_6px_rgba(40,200,64,0.8)] transition-all" title="تكبير" />
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <button onClick={goBack} className={`p-1 transition-colors ${canGoBack ? "text-white/80 hover:text-white" : "text-[#6e6a86]/40 cursor-not-allowed"}`} disabled={!canGoBack}><ArrowLeft className="w-3.5 h-3.5" /></button>
                <button onClick={goForward} className={`p-1 transition-colors ${canGoForward ? "text-white/80 hover:text-white" : "text-[#6e6a86]/40 cursor-not-allowed"}`} disabled={!canGoForward}><ArrowRight className="w-3.5 h-3.5" /></button>
                <button onClick={handlePreview} className="p-1 text-[#6e6a86] hover:text-emerald-400 transition-colors" title="تحديث"><RotateCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => navigateTo("/")} className="p-1 text-[#6e6a86] hover:text-white/80 transition-colors" title="الصفحة الرئيسية"><Home className="w-3.5 h-3.5" /></button>
              </div>

              <div
                className="flex-1 mx-1 sm:mx-2 rounded-lg border px-2 sm:px-3 py-1 flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-text"
                style={{
                  background: "rgba(15,18,32,0.8)",
                  borderColor: "rgba(16,185,129,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(16,185,129,0.05)",
                }}
                onClick={() => { setUrlBarEditing(true); setTimeout(() => urlBarRef.current?.select(), 0); }}
              >
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.5))" }} />
                {urlBarEditing ? (
                  <input
                    ref={urlBarRef}
                    value={urlBarValue}
                    onChange={e => setUrlBarValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); handleUrlBarSubmit(); }
                      if (e.key === "Escape") { setUrlBarEditing(false); setUrlBarValue(`https://${BROWSER_DOMAIN}${currentPage}`); }
                    }}
                    onBlur={() => { setUrlBarEditing(false); setUrlBarValue(`https://${BROWSER_DOMAIN}${currentPage}`); }}
                    className="flex-1 bg-transparent text-[10px] sm:text-xs text-white font-mono outline-none min-w-0"
                    autoFocus spellCheck={false} dir="ltr"
                  />
                ) : (
                  <span className="text-[10px] sm:text-xs font-mono truncate select-all min-w-0 flex-1">
                    <span className="text-white/30">https://</span>
                    <span className="text-white/60">{BROWSER_DOMAIN}</span>
                    <span className="text-emerald-400">{currentPage}</span>
                  </span>
                )}
                {htmlPages.length > 1 && !urlBarEditing && (
                  <div className="relative group shrink-0">
                    <button className="text-[#6e6a86] hover:text-white/70 transition-colors p-0.5"><Layers className="w-3 h-3" /></button>
                    <div className="absolute top-full right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] z-50 hidden group-hover:block">
                      {htmlPages.map(f => {
                        const pagePath = fileNameToPath(f.name);
                        const isActivePage = currentPage === pagePath;
                        return (
                          <button
                            key={f.id}
                            onClick={(e) => { e.stopPropagation(); navigateTo(pagePath); }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center gap-2 transition-colors ${isActivePage ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-white/70 hover:bg-white/5"}`}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {onShareWithTeacher && (
                  <button onClick={sharePreview} className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors" title="شارك مع المعلم"><Share2 className="w-3.5 h-3.5" /></button>
                )}
                <button onClick={() => setShowPreviewConsole(!showPreviewConsole)} className={`p-1 transition-colors ${showPreviewConsole ? "text-[#F59E0B]" : "text-[#6e6a86] hover:text-white/60"}`} title="وحدة التحكم"><Terminal className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => setPreviewFullscreen(false)}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-md bg-[#F59E0B] text-black hover:bg-[#fbbf24] transition-colors mr-0.5"
                >
                  <FileCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">المحرر</span>
                </button>
              </div>
            </div>

            <div className="bg-[#0d1017] px-2 sm:px-3 py-1 flex items-center gap-2 sm:gap-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-[#1a1a2e] rounded-md px-2 py-0.5">
                {(["desktop", "tablet", "mobile"] as const).map(mode => {
                  const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone;
                  const label = mode === "desktop" ? "سطح المكتب" : mode === "tablet" ? "جهاز لوحي" : "جوال";
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewportMode(mode)}
                      className={`p-1 rounded transition-all ${viewportMode === mode ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-[#6e6a86] hover:text-white/60"}`}
                      title={label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] sm:text-[10px] text-[#6e6a86] font-mono hidden sm:inline">
                {viewportMode === "desktop" ? "100%" : viewportMode === "tablet" ? "768px" : "375px"}
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 sm:gap-2">
                {errorCount > 0 && <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono"><AlertTriangle className="w-3 h-3" /> {errorCount}</span>}
                {warnCount > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">⚠ {warnCount}</span>}
                {logCount > 0 && <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono"><Terminal className="w-3 h-3" /> {logCount}</span>}
              </div>
            </div>

            <div className="flex-1 bg-[#e8e8e8] flex items-start justify-center overflow-auto min-h-0">
              <div
                className="bg-white transition-all duration-300 h-full"
                style={{
                  width: viewportMode === "desktop" ? "100%" : viewportMode === "tablet" ? "768px" : "375px",
                  maxWidth: "100%",
                  boxShadow: viewportMode !== "desktop" ? "0 0 40px rgba(0,0,0,0.3)" : "none",
                  borderLeft: viewportMode !== "desktop" ? "1px solid rgba(0,0,0,0.1)" : "none",
                  borderRight: viewportMode !== "desktop" ? "1px solid rgba(0,0,0,0.1)" : "none",
                }}
              >
                <iframe
                  ref={iframeFullRef}
                  key={previewKey}
                  srcDoc={previewHtml}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0"
                  title="معاينة الصفحة"
                />
              </div>
            </div>

            <AnimatePresence>
              {showPreviewConsole && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "clamp(100px, 20vh, 200px)" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="bg-[#060910] border-t border-white/10 h-full flex flex-col">
                    <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2 shrink-0">
                      <Terminal className="w-3 h-3 text-[#6e6a86]" />
                      <span className="text-[10px] text-[#6e6a86] font-mono">CONSOLE ({previewLogs.length})</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => setShowTimestamps(t => !t)}
                        className={`text-[10px] font-mono transition-colors ${showTimestamps ? "text-[#F59E0B]" : "text-[#6e6a86] hover:text-white"}`}
                      >
                        TS
                      </button>
                      {errorCount > 0 && <span className="text-[9px] text-red-400 font-mono">{errorCount} errors</span>}
                      {logCount > 0 && <span className="text-[9px] text-blue-400 font-mono">{logCount} logs</span>}
                      <button onClick={copyConsoleOutput} className="text-[#6e6a86] hover:text-white p-0.5" title="نسخ"><Copy className="w-3 h-3" /></button>
                      <button onClick={() => setPreviewLogs([])} className="text-[10px] text-[#6e6a86] hover:text-white font-mono p-0.5" title="مسح"><Trash2 className="w-3 h-3" /></button>
                      <button onClick={() => setShowPreviewConsole(false)} className="text-[#6e6a86] hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="p-2 space-y-0.5 overflow-y-auto flex-1">
                      {previewLogs.length === 0 ? (
                        <div className="text-[11px] text-[#6e6a86] font-mono py-2 text-center">لا توجد سجلات</div>
                      ) : previewLogs.map((log, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`text-[11px] font-mono flex items-start gap-1.5 ${log.type === "error" ? "text-[#f38ba8]" : log.type === "warn" ? "text-[#fab387]" : "text-[#a6e3a1]"}`}
                        >
                          <span className="shrink-0 text-white/30">{String(i + 1).padStart(2, "0")}</span>
                          <span className="shrink-0">{log.type === "error" ? "✗" : log.type === "warn" ? "⚠" : "›"}</span>
                          <span className="break-all flex-1">{log.msg}{log.line ? ` (سطر ${log.line})` : ""}</span>
                          {showTimestamps && log.ts && (
                            <span className="shrink-0 text-white/20 text-[9px] ml-1">
                              {new Date(log.ts).toLocaleTimeString("ar-SA")}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#0d1017] px-3 py-1 flex items-center gap-3 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-mono">LIVE</span>
              </div>
              <span className="text-[9px] text-[#6e6a86] font-mono">{viewportMode === "desktop" ? "Desktop" : viewportMode === "tablet" ? "Tablet 768px" : "Mobile 375px"}</span>
              {htmlPages.length > 1 && <span className="text-[9px] text-[#F59E0B]/60 font-mono">{htmlPages.length} صفحات</span>}
              <div className="flex-1" />
              <span className="text-[9px] text-[#6e6a86] font-mono">Nukhba Browser</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#090b14] px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 flex items-center gap-2 sm:gap-3 flex-wrap">
        {canPreview && (
          <>
            <button
              onClick={handlePreview}
              className="preview-btn-pulse flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30 active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{showPreview ? "تحديث المعاينة 🔄" : "معاينة الصفحة 👁"}</span>
            </button>
            <button
              onClick={() => { handlePreview(); setPreviewFullscreen(true); }}
              className="run-btn-pulse flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow-[#F59E0B]/30 active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>فتح المتصفح 🌐</span>
            </button>
            {showPreview && onShareWithTeacher && (
              <button
                onClick={sharePreview}
                className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-3 py-2 sm:py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                style={{ direction: "rtl" }}
              >
                📤 شارك مع المعلم
              </button>
            )}
          </>
        )}
        {!canPreview && (
          <button
            onClick={handleRun}
            disabled={running}
            className={`run-btn-pulse flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg ${
              running
                ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow-[#F59E0B]/30 active:scale-95"
            }`}
          >
            {running
              ? <><div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>جاري التنفيذ...</span></>
              : <><Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /><span>تشغيل الكود ▶</span></>
            }
          </button>
        )}
        {canPreview && !isWebLang && (
          <button
            onClick={handleRun}
            disabled={running}
            className={`run-btn-pulse flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg ${
              running
                ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow-[#F59E0B]/30 active:scale-95"
            }`}
          >
            {running
              ? <><div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>جاري التنفيذ...</span></>
              : <><Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /><span>تشغيل ▶</span></>
            }
          </button>
        )}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 sm:gap-2 text-[#6e6a86] hover:text-white/70 transition-colors text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl hover:bg-white/5"
        >
          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">إعادة تعيين</span>
          <span className="sm:hidden">↺</span>
        </button>
        <div className="flex-1" />
        {output !== null && !running && !canPreview && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className={`text-[11px] sm:text-xs font-mono flex items-center gap-1.5 ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
              <Circle className="w-2 h-2 fill-current" />
              {outputType === "success" ? "نجح ✓" : "خطأ ✗"}
            </div>
            {onShareWithTeacher && (
              <button
                onClick={() => onShareWithTeacher(activeFile?.content || "", activeFile?.language || "python", output ?? "")}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                style={{ direction: "rtl" }}
              >
                <span>📤</span>
                <span>شارك مع المعلم</span>
              </button>
            )}
          </div>
        )}
        {showPreview && (
          <div className="flex items-center gap-2">
            {errorCount === 0 ? (
              <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Circle className="w-2 h-2 fill-current" /> لا أخطاء ✓
              </span>
            ) : (
              <button
                onClick={() => setShowPreviewConsole(!showPreviewConsole)}
                className="text-[10px] sm:text-[11px] text-red-400 font-mono flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" /> {errorCount} أخطاء
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOutput && !canPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#060910] border-t border-white/5">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-b border-white/5">
                <Terminal className="w-3.5 h-3.5 text-[#6e6a86] shrink-0" />
                <span className="text-[10px] sm:text-xs text-[#6e6a86] font-mono shrink-0">TERMINAL</span>
                {output !== null && (
                  <div className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
                    <Circle className="w-2 h-2 fill-current" />
                    <span className="hidden sm:inline">{outputType === "success" ? "exit 0" : "exit 1"}</span>
                  </div>
                )}
                {output !== null && (
                  <span className="text-[10px] text-[#6e6a86] font-mono shrink-0">
                    {output.split("\n").length} سطر
                  </span>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowTimestamps(t => !t)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors shrink-0 ${showTimestamps ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-[#6e6a86] hover:text-white/60"}`}
                  title="إظهار الطوابع الزمنية"
                >⏱</button>
                {output && (
                  <button onClick={copyTerminalOutput} className="text-[#6e6a86] hover:text-white p-0.5 shrink-0" title="نسخ الإخراج"><Copy className="w-3 h-3" /></button>
                )}
                {output && (
                  <button onClick={() => setOutput(null)} className="text-[#6e6a86] hover:text-[#ff5f57] p-0.5 shrink-0" title="مسح الإخراج">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => { setShowOutput(false); setOutput(null); }} className="text-[#6e6a86] hover:text-white/60 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 sm:p-4 font-mono min-h-[60px] sm:min-h-[80px] max-h-[200px] overflow-y-auto bg-[#060910] console-log-entry">
                {output === null && running ? (
                  <div className="flex items-center gap-2 text-[#6e6a86] text-xs sm:text-sm">
                    <div className="w-3 h-3 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                    <span>$ running {activeLangInfo.label}...</span>
                  </div>
                ) : output !== null ? (
                  <pre className={`whitespace-pre-wrap text-[11px] sm:text-xs leading-relaxed ${outputType === "success" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}>
                    {showTimestamps && (
                      <span className="text-[#6e6a86] text-[10px]">[{new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] </span>
                    )}
                    <span className="text-[#6e6a86]">$ {activeFile?.name}{"\n"}</span>
                    {output}
                  </pre>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const openFileAtLine = (fileId: string, lineNo: number) => {
    switchFile(fileId);
    setTimeout(() => {
      const editor = editorRef.current;
      if (editor) {
        editor.revealLineInCenter(lineNo);
        editor.setPosition({ lineNumber: lineNo, column: 1 });
        editor.focus();
      }
    }, 80);
  };

  const quickOpenPanel = showQuickOpen && (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh]"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={() => setShowQuickOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl shadow-black/60"
        style={{ border: "1px solid rgba(245,158,11,0.25)", background: "#0f1221" }}
      >
        {/* Tab switcher */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setQuickOpenMode("files")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono transition-colors ${quickOpenMode === "files" ? "text-[#F59E0B] border-b-2 border-[#F59E0B]" : "text-[#6e6a86] hover:text-white/60"}`}
          >
            <FileCode className="w-3 h-3" /> ملفات (Ctrl+P)
          </button>
          <button
            onClick={() => setQuickOpenMode("search")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono transition-colors ${quickOpenMode === "search" ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]" : "text-[#6e6a86] hover:text-white/60"}`}
          >
            <Search className="w-3 h-3" /> بحث في الملفات
          </button>
        </div>
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
          {quickOpenMode === "files"
            ? <FileCode className="w-4 h-4 text-[#F59E0B]/50 shrink-0" />
            : <Search className="w-4 h-4 text-[#8B5CF6]/50 shrink-0" />}
          <input
            autoFocus
            value={quickOpenQuery}
            onChange={e => setQuickOpenQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { setShowQuickOpen(false); return; }
              if (e.key === "Enter") {
                if (quickOpenMode === "files" && quickOpenFiles.length > 0) {
                  switchFile(quickOpenFiles[0].id); setShowQuickOpen(false);
                } else if (quickOpenMode === "search" && searchMatches.length > 0) {
                  openFileAtLine(searchMatches[0].file.id, searchMatches[0].lineNo); setShowQuickOpen(false);
                }
              }
            }}
            placeholder={quickOpenMode === "files" ? "ابحث عن ملف..." : "ابحث في محتوى الملفات..."}
            className="flex-1 bg-transparent text-sm text-white font-mono outline-none placeholder:text-[#6e6a86]"
            dir="rtl"
          />
          <span className="text-[10px] text-[#6e6a86] font-mono shrink-0">ESC للإغلاق</span>
        </div>
        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {quickOpenMode === "files" ? (
            quickOpenFiles.length === 0 ? (
              <div className="text-center py-6 text-[#6e6a86] text-xs font-mono">لا توجد ملفات مطابقة</div>
            ) : quickOpenFiles.map(f => {
              const li = langInfo(f.language);
              const isActive = f.id === activeId;
              const segments = f.name.split("/");
              const fileName = segments.pop()!;
              const folderPath = segments.join("/");
              return (
                <button
                  key={f.id}
                  onClick={() => { switchFile(f.id); setShowQuickOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors text-left ${isActive ? "bg-[#F59E0B]/10" : "hover:bg-white/5"}`}
                >
                  <span className="text-sm shrink-0">{li.icon}</span>
                  <span className={`text-sm font-mono flex-1 truncate ${isActive ? "text-[#F59E0B]" : "text-white/80"}`}>{fileName}</span>
                  {folderPath && <span className="text-[10px] text-[#6e6a86] font-mono shrink-0 truncate max-w-[120px]">{folderPath}/</span>}
                </button>
              );
            })
          ) : (
            quickOpenQuery.trim().length < 2 ? (
              <div className="text-center py-6 text-[#6e6a86] text-xs font-mono">اكتب 2+ حرف للبحث في محتوى الملفات</div>
            ) : searchMatches.length === 0 ? (
              <div className="text-center py-6 text-[#6e6a86] text-xs font-mono">لا توجد نتائج</div>
            ) : searchMatches.map((m, idx) => {
              const before = m.line.slice(0, m.matchStart);
              const match = m.line.slice(m.matchStart, m.matchEnd);
              const after = m.line.slice(m.matchEnd);
              const segments = m.file.name.split("/");
              const fileName = segments.pop()!;
              return (
                <button
                  key={`${m.file.id}-${m.lineNo}-${idx}`}
                  onClick={() => { openFileAtLine(m.file.id, m.lineNo); setShowQuickOpen(false); }}
                  className="w-full flex items-start gap-2.5 px-4 py-2 hover:bg-white/5 transition-colors text-left group"
                >
                  <span className="text-[10px] text-[#8B5CF6]/70 font-mono shrink-0 mt-0.5 w-8 text-right">{m.lineNo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] text-[#6e6a86] font-mono mb-0.5 truncate">{fileName}{segments.length > 0 ? ` · ${segments.join("/")}` : ""}</div>
                    <div className="text-xs font-mono text-white/60 truncate">
                      {before && <span>{before.length > 20 ? "…" + before.slice(-20) : before}</span>}
                      <span className="text-[#F59E0B] bg-[#F59E0B]/15 px-0.5 rounded">{match}</span>
                      {after && <span>{after.length > 40 ? after.slice(0, 40) + "…" : after}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-white/8 flex items-center gap-3 text-[9px] text-[#6e6a86] font-mono">
          <span>↑↓ للتنقل</span>
          <span>Enter للفتح</span>
          <span>Esc للإغلاق</span>
          {quickOpenMode === "search" && searchMatches.length > 0 && (
            <span className="ml-auto text-[#8B5CF6]/60">{searchMatches.length} نتيجة</span>
          )}
          {quickOpenMode === "files" && (
            <span className="ml-auto text-[#F59E0B]/60">{quickOpenFiles.length} ملف</span>
          )}
        </div>
      </motion.div>
    </div>
  );

  const savedToastEl = savedToast && (
    <motion.div
      key="saved-toast"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[11000] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono shadow-xl"
      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" }}
    >
      <Check className="w-3.5 h-3.5" /> تم الحفظ تلقائيًا ✓
    </motion.div>
  );

  return (
    <>
      {mainContent}
      <AnimatePresence>
        {showShortcuts && (
          <ShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showQuickOpen && quickOpenPanel}
      </AnimatePresence>
      <AnimatePresence>
        {savedToast && savedToastEl}
      </AnimatePresence>
    </>
  );
}
