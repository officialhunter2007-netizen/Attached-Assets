import { useState } from "react";
import { Share2, Play, Filter } from "lucide-react";

interface Packet {
  id: number;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  length: number;
  info: string;
  flags?: string;
  payload?: string;
  suspicious?: boolean;
}

const CAPTURES: Record<string, { name: string; desc: string; packets: Packet[] }> = {
  normal: {
    name: "حركة مرور عادية",
    desc: "تصفح ويب طبيعي مع DNS و HTTP",
    packets: [
      { id: 1, time: "0.000000", src: "192.168.1.50", dst: "8.8.8.8", protocol: "DNS", length: 74, info: "Standard query A www.example.com" },
      { id: 2, time: "0.023451", src: "8.8.8.8", dst: "192.168.1.50", protocol: "DNS", length: 90, info: "Standard query response A 93.184.216.34" },
      { id: 3, time: "0.024102", src: "192.168.1.50", dst: "93.184.216.34", protocol: "TCP", length: 66, info: "SYN [Seq=0] Win=64240", flags: "SYN" },
      { id: 4, time: "0.045231", src: "93.184.216.34", dst: "192.168.1.50", protocol: "TCP", length: 66, info: "SYN,ACK [Seq=0 Ack=1] Win=65535", flags: "SYN,ACK" },
      { id: 5, time: "0.045312", src: "192.168.1.50", dst: "93.184.216.34", protocol: "TCP", length: 54, info: "ACK [Seq=1 Ack=1] Win=64240", flags: "ACK" },
      { id: 6, time: "0.045890", src: "192.168.1.50", dst: "93.184.216.34", protocol: "HTTP", length: 350, info: 'GET / HTTP/1.1 Host: www.example.com' },
      { id: 7, time: "0.067123", src: "93.184.216.34", dst: "192.168.1.50", protocol: "HTTP", length: 1256, info: "HTTP/1.1 200 OK (text/html)" },
      { id: 8, time: "0.067456", src: "192.168.1.50", dst: "93.184.216.34", protocol: "TCP", length: 54, info: "ACK [Seq=297 Ack=1203]", flags: "ACK" },
    ]
  },
  bruteforce: {
    name: "هجوم Brute Force SSH",
    desc: "محاولات تسجيل دخول متكررة على SSH من عنوان مشبوه",
    packets: [
      { id: 1, time: "0.000000", src: "10.0.0.99", dst: "192.168.1.100", protocol: "TCP", length: 66, info: "SYN → Port 22 [SSH]", flags: "SYN", suspicious: true },
      { id: 2, time: "0.001234", src: "192.168.1.100", dst: "10.0.0.99", protocol: "TCP", length: 66, info: "SYN,ACK Port 22", flags: "SYN,ACK" },
      { id: 3, time: "0.002100", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 150, info: "Client: SSH-2.0-libssh2_1.10.0", suspicious: true },
      { id: 4, time: "0.003200", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 200, info: "Auth attempt: root / password123", suspicious: true, payload: "Failed authentication" },
      { id: 5, time: "0.504100", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 200, info: "Auth attempt: root / admin", suspicious: true, payload: "Failed authentication" },
      { id: 6, time: "1.005300", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 200, info: "Auth attempt: root / toor", suspicious: true, payload: "Failed authentication" },
      { id: 7, time: "1.506700", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 200, info: "Auth attempt: root / root", suspicious: true, payload: "Failed authentication" },
      { id: 8, time: "2.008100", src: "10.0.0.99", dst: "192.168.1.100", protocol: "SSH", length: 200, info: "Auth attempt: admin / admin123", suspicious: true, payload: "Authentication successful!", },
      { id: 9, time: "2.010000", src: "192.168.1.100", dst: "10.0.0.99", protocol: "SSH", length: 100, info: "Session established - Shell opened", suspicious: true },
    ]
  },
  portscan: {
    name: "مسح منافذ Nmap",
    desc: "SYN Scan على خادم لاكتشاف المنافذ المفتوحة",
    packets: [
      { id: 1, time: "0.000000", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 58, info: "SYN → Port 21 [FTP]", flags: "SYN", suspicious: true },
      { id: 2, time: "0.000100", src: "192.168.1.100", dst: "10.0.0.50", protocol: "TCP", length: 54, info: "RST,ACK ← Port 21 [CLOSED]", flags: "RST,ACK" },
      { id: 3, time: "0.000200", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 58, info: "SYN → Port 22 [SSH]", flags: "SYN", suspicious: true },
      { id: 4, time: "0.000350", src: "192.168.1.100", dst: "10.0.0.50", protocol: "TCP", length: 58, info: "SYN,ACK ← Port 22 [OPEN]", flags: "SYN,ACK" },
      { id: 5, time: "0.000400", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 54, info: "RST → Port 22 [Scan complete]", flags: "RST", suspicious: true },
      { id: 6, time: "0.000500", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 58, info: "SYN → Port 80 [HTTP]", flags: "SYN", suspicious: true },
      { id: 7, time: "0.000650", src: "192.168.1.100", dst: "10.0.0.50", protocol: "TCP", length: 58, info: "SYN,ACK ← Port 80 [OPEN]", flags: "SYN,ACK" },
      { id: 8, time: "0.000700", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 58, info: "SYN → Port 443 [HTTPS]", flags: "SYN", suspicious: true },
      { id: 9, time: "0.000850", src: "192.168.1.100", dst: "10.0.0.50", protocol: "TCP", length: 58, info: "SYN,ACK ← Port 443 [OPEN]", flags: "SYN,ACK" },
      { id: 10, time: "0.000900", src: "10.0.0.50", dst: "192.168.1.100", protocol: "TCP", length: 58, info: "SYN → Port 3306 [MySQL]", flags: "SYN", suspicious: true },
      { id: 11, time: "0.001050", src: "192.168.1.100", dst: "10.0.0.50", protocol: "TCP", length: 58, info: "SYN,ACK ← Port 3306 [OPEN]", flags: "SYN,ACK" },
    ]
  },
  dns_exfil: {
    name: "تسريب بيانات عبر DNS",
    desc: "DNS Exfiltration — بيانات مشبوهة مرمّزة في استعلامات DNS",
    packets: [
      { id: 1, time: "0.000000", src: "192.168.1.50", dst: "10.0.0.200", protocol: "DNS", length: 120, info: "Query: Y29uZmlkZW50aWFs.evil-server.com", suspicious: true },
      { id: 2, time: "0.050000", src: "10.0.0.200", dst: "192.168.1.50", protocol: "DNS", length: 90, info: "Response: NXDOMAIN" },
      { id: 3, time: "0.100000", src: "192.168.1.50", dst: "10.0.0.200", protocol: "DNS", length: 130, info: "Query: cGFzc3dvcmQ9YWRtaW4=.evil-server.com", suspicious: true },
      { id: 4, time: "0.150000", src: "10.0.0.200", dst: "192.168.1.50", protocol: "DNS", length: 90, info: "Response: NXDOMAIN" },
      { id: 5, time: "0.200000", src: "192.168.1.50", dst: "10.0.0.200", protocol: "DNS", length: 140, info: "Query: c2VjcmV0X2RhdGE=.evil-server.com", suspicious: true },
      { id: 6, time: "0.250000", src: "192.168.1.50", dst: "8.8.8.8", protocol: "DNS", length: 74, info: "Query: www.google.com (legitimate)" },
      { id: 7, time: "0.300000", src: "192.168.1.50", dst: "10.0.0.200", protocol: "DNS", length: 150, info: "Query: ZGF0YWJhc2VfZHVtcA==.evil-server.com", suspicious: true },
    ]
  },
};

const protoColors: Record<string, string> = {
  TCP: "text-blue-400",
  HTTP: "text-emerald-400",
  DNS: "text-amber-400",
  SSH: "text-purple-400",
  HTTPS: "text-cyan-400",
};

export default function PacketLab({ onShare }: { onShare: (c: string) => void }) {
  const [capture, setCapture] = useState<string>("normal");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Packet | null>(null);

  const data = CAPTURES[capture];
  const filtered = data.packets.filter(p => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return p.src.includes(f) || p.dst.includes(f) || p.protocol.toLowerCase().includes(f) || p.info.toLowerCase().includes(f);
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      <div className="shrink-0 p-3 border-b border-white/5 space-y-2 bg-[#0d1119]">
        <div className="flex flex-wrap gap-2">
          {Object.entries(CAPTURES).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { setCapture(key); setSelected(null); setFilter(""); }}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                capture === key ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "border-white/8 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="فلترة: IP, بروتوكول, أو كلمة..."
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/40"
            dir="ltr"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{data.desc} — {filtered.length} حزمة</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[30px_80px_120px_120px_50px_50px_1fr] text-[10px] font-bold text-muted-foreground border-b border-white/5 px-2 py-1.5 bg-white/3 sticky top-0">
          <span>#</span><span>الوقت</span><span>المصدر</span><span>الوجهة</span><span>بروتوكول</span><span>الحجم</span><span>المعلومات</span>
        </div>
        {filtered.map(p => (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            className={`grid grid-cols-[30px_80px_120px_120px_50px_50px_1fr] text-[11px] px-2 py-1.5 border-b border-white/3 cursor-pointer transition-colors ${
              selected?.id === p.id ? "bg-cyan-500/10" : p.suspicious ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-white/3"
            }`}
          >
            <span className="text-muted-foreground/50 font-mono">{p.id}</span>
            <span className="font-mono text-muted-foreground/70">{p.time}</span>
            <span className={`font-mono ${p.suspicious ? "text-red-400" : "text-white"}`}>{p.src}</span>
            <span className="font-mono text-white">{p.dst}</span>
            <span className={`font-bold ${protoColors[p.protocol] || "text-white"}`}>{p.protocol}</span>
            <span className="text-muted-foreground font-mono">{p.length}</span>
            <span className={`truncate ${p.suspicious ? "text-red-300" : "text-muted-foreground"}`}>{p.info}</span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="shrink-0 border-t border-white/5 bg-[#0d1119] p-3 max-h-[180px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-cyan-400">تفاصيل الحزمة #{selected.id}</p>
            <button
              onClick={() => onShare(`تحليل حزمة #${selected.id}\n${selected.src} → ${selected.dst}\nبروتوكول: ${selected.protocol}\n${selected.info}\n${selected.suspicious ? "⚠ حزمة مشبوهة!" : ""}\n${selected.payload || ""}`)}
              className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" /> مشاركة
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-muted-foreground">المصدر:</span> <span className="font-mono text-white">{selected.src}</span></div>
            <div><span className="text-muted-foreground">الوجهة:</span> <span className="font-mono text-white">{selected.dst}</span></div>
            <div><span className="text-muted-foreground">بروتوكول:</span> <span className={`font-bold ${protoColors[selected.protocol] || ""}`}>{selected.protocol}</span></div>
            <div><span className="text-muted-foreground">الحجم:</span> <span className="font-mono text-white">{selected.length} bytes</span></div>
            {selected.flags && <div><span className="text-muted-foreground">الأعلام:</span> <span className="font-mono text-amber-400">[{selected.flags}]</span></div>}
            {selected.suspicious && <div className="col-span-2 text-red-400 font-bold">⚠ حزمة مشبوهة — تحتاج تحقيق</div>}
            {selected.payload && <div className="col-span-2"><span className="text-muted-foreground">البيانات:</span> <span className="font-mono text-white">{selected.payload}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
