import type { CommandResult, CommandContext, FSNode, VirtualMachine } from "./cyber-env-types";

export function resolvePath(fs: FSNode, path: string, cwd: string): { node: FSNode | null; absPath: string } {
  if (fs.children?.["C:"]) {
    return resolveWindowsPath(fs, path, cwd);
  }
  let abs = path.startsWith("/") ? path : `${cwd === "/" ? "" : cwd}/${path}`;
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
    if (!node || node.type !== "dir" || !node.children?.[part]) return { node: null, absPath: abs };
    node = node.children[part];
  }
  return { node, absPath: abs };
}

function resolveWindowsPath(fs: FSNode, path: string, cwd: string): { node: FSNode | null; absPath: string } {
  let abs = path;
  if (!path.match(/^[A-Z]:\\/i)) {
    abs = cwd.endsWith("\\") ? `${cwd}${path}` : `${cwd}\\${path}`;
  }
  abs = abs.replace(/\//g, "\\");
  const parts = abs.split("\\").filter(Boolean);
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") { if (resolved.length > 1) resolved.pop(); continue; }
    resolved.push(p);
  }
  abs = resolved.join("\\");
  let node: FSNode | null = fs;
  for (const part of resolved) {
    if (!node || node.type !== "dir" || !node.children?.[part]) return { node: null, absPath: abs };
    node = node.children[part];
  }
  return { node, absPath: abs };
}

function getParent(fs: FSNode, path: string, isWindows: boolean): { parent: FSNode | null; name: string } {
  const sep = isWindows ? "\\" : "/";
  const parts = path.split(sep).filter(Boolean);
  const name = parts.pop() || "";
  let node = fs;
  for (const part of parts) {
    if (!node.children?.[part]) return { parent: null, name };
    node = node.children[part];
  }
  return { parent: node, name };
}

function formatSize(size: number): string {
  if (size < 1024) return `${size}`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}K`;
  return `${(size / (1024 * 1024)).toFixed(1)}M`;
}

function c(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const green = (t: string) => c("32", t);
const red = (t: string) => c("31", t);
const blue = (t: string) => c("34", t);
const yellow = (t: string) => c("33", t);
const cyan = (t: string) => c("36", t);
const bold = (t: string) => c("1", t);
const dim = (t: string) => c("2", t);

type CmdFn = (args: string[], ctx: CommandContext) => CommandResult;

const linuxCommands: Record<string, CmdFn> = {
  ls: (args, ctx) => {
    const showAll = args.some(a => a.includes("a"));
    const showLong = args.some(a => a.includes("l"));
    const target = args.find(a => !a.startsWith("-")) || ".";
    const { node } = ctx.resolvePath(target, ctx.cwd);
    if (!node) return { output: [red(`ls: cannot access '${target}': No such file or directory`)], error: true };
    if (node.type === "file") return { output: [target] };
    const entries = Object.entries(node.children || {}).filter(([n]) => showAll || !n.startsWith(".")).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return { output: [] };
    if (showLong) {
      const lines = [`total ${entries.length}`];
      for (const [name, n] of entries) {
        const isDir = n.type === "dir";
        const perm = n.permissions || (isDir ? "drwxr-xr-x" : n.executable ? "-rwxr-xr-x" : "-rw-r--r--");
        const owner = n.owner || ctx.machine.currentUser;
        const size = String(n.content?.length || (isDir ? 4096 : 0)).padStart(6);
        const color = isDir ? blue(name) : n.executable ? green(name) : name;
        lines.push(`${perm}  1 ${owner.padEnd(8)} ${owner.padEnd(8)} ${size}  Jan 15 12:00 ${color}`);
      }
      return { output: lines };
    }
    const line = entries.map(([name, n]) => n.type === "dir" ? blue(name) : n.executable ? green(name) : name).join("  ");
    return { output: [line] };
  },

  cd: (args, ctx) => {
    const target = args[0] || ctx.machine.env.HOME || "/home";
    const resolved = target === "~" ? (ctx.machine.env.HOME || "/home") : target;
    const { node, absPath } = ctx.resolvePath(resolved, ctx.cwd);
    if (!node) return { output: [red(`cd: ${target}: No such file or directory`)], error: true };
    if (node.type !== "dir") return { output: [red(`cd: ${target}: Not a directory`)], error: true };
    return { output: [], newCwd: absPath };
  },

  cat: (args, ctx) => {
    if (!args[0]) return { output: [red("cat: missing operand")], error: true };
    const results: string[] = [];
    for (const arg of args.filter(a => !a.startsWith("-"))) {
      const { node } = ctx.resolvePath(arg, ctx.cwd);
      if (!node) { results.push(red(`cat: ${arg}: No such file or directory`)); continue; }
      if (node.type === "dir") { results.push(red(`cat: ${arg}: Is a directory`)); continue; }
      results.push(...(node.content || "").split("\n"));
    }
    return { output: results };
  },

  pwd: (_a, ctx) => ({ output: [ctx.cwd] }),
  whoami: (_a, ctx) => ({ output: [ctx.machine.currentUser] }),
  id: (_a, ctx) => {
    const user = ctx.machine.users.find(u => u.username === ctx.machine.currentUser);
    if (!user) return { output: [`uid=1000(${ctx.machine.currentUser}) gid=1000(${ctx.machine.currentUser})`] };
    return { output: [`uid=${user.uid}(${user.username}) gid=${user.uid}(${user.username}) groups=${user.groups.map((g, i) => `${1000 + i}(${g})`).join(",")}`] };
  },
  hostname: (_a, ctx) => ({ output: [ctx.machine.hostname] }),

  uname: (args, ctx) => {
    if (args.includes("-a")) return { output: [`Linux ${ctx.machine.hostname} 6.1.0-kali9-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`] };
    if (args.includes("-r")) return { output: ["6.1.0-kali9-amd64"] };
    return { output: ["Linux"] };
  },

  echo: (args) => ({ output: [args.join(" ")] }),
  clear: () => ({ output: [], clearScreen: true }),
  history: (_a, ctx) => ({ output: ctx.commandHistory.slice(-20).map((c, i) => `  ${i + 1}  ${c}`) }),

  mkdir: (args, ctx) => {
    if (!args[0]) return { output: [red("mkdir: missing operand")], error: true };
    const target = args.find(a => !a.startsWith("-")) || args[0];
    const { node } = ctx.resolvePath(target, ctx.cwd);
    if (node) return { output: [red(`mkdir: cannot create directory '${target}': File exists`)], error: true };
    const absPath = target.startsWith("/") ? target : `${ctx.cwd === "/" ? "" : ctx.cwd}/${target}`;
    return { output: [], modifyFs: { path: absPath, node: { type: "dir", children: {} } } };
  },

  touch: (args, ctx) => {
    if (!args[0]) return { output: [red("touch: missing file operand")], error: true };
    const target = args[0];
    const absPath = target.startsWith("/") ? target : `${ctx.cwd === "/" ? "" : ctx.cwd}/${target}`;
    return { output: [], modifyFs: { path: absPath, node: { type: "file", content: "" } } };
  },

  rm: (args, ctx) => {
    if (!args[0]) return { output: [red("rm: missing operand")], error: true };
    const target = args.find(a => !a.startsWith("-")) || args[0];
    const { node } = ctx.resolvePath(target, ctx.cwd);
    if (!node) return { output: [red(`rm: cannot remove '${target}': No such file or directory`)], error: true };
    if (node.type === "dir" && !args.includes("-r") && !args.includes("-rf")) return { output: [red(`rm: cannot remove '${target}': Is a directory`)], error: true };
    const absPath = target.startsWith("/") ? target : `${ctx.cwd === "/" ? "" : ctx.cwd}/${target}`;
    return { output: [], deleteFs: absPath };
  },

  cp: (args) => {
    if (args.length < 2) return { output: [red("cp: missing destination")], error: true };
    return { output: [dim("(copied)")] };
  },

  mv: (args) => {
    if (args.length < 2) return { output: [red("mv: missing destination")], error: true };
    return { output: [dim("(moved)")] };
  },

  chmod: (args) => {
    if (args.length < 2) return { output: [red("chmod: missing operand")], error: true };
    return { output: [] };
  },

  chown: (args) => {
    if (args.length < 2) return { output: [red("chown: missing operand")], error: true };
    return { output: [] };
  },

  grep: (args, ctx) => {
    const flags = args.filter(a => a.startsWith("-"));
    const nonFlags = args.filter(a => !a.startsWith("-"));
    if (nonFlags.length < 1) return { output: ["Usage: grep [OPTION] PATTERN [FILE]"], error: true };
    const pattern = nonFlags[0];
    const file = nonFlags[1];
    const caseInsensitive = flags.includes("-i");
    if (!file) return { output: [red("grep: no input file")], error: true };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`grep: ${file}: No such file or directory`)], error: true };
    const regex = new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, caseInsensitive ? "gi" : "g");
    const matches = (node.content || "").split("\n").filter(l => caseInsensitive ? l.toLowerCase().includes(pattern.toLowerCase()) : l.includes(pattern));
    if (matches.length === 0) return { output: [] };
    return { output: matches.map(m => m.replace(regex, red("$1"))) };
  },

  find: (args, ctx) => {
    const startDir = args.find(a => !a.startsWith("-")) || ".";
    const nameIdx = args.indexOf("-name");
    const pattern = nameIdx >= 0 && args[nameIdx + 1] ? args[nameIdx + 1].replace(/\*/g, "") : "";
    const permIdx = args.indexOf("-perm");
    const permPattern = permIdx >= 0 ? args[permIdx + 1] : "";

    const results: string[] = [];
    const { node: startNode, absPath } = ctx.resolvePath(startDir, ctx.cwd);
    if (!startNode) return { output: [red(`find: '${startDir}': No such file or directory`)], error: true };

    const walk = (node: FSNode, path: string) => {
      if (node.children) {
        for (const [name, child] of Object.entries(node.children)) {
          const full = `${path}/${name}`;
          let match = true;
          if (pattern && !name.includes(pattern)) match = false;
          if (permPattern === "-4000" && !(child.permissions || "").includes("s")) match = false;
          if (match) results.push(full);
          if (child.type === "dir") walk(child, full);
        }
      }
    };
    walk(startNode, absPath === "/" ? "" : absPath);
    if (results.length === 0) return { output: [] };
    return { output: results.slice(0, 50) };
  },

  head: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-")) || "";
    if (!file) return { output: [red("head: missing file operand")], error: true };
    const nIdx = args.indexOf("-n");
    const n = nIdx >= 0 ? parseInt(args[nIdx + 1]) || 10 : 10;
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`head: ${file}: No such file or directory`)], error: true };
    return { output: (node.content || "").split("\n").slice(0, n) };
  },

  tail: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-")) || "";
    if (!file) return { output: [red("tail: missing file operand")], error: true };
    const nIdx = args.indexOf("-n");
    const n = nIdx >= 0 ? parseInt(args[nIdx + 1]) || 10 : 10;
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`tail: ${file}: No such file or directory`)], error: true };
    return { output: (node.content || "").split("\n").slice(-n) };
  },

  wc: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-")) || "";
    if (!file) return { output: [red("wc: missing file operand")], error: true };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`wc: ${file}: No such file or directory`)], error: true };
    const content = node.content || "";
    const lines = content.split("\n").length;
    const words = content.split(/\s+/).filter(Boolean).length;
    return { output: [`  ${lines}  ${words}  ${content.length} ${file}`] };
  },

  file: (args, ctx) => {
    if (!args[0]) return { output: [red("file: missing operand")], error: true };
    const { node } = ctx.resolvePath(args[0], ctx.cwd);
    if (!node) return { output: [red(`${args[0]}: cannot open (No such file or directory)`)], error: true };
    if (node.type === "dir") return { output: [`${args[0]}: directory`] };
    if (node.executable) return { output: [`${args[0]}: ELF 64-bit LSB executable, x86-64`] };
    if (node.content?.startsWith("#!/")) return { output: [`${args[0]}: Bourne-Again shell script, ASCII text executable`] };
    if (node.content?.startsWith("<")) return { output: [`${args[0]}: HTML document, ASCII text`] };
    return { output: [`${args[0]}: ASCII text`] };
  },

  ifconfig: (_a, ctx) => {
    const m = ctx.machine;
    return { output: [
      `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`,
      `        inet ${m.ip}  netmask ${ctx.env.network.netmask}  broadcast ${m.ip.replace(/\.\d+$/, ".255")}`,
      `        inet6 fe80::${m.mac.split(":").slice(-2).join("")}  prefixlen 64  scopeid 0x20<link>`,
      `        ether ${m.mac}  txqueuelen 0  (Ethernet)`,
      `        RX packets ${Math.floor(Math.random() * 50000 + 10000)}  bytes ${Math.floor(Math.random() * 50000000 + 1000000)}`,
      `        TX packets ${Math.floor(Math.random() * 30000 + 5000)}  bytes ${Math.floor(Math.random() * 10000000 + 500000)}`,
      ``,
      `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536`,
      `        inet 127.0.0.1  netmask 255.0.0.0`,
    ]};
  },

  ip: (args, ctx) => {
    if (args[0] === "addr" || args[0] === "a") {
      return { output: [
        `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536`,
        `    inet 127.0.0.1/8 scope host lo`,
        `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500`,
        `    inet ${ctx.machine.ip}/24 brd ${ctx.machine.ip.replace(/\.\d+$/, ".255")} scope global eth0`,
        `    link/ether ${ctx.machine.mac} brd ff:ff:ff:ff:ff:ff`,
      ]};
    }
    if (args[0] === "route") {
      return { output: [
        `default via ${ctx.env.network.gateway} dev eth0`,
        `${ctx.env.network.subnet.replace("/24", "")} dev eth0 proto kernel scope link src ${ctx.machine.ip}`,
      ]};
    }
    return { output: ["Usage: ip [addr|route|link]"] };
  },

  netstat: (args, ctx) => {
    const lines = [
      "Active Internet connections (servers and established)",
      "Proto  Recv-Q  Send-Q  Local Address           Foreign Address         State",
    ];
    for (const svc of ctx.machine.services) {
      if (svc.running) {
        lines.push(`tcp    0       0       0.0.0.0:${svc.port}${" ".repeat(Math.max(1, 15 - String(svc.port).length))}0.0.0.0:*               LISTEN`);
      }
    }
    lines.push(`tcp    0       0       ${ctx.machine.ip}:22      192.168.1.100:52100     ESTABLISHED`);
    return { output: lines };
  },

  ss: (args, ctx) => linuxCommands.netstat(args, ctx),

  ping: (args, ctx) => {
    const host = args.find(a => !a.startsWith("-"));
    if (!host) return { output: [red("ping: missing host operand")], error: true };
    const target = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    const ip = target ? target.ip : host;
    const reachable = !!target || host === "127.0.0.1" || host === "localhost" || host === ctx.env.network.gateway || host === "8.8.8.8";
    if (!reachable) {
      return { output: [
        `PING ${host} (${ip}) 56(84) bytes of data.`,
        `From ${ctx.machine.ip} icmp_seq=1 Destination Host Unreachable`,
        `From ${ctx.machine.ip} icmp_seq=2 Destination Host Unreachable`,
        `--- ${host} ping statistics ---`,
        `2 packets transmitted, 0 received, +2 errors, ${red("100% packet loss")}`,
      ]};
    }
    const times = [1, 2, 3].map(() => (Math.random() * 2 + 0.1).toFixed(3));
    return { output: [
      `PING ${host} (${ip}) 56(84) bytes of data.`,
      ...times.map((t, i) => `64 bytes from ${ip}: icmp_seq=${i + 1} ttl=64 time=${t} ms`),
      `--- ${host} ping statistics ---`,
      `3 packets transmitted, 3 received, ${green("0% packet loss")}`,
      `rtt min/avg/max = ${times.sort()[0]}/${(times.reduce((a, b) => a + parseFloat(b), 0) / 3).toFixed(3)}/${times.sort()[2]} ms`,
    ]};
  },

  traceroute: (args, ctx) => {
    const host = args.find(a => !a.startsWith("-"));
    if (!host) return { output: [red("traceroute: missing host")], error: true };
    const target = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    const ip = target?.ip || host;
    return { output: [
      `traceroute to ${host} (${ip}), 30 hops max, 60 byte packets`,
      ` 1  ${ctx.env.network.gateway}  ${(Math.random() * 2).toFixed(3)} ms  ${(Math.random() * 2).toFixed(3)} ms  ${(Math.random() * 2).toFixed(3)} ms`,
      ` 2  ${ip}  ${(Math.random() * 5).toFixed(3)} ms  ${(Math.random() * 5).toFixed(3)} ms  ${(Math.random() * 5).toFixed(3)} ms`,
    ]};
  },

  nslookup: (args) => {
    const host = args[0];
    if (!host) return { output: [red("nslookup: missing host")], error: true };
    return { output: [
      `Server:\t\t8.8.8.8`, `Address:\t8.8.8.8#53`, ``,
      `Non-authoritative answer:`,
      `Name:\t${host}`,
      `Address: ${host.match(/^\d/) ? host : `${Math.floor(Math.random() * 200 + 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`}`,
    ]};
  },

  dig: (args) => {
    const host = args.find(a => !a.startsWith("-") && !a.startsWith("@")) || "localhost";
    const ip = `${Math.floor(Math.random() * 200 + 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    return { output: [
      `; <<>> DiG 9.18.12 <<>> ${host}`,
      `;; ANSWER SECTION:`,
      `${host}.\t\t300\tIN\tA\t${ip}`,
      ``,
      `;; Query time: ${Math.floor(Math.random() * 50)} msec`,
      `;; SERVER: 8.8.8.8#53(8.8.8.8)`,
    ]};
  },

  whois: (args) => {
    if (!args[0]) return { output: [red("whois: missing argument")], error: true };
    return { output: [
      `Domain Name: ${args[0]}`, `Registrar: Example Registrar`,
      `Creation Date: 2020-01-15T00:00:00Z`,
      `Registry Expiry Date: 2025-01-15T00:00:00Z`,
      `Name Server: ns1.example.com`, `Name Server: ns2.example.com`,
    ]};
  },

  arp: (args, ctx) => {
    const lines = ["Address                  HWtype  HWaddress           Flags Mask  Iface"];
    lines.push(`${ctx.env.network.gateway}          ether   02:42:ac:11:00:01   C           eth0`);
    for (const m of ctx.allMachines.filter(m => m.id !== ctx.machine.id)) {
      lines.push(`${m.ip}${" ".repeat(Math.max(1, 24 - m.ip.length))}ether   ${m.mac}   C           eth0`);
    }
    return { output: lines };
  },

  route: (_a, ctx) => {
    return { output: [
      "Kernel IP routing table",
      "Destination     Gateway         Genmask         Flags Metric Ref    Use Iface",
      `0.0.0.0         ${ctx.env.network.gateway}    0.0.0.0         UG    100    0        0 eth0`,
      `${ctx.env.network.subnet.replace("/24", "")}   0.0.0.0         255.255.255.0   U     100    0        0 eth0`,
    ]};
  },

  ps: (args, ctx) => {
    const wide = args.includes("aux") || args.includes("-ef") || args.includes("-aux");
    if (wide) {
      const lines = ["USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND"];
      for (const p of ctx.machine.processes) {
        lines.push(`${p.user.padEnd(10)} ${String(p.pid).padStart(4)} ${p.cpu.padStart(4)} ${p.mem.padStart(4)}  ${Math.floor(Math.random() * 500000 + 10000)}  ${Math.floor(Math.random() * 50000 + 1000)} ?        Ss   Jan15   0:${Math.floor(Math.random() * 99).toString().padStart(2, "0")} ${p.command}`);
      }
      return { output: lines };
    }
    const lines = ["  PID TTY          TIME CMD"];
    for (const p of ctx.machine.processes) {
      lines.push(`${String(p.pid).padStart(5)} ?        00:00:0${Math.floor(Math.random() * 9)} ${p.command}`);
    }
    return { output: lines };
  },

  kill: (args) => {
    if (!args[0]) return { output: [red("kill: missing operand")], error: true };
    return { output: [dim(`kill: sent signal to process ${args[args.length - 1]}`)] };
  },

  free: () => ({ output: [
    "              total        used        free      shared  buff/cache   available",
    "Mem:        16384000     4096000     8192000      256000     4096000    12288000",
    "Swap:        4096000           0     4096000",
  ]}),

  df: () => ({ output: [
    "Filesystem     1K-blocks    Used Available Use% Mounted on",
    "/dev/sda1       51200000 12800000  38400000  26% /",
    "tmpfs            8192000        0   8192000   0% /dev/shm",
    "/dev/sda2       10240000  2048000   8192000  20% /boot",
  ]}),

  uptime: () => {
    const h = Math.floor(Math.random() * 720 + 24);
    return { output: [` ${new Date().toLocaleTimeString()} up ${Math.floor(h / 24)} days, ${h % 24}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")},  1 user,  load average: 0.${Math.floor(Math.random() * 50)}, 0.${Math.floor(Math.random() * 30)}, 0.${Math.floor(Math.random() * 20)}`] };
  },

  date: () => ({ output: [new Date().toString()] }),
  env: (_a, ctx) => ({ output: Object.entries(ctx.machine.env).map(([k, v]) => `${k}=${v}`) }),
  export: (args, ctx) => {
    if (!args[0]) return linuxCommands.env(args, ctx);
    return { output: [] };
  },
  which: (args, ctx) => {
    if (!args[0]) return { output: [red("which: missing argument")], error: true };
    if (ctx.machine.tools.includes(args[0])) return { output: [`/usr/bin/${args[0]}`] };
    const builtins = ["ls", "cd", "cat", "grep", "find", "echo", "mkdir", "rm", "cp", "mv", "chmod", "chown", "touch", "head", "tail", "wc", "sort", "uniq", "cut", "tr", "tee", "bash", "sh", "python3", "python"];
    if (builtins.includes(args[0])) return { output: [`/usr/bin/${args[0]}`] };
    return { output: [red(`${args[0]} not found`)], error: true };
  },

  man: (args) => {
    if (!args[0]) return { output: ["What manual page do you want?"] };
    return { output: [`${bold(args[0].toUpperCase())}(1)`, "", `NAME`, `    ${args[0]} - ${args[0]} command`, "", `DESCRIPTION`, `    Use ${yellow("help")} for available commands in this environment.`] };
  },

  sudo: (args, ctx) => {
    const user = ctx.machine.users.find(u => u.username === ctx.machine.currentUser);
    if (!user?.groups.includes("sudo") && !user?.isRoot) {
      return { output: [red(`${ctx.machine.currentUser} is not in the sudoers file. This incident will be reported.`)], error: true };
    }
    if (args.length === 0) return { output: ["usage: sudo <command>"] };
    if (args[0] === "su" || (args[0] === "-i") || (args[0] === "bash")) {
      return { output: [yellow("⚡ Switched to root shell")] };
    }
    const subCmd = args.join(" ");
    return executeCommand(subCmd, { ...ctx, machine: { ...ctx.machine, currentUser: "root" } });
  },

  su: (args, ctx) => {
    const targetUser = args[0] === "-" ? "root" : (args[0] || "root");
    const user = ctx.machine.users.find(u => u.username === targetUser);
    if (!user) return { output: [red(`su: user ${targetUser} does not exist`)], error: true };
    return { output: [yellow(`Password required for ${targetUser}`), dim("(in simulation, access granted)")] };
  },

  service: (args) => {
    if (args.length < 2) return { output: ["Usage: service <name> <start|stop|status|restart>"] };
    return { output: [`${args[0]}: ${args[1] === "status" ? "active (running)" : `${args[1]}ed successfully`}`] };
  },

  systemctl: (args) => {
    if (args.length < 2) return { output: ["Usage: systemctl <start|stop|status|restart> <service>"] };
    const action = args[0];
    const svc = args[1];
    if (action === "status") {
      return { output: [
        `● ${svc}.service - ${svc}`,
        `   Loaded: loaded (/lib/systemd/system/${svc}.service; enabled)`,
        `   Active: ${green("active (running)")} since Mon 2024-01-15 00:00:00 UTC`,
        `   Main PID: ${Math.floor(Math.random() * 9000 + 1000)}`,
      ]};
    }
    return { output: [] };
  },

  nmap: (args, ctx) => {
    const flags = args.filter(a => a.startsWith("-"));
    const target = args.find(a => !a.startsWith("-"));
    if (!target) return { output: [red("nmap: missing target")], error: true };

    const isSubnet = target.includes("/");
    const targetMachines = isSubnet
      ? ctx.allMachines.filter(m => m.id !== ctx.machine.id)
      : ctx.allMachines.filter(m => m.ip === target || m.hostname === target);

    if (targetMachines.length === 0) {
      return { output: [
        `Starting Nmap 7.94 ( https://nmap.org )`,
        `Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn`,
        `Nmap done: 1 IP address (0 hosts up) scanned in 3.05 seconds`,
      ]};
    }

    const showVersion = flags.some(f => f.includes("V") || f.includes("sV"));
    const showScripts = flags.some(f => f.includes("C") || f.includes("sC") || f.includes("script"));
    const showOS = flags.some(f => f.includes("O"));
    const showAll = flags.some(f => f === "-A");
    const showVuln = flags.some(f => f.includes("vuln"));

    const lines: string[] = [];
    lines.push(`Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString().split("T")[0]} UTC`);

    for (const tm of targetMachines) {
      lines.push(`Nmap scan report for ${tm.hostname} (${tm.ip})`);
      lines.push(`Host is up (0.00${Math.floor(Math.random() * 90 + 10)}s latency).`);
      const openPorts = tm.services.filter(s => s.running);
      const closedCount = 1000 - openPorts.length;
      lines.push(`Not shown: ${closedCount} closed tcp ports (reset)`);
      lines.push(`PORT      STATE SERVICE${(showVersion || showAll) ? "         VERSION" : ""}`);
      for (const svc of openPorts) {
        const portStr = `${svc.port}/${svc.protocol}`.padEnd(9);
        const stateStr = "open".padEnd(6);
        const svcStr = svc.name.padEnd(15);
        lines.push(`${portStr} ${stateStr} ${svcStr}${(showVersion || showAll) ? ` ${svc.version}` : ""}`);
      }

      if ((showScripts || showAll) && openPorts.length > 0) {
        for (const svc of openPorts) {
          if (svc.name === "ssh") {
            lines.push(`| ssh-hostkey:`, `|   3072 ${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":")} (RSA)`);
          }
          if (svc.name === "http" || svc.name === "apache") {
            lines.push(`| http-title: Welcome to Target Server`);
            if (svc.webContent?.["robots.txt"]) {
              lines.push(`| http-robots.txt: 3 disallowed entries`, `|_ /admin/ /backup/ /config/`);
            }
          }
          if (svc.name === "ftp" && svc.vulnerabilities.includes("Anonymous login allowed")) {
            lines.push(`| ftp-anon: ${yellow("Anonymous FTP login allowed")}`);
            if (svc.ftpFiles) {
              for (const f of svc.ftpFiles.slice(0, 3)) lines.push(`|   ${f}`);
            }
          }
          if (svc.name === "smb") {
            lines.push(`| smb-os-discovery:`, `|   OS: Windows 10 Pro 19045`, `|   Computer name: ${tm.hostname}`, `|   Domain: WORKGROUP`);
          }
        }
      }

      if (showVuln) {
        for (const svc of openPorts) {
          if (svc.vulnerabilities.length > 0) {
            lines.push(`| ${svc.name}-vulns:`);
            for (const v of svc.vulnerabilities) {
              lines.push(`|   ${red("VULNERABLE:")} ${v}`);
            }
          }
        }
      }

      if (showOS || showAll) {
        lines.push(`OS details: ${tm.osLabel}`);
      }
      lines.push(``);
    }

    lines.push(`Nmap done: ${isSubnet ? ctx.allMachines.length - 1 : 1} IP address(es) (${targetMachines.length} host(s) up) scanned in ${(Math.random() * 10 + 2).toFixed(2)} seconds`);
    return { output: lines };
  },

  ssh: (args, ctx) => {
    let user = ctx.machine.currentUser;
    let host = "";
    let port = 22;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-p" && args[i + 1]) { port = parseInt(args[i + 1]); i++; continue; }
      if (args[i] === "-l" && args[i + 1]) { user = args[i + 1]; i++; continue; }
      if (!args[i].startsWith("-")) {
        if (args[i].includes("@")) {
          const parts = args[i].split("@");
          user = parts[0];
          host = parts[1];
        } else {
          host = args[i];
        }
      }
    }

    if (!host) return { output: ["usage: ssh [-p port] [user@]hostname"], error: true };

    const targetMachine = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    if (!targetMachine) {
      return { output: [red(`ssh: connect to host ${host} port ${port}: Connection refused`)], error: true };
    }

    const sshService = targetMachine.services.find(s => s.name === "ssh" && s.running);
    if (!sshService) {
      return { output: [red(`ssh: connect to host ${host} port ${port}: Connection refused`)], error: true };
    }

    const targetUser = targetMachine.users.find(u => u.username === user);
    if (!targetUser) {
      return { output: [red(`Permission denied (publickey,password).`)], error: true };
    }

    return {
      output: [
        `The authenticity of host '${host} (${targetMachine.ip})' can't be established.`,
        `ED25519 key fingerprint is SHA256:${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("").slice(0, 43)}.`,
        `This key is not known by any other names.`,
        `Are you sure you want to continue connecting (yes/no/[fingerprint])? yes`,
        `Warning: Permanently added '${host}' (ED25519) to the list of known hosts.`,
      ],
      passwordPrompt: { callback: "ssh-auth", machineId: targetMachine.id, user },
    };
  },

  curl: (args, ctx) => {
    const url = args.find(a => !a.startsWith("-"));
    if (!url) return { output: ["curl: missing URL"], error: true };

    const urlMatch = url.match(/https?:\/\/([^/:]+)(?::(\d+))?([^\s]*)?/);
    if (!urlMatch) return { output: [red(`curl: (6) Could not resolve host`)], error: true };

    const host = urlMatch[1];
    const port = parseInt(urlMatch[2] || "80");
    const path = urlMatch[3] || "/";

    const targetMachine = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    if (!targetMachine) return { output: [red(`curl: (7) Failed to connect to ${host} port ${port}`)], error: true };

    const httpSvc = targetMachine.services.find(s => (s.name === "http" || s.name === "apache") && s.running);
    if (!httpSvc) return { output: [red(`curl: (7) Failed to connect to ${host} port ${port}`)], error: true };

    const showHeaders = args.includes("-I") || args.includes("-i") || args.includes("--head");
    const headers = [
      `HTTP/1.1 200 OK`,
      `Server: ${httpSvc.version}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Date: ${new Date().toUTCString()}`,
      `Connection: close`,
    ];

    if (args.includes("-I") || args.includes("--head")) return { output: headers };

    const webRoot = resolvePath(targetMachine.filesystem, targetMachine.os.includes("windows") ? "C:\\inetpub\\wwwroot" : "/var/www/html", "/");
    const fileName = path === "/" ? "index.html" : path.replace(/^\//, "");
    let content = "<html><body><h1>404 Not Found</h1></body></html>";
    if (webRoot.node?.children) {
      const file = webRoot.node.children[fileName];
      if (file?.type === "file" && file.content) content = file.content;
    }

    if (args.includes("-i")) return { output: [...headers, "", content] };
    return { output: content.split("\n") };
  },

  wget: (args) => {
    const url = args.find(a => !a.startsWith("-"));
    if (!url) return { output: [red("wget: missing URL")], error: true };
    const fileName = url.split("/").pop() || "index.html";
    return { output: [
      `--${new Date().toISOString()}--  ${url}`,
      `Resolving ${url.split("/")[2]}... done.`,
      `Connecting to ${url.split("/")[2]}... connected.`,
      `HTTP request sent, awaiting response... 200 OK`,
      `Length: ${Math.floor(Math.random() * 10000 + 1000)} [text/html]`,
      `Saving to: '${fileName}'`,
      ``,
      `${fileName}          100%[==================>]   ${Math.floor(Math.random() * 10 + 1)}.${Math.floor(Math.random() * 99)}K  --.-KB/s    in 0.001s`,
      ``,
      `${new Date().toISOString()} - '${fileName}' saved`,
    ]};
  },

  nc: (args, ctx) => {
    if (args.includes("-l") || args.includes("-lp") || args.includes("-lvp")) {
      const port = args.find(a => /^\d+$/.test(a)) || "4444";
      return { output: [dim(`listening on [0.0.0.0] ${port} ...`)] };
    }
    const host = args.find(a => !a.startsWith("-") && !/^\d+$/.test(a));
    const port = args.find(a => /^\d+$/.test(a));
    if (!host || !port) return { output: ["usage: nc [-l] [host] [port]"], error: true };
    const target = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    if (!target) return { output: [red(`nc: connect to ${host} port ${port} (tcp) failed: Connection refused`)], error: true };
    const svc = target.services.find(s => s.port === parseInt(port) && s.running);
    if (!svc) return { output: [red(`nc: connect to ${host} port ${port} (tcp) failed: Connection refused`)], error: true };
    return { output: [svc.banner || `Connected to ${host}:${port}`] };
  },

  hydra: (args, ctx) => {
    let loginUser = "";
    let passwordFile = "";
    let targetProto = "";
    let targetHost = "";

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-l" && args[i + 1]) { loginUser = args[i + 1]; i++; }
      if (args[i] === "-P" && args[i + 1]) { passwordFile = args[i + 1]; i++; }
      if (!args[i].startsWith("-")) {
        const protoMatch = args[i].match(/(ssh|ftp|http-get|http-post):\/\/(.+)/);
        if (protoMatch) { targetProto = protoMatch[1]; targetHost = protoMatch[2]; }
        else if (["ssh", "ftp"].includes(args[i])) { targetProto = args[i]; }
        else if (!loginUser && !passwordFile) { targetHost = args[i]; }
      }
    }

    if (!targetHost || !loginUser) return { output: ["Usage: hydra -l <user> -P <wordlist> <protocol>://<host>"], error: true };

    const target = ctx.allMachines.find(m => m.ip === targetHost || m.hostname === targetHost);
    if (!target) return { output: [red(`[ERROR] target ${targetHost} not reachable`)], error: true };

    const user = target.users.find(u => u.username === loginUser);
    const wordlist = passwordFile ? resolvePath(ctx.machine.filesystem, passwordFile, ctx.cwd) : null;
    const passwords = wordlist?.node?.content?.split("\n").filter(Boolean) || ["password", "123456", "admin"];

    const lines: string[] = [];
    lines.push(`Hydra v9.5 (c) 2023 by van Hauser/THC - https://github.com/vanhauser-thc/thc-hydra`);
    lines.push(`[DATA] max 16 tasks per 1 server, overall 16 tasks, ${passwords.length} login tries (l:1/p:${passwords.length})`);
    lines.push(`[DATA] attacking ${targetProto}://${targetHost}:${targetProto === "ssh" ? 22 : targetProto === "ftp" ? 21 : 80}`);

    const totalPasswords = passwords.length;
    const attempts = Math.min(totalPasswords, 20);
    let found = false;

    for (let i = 0; i < attempts; i++) {
      if (user && passwords[i] === user.password) {
        lines.push(`[${targetProto === "ssh" ? "22" : "21"}][${targetProto}] host: ${targetHost}   login: ${green(loginUser)}   password: ${green(passwords[i])}`);
        found = true;
        break;
      }
      if (i % 5 === 4) {
        lines.push(`[STATUS] ${i + 1}/${totalPasswords} tries, ~${totalPasswords - i - 1} remaining`);
      }
    }

    if (!found && user && passwords.includes(user.password)) {
      lines.push(`[${targetProto === "ssh" ? "22" : "21"}][${targetProto}] host: ${targetHost}   login: ${green(loginUser)}   password: ${green(user.password)}`);
      found = true;
    }

    if (found) {
      lines.push(`${green("[SUCCESS]")} 1 valid password found`);
    } else {
      lines.push(`${red("[ERROR]")} 0 valid passwords found after ${totalPasswords} attempts`);
    }
    lines.push(`Hydra finished.`);
    return { output: lines };
  },

  john: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-"));
    if (!file) return { output: ["Usage: john [options] <hash-file>"], error: true };

    const wlIdx = args.indexOf("--wordlist");
    const wlEqIdx = args.findIndex(a => a.startsWith("--wordlist="));
    let wordlistPath = wlIdx >= 0 ? args[wlIdx + 1] : wlEqIdx >= 0 ? args[wlEqIdx].split("=")[1] : null;

    const { node: hashNode } = ctx.resolvePath(file, ctx.cwd);
    if (!hashNode || hashNode.type !== "file") return { output: [red(`No such file: ${file}`)], error: true };

    const lines: string[] = [];
    lines.push(`Loaded ${(hashNode.content || "").split("\n").filter(Boolean).length} password hash(es)`);
    lines.push(`Will run ${Math.min(8, 4)} OpenMP threads`);
    lines.push(`Press 'q' or Ctrl-C to abort, almost any other key for status`);

    const hashes = (hashNode.content || "").split("\n").filter(Boolean);
    let cracked = 0;
    for (const hash of hashes) {
      const parts = hash.split(":");
      const username = parts[0];
      const targetUser = ctx.allMachines.flatMap(m => m.users).find(u => u.username === username);
      if (targetUser) {
        lines.push(`${green(targetUser.password)}     (${username})`);
        cracked++;
      }
    }

    lines.push(`${cracked}g ${cracked}p 0:00:00:${Math.floor(Math.random() * 59).toString().padStart(2, "0")} 100% (ETA: ${new Date().toTimeString().split(" ")[0]})`);
    lines.push(`Session completed`);
    return { output: lines };
  },

  hashcat: (args) => {
    return { output: [
      `hashcat (v6.2.6) starting...`,
      `OpenCL API (OpenCL 2.0) - Platform #1 [Intel(R)]`,
      dim(`Use --help for usage information`),
      `Session..........: hashcat`,
      `Status...........: Running`,
      `Hash.Type........: MD5/SHA-256`,
    ]};
  },

  gobuster: (args, ctx) => {
    if (args[0] !== "dir") return { output: ["Usage: gobuster dir -u <url> -w <wordlist>"] };
    const uIdx = args.indexOf("-u");
    const url = uIdx >= 0 ? args[uIdx + 1] : "";
    if (!url) return { output: [red("URL is required (-u)")], error: true };

    const urlMatch = url.match(/https?:\/\/([^/:]+)/);
    if (!urlMatch) return { output: [red("Invalid URL")], error: true };

    const target = ctx.allMachines.find(m => m.ip === urlMatch[1] || m.hostname === urlMatch[1]);
    if (!target) return { output: [red(`Error: could not connect to ${url}`)], error: true };

    const webRoot = resolvePath(target.filesystem, "/var/www/html", "/");
    const lines: string[] = [`Gobuster v3.6`, `[+] Url:        ${url}`, `[+] Threads:    10`, `===============================================================`, `Starting gobuster`, `===============================================================`];

    if (webRoot.node?.children) {
      for (const [name, node] of Object.entries(webRoot.node.children)) {
        const status = node.type === "dir" ? 301 : 200;
        const size = node.content?.length || 0;
        lines.push(`/${name.padEnd(20)} (Status: ${status === 301 ? yellow(String(status)) : green(String(status))})  [Size: ${size}]`);
        if (node.type === "dir" && node.children) {
          for (const [sub] of Object.entries(node.children)) {
            lines.push(`/${name}/${sub.padEnd(14)} (Status: ${green("200")})  [Size: ${node.children[sub]?.content?.length || 0}]`);
          }
        }
      }
    }

    lines.push(`===============================================================`, `Finished`, `===============================================================`);
    return { output: lines };
  },

  nikto: (args, ctx) => {
    const hIdx = args.indexOf("-h");
    const host = hIdx >= 0 ? args[hIdx + 1] : args.find(a => !a.startsWith("-"));
    if (!host) return { output: ["Usage: nikto -h <host>"], error: true };

    const target = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    const httpSvc = target?.services.find(s => (s.name === "http" || s.name === "apache") && s.running);
    if (!target || !httpSvc) return { output: [red(`- ${host}: ERROR - no web server found`)], error: true };

    const lines = [
      `- Nikto v2.5.0`,
      `---------------------------------------------------------------------------`,
      `+ Target IP:          ${target.ip}`,
      `+ Target Hostname:    ${target.hostname}`,
      `+ Target Port:        ${httpSvc.port}`,
      `+ Start Time:         ${new Date().toISOString()}`,
      `---------------------------------------------------------------------------`,
      `+ Server: ${httpSvc.version}`,
    ];

    for (const vuln of httpSvc.vulnerabilities) {
      lines.push(`+ ${red("OSVDB-0000:")} ${vuln}`);
    }
    lines.push(
      `+ /admin/: Admin directory found`,
      `+ /robots.txt: Robots file found with ${yellow("3")} disallowed entries`,
      `+ /backup/: Backup directory found - may contain sensitive data`,
      `---------------------------------------------------------------------------`,
      `+ ${httpSvc.vulnerabilities.length + 3} item(s) reported on remote host`,
      `+ End Time: ${new Date().toISOString()}`,
      `---------------------------------------------------------------------------`,
    );
    return { output: lines };
  },

  sqlmap: (args) => {
    const uIdx = args.indexOf("-u");
    const url = uIdx >= 0 ? args[uIdx + 1] : args.find(a => !a.startsWith("-"));
    if (!url) return { output: ["Usage: sqlmap -u <url>"], error: true };
    return { output: [
      dim(`[*] starting @ ${new Date().toTimeString().split(" ")[0]}`),
      `[${green("INFO")}] testing connection to the target URL`,
      `[${green("INFO")}] testing if the target URL content is stable`,
      `[${green("INFO")}] target URL content is stable`,
      `[${green("INFO")}] testing if GET parameter 'id' is dynamic`,
      `[${yellow("WARNING")}] GET parameter 'id' does not appear to be dynamic`,
      `[${green("INFO")}] heuristic (basic) test shows that GET parameter 'id' might be injectable`,
      `[${green("INFO")}] testing for SQL injection on GET parameter 'id'`,
      `[${green("INFO")}] testing 'AND boolean-based blind'`,
      `[${green("INFO")}] GET parameter 'id' appears to be 'AND boolean-based blind' injectable`,
      `[${red("CRITICAL")}] ${bold("Parameter 'id' is vulnerable to SQL injection!")}`,
      `sqlmap identified the following injection point(s):`,
      `Parameter: id (GET)`,
      `    Type: boolean-based blind`,
      `    Title: AND boolean-based blind`,
      `    Payload: id=1 AND 1=1`,
    ]};
  },

  tcpdump: (args, ctx) => {
    const iface = args.includes("-i") ? args[args.indexOf("-i") + 1] : "eth0";
    const lines: string[] = [];
    lines.push(`tcpdump: verbose output suppressed, use -v for full protocol decode`);
    lines.push(`listening on ${iface}, link-type EN10MB (Ethernet), capture size 262144 bytes`);

    for (let i = 0; i < 5; i++) {
      const srcMachine = ctx.allMachines[Math.floor(Math.random() * ctx.allMachines.length)];
      const dstMachine = ctx.allMachines[Math.floor(Math.random() * ctx.allMachines.length)];
      const srcPort = Math.floor(Math.random() * 60000 + 1024);
      const dstPort = [22, 80, 443, 3306, 53][Math.floor(Math.random() * 5)];
      const time = `${new Date().toTimeString().split(" ")[0]}.${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`;
      lines.push(`${time} IP ${srcMachine.ip}.${srcPort} > ${dstMachine.ip}.${dstPort}: Flags [S], seq ${Math.floor(Math.random() * 4000000000)}, win 65535, length 0`);
    }
    lines.push(`5 packets captured`);
    return { output: lines };
  },

  smbclient: (args, ctx) => {
    const target = args.find(a => a.startsWith("//"));
    if (!target) return { output: ["Usage: smbclient //server/share [-U user]"] };
    const parts = target.replace("//", "").split("/");
    const host = parts[0];
    const targetMachine = ctx.allMachines.find(m => m.ip === host || m.hostname === host);
    if (!targetMachine) return { output: [red(`Connection to ${host} failed`)], error: true };
    const smbSvc = targetMachine.services.find(s => s.name === "smb" && s.running);
    if (!smbSvc) return { output: [red(`Connection to ${host} failed (Error: Connection refused)`)], error: true };

    if (args.includes("-L") || !parts[1]) {
      const lines = [`Sharename       Type      Comment`];
      if (smbSvc.smbShares) {
        for (const [name] of Object.entries(smbSvc.smbShares)) {
          lines.push(`${name.padEnd(15)} Disk`);
        }
      }
      return { output: lines };
    }
    return { output: [`smb: \\> `, dim("(connected - type 'help' for commands)")] };
  },

  iptables: (args) => {
    if (args.includes("-L")) {
      return { output: [
        `Chain INPUT (policy ACCEPT)`,
        `target     prot opt source               destination`,
        ``,
        `Chain FORWARD (policy ACCEPT)`,
        `target     prot opt source               destination`,
        ``,
        `Chain OUTPUT (policy ACCEPT)`,
        `target     prot opt source               destination`,
      ]};
    }
    if (args.includes("-A")) {
      return { output: [dim("Rule added successfully")] };
    }
    return { output: ["Usage: iptables [-L|-A|-D|-F] [chain] [rule]"] };
  },

  ufw: (args) => {
    if (args[0] === "status") return { output: ["Status: inactive"] };
    if (args[0] === "enable") return { output: [green("Firewall is active and enabled on system startup")] };
    if (args[0] === "allow") return { output: [green(`Rules updated for ${args.slice(1).join(" ")}`)] };
    if (args[0] === "deny") return { output: [green(`Rules updated for ${args.slice(1).join(" ")}`)] };
    return { output: ["Usage: ufw [enable|disable|status|allow|deny] [port/proto]"] };
  },

  exit: (_a, ctx) => {
    if (ctx.sshStack.length > 0) return { output: [dim("Connection to remote host closed.")], exitSession: true };
    return { output: [dim("logout")] };
  },

  help: (_a, ctx) => {
    const lines = [
      yellow("═══ Available Commands ═══"),
      "",
      bold("  File System:"),
      `  ${green("ls")} [-la]              List directory contents`,
      `  ${green("cd")} <path>            Change directory`,
      `  ${green("cat")} <file>           Display file contents`,
      `  ${green("pwd")}                  Print working directory`,
      `  ${green("mkdir")} <dir>          Create directory`,
      `  ${green("touch")} <file>         Create empty file`,
      `  ${green("rm")} [-rf] <path>      Remove file/directory`,
      `  ${green("find")} [-name] <pat>   Find files`,
      `  ${green("grep")} <pat> <file>    Search in file`,
      `  ${green("head/tail")} <file>     Show first/last lines`,
      "",
      bold("  System:"),
      `  ${green("whoami")}               Current user`,
      `  ${green("id")}                   User identity`,
      `  ${green("hostname")}             Machine hostname`,
      `  ${green("uname")} [-a]           System info`,
      `  ${green("ps")} [aux]             Running processes`,
      `  ${green("uptime")}               System uptime`,
      `  ${green("sudo")} <cmd>           Run as root`,
      "",
      bold("  Network:"),
      `  ${green("ifconfig")} / ${green("ip addr")}  Network interfaces`,
      `  ${green("ping")} <host>          Test connectivity`,
      `  ${green("ssh")} user@host        Connect to remote host`,
      `  ${green("netstat")} / ${green("ss")}         Active connections`,
      `  ${green("traceroute")} <host>    Trace route`,
      `  ${green("curl")} <url>           HTTP request`,
      `  ${green("wget")} <url>           Download file`,
      `  ${green("nc")} <host> <port>     Netcat connection`,
      `  ${green("arp")}                  ARP table`,
      "",
    ];

    if (ctx.machine.tools.length > 0) {
      lines.push(bold("  Security Tools:"));
      if (ctx.machine.tools.includes("nmap")) lines.push(`  ${green("nmap")} [-sV|-sC|-A] <target>  Port scanner`);
      if (ctx.machine.tools.includes("hydra")) lines.push(`  ${green("hydra")} -l <user> -P <list> ssh://<host>  Brute force`);
      if (ctx.machine.tools.includes("john")) lines.push(`  ${green("john")} [--wordlist=<file>] <hash>  Password cracker`);
      if (ctx.machine.tools.includes("gobuster")) lines.push(`  ${green("gobuster")} dir -u <url> -w <list>  Directory scanner`);
      if (ctx.machine.tools.includes("nikto")) lines.push(`  ${green("nikto")} -h <host>  Web vulnerability scanner`);
      if (ctx.machine.tools.includes("sqlmap")) lines.push(`  ${green("sqlmap")} -u <url>  SQL injection tester`);
      if (ctx.machine.tools.includes("tcpdump")) lines.push(`  ${green("tcpdump")} [-i <iface>]  Packet capture`);
      if (ctx.machine.tools.includes("smbclient")) lines.push(`  ${green("smbclient")} //host/share  SMB client`);
      lines.push("");
    }

    lines.push(`  ${green("clear")}                Clear screen`);
    lines.push(`  ${green("history")}              Command history`);
    lines.push(`  ${green("exit")}                 Exit / disconnect SSH`);
    return { output: lines };
  },

  last: () => ({ output: [
    `admin     pts/0        192.168.1.100    Mon Jan 15 08:00   still logged in`,
    `root      pts/1        45.33.32.156     Sun Jan 14 23:00 - 23:30  (00:30)`,
    `admin     pts/0        45.33.32.156     Sun Jan 14 22:00 - 22:02  (00:02)`,
    `reboot    system boot  5.15.0-91-generic Sun Jan 14 00:00   still running`,
  ]}),

  lastlog: () => ({ output: [
    `Username         Port     From             Latest`,
    `root             pts/1    45.33.32.156     Sun Jan 14 23:00:00 +0000 2024`,
    `admin            pts/0    192.168.1.100    Mon Jan 15 08:00:00 +0000 2024`,
    `user1            pts/2    192.168.1.10     Mon Jan 15 08:15:00 +0000 2024`,
    `www-data                                   **Never logged in**`,
  ]}),

  w: (_a, ctx) => ({ output: [
    ` ${new Date().toTimeString().split(" ")[0]} up 1 day, 8:00,  1 user,  load average: 0.15, 0.10, 0.05`,
    `USER     TTY      FROM             LOGIN@   IDLE   WHAT`,
    `${ctx.machine.currentUser.padEnd(8)} pts/0    192.168.1.100    08:00    0.00s  bash`,
  ]}),

  sort: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-"));
    if (!file) return { output: [] };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`sort: ${file}: No such file`)], error: true };
    const lines = (node.content || "").split("\n").sort();
    if (args.includes("-r")) lines.reverse();
    return { output: lines };
  },

  uniq: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-"));
    if (!file) return { output: [] };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`uniq: ${file}: No such file`)], error: true };
    const lines = (node.content || "").split("\n");
    return { output: lines.filter((l, i) => i === 0 || l !== lines[i - 1]) };
  },

  cut: (args) => {
    return { output: [dim("(cut output)")] };
  },

  base64: (args) => {
    if (args.includes("-d") && args[1]) {
      try { return { output: [atob(args[1])] }; } catch { return { output: [red("Invalid base64")] }; }
    }
    if (args[0]) return { output: [btoa(args[0])] };
    return { output: ["Usage: base64 [-d] <string>"] };
  },

  md5sum: (args, ctx) => {
    const file = args[0];
    if (!file) return { output: ["Usage: md5sum <file>"] };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`${file}: No such file`)], error: true };
    const hash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    return { output: [`${hash}  ${file}`] };
  },

  sha256sum: (args, ctx) => {
    const file = args[0];
    if (!file) return { output: ["Usage: sha256sum <file>"] };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`${file}: No such file`)], error: true };
    const hash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    return { output: [`${hash}  ${file}`] };
  },

  strings: (args, ctx) => {
    const file = args.find(a => !a.startsWith("-"));
    if (!file) return { output: ["Usage: strings <file>"] };
    const { node } = ctx.resolvePath(file, ctx.cwd);
    if (!node || node.type !== "file") return { output: [red(`${file}: No such file`)], error: true };
    return { output: (node.content || "").split("\n").filter(l => l.length >= 4) };
  },

  crontab: (args, ctx) => {
    if (args.includes("-l")) {
      const { node } = ctx.resolvePath("/etc/crontab", "/");
      return { output: (node?.content || "no crontab for " + ctx.machine.currentUser).split("\n") };
    }
    return { output: ["Usage: crontab [-l|-e|-r]"] };
  },

  passwd: () => ({ output: [yellow("Changing password... (simulated)"), dim("Password updated successfully")] }),
  useradd: (args) => ({ output: args[0] ? [] : [red("Usage: useradd <username>")] }),
  groupadd: (args) => ({ output: args[0] ? [] : [red("Usage: groupadd <groupname>")] }),
};

const windowsCommands: Record<string, CmdFn> = {
  dir: (args, ctx) => {
    const target = args.find(a => !a.startsWith("/")) || ".";
    const { node, absPath } = ctx.resolvePath(target, ctx.cwd);
    if (!node || node.type !== "dir") return { output: [red(` Directory not found: ${target}`)], error: true };
    const lines = [` Directory of ${absPath}`, ``];
    let fileCount = 0, dirCount = 0;
    for (const [name, child] of Object.entries(node.children || {}).sort(([a], [b]) => a.localeCompare(b))) {
      const isDir = child.type === "dir";
      const size = isDir ? "<DIR>" : String(child.content?.length || 0).padStart(10);
      const date = "01/15/2024  12:00 PM";
      lines.push(`${date}    ${isDir ? "<DIR>".padEnd(14) : size.padStart(14)} ${name}`);
      if (isDir) dirCount++; else fileCount++;
    }
    lines.push(`               ${fileCount} File(s)`);
    lines.push(`               ${dirCount} Dir(s)   ${Math.floor(Math.random() * 100 + 50)},000,000,000 bytes free`);
    return { output: lines };
  },

  cd: (args, ctx) => {
    if (!args[0]) return { output: [ctx.cwd] };
    const target = args.join(" ");
    if (target === "..") {
      const parts = ctx.cwd.split("\\").filter(Boolean);
      if (parts.length > 1) parts.pop();
      return { output: [], newCwd: parts.join("\\") };
    }
    const { node, absPath } = ctx.resolvePath(target, ctx.cwd);
    if (!node || node.type !== "dir") return { output: [red(`The system cannot find the path specified.`)], error: true };
    return { output: [], newCwd: absPath };
  },

  type: (args, ctx) => {
    if (!args[0]) return { output: [red("The syntax of the command is incorrect.")], error: true };
    const { node } = ctx.resolvePath(args.join(" "), ctx.cwd);
    if (!node) return { output: [red(`The system cannot find the file specified.`)], error: true };
    if (node.type === "dir") return { output: [red("Access is denied.")], error: true };
    return { output: (node.content || "").split("\n") };
  },

  cls: () => ({ output: [], clearScreen: true }),
  echo: (args) => ({ output: [args.join(" ")] }),
  whoami: (_a, ctx) => ({ output: [`${ctx.machine.hostname}\\${ctx.machine.currentUser}`] }),
  hostname: (_a, ctx) => ({ output: [ctx.machine.hostname] }),

  systeminfo: (_a, ctx) => ({ output: [
    `Host Name:                 ${ctx.machine.hostname}`,
    `OS Name:                   ${ctx.machine.osLabel}`,
    `OS Version:                10.0.19045 N/A Build 19045`,
    `System Type:               x64-based PC`,
    `Processor(s):              1 Processor(s) Installed.`,
    `                           [01]: Intel64 Family 6 Model 165`,
    `Total Physical Memory:     16,384 MB`,
    `Available Physical Memory: 8,192 MB`,
    `Network Card(s):           1 NIC(s) Installed.`,
    `                           [01]: Ethernet adapter`,
    `                           Connection Name: Ethernet`,
    `                           DHCP Enabled:    No`,
    `                           IP address(es):  ${ctx.machine.ip}`,
  ]}),

  ipconfig: (args, ctx) => {
    const showAll = args.includes("/all");
    const lines = [
      `Windows IP Configuration`,
      ``,
      `Ethernet adapter Ethernet:`,
      `   Connection-specific DNS Suffix  . :`,
      `   IPv4 Address. . . . . . . . . . : ${ctx.machine.ip}`,
      `   Subnet Mask . . . . . . . . . . : ${ctx.env.network.netmask}`,
      `   Default Gateway . . . . . . . . : ${ctx.env.network.gateway}`,
    ];
    if (showAll) {
      lines.push(
        `   Physical Address. . . . . . . . : ${ctx.machine.mac.replace(/:/g, "-").toUpperCase()}`,
        `   DHCP Enabled. . . . . . . . . . : No`,
        `   DNS Servers . . . . . . . . . . : ${ctx.env.network.dns}`,
      );
    }
    return { output: lines };
  },

  ping: (args, ctx) => linuxCommands.ping(args, ctx),

  netstat: (args, ctx) => {
    const lines = ["Active Connections", "", "  Proto  Local Address          Foreign Address        State"];
    for (const svc of ctx.machine.services.filter(s => s.running)) {
      lines.push(`  TCP    0.0.0.0:${svc.port}${" ".repeat(Math.max(1, 15 - String(svc.port).length))}0.0.0.0:0              LISTENING`);
    }
    return { output: lines };
  },

  tasklist: (_a, ctx) => {
    const lines = ["Image Name                     PID Session Name        Mem Usage", "========================= ======== ================ ============"];
    for (const p of ctx.machine.processes) {
      lines.push(`${p.command.split("/").pop()?.split("\\").pop()?.padEnd(25) || "process".padEnd(25)} ${String(p.pid).padStart(8)} Services          ${Math.floor(Math.random() * 50000 + 1000).toLocaleString().padStart(10)} K`);
    }
    return { output: lines };
  },

  "net": (args, ctx) => {
    if (args[0] === "user") {
      if (args[1]) {
        const u = ctx.machine.users.find(u => u.username.toLowerCase() === args[1].toLowerCase());
        if (!u) return { output: [red(`The user name could not be found.`)] };
        return { output: [
          `User name                    ${u.username}`,
          `Full Name                    ${u.username}`,
          `Account active               Yes`,
          `Local Group Memberships      *${u.groups.join("  *")}`,
          `Global Group memberships     *None`,
        ]};
      }
      const lines = [`User accounts for \\\\${ctx.machine.hostname}`, ``, `---------------------------------------`];
      for (const u of ctx.machine.users) lines.push(u.username);
      lines.push(`The command completed successfully.`);
      return { output: lines };
    }
    if (args[0] === "share") {
      const smbSvc = ctx.machine.services.find(s => s.name === "smb");
      const lines = [`Share name   Resource                        Remark`];
      lines.push(`-----------------------------------------------`);
      if (smbSvc?.smbShares) {
        for (const [name] of Object.entries(smbSvc.smbShares)) {
          lines.push(`${name.padEnd(12)} ${name === "C$" ? "C:\\" : `C:\\${name}`}`);
        }
      }
      return { output: lines };
    }
    return { output: ["The syntax of this command is:", "NET [USER | SHARE | START | STOP | LOCALGROUP]"] };
  },

  tracert: (args, ctx) => linuxCommands.traceroute(args, ctx),
  nslookup: (args, ctx) => linuxCommands.nslookup(args, ctx),
  arp: (args, ctx) => linuxCommands.arp(args, ctx),

  ver: () => ({ output: ["Microsoft Windows [Version 10.0.19045.3803]"] }),
  set: (_a, ctx) => ({ output: Object.entries(ctx.machine.env).map(([k, v]) => `${k}=${v}`) }),

  copy: (args) => {
    if (args.length < 2) return { output: [red("The syntax of the command is incorrect.")], error: true };
    return { output: ["        1 file(s) copied."] };
  },

  del: (args) => {
    if (!args[0]) return { output: [red("The syntax of the command is incorrect.")], error: true };
    return { output: [] };
  },

  mkdir: (args, ctx) => {
    if (!args[0]) return { output: [red("The syntax of the command is incorrect.")], error: true };
    const target = args.join(" ");
    const absPath = target.match(/^[A-Z]:\\/i) ? target : `${ctx.cwd}\\${target}`;
    return { output: [], modifyFs: { path: absPath, node: { type: "dir", children: {} } } };
  },

  tree: (args, ctx) => {
    const { node } = ctx.resolvePath(args[0] || ".", ctx.cwd);
    if (!node || node.type !== "dir") return { output: [red("Invalid path")], error: true };
    const lines: string[] = [ctx.cwd];
    const walk = (n: FSNode, prefix: string) => {
      const entries = Object.entries(n.children || {});
      entries.forEach(([name, child], i) => {
        const isLast = i === entries.length - 1;
        lines.push(`${prefix}${isLast ? "└──" : "├──"} ${name}`);
        if (child.type === "dir") walk(child, `${prefix}${isLast ? "    " : "│   "}`);
      });
    };
    walk(node, "");
    return { output: lines };
  },

  exit: () => ({ output: [] }),
  help: () => ({ output: [
    yellow("═══ Available Commands ═══"),
    `  ${green("dir")}              List files`,
    `  ${green("cd")} <path>        Change directory`,
    `  ${green("type")} <file>      Display file`,
    `  ${green("copy")} <src> <dst> Copy file`,
    `  ${green("del")} <file>       Delete file`,
    `  ${green("mkdir")} <dir>      Create directory`,
    `  ${green("tree")}             Show directory tree`,
    `  ${green("cls")}              Clear screen`,
    `  ${green("whoami")}           Current user`,
    `  ${green("hostname")}         Machine name`,
    `  ${green("systeminfo")}       System information`,
    `  ${green("ipconfig")} [/all]  Network config`,
    `  ${green("ping")} <host>      Test connectivity`,
    `  ${green("netstat")}          Active connections`,
    `  ${green("tracert")} <host>   Trace route`,
    `  ${green("tasklist")}         Running processes`,
    `  ${green("net user")}         User accounts`,
    `  ${green("net share")}        Shared folders`,
    `  ${green("arp")} -a           ARP table`,
    `  ${green("exit")}             Exit`,
  ]}),
};

export function executeCommand(input: string, ctx: CommandContext): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { output: [] };

  const isWindows = ctx.machine.os.includes("windows");
  const commands = isWindows ? windowsCommands : linuxCommands;

  const parts = trimmed.split(/\s+/);
  let cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (!isWindows && cmdName === "sudo" && args.length > 0) {
    return (commands["sudo"] || linuxCommands.sudo)(args, ctx);
  }

  if (isWindows && cmdName === "net" && args.length > 0) {
    return (commands["net"] || windowsCommands.net)(args, ctx);
  }

  const handler = commands[cmdName];
  if (!handler) {
    if (isWindows) {
      return { output: [red(`'${cmdName}' is not recognized as an internal or external command.`)], error: true };
    }
    return { output: [red(`${cmdName}: command not found`)], error: true };
  }

  return handler(args, ctx);
}

export function getPrompt(machine: VirtualMachine, cwd: string): { user: string; host: string; path: string; symbol: string } {
  if (machine.os.includes("windows")) {
    return { user: "", host: "", path: cwd, symbol: ">" };
  }
  const isRoot = machine.currentUser === "root";
  return {
    user: machine.currentUser,
    host: machine.hostname,
    path: cwd,
    symbol: isRoot ? "#" : "$",
  };
}

export function checkSSHAuth(machine: VirtualMachine, user: string, password: string): boolean {
  const vmUser = machine.users.find(u => u.username === user);
  return !!vmUser && vmUser.password === password;
}
