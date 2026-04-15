import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Circle, X, Plus, FileCode, Zap, Check, Eye, AlertTriangle, Maximize2, Monitor, Smartphone, Tablet, Globe, ArrowLeft, ArrowRight, Lock, Share2, Layers, Home, FolderOpen, Folder, FolderPlus, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
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

const LS_KEY = "nukhba-ide-files-v3";

interface TreeNode {
  type: "file" | "folder";
  name: string;
  path: string;
  file?: IDEFile;
  children?: TreeNode[];
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

  doc = doc.replace(/<img\s[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, src) => {
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//") || src.startsWith("data:")) return match;
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
      const oldSaved = localStorage.getItem("nukhba-ide-files-v2");
      if (oldSaved) {
        const oldFiles = JSON.parse(oldSaved);
        localStorage.setItem(LS_KEY, oldSaved);
        localStorage.removeItem("nukhba-ide-files-v2");
        return oldFiles;
      }
    } catch {}
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
  const urlBarRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeFullRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

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
    if (val.startsWith("/")) {
      navigateTo(val);
      return;
    }
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

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setTimeout(() => editor.layout(), 50);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) return;
    const ro = new ResizeObserver(() => editor.layout());
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeId]);

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
  const activeLangInfo = langInfo(activeFile?.language || "python");

  const previewHtml = useMemo(() => {
    if (!showPreview && !previewFullscreen) return "";
    return buildPageHtml(currentPage, files, previewNonce);
  }, [files, previewNonce, showPreview, previewFullscreen, currentPage]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(files)); } catch {}
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
        setPreviewLogs(e.data.errors || []);
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
      setNameError("اسم غير صالح");
      return;
    }
    if (createTarget === "folder") {
      const folderPath = createPrefix ? `${createPrefix}/${raw}` : raw;
      const placeholder: IDEFile = {
        id: `${Date.now()}`,
        name: `${folderPath}/.gitkeep`,
        language: "bash",
        content: "",
      };
      setFiles(prev => [...prev, placeholder]);
      expandAllParents(`${folderPath}/dummy`);
      setIsCreating(false);
      setNewName("");
      setNameError("");
      return;
    }
    const fullName = createPrefix ? `${createPrefix}/${raw}` : raw;
    if (files.some(f => f.name === fullName)) { setNameError("اسم مستخدم مسبقاً"); return; }
    const lang = detectLangFromExt(fullName);
    const newFile: IDEFile = {
      id: `${Date.now()}`,
      name: fullName,
      language: lang,
      content: DEFAULT_CODE[lang] || "",
    };
    setFiles(prev => [...prev, newFile]);
    setActiveId(newFile.id);
    setOpenTabs(prev => new Set([...prev, newFile.id]));
    expandAllParents(fullName);
    setIsCreating(false);
    setNewName("");
    setNameError("");
    setOutput(null);
    setShowOutput(false);
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
      if (activeId === id) {
        const fallback = newReal[0]?.id || "";
        if (fallback) next.add(fallback);
      }
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
      if (needsNewActive) {
        const fallback = newReal[0]?.id || "";
        if (fallback) next.add(fallback);
      }
      return next;
    });
    if (needsNewActive) {
      setActiveId(newReal[0]?.id || "");
    }
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
    setUrlBarValue(`https://${BROWSER_DOMAIN}${currentPage}`);
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
    const webFiles = files.filter(f => WEB_LANGS.has(f.language));
    const filesSummary = webFiles.map(f =>
      `--- ${f.name} (${f.language}) ---\n${f.content}`
    ).join("\n\n");
    const logsText = previewLogs.length > 0
      ? "\n\n--- سجل المعاينة ---\n" + previewLogs.map(l =>
        `[${l.type === "error" ? "خطأ" : l.type === "warn" ? "تحذير" : "سجل"}]${l.line ? ` سطر ${l.line}` : ""}: ${l.msg}`
      ).join("\n")
      : "";
    const pageInfo = htmlPages.length > 1 ? `\nالصفحة الحالية: ${currentPage}\nإجمالي الصفحات: ${htmlPages.length} (${htmlPages.map(f => f.name).join(", ")})` : "";
    onShareWithTeacher(
      filesSummary,
      "html",
      `معاينة الصفحة الحية:${pageInfo}\nالملفات المستخدمة: ${webFiles.map(f => f.name).join(", ")}${previewLogs.filter(l => l.type === "error").length > 0 ? `\n⚠️ يوجد ${previewLogs.filter(l => l.type === "error").length} أخطاء` : "\n✓ لا توجد أخطاء"}${logsText}`
    );
  };

  const errorCount = previewLogs.filter(l => l.type === "error").length;
  const warnCount = previewLogs.filter(l => l.type === "warn").length;
  const logCount = previewLogs.filter(l => l.type === "log").length;

  const isWebLang = WEB_LANGS.has(activeFile?.language || "");

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
              className={`group flex items-center gap-1 px-1 ${rowPy} cursor-pointer hover:bg-white/5 ${textSize} font-mono text-[#c8c8d0] select-none`}
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              {isExpanded ? <ChevronDown className={`${iconSize} text-[#6e6a86] shrink-0`} /> : <ChevronRight className={`${iconSize} text-[#6e6a86] shrink-0`} />}
              {isExpanded ? <FolderOpen className={`${folderIconSize} text-[#F59E0B] shrink-0`} /> : <Folder className={`${folderIconSize} text-[#F59E0B] shrink-0`} />}
              <span className="flex-1 truncate">{node.name}</span>
              <span className={`${actionVisible} flex items-center gap-0.5 shrink-0`}>
                <button onClick={(e) => { e.stopPropagation(); startCreate("file", node.path); }} className={`p-0.5 text-[#6e6a86] hover:text-white`}><Plus className={actionIconSize} /></button>
                <button onClick={(e) => { e.stopPropagation(); startCreate("folder", node.path); }} className={`p-0.5 text-[#6e6a86] hover:text-white`}><FolderPlus className={actionIconSize} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteFolder(node.path); }} className={`p-0.5 text-[#6e6a86] hover:text-red-400`}><X className={actionIconSize} /></button>
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
      return (
        <div
          key={node.file.id}
          className={`group flex items-center gap-1 px-1 ${rowPy} cursor-pointer ${textSize} font-mono select-none transition-colors ${
            isActive ? "bg-[#F59E0B]/10 text-white" : "text-[#a0a0b0] hover:bg-white/5 hover:text-white/80"
          }`}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          onClick={() => switchFile(node.file!.id)}
        >
          <span className={`${mobSize ? "text-[12px]" : "text-[10px]"} shrink-0`}>{getFileIcon(node.file.language)}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {realFilesOnly.length > 1 && (
            <span
              onClick={(e) => deleteFile(node.file!.id, e)}
              className={`${actionVisible} hover:text-red-400 transition-all shrink-0 p-0.5`}
            >
              <X className={actionIconSize} />
            </span>
          )}
        </div>
      );
    });
  };

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

      <div className="bg-[#181825] border-b border-white/5 flex items-center">
        <button
          onClick={() => isMobile ? setShowMobileExplorer(!showMobileExplorer) : setShowExplorer(!showExplorer)}
          className={`shrink-0 px-2 py-2 transition-colors ${(isMobile ? showMobileExplorer : showExplorer) ? "text-[#F59E0B]" : "text-[#6e6a86] hover:text-white/60"}`}
          title={showExplorer ? "إخفاء المستكشف" : "إظهار المستكشف"}
        >
          {(isMobile ? showMobileExplorer : showExplorer) ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          {realFilesOnly.filter(f => openTabs.has(f.id)).map(file => {
            const li = langInfo(file.language);
            const displayName = file.name.includes("/") ? file.name.split("/").pop()! : file.name;
            const hasDuplicate = realFilesOnly.filter(f2 => openTabs.has(f2.id)).some(f2 => f2.id !== file.id && (f2.name.includes("/") ? f2.name.split("/").pop()! : f2.name) === displayName);
            return (
              <button
                key={file.id}
                onClick={() => switchFile(file.id)}
                className={`group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-mono border-b-2 whitespace-nowrap transition-all shrink-0 ${
                  activeId === file.id
                    ? "border-[#F59E0B] text-white bg-[#1e1e2e]"
                    : "border-transparent text-[#6e6a86] hover:text-white/60 hover:bg-white/5"
                }`}
                title={file.name}
              >
                <span className="text-[10px]">{li.icon}</span>
                <span>{hasDuplicate ? file.name : displayName}</span>
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

      {isMobile && showMobileExplorer && (
        <div className="bg-[#181825] border-b border-white/5 max-h-[50vh] overflow-y-auto">
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

      <div className={`bg-[#1e1e2e] w-full overflow-hidden flex ${showPreview && !previewFullscreen ? "flex-col sm:flex-row" : ""}`}>
        {showExplorer && !isMobile && (
          <div className="w-[200px] min-w-[200px] bg-[#181825] border-r border-white/5 flex flex-col shrink-0 overflow-hidden">
            <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/5">
              <span className="text-[10px] text-[#6e6a86] font-mono font-bold flex-1 uppercase tracking-wider">المستكشف</span>
              <button onClick={() => startCreate("file")} className="text-[#6e6a86] hover:text-white transition-colors p-0.5" title="ملف جديد"><Plus className="w-3 h-3" /></button>
              <button onClick={() => startCreate("folder")} className="text-[#6e6a86] hover:text-white transition-colors p-0.5" title="مجلد جديد"><FolderPlus className="w-3 h-3" /></button>
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

        <div className={`flex-1 min-w-0 flex flex-col ${showPreview && !previewFullscreen ? "sm:w-1/2 sm:border-r sm:border-white/5" : ""}`}>
          <div className="bg-[#181825] border-b border-white/5 px-3 py-1 flex items-center gap-2">
            <span className="text-sm">{activeLangInfo.icon}</span>
            <span className="text-[10px] sm:text-[11px] text-white/50 font-mono truncate">{activeFile?.name}</span>
            <div className="flex-1" />
            {canPreview && <span className="text-[10px] text-emerald-400/60 font-mono hidden sm:inline">معاينة حية</span>}
            <span className="text-[10px] sm:text-[11px] text-[#6e6a86] font-mono">{realFilesOnly.length} ملفات</span>
          </div>
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
              {htmlPages.length > 1 && (
                <span className="text-[9px] text-[#F59E0B]/80 font-mono bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">{currentPage === "/" ? "index.html" : currentPage.replace(/^\//, "")}</span>
              )}
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
                srcDoc={previewHtml}
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
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) { setPreviewFullscreen(false); } }}>
          <div className="w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10">

            <div className="bg-[#2b2b3d] px-2 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 mr-1 sm:mr-2">
                <button onClick={() => { setShowPreview(false); setPreviewFullscreen(false); }} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors" title="إغلاق" />
                <button onClick={() => setPreviewFullscreen(false)} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#f5a623] transition-colors" title="تصغير" />
                <button onClick={() => {}} className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#1fb636] transition-colors" title="تكبير" />
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <button onClick={goBack} className={`p-1 transition-colors ${canGoBack ? "text-white/80 hover:text-white" : "text-[#6e6a86]/40 cursor-not-allowed"}`} title="رجوع" disabled={!canGoBack}><ArrowLeft className="w-3.5 h-3.5" /></button>
                <button onClick={goForward} className={`p-1 transition-colors ${canGoForward ? "text-white/80 hover:text-white" : "text-[#6e6a86]/40 cursor-not-allowed"}`} title="تقدم" disabled={!canGoForward}><ArrowRight className="w-3.5 h-3.5" /></button>
                <button onClick={handlePreview} className="p-1 text-[#6e6a86] hover:text-emerald-400 transition-colors" title="تحديث"><RotateCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => navigateTo("/")} className="p-1 text-[#6e6a86] hover:text-white/80 transition-colors" title="الصفحة الرئيسية"><Home className="w-3.5 h-3.5" /></button>
              </div>

              <div className="flex-1 mx-1 sm:mx-2 bg-[#1e1e2e] rounded-lg border border-white/10 px-2 sm:px-3 py-1 flex items-center gap-1.5 sm:gap-2 min-w-0 cursor-text" onClick={() => { setUrlBarEditing(true); setTimeout(() => urlBarRef.current?.select(), 0); }}>
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
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
                    autoFocus
                    spellCheck={false}
                    dir="ltr"
                  />
                ) : (
                  <span className="text-[10px] sm:text-xs font-mono truncate select-all min-w-0 flex-1">
                    <span className="text-white/40">https://</span>
                    <span className="text-white/70">{BROWSER_DOMAIN}</span>
                    <span className="text-emerald-400">{currentPage}</span>
                  </span>
                )}
                {htmlPages.length > 1 && !urlBarEditing && (
                  <div className="relative group shrink-0">
                    <button className="text-[#6e6a86] hover:text-white/70 transition-colors p-0.5">
                      <Layers className="w-3 h-3" />
                    </button>
                    <div className="absolute top-full right-0 mt-1 bg-[#2b2b3d] border border-white/10 rounded-lg shadow-2xl shadow-black/60 py-1 min-w-[180px] z-50 hidden group-hover:block">
                      {htmlPages.map(f => {
                        const pagePath = fileNameToPath(f.name);
                        const isActive = currentPage === pagePath;
                        return (
                          <button
                            key={f.id}
                            onClick={(e) => { e.stopPropagation(); navigateTo(pagePath); }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center gap-2 transition-colors ${isActive ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-white/70 hover:bg-white/5"}`}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{f.name}</span>
                            <span className="text-[9px] text-[#6e6a86] mr-auto">{pagePath}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {onShareWithTeacher && (
                  <button onClick={sharePreview} className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors" title="شارك مع المعلم">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setShowPreviewConsole(!showPreviewConsole)} className={`p-1 transition-colors ${showPreviewConsole ? "text-[#F59E0B]" : "text-[#6e6a86] hover:text-white/60"}`} title="وحدة التحكم">
                  <Terminal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewFullscreen(false)}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-md bg-[#F59E0B] text-black hover:bg-[#fbbf24] transition-colors mr-0.5"
                  title="العودة للمحرر"
                >
                  <FileCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">المحرر</span>
                </button>
              </div>
            </div>

            <div className="bg-[#1e1e2e] px-2 sm:px-3 py-1 flex items-center gap-2 sm:gap-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-[#2b2b3d] rounded-md px-2 py-0.5">
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
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                    <AlertTriangle className="w-3 h-3" /> {errorCount}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">⚠ {warnCount}</span>
                )}
                {logCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                    <Terminal className="w-3 h-3" /> {logCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#6e6a86] font-mono">
                <Layers className="w-3 h-3" />
                <span>{files.filter(f => WEB_LANGS.has(f.language)).length} ملفات ويب</span>
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

            {showPreviewConsole && (
              <div className="bg-[#0d1117] border-t border-white/10 shrink-0" style={{ height: "clamp(100px, 20vh, 200px)" }}>
                <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-[#6e6a86]" />
                  <span className="text-[10px] text-[#6e6a86] font-mono">CONSOLE</span>
                  <div className="flex-1" />
                  {errorCount > 0 && <span className="text-[9px] text-red-400 font-mono">{errorCount} errors</span>}
                  {logCount > 0 && <span className="text-[9px] text-blue-400 font-mono">{logCount} logs</span>}
                  <button onClick={() => setPreviewLogs([])} className="text-[10px] text-[#6e6a86] hover:text-white font-mono">مسح</button>
                  <button onClick={() => setShowPreviewConsole(false)} className="text-[#6e6a86] hover:text-white"><X className="w-3 h-3" /></button>
                </div>
                <div className="p-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: "calc(20vh - 30px)" }}>
                  {previewLogs.length === 0 ? (
                    <div className="text-[11px] text-[#6e6a86] font-mono py-2 text-center">لا توجد سجلات</div>
                  ) : previewLogs.map((log, i) => (
                    <div key={i} className={`text-[11px] font-mono flex items-start gap-1.5 ${log.type === "error" ? "text-[#f38ba8]" : log.type === "warn" ? "text-[#fab387]" : "text-[#a6e3a1]"}`}>
                      <span className="shrink-0">{log.type === "error" ? "✗" : log.type === "warn" ? "⚠" : "›"}</span>
                      <span className="break-all">{log.msg}{log.line ? ` (سطر ${log.line})` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#1e1e2e] px-3 py-1 flex items-center gap-3 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-mono">LIVE</span>
              </div>
              <span className="text-[9px] text-[#6e6a86] font-mono">{viewportMode === "desktop" ? "Desktop" : viewportMode === "tablet" ? "Tablet 768px" : "Mobile 375px"}</span>
              {htmlPages.length > 1 && <span className="text-[9px] text-[#F59E0B]/60 font-mono">{htmlPages.length} صفحات</span>}
              <span className="text-[9px] text-[#6e6a86] font-mono">{currentPage === "/" ? "index.html" : currentPage.replace(/^\//, "")}</span>
              <div className="flex-1" />
              {navHistory.length > 1 && <span className="text-[9px] text-[#6e6a86]/50 font-mono">{navIndex + 1}/{navHistory.length}</span>}
              <span className="text-[9px] text-[#6e6a86] font-mono">Nukhba Browser</span>
            </div>
          </div>
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
            <button
              onClick={() => { handlePreview(); setPreviewFullscreen(true); }}
              className="flex items-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg bg-[#F59E0B] text-black hover:bg-[#fbbf24] shadow-[#F59E0B]/30 active:scale-95"
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
