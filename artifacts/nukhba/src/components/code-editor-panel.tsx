import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Circle, X, Plus, FileCode, Zap, Check, Eye, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
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

interface IDEFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const LS_KEY = "nukhba-ide-files-v2";

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
  if (lower.includes("swift")) return "swift";
  if (lower.includes("dart") || lower.includes("flutter")) return "dart";
  if (lower.includes("rust")) return "rust";
  if (lower.includes("golang") || lower.includes(" go ")) return "go";
  if (lower.includes("ruby")) return "ruby";
  if (lower.includes("php")) return "php";
  if (lower.includes("sql")) return "sql";
  if (lower.includes("lua")) return "lua";
  if (lower.includes("elixir")) return "elixir";
  if (lower.includes("c++") || lower.includes("cpp")) return "cpp";
  if (lower.includes("bash") || lower.includes("shell")) return "bash";
  if (lower.includes("perl")) return "perl";
  if (lower.includes("awk")) return "awk";
  if (lower.includes(" r ") || lower.includes("rstudio")) return "r";
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

function buildPreviewHtml(files: IDEFile[], nonce: string): string {
  const htmlFile = files.find(f => f.language === "html");
  const cssFiles = files.filter(f => f.language === "css");
  const jsFiles = files.filter(f => f.language === "javascript");

  if (htmlFile) {
    let doc = htmlFile.content;
    if (cssFiles.length > 0) {
      const cssBlock = cssFiles.map(f => f.content).join("\n");
      if (/<\/head>/i.test(doc)) {
        doc = replaceLastOccurrence(doc, /<\/head>/i, `<style>\n${cssBlock}\n</style>\n</head>`);
      } else if (/<body/i.test(doc)) {
        doc = doc.replace(/<body/i, `<style>\n${cssBlock}\n</style>\n<body`);
      } else {
        doc = `<style>\n${cssBlock}\n</style>\n` + doc;
      }
    }
    if (jsFiles.length > 0) {
      const jsBlock = jsFiles.map(f => f.content).join("\n");
      if (/<\/body>/i.test(doc)) {
        doc = replaceLastOccurrence(doc, /<\/body>/i, `<script>\n${jsBlock}\n</script>\n</body>`);
      } else {
        doc += `\n<script>\n${jsBlock}\n</script>`;
      }
    }
    const errorScript = `<script>
(function(){
  var nonce = '${nonce}';
  var errors = [];
  var MAX_LOGS = 200;
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
  window.onerror = function(msg, src, line, col) {
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: String(msg), line: line, col: col});
    notify();
  };
  window.addEventListener('unhandledrejection', function(e){
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: 'Unhandled Promise: ' + String(e.reason)});
    notify();
  });
  var origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'log', msg: args});
    notify();
    origLog.apply(console, arguments);
  };
  console.warn = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'warn', msg: args});
    notify();
    origWarn.apply(console, arguments);
  };
  console.error = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: args});
    notify();
    origErr.apply(console, arguments);
  };
  window.addEventListener('load', function(){ notify(); });
})();
</script>`;
    if (/<head[\s>]/i.test(doc) || /<head>/i.test(doc)) {
      doc = doc.replace(/<head[^>]*>/i, `$&\n${errorScript}`);
    } else if (/<html/i.test(doc)) {
      doc = doc.replace(/<html[^>]*>/i, `$&\n<head>${errorScript}</head>`);
    } else {
      doc = errorScript + "\n" + doc;
    }
    return doc;
  }

  let body = "";
  let styles = "";
  let scripts = "";

  if (cssFiles.length > 0) {
    styles = cssFiles.map(f => f.content).join("\n");
    body = `<div class="wrapper">
  <header class="header"><nav class="nav"><a href="#" class="logo">Logo</a><ul class="nav-list"><li class="nav-item"><a href="#" class="nav-link">الرئيسية</a></li><li class="nav-item"><a href="#" class="nav-link">حول</a></li><li class="nav-item"><a href="#" class="nav-link">تواصل</a></li></ul></nav></header>
  <main class="main content">
    <section class="hero section"><div class="container"><h1 class="title heading">معاينة CSS</h1><p class="subtitle text description">هذا نص تجريبي لعرض الأنماط - أنشئ ملف HTML لتخصيص المحتوى</p><button class="btn button primary">زر تجريبي</button><a href="#" class="link">رابط تجريبي</a></div></section>
    <section class="section cards"><div class="grid row flex-container"><div class="card box item col"><h2 class="card-title">بطاقة 1</h2><p class="card-text">محتوى تجريبي</p></div><div class="card box item col"><h2 class="card-title">بطاقة 2</h2><p class="card-text">محتوى تجريبي</p></div><div class="card box item col"><h2 class="card-title">بطاقة 3</h2><p class="card-text">محتوى تجريبي</p></div></div></section>
    <section class="section"><form class="form"><div class="form-group field"><label class="label">الاسم</label><input type="text" class="input form-control" placeholder="أدخل اسمك" /></div><div class="form-group field"><label class="label">البريد</label><input type="email" class="input form-control" placeholder="أدخل بريدك" /></div><textarea class="textarea form-control" placeholder="رسالتك"></textarea><button type="button" class="btn submit button">إرسال</button></form></section>
    <ul class="list"><li class="list-item">عنصر 1</li><li class="list-item">عنصر 2</li><li class="list-item">عنصر 3</li></ul>
    <table class="table"><thead><tr><th>العمود 1</th><th>العمود 2</th><th>العمود 3</th></tr></thead><tbody><tr><td>بيانات</td><td>بيانات</td><td>بيانات</td></tr><tr><td>بيانات</td><td>بيانات</td><td>بيانات</td></tr></tbody></table>
  </main>
  <footer class="footer"><p class="footer-text">&copy; 2024 معاينة CSS - نُخبة</p></footer>
</div>`;
  }
  if (jsFiles.length > 0) {
    scripts = jsFiles.map(f => f.content).join("\n");
    if (!body) {
      body = `<div id="nukhba-console-output" style="font-family:monospace;font-size:13px;padding:12px;background:#1e1e2e;color:#a6e3a1;min-height:100vh;direction:ltr;white-space:pre-wrap;"></div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>
(function(){
  var nonce = '${nonce}';
  var errors = [];
  var MAX_LOGS = 200;
  var consoleEl = null;
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
  function appendToConsole(type, text) {
    if (!consoleEl) consoleEl = document.getElementById('nukhba-console-output');
    if (!consoleEl) return;
    var line = document.createElement('div');
    line.style.padding = '2px 0';
    line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    if (type === 'error') { line.style.color = '#f38ba8'; line.textContent = '✗ ' + text; }
    else if (type === 'warn') { line.style.color = '#fab387'; line.textContent = '⚠ ' + text; }
    else { line.style.color = '#a6e3a1'; line.textContent = '› ' + text; }
    consoleEl.appendChild(line);
  }
  window.onerror = function(msg, src, line, col) {
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: String(msg), line: line, col: col});
    appendToConsole('error', String(msg) + (line ? ' (سطر ' + line + ')' : ''));
    notify();
  };
  window.addEventListener('unhandledrejection', function(e){
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: 'Unhandled Promise: ' + String(e.reason)});
    appendToConsole('error', 'Unhandled Promise: ' + String(e.reason));
    notify();
  });
  var origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'log', msg: args});
    appendToConsole('log', args);
    notify();
    origLog.apply(console, arguments);
  };
  console.warn = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'warn', msg: args});
    appendToConsole('warn', args);
    notify();
    origWarn.apply(console, arguments);
  };
  console.error = function() {
    var args = Array.from(arguments).map(safeStr).join(' ');
    if (errors.length >= MAX_LOGS) errors.shift();
    errors.push({type:'error', msg: args});
    appendToConsole('error', args);
    notify();
    origErr.apply(console, arguments);
  };
  window.addEventListener('load', function(){ notify(); });
})();
</script>
<style>
body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: ${cssFiles.length > 0 ? '1rem' : '0'}; }
${styles}
</style>
</head>
<body>
${body}
${scripts ? `<script>\n${scripts}\n</script>` : ""}
</body>
</html>`;
}

interface PreviewLog {
  type: "log" | "warn" | "error";
  msg: string;
  line?: number;
  col?: number;
}

interface Props {
  sectionContent: string;
  subjectId?: string;
  onShareWithTeacher?: (code: string, language: string, output: string) => void;
}

export function CodeEditorPanel({ sectionContent, subjectId, onShareWithTeacher }: Props) {
  const isMobile = useIsMobile();
  const starter = extractStarterCode(sectionContent);
  const detectedLang = detectLanguageFromContent(sectionContent, subjectId);
  const langInfo = (l: string) => LANGUAGES.find(x => x.id === l) || LANGUAGES[0];

  const initFiles = (): IDEFile[] => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const lang = detectedLang;
    const ext = langInfo(lang).ext;
    return [{ id: "main", name: `main.${ext}`, language: lang, content: starter || DEFAULT_CODE[lang] || "" }];
  };

  const [files, setFiles] = useState<IDEFile[]>(initFiles);
  const [activeId, setActiveId] = useState<string>(() => initFiles()[0]?.id || "main");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
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
  const newNameRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeFullRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  const canPreview = isWebSubject(subjectId) || hasWebFiles(files);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setTimeout(() => editor.layout(), 50);

    if (containerRef.current) {
      const ro = new ResizeObserver(() => editor.layout());
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
    return undefined;
  }, []);

  const activeFile = files.find(f => f.id === activeId) || files[0];
  const activeLangInfo = langInfo(activeFile?.language || "python");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(files)); } catch {}
  }, [files]);

  useEffect(() => {
    if (isCreating && newNameRef.current) newNameRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "nukhba-preview-error" && e.data?.nonce === previewNonce) {
        const src = e.source;
        if (src === iframeRef.current?.contentWindow || src === iframeFullRef.current?.contentWindow) {
          setPreviewLogs(e.data.errors || []);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [previewNonce]);

  const updateContent = (content: string) => {
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content } : f));
  };

  const createFile = () => {
    const name = newName.trim();
    if (!name) { setNameError("أدخل اسم الملف"); return; }
    if (files.some(f => f.name === name)) { setNameError("اسم مستخدم مسبقاً"); return; }
    const lang = detectLangFromExt(name);
    const newFile: IDEFile = {
      id: `${Date.now()}`,
      name,
      language: lang,
      content: DEFAULT_CODE[lang] || "",
    };
    setFiles(prev => [...prev, newFile]);
    setActiveId(newFile.id);
    setIsCreating(false);
    setNewName("");
    setNameError("");
    setOutput(null);
    setShowOutput(false);
  };

  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeId === id) setActiveId(newFiles[0]?.id || "");
  };

  const switchFile = (id: string) => {
    setActiveId(id);
    setOutput(null);
    setShowOutput(false);
  };

  const handleRun = async () => {
    if (running || !activeFile) return;
    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: activeFile.content, language: activeFile.language }),
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

  const handlePreview = () => {
    setPreviewLogs([]);
    setPreviewKey(k => k + 1);
    setShowPreview(true);
    setShowPreviewConsole(false);
  };

  const handleReset = () => {
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id
      ? { ...f, content: DEFAULT_CODE[f.language] || "" }
      : f
    ));
    setOutput(null);
    setShowOutput(false);
  };

  const sharePreview = () => {
    if (!onShareWithTeacher) return;
    const filesSummary = files.filter(f => WEB_LANGS.has(f.language)).map(f =>
      `--- ${f.name} (${f.language}) ---\n${f.content}`
    ).join("\n\n");
    const logsText = previewLogs.length > 0
      ? "\n\n--- سجل المعاينة ---\n" + previewLogs.map(l =>
        `[${l.type === "error" ? "خطأ" : l.type === "warn" ? "تحذير" : "سجل"}]${l.line ? ` سطر ${l.line}` : ""}: ${l.msg}`
      ).join("\n")
      : "";
    onShareWithTeacher(
      filesSummary,
      "html",
      `معاينة الصفحة الحية:\nالملفات المستخدمة: ${files.filter(f => WEB_LANGS.has(f.language)).map(f => f.name).join(", ")}${previewLogs.filter(l => l.type === "error").length > 0 ? `\n⚠️ يوجد ${previewLogs.filter(l => l.type === "error").length} أخطاء` : "\n✓ لا توجد أخطاء"}${logsText}`
    );
  };

  const errorCount = previewLogs.filter(l => l.type === "error").length;
  const warnCount = previewLogs.filter(l => l.type === "warn").length;
  const logCount = previewLogs.filter(l => l.type === "log").length;

  const isWebLang = WEB_LANGS.has(activeFile?.language || "");

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 w-full min-w-0" style={{ direction: "ltr" }}>

      <div className="bg-[#1e1e2e] px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28c840]" />
        </div>
        <FileCode className="w-3.5 h-3.5 text-[#6e6a86] hidden sm:block" />
        <span className="text-[11px] sm:text-xs text-[#6e6a86] font-mono flex-1 truncate">Nukhba IDE</span>
        <button
          onClick={handleReset}
          title="Reset file"
          className="text-[#6e6a86] hover:text-white/70 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-[#181825] border-b border-white/5 flex items-center overflow-x-auto scrollbar-hide">
        <div className="flex min-w-0">
          {files.map(file => {
            const li = langInfo(file.language);
            return (
              <button
                key={file.id}
                onClick={() => switchFile(file.id)}
                className={`group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-mono border-b-2 whitespace-nowrap transition-all shrink-0 ${
                  activeId === file.id
                    ? "border-[#F59E0B] text-white bg-[#1e1e2e]"
                    : "border-transparent text-[#6e6a86] hover:text-white/60 hover:bg-white/5"
                }`}
              >
                <span>{li.icon}</span>
                <span>{file.name}</span>
                {files.length > 1 && (
                  <span
                    onClick={(e) => deleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isCreating ? (
          <div className="flex items-center gap-1 px-2 shrink-0">
            <input
              ref={newNameRef}
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError(""); }}
              onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); setNameError(""); } }}
              placeholder="index.html"
              className="bg-[#1e1e2e] border border-[#F59E0B]/50 rounded px-2 py-1 text-xs font-mono text-white outline-none w-24 sm:w-28 placeholder:text-[#6e6a86]"
            />
            <button onClick={createFile} className="text-[#28c840] hover:text-green-300 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setIsCreating(false); setNewName(""); setNameError(""); }} className="text-[#ff5f57] hover:text-red-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            {nameError && <span className="text-[10px] text-red-400">{nameError}</span>}
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            title="ملف جديد"
            className="shrink-0 px-2 sm:px-3 py-2 text-[#6e6a86] hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex-1" />

        <div className="px-1.5 sm:px-2 shrink-0 flex items-center gap-1.5">
          {canPreview && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-all bg-emerald-600 text-white hover:bg-emerald-500 shadow shadow-emerald-600/20"
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
              className={`flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-md transition-all ${
                running
                  ? "bg-[#F59E0B]/30 text-[#F59E0B]/60 cursor-not-allowed"
                  : "bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow shadow-[#F59E0B]/20"
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

      <div className="bg-[#181825] border-b border-white/5 px-3 py-1 flex items-center gap-2">
        <span className="text-sm">{activeLangInfo.icon}</span>
        <span className="text-[10px] sm:text-[11px] text-[#6e6a86] font-mono truncate">{activeLangInfo.label} · {activeFile?.name}</span>
        <div className="flex-1" />
        {canPreview && (
          <span className="text-[10px] text-emerald-400/60 font-mono hidden sm:inline">معاينة حية متاحة</span>
        )}
        <span className="text-[10px] sm:text-[11px] text-[#6e6a86] font-mono">{files.length} {files.length === 1 ? "ملف" : "ملفات"}</span>
      </div>

      <div className={`bg-[#1e1e2e] w-full overflow-hidden ${showPreview && !previewFullscreen ? "flex flex-col sm:flex-row" : ""}`}>
        <div className={showPreview && !previewFullscreen ? "w-full sm:w-1/2 sm:border-r sm:border-white/5" : "w-full"}>
          {isMobile ? (
            <textarea
              value={activeFile?.content || ""}
              onChange={(e) => updateContent(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              dir="ltr"
              className="w-full bg-[#1e1e2e] text-[#e2e8f0] font-mono text-[13px] leading-relaxed p-3 outline-none resize-none border-0"
              style={{ minHeight: showPreview ? "clamp(150px, 25vh, 220px)" : "clamp(200px, 38vh, 340px)", maxHeight: "50vh", tabSize: 2 }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const target = e.target as HTMLTextAreaElement;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const val = target.value;
                  updateContent(val.substring(0, start) + "  " + val.substring(end));
                  setTimeout(() => { target.selectionStart = target.selectionEnd = start + 2; }, 0);
                }
              }}
            />
          ) : (
            <Editor
              key={activeFile?.id}
              height={showPreview ? "clamp(200px, 38vh, 340px)" : "clamp(200px, 38vh, 340px)"}
              width="100%"
              language={activeLangInfo.monacoLang}
              value={activeFile?.content || ""}
              onChange={(val) => updateContent(val || "")}
              onMount={handleEditorMount}
              theme="vs-dark"
              loading={
                <div className="flex items-center justify-center h-full py-10 text-[#6e6a86] text-sm font-mono gap-2">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>جاري تحميل المحرر...</span>
                </div>
              }
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                wrappingIndent: "indent",
                lineNumbers: "on",
                glyphMargin: false,
                folding: false,
                lineNumbersMinChars: 2,
                lineDecorationsWidth: 4,
                renderLineHighlight: "line",
                smoothScrolling: false,
                cursorBlinking: "blink",
                cursorSmoothCaretAnimation: "off",
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
                quickSuggestions: false,
                parameterHints: { enabled: false },
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: "off",
                hover: { enabled: false },
                links: false,
                colorDecorators: false,
                occurrencesHighlight: "off",
                selectionHighlight: false,
                codeLens: false,
                renderValidationDecorations: "off",
                automaticLayout: true,
              }}
            />
          )}
        </div>

        {showPreview && !previewFullscreen && (
          <div className="w-full sm:w-1/2 flex flex-col border-t sm:border-t-0 border-white/5">
            <div className="bg-[#181825] px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-mono font-bold">LIVE PREVIEW</span>
              <div className="flex-1" />
              {errorCount > 0 && (
                <button
                  onClick={() => setShowPreviewConsole(!showPreviewConsole)}
                  className="flex items-center gap-1 text-[10px] text-red-400 font-mono"
                >
                  <AlertTriangle className="w-3 h-3" /> {errorCount}
                </button>
              )}
              {warnCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">⚠ {warnCount}</span>
              )}
              {logCount > 0 && (
                <button
                  onClick={() => setShowPreviewConsole(!showPreviewConsole)}
                  className="flex items-center gap-1 text-[10px] text-blue-400 font-mono"
                >
                  <Terminal className="w-3 h-3" /> {logCount}
                </button>
              )}
              <button
                onClick={() => setPreviewFullscreen(true)}
                className="text-[#6e6a86] hover:text-white transition-colors"
                title="تكبير"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onClick={handlePreview}
                className="text-[#6e6a86] hover:text-emerald-400 transition-colors"
                title="تحديث المعاينة"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#6e6a86] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 bg-white" style={{ minHeight: isMobile ? "200px" : "clamp(200px, 30vh, 300px)" }}>
              <iframe
                ref={iframeRef}
                key={previewKey}
                srcDoc={buildPreviewHtml(files, previewNonce)}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
                style={{ minHeight: isMobile ? "200px" : "clamp(200px, 30vh, 300px)" }}
                title="معاينة الصفحة"
              />
            </div>
            {showPreviewConsole && previewLogs.length > 0 && (
              <div className="bg-[#0d1117] border-t border-white/10 max-h-[120px] overflow-y-auto">
                <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-[#6e6a86]" />
                  <span className="text-[10px] text-[#6e6a86] font-mono">CONSOLE</span>
                  <div className="flex-1" />
                  <button onClick={() => setShowPreviewConsole(false)} className="text-[#6e6a86] hover:text-white"><X className="w-3 h-3" /></button>
                </div>
                <div className="p-2 space-y-0.5">
                  {previewLogs.map((log, i) => (
                    <div key={i} className={`text-[11px] font-mono flex items-start gap-1.5 ${log.type === "error" ? "text-[#f38ba8]" : log.type === "warn" ? "text-[#fab387]" : "text-[#a6e3a1]"}`}>
                      <span className="shrink-0">{log.type === "error" ? "✗" : log.type === "warn" ? "⚠" : "›"}</span>
                      <span className="break-all">{log.msg}{log.line ? ` (سطر ${log.line})` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showPreview && previewFullscreen && (
        <div className="bg-[#0d1117] border-t border-white/5">
          <div className="bg-[#181825] px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-mono font-bold">LIVE PREVIEW — FULLSCREEN</span>
            <div className="flex-1" />
            {errorCount > 0 && (
              <button
                onClick={() => setShowPreviewConsole(!showPreviewConsole)}
                className="flex items-center gap-1 text-[10px] text-red-400 font-mono"
              >
                <AlertTriangle className="w-3 h-3" /> {errorCount} أخطاء
              </button>
            )}
            {logCount > 0 && (
              <button
                onClick={() => setShowPreviewConsole(!showPreviewConsole)}
                className="flex items-center gap-1 text-[10px] text-blue-400 font-mono"
              >
                <Terminal className="w-3 h-3" /> {logCount} سجل
              </button>
            )}
            {onShareWithTeacher && (
              <button
                onClick={sharePreview}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                style={{ direction: "rtl" }}
              >
                📤 شارك المعاينة مع المعلم
              </button>
            )}
            <button
              onClick={handlePreview}
              className="text-[#6e6a86] hover:text-emerald-400 transition-colors"
              title="تحديث"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewFullscreen(false)}
              className="text-[#6e6a86] hover:text-white transition-colors"
              title="تصغير"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowPreview(false); setPreviewFullscreen(false); }}
              className="text-[#6e6a86] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white" style={{ height: "clamp(300px, 50vh, 500px)" }}>
            <iframe
              ref={iframeFullRef}
              key={previewKey}
              srcDoc={buildPreviewHtml(files, previewNonce)}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              title="معاينة الصفحة"
            />
          </div>
          {showPreviewConsole && previewLogs.length > 0 && (
            <div className="bg-[#0d1117] border-t border-white/10 max-h-[150px] overflow-y-auto">
              <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2">
                <Terminal className="w-3 h-3 text-[#6e6a86]" />
                <span className="text-[10px] text-[#6e6a86] font-mono">CONSOLE OUTPUT</span>
              </div>
              <div className="p-2 space-y-0.5">
                {previewLogs.map((log, i) => (
                  <div key={i} className={`text-[11px] font-mono flex items-start gap-1.5 ${log.type === "error" ? "text-[#f38ba8]" : log.type === "warn" ? "text-[#fab387]" : "text-[#a6e3a1]"}`}>
                    <span className="shrink-0">{log.type === "error" ? "✗" : log.type === "warn" ? "⚠" : "›"}</span>
                    <span className="break-all">{log.msg}{log.line ? ` (سطر ${log.line})` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#181825] px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 flex items-center gap-2 sm:gap-3 flex-wrap">
        {canPreview && (
          <>
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30 active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{showPreview ? "تحديث المعاينة 🔄" : "معاينة الصفحة 👁"}</span>
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
            className={`flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg ${
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
            className={`flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg ${
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
            {errorCount === 0 && (
              <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Circle className="w-2 h-2 fill-current" /> لا أخطاء ✓
              </span>
            )}
            {errorCount > 0 && (
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
            <div className="bg-[#0d1117] border-t border-white/5">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/5">
                <Terminal className="w-3.5 h-3.5 text-[#6e6a86]" />
                <span className="text-[10px] sm:text-xs text-[#6e6a86] font-mono">TERMINAL OUTPUT</span>
                <div className="flex-1" />
                {output !== null && (
                  <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-mono ${outputType === "success" ? "text-[#28c840]" : "text-[#ff5f57]"}`}>
                    <Circle className="w-2 h-2 fill-current" />
                    <span className="hidden sm:inline">{outputType === "success" ? "✓ Process exited with code 0" : "✗ Process exited with error"}</span>
                    <span className="sm:hidden">{outputType === "success" ? "✓" : "✗"}</span>
                  </div>
                )}
                <button onClick={() => setShowOutput(false)} className="text-[#6e6a86] hover:text-white/60 mr-1 sm:mr-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 sm:p-4 font-mono min-h-[60px] sm:min-h-[80px] max-h-[200px] overflow-y-auto bg-[#0d1117]">
                {output === null && running ? (
                  <div className="flex items-center gap-2 text-[#6e6a86] text-xs sm:text-sm">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>$ running {activeLangInfo.label}...</span>
                  </div>
                ) : output !== null ? (
                  <pre className={`whitespace-pre-wrap text-[11px] sm:text-xs leading-relaxed ${outputType === "success" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}>
                    <span className="text-[#6e6a86]">$ {activeFile?.name}{"\n"}</span>
                    {output}
                  </pre>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#007acc] px-3 sm:px-4 py-0.5 flex items-center gap-2 sm:gap-4">
        <span className="text-[9px] sm:text-[10px] text-white/80 font-mono">{activeLangInfo.icon} {activeLangInfo.label}</span>
        <span className="text-[9px] sm:text-[10px] text-white/50 font-mono">UTF-8</span>
        {canPreview && <span className="text-[9px] sm:text-[10px] text-white/80 font-mono">🌐 Web Preview</span>}
        <div className="flex-1" />
        <span className="text-[9px] sm:text-[10px] text-white/80 font-mono hidden sm:inline">Nukhba IDE</span>
      </div>
    </div>
  );
}
