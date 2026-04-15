import { useState, useRef, useEffect, useCallback } from "react";
import { Share2 } from "lucide-react";

interface FSNode {
  type: "file" | "dir";
  content?: string;
  children?: Record<string, FSNode>;
}

function buildFS(): FSNode {
  return {
    type: "dir",
    children: {
      home: {
        type: "dir",
        children: {
          student: {
            type: "dir",
            children: {
              "notes.txt": { type: "file", content: "ملاحظات الأمن السيبراني\n- تعلم أساسيات Linux\n- إتقان أدوات المسح\n- فهم البروتوكولات" },
              "passwords.txt": { type: "file", content: "admin:admin123\nroot:toor\nuser:password\n# هذه كلمات مرور ضعيفة - لا تستخدمها!" },
              "secret.txt": { type: "file", content: "FLAG{w3lc0me_t0_cyb3r_l4b}" },
              projects: {
                type: "dir",
                children: {
                  "scan.sh": { type: "file", content: "#!/bin/bash\necho 'بدء مسح الشبكة...'\nnmap -sV 192.168.1.0/24\necho 'اكتمل المسح'" },
                  "report.md": { type: "file", content: "# تقرير اختبار الاختراق\n## الهدف: 192.168.1.100\n## المنافذ المفتوحة: 22, 80, 443\n## الثغرات: CVE-2024-1234" },
                }
              },
              ".bash_history": { type: "file", content: "ls -la\ncd /etc\ncat passwd\nnmap 192.168.1.1\nwhoami" },
            }
          }
        }
      },
      etc: {
        type: "dir",
        children: {
          passwd: { type: "file", content: "root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/bash\nnobody:x:65534:65534:Nobody:/:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsshd:x:74:74:SSH:/var/empty:/sbin/nologin" },
          shadow: { type: "file", content: "root:$6$abc123$xYz789...:19000:0:99999:7:::\nstudent:$6$def456$aBc012...:19000:0:99999:7:::" },
          hostname: { type: "file", content: "nukhba-cyber-lab" },
          hosts: { type: "file", content: "127.0.0.1\tlocalhost\n192.168.1.1\trouter\n192.168.1.100\ttarget-server\n10.0.0.5\tdatabase-server" },
          "resolv.conf": { type: "file", content: "nameserver 8.8.8.8\nnameserver 8.8.4.4" },
          network: {
            type: "dir",
            children: {
              interfaces: { type: "file", content: "auto lo\niface lo inet loopback\n\nauto eth0\niface eth0 inet dhcp" }
            }
          }
        }
      },
      var: {
        type: "dir",
        children: {
          log: {
            type: "dir",
            children: {
              "auth.log": { type: "file", content: "Jan 15 03:22:11 server sshd[1234]: Failed password for root from 10.0.0.99 port 44322\nJan 15 03:22:13 server sshd[1234]: Failed password for root from 10.0.0.99 port 44322\nJan 15 03:22:15 server sshd[1234]: Failed password for root from 10.0.0.99 port 44322\nJan 15 03:22:17 server sshd[1234]: Accepted password for student from 192.168.1.50 port 52100\nJan 15 04:00:00 server sudo: student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/bin/cat /etc/shadow" },
              "syslog": { type: "file", content: "Jan 15 00:00:01 server CRON[999]: (root) CMD (/usr/bin/backup.sh)\nJan 15 03:22:10 server sshd[1234]: Connection from 10.0.0.99 port 44322\nJan 15 06:00:00 server kernel: [UFW BLOCK] IN=eth0 SRC=45.33.32.156 DST=192.168.1.100 PROTO=TCP DPT=3389" },
            }
          },
          www: {
            type: "dir",
            children: {
              html: {
                type: "dir",
                children: {
                  "index.html": { type: "file", content: "<html><body><h1>Welcome to Target Server</h1></body></html>" },
                }
              }
            }
          }
        }
      },
      tmp: { type: "dir", children: {} },
    }
  };
}

function resolvePath(fs: FSNode, path: string, cwd: string): { node: FSNode | null; absPath: string } {
  let abs = path.startsWith("/") ? path : `${cwd}/${path}`;
  const parts = abs.split("/").filter(Boolean);
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") { resolved.pop(); continue; }
    resolved.push(p);
  }
  abs = "/" + resolved.join("/");
  let node: FSNode | null = fs;
  for (const part of resolved) {
    if (!node || node.type !== "dir" || !node.children?.[part]) { return { node: null, absPath: abs }; }
    node = node.children[part];
  }
  return { node, absPath: abs };
}

export default function TerminalSim({ onShare }: { onShare: (c: string) => void }) {
  const [fs] = useState(buildFS);
  const [cwd, setCwd] = useState("/home/student");
  const [history, setHistory] = useState<string[]>([
    "\x1b[32m╔══════════════════════════════════════╗\x1b[0m",
    "\x1b[32m║   🔐 مختبر الأمن السيبراني - طرفية  ║\x1b[0m",
    "\x1b[32m╚══════════════════════════════════════╝\x1b[0m",
    "",
    "اكتب \x1b[33mhelp\x1b[0m لعرض الأوامر المتاحة",
    "",
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const addOutput = useCallback((...lines: string[]) => {
    setHistory(h => [...h, ...lines]);
  }, []);

  const execute = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setCmdHistory(h => [trimmed, ...h].slice(0, 50));
    setHistIdx(-1);
    addOutput(`\x1b[36mstudent@cyber-lab\x1b[0m:\x1b[34m${cwd}\x1b[0m$ ${trimmed}`);

    const [command, ...args] = trimmed.split(/\s+/);
    const argStr = args.join(" ");

    switch (command) {
      case "help": {
        addOutput(
          "\x1b[33m═══ الأوامر المتاحة ═══\x1b[0m",
          "  \x1b[32mls\x1b[0m [-la]          عرض محتويات المجلد",
          "  \x1b[32mcd\x1b[0m <path>        تغيير المجلد",
          "  \x1b[32mcat\x1b[0m <file>       عرض محتوى ملف",
          "  \x1b[32mpwd\x1b[0m              عرض المسار الحالي",
          "  \x1b[32mwhoami\x1b[0m           عرض المستخدم الحالي",
          "  \x1b[32mid\x1b[0m               عرض معلومات المستخدم",
          "  \x1b[32mfind\x1b[0m <pattern>   البحث عن ملفات",
          "  \x1b[32mgrep\x1b[0m <pattern> <file>  البحث في ملف",
          "  \x1b[32mecho\x1b[0m <text>      طباعة نص",
          "  \x1b[32mfile\x1b[0m <path>      نوع الملف",
          "  \x1b[32mwc\x1b[0m <file>        عدد الأسطر/الكلمات",
          "  \x1b[32mhead\x1b[0m <file>      أول 5 أسطر",
          "  \x1b[32mtail\x1b[0m <file>      آخر 5 أسطر",
          "  \x1b[32mifconfig\x1b[0m         إعدادات الشبكة",
          "  \x1b[32mnetstat\x1b[0m          الاتصالات النشطة",
          "  \x1b[32mping\x1b[0m <host>      اختبار الاتصال",
          "  \x1b[32mnslookup\x1b[0m <host>  استعلام DNS",
          "  \x1b[32mps\x1b[0m               العمليات الجارية",
          "  \x1b[32muname\x1b[0m [-a]       معلومات النظام",
          "  \x1b[32mhistory\x1b[0m          سجل الأوامر",
          "  \x1b[32mclear\x1b[0m            مسح الشاشة",
          ""
        );
        break;
      }
      case "ls": {
        const target = args.find(a => !a.startsWith("-")) || ".";
        const showAll = argStr.includes("-a") || argStr.includes("-la") || argStr.includes("-al");
        const showLong = argStr.includes("-l") || argStr.includes("-la") || argStr.includes("-al");
        const { node } = resolvePath(fs, target, cwd);
        if (!node) { addOutput(`ls: لا يمكن الوصول إلى '${target}': لا يوجد ملف أو مجلد`); break; }
        if (node.type === "file") { addOutput(target); break; }
        const entries = Object.entries(node.children || {})
          .filter(([name]) => showAll || !name.startsWith("."));
        if (showLong) {
          addOutput(`المجموع ${entries.length}`);
          for (const [name, n] of entries) {
            const isDir = n.type === "dir";
            const perm = isDir ? "drwxr-xr-x" : "-rw-r--r--";
            const size = n.content?.length || 4096;
            const color = isDir ? "\x1b[34m" : n.name?.endsWith(".sh") ? "\x1b[32m" : "";
            addOutput(`${perm}  1 student student  ${String(size).padStart(5)}  Jan 15 12:00 ${color}${name}\x1b[0m`);
          }
        } else {
          const line = entries.map(([name, n]) => n.type === "dir" ? `\x1b[34m${name}\x1b[0m` : name).join("  ");
          addOutput(line || "(فارغ)");
        }
        break;
      }
      case "cd": {
        const target = args[0] || "/home/student";
        if (target === "~") { setCwd("/home/student"); break; }
        const { node, absPath } = resolvePath(fs, target, cwd);
        if (!node) { addOutput(`cd: ${target}: لا يوجد مجلد`); break; }
        if (node.type !== "dir") { addOutput(`cd: ${target}: ليس مجلداً`); break; }
        setCwd(absPath);
        break;
      }
      case "cat": {
        if (!args[0]) { addOutput("cat: يجب تحديد ملف"); break; }
        const { node } = resolvePath(fs, args[0], cwd);
        if (!node) { addOutput(`cat: ${args[0]}: لا يوجد ملف`); break; }
        if (node.type === "dir") { addOutput(`cat: ${args[0]}: هذا مجلد`); break; }
        addOutput(...(node.content || "").split("\n"));
        break;
      }
      case "pwd": addOutput(cwd); break;
      case "whoami": addOutput("student"); break;
      case "id": addOutput("uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)"); break;
      case "hostname": addOutput("nukhba-cyber-lab"); break;
      case "uname": {
        addOutput(argStr.includes("-a") ? "Linux nukhba-cyber-lab 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux" : "Linux");
        break;
      }
      case "echo": addOutput(argStr || ""); break;
      case "grep": {
        if (args.length < 2) { addOutput("الاستخدام: grep <نمط> <ملف>"); break; }
        const pattern = args[0];
        const { node } = resolvePath(fs, args[1], cwd);
        if (!node || node.type !== "file") { addOutput(`grep: ${args[1]}: لا يوجد ملف`); break; }
        const matches = (node.content || "").split("\n").filter(l => l.includes(pattern));
        if (matches.length === 0) addOutput("(لا توجد نتائج)");
        else matches.forEach(m => addOutput(m.replace(new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), `\x1b[31m$1\x1b[0m`)));
        break;
      }
      case "find": {
        const pattern = args[0] || "*";
        const results: string[] = [];
        const walk = (node: FSNode, path: string) => {
          if (node.children) {
            for (const [name, child] of Object.entries(node.children)) {
              const full = `${path}/${name}`;
              if (name.includes(pattern.replace("*", ""))) results.push(full);
              walk(child, full);
            }
          }
        };
        walk(fs, "");
        addOutput(...(results.length ? results : ["(لا توجد نتائج)"]));
        break;
      }
      case "wc": {
        if (!args[0]) { addOutput("wc: يجب تحديد ملف"); break; }
        const { node } = resolvePath(fs, args[0], cwd);
        if (!node || node.type !== "file") { addOutput(`wc: ${args[0]}: لا يوجد ملف`); break; }
        const lines = (node.content || "").split("\n");
        const words = (node.content || "").split(/\s+/).filter(Boolean);
        addOutput(`  ${lines.length}  ${words.length}  ${(node.content || "").length} ${args[0]}`);
        break;
      }
      case "head": {
        if (!args[0]) { addOutput("head: يجب تحديد ملف"); break; }
        const { node } = resolvePath(fs, args[0], cwd);
        if (!node || node.type !== "file") { addOutput(`head: ${args[0]}: لا يوجد ملف`); break; }
        addOutput(...(node.content || "").split("\n").slice(0, 5));
        break;
      }
      case "tail": {
        if (!args[0]) { addOutput("tail: يجب تحديد ملف"); break; }
        const { node } = resolvePath(fs, args[0], cwd);
        if (!node || node.type !== "file") { addOutput(`tail: ${args[0]}: لا يوجد ملف`); break; }
        addOutput(...(node.content || "").split("\n").slice(-5));
        break;
      }
      case "file": {
        if (!args[0]) { addOutput("file: يجب تحديد ملف"); break; }
        const { node } = resolvePath(fs, args[0], cwd);
        if (!node) { addOutput(`file: ${args[0]}: لا يوجد`); break; }
        addOutput(node.type === "dir" ? `${args[0]}: directory` : `${args[0]}: ASCII text`);
        break;
      }
      case "ifconfig": {
        addOutput(
          "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
          "        inet 192.168.1.50  netmask 255.255.255.0  broadcast 192.168.1.255",
          "        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>",
          "        ether 02:42:ac:11:00:02  txqueuelen 0",
          "        RX packets 15847  bytes 21563892",
          "        TX packets 9432  bytes 1245672",
          "",
          "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536",
          "        inet 127.0.0.1  netmask 255.0.0.0",
        );
        break;
      }
      case "netstat": {
        addOutput(
          "Active Internet connections",
          "Proto  Local Address          Foreign Address        State",
          "tcp    0.0.0.0:22             0.0.0.0:*              LISTEN",
          "tcp    0.0.0.0:80             0.0.0.0:*              LISTEN",
          "tcp    0.0.0.0:443            0.0.0.0:*              LISTEN",
          "tcp    192.168.1.50:22        192.168.1.10:52100     ESTABLISHED",
          "tcp    192.168.1.50:80        10.0.0.99:44567        TIME_WAIT",
          "udp    0.0.0.0:53             0.0.0.0:*",
        );
        break;
      }
      case "ping": {
        if (!args[0]) { addOutput("ping: يجب تحديد عنوان"); break; }
        const host = args[0];
        addOutput(
          `PING ${host} (${host === "localhost" ? "127.0.0.1" : host}) 56(84) bytes of data.`,
          `64 bytes from ${host}: icmp_seq=1 ttl=64 time=0.${Math.floor(Math.random() * 900 + 100)} ms`,
          `64 bytes from ${host}: icmp_seq=2 ttl=64 time=0.${Math.floor(Math.random() * 900 + 100)} ms`,
          `64 bytes from ${host}: icmp_seq=3 ttl=64 time=0.${Math.floor(Math.random() * 900 + 100)} ms`,
          `--- ${host} ping statistics ---`,
          "3 packets transmitted, 3 received, 0% packet loss",
        );
        break;
      }
      case "nslookup": {
        if (!args[0]) { addOutput("nslookup: يجب تحديد اسم المضيف"); break; }
        addOutput(
          "Server:\t\t8.8.8.8",
          "Address:\t8.8.8.8#53",
          "",
          `Name:\t${args[0]}`,
          `Address: ${Math.floor(Math.random() * 200 + 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        );
        break;
      }
      case "ps": {
        addOutput(
          "  PID TTY          TIME CMD",
          "    1 ?        00:00:03 systemd",
          "  234 ?        00:00:01 sshd",
          "  567 ?        00:00:00 nginx",
          "  890 pts/0    00:00:00 bash",
          " 1234 pts/0    00:00:00 ps",
        );
        break;
      }
      case "history": {
        cmdHistory.slice(0, 20).reverse().forEach((c, i) => addOutput(`  ${i + 1}  ${c}`));
        break;
      }
      case "clear": setHistory([]); break;
      case "man": addOutput(`لا يوجد دليل لـ '${args[0] || ""}'. استخدم help لعرض الأوامر المتاحة.`); break;
      case "sudo": addOutput("\x1b[33m⚠ student is not in the sudoers file. This incident will be reported.\x1b[0m"); break;
      case "rm": addOutput("\x1b[31m⛔ الحذف معطّل في بيئة المختبر\x1b[0m"); break;
      case "chmod":
      case "chown":
        addOutput("\x1b[33m⚠ تغيير الصلاحيات معطّل في بيئة المختبر\x1b[0m"); break;
      case "exit": addOutput("لا يمكنك الخروج من المختبر 😄"); break;
      default:
        addOutput(`\x1b[31m${command}: الأمر غير موجود\x1b[0m. اكتب \x1b[33mhelp\x1b[0m للمساعدة`);
    }
  }, [fs, cwd, addOutput, cmdHistory]);

  const renderLine = (line: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\x1b\[(\d+)m/g;
    let lastIndex = 0;
    let match;
    let currentColor = "";
    const colorMap: Record<string, string> = {
      "0": "", "31": "text-red-400", "32": "text-emerald-400",
      "33": "text-amber-400", "34": "text-blue-400", "36": "text-cyan-400",
    };
    let i = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={i++} className={currentColor}>{line.slice(lastIndex, match.index)}</span>);
      }
      currentColor = colorMap[match[1]] || "";
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < line.length) {
      parts.push(<span key={i++} className={currentColor}>{line.slice(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="flex flex-col h-full" onClick={() => inputRef.current?.focus()}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b26] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">student@cyber-lab:~</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(history.map(l => l.replace(/\x1b\[\d+m/g, '')).join("\n")); }}
          className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
        >
          <Share2 className="w-3 h-3" /> مشاركة
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed bg-[#0d1117]" dir="ltr">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all min-h-[1.4em]">{renderLine(line)}</div>
        ))}
        <div className="flex items-center gap-0">
          <span className="text-cyan-400">student@cyber-lab</span>
          <span className="text-white">:</span>
          <span className="text-blue-400">{cwd}</span>
          <span className="text-white">$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { execute(input); setInput(""); }
              if (e.key === "ArrowUp") { e.preventDefault(); const next = Math.min(histIdx + 1, cmdHistory.length - 1); setHistIdx(next); setInput(cmdHistory[next] || ""); }
              if (e.key === "ArrowDown") { e.preventDefault(); const next = Math.max(histIdx - 1, -1); setHistIdx(next); setInput(next === -1 ? "" : cmdHistory[next] || ""); }
              if (e.key === "Tab") {
                e.preventDefault();
                const { node } = resolvePath(fs, ".", cwd);
                if (node?.children) {
                  const partial = input.split(/\s+/).pop() || "";
                  const matches = Object.keys(node.children).filter(n => n.startsWith(partial));
                  if (matches.length === 1) {
                    const parts = input.split(/\s+/);
                    parts[parts.length - 1] = matches[0];
                    setInput(parts.join(" "));
                  }
                }
              }
            }}
            className="flex-1 bg-transparent outline-none text-white font-mono text-[13px] caret-emerald-400"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
