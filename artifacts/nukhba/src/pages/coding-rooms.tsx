import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Code2, Globe, Lock, Clock, ChevronLeft, RefreshCw, LogIn, XCircle, Search, UserCircle2 } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

type Room = {
  id: number;
  title: string;
  description: string;
  languages: string[];
  invite_type: "public" | "private";
  host_user_id: number;
  host_name: string;
  status: string;
  created_at: string;
  onlineCount: number;
};

type HistoryRoom = {
  id: number;
  title: string;
  languages: string[];
  host_user_id: number;
  host_name: string;
  closed_at: string | null;
  created_at: string;
  participants: { userId: number; name: string }[] | null;
};

const LANG_COLORS: Record<string, string> = {
  javascript: "#F59E0B",
  typescript: "#3B82F6",
  python: "#10B981",
  html: "#EF4444",
  css: "#8B5CF6",
  rust: "#F97316",
  go: "#06B6D4",
  java: "#F43F5E",
  cpp: "#EC4899",
  php: "#6366F1",
  default: "#94A3B8",
};

function getLangColor(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] ?? LANG_COLORS.default;
}

function LangPill({ lang }: { lang: string }) {
  const color = getLangColor(lang);
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: `${color}20`,
        border: `1px solid ${color}50`,
        color,
      }}
    >
      {lang}
    </span>
  );
}

function RoomCard({
  room, onJoin, onClose, userId,
}: {
  room: Room;
  onJoin: (id: number) => void;
  onClose: (id: number) => void;
  userId: number | null;
}) {
  const [, navigate] = useLocation();
  const [closing, setClosing] = useState(false);
  const isOwner = !!userId && room.host_user_id === userId;

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (diff < 1) return "الآن";
    if (diff < 60) return `${Math.floor(diff)} دقيقة`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ساعة`;
    return `${Math.floor(diff / 1440)} يوم`;
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من إنهاء الغرفة؟ سيتم فصل جميع المشاركين.")) return;
    setClosing(true);
    try {
      const r = await fetch(`/api/coding-rooms/${room.id}/close`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (r.ok) {
        onClose(room.id);
      } else {
        alert(d.error ?? "فشل إغلاق الغرفة");
      }
    } catch {
      alert("خطأ في الشبكة");
    } finally {
      setClosing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="relative rounded-2xl p-5 cursor-pointer group overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(16,22,40,0.95) 0%, rgba(10,15,30,0.98) 100%)",
        border: "1px solid rgba(16,185,129,0.15)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top left, rgba(16,185,129,0.06) 0%, transparent 70%)" }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm text-white truncate">{room.title}</h3>
            {room.invite_type === "public" ? (
              <Globe className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} />
            ) : (
              <Lock className="w-3 h-3 shrink-0" style={{ color: "#F59E0B" }} />
            )}
          </div>
          {room.description && (
            <p className="text-xs text-white/40 truncate">{room.description}</p>
          )}
        </div>
        <div
          className="flex items-center gap-1 text-[10px] font-bold shrink-0 px-2 py-1 rounded-full"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {room.onlineCount}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {room.languages.slice(0, 4).map((l) => <LangPill key={l} lang={l} />)}
        {room.languages.length > 4 && (
          <span className="text-[10px] text-white/30">+{room.languages.length - 4}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-white/35 min-w-0">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{timeAgo(room.created_at)}</span>
          <span className="mx-1 opacity-40">•</span>
          <UserCircle2 className="w-3 h-3 shrink-0 text-emerald-500/60" />
          <span className="text-emerald-400/70 font-semibold truncate">{room.host_name}</span>
        </div>
        {isOwner ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate(`/coding-room/${room.id}`)}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))",
                border: "1px solid rgba(16,185,129,0.4)",
                color: "#10B981",
              }}
            >
              <LogIn className="w-3 h-3" />
              ادخل كمشرف
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleClose}
              disabled={closing}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#F87171",
              }}
            >
              <XCircle className="w-3 h-3" />
              {closing ? "..." : "إنهاء"}
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onJoin(room.id)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#10B981",
            }}
          >
            انضم
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function HistoryCard({ room, onReopen }: { room: HistoryRoom; onReopen: (id: number) => void }) {
  const { user } = useAuth();
  const isHost = user && room.host_user_id === (user as any).id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/80 truncate">{room.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {room.languages.slice(0, 3).map((l) => <LangPill key={l} lang={l} />)}
        </div>
        {room.participants && room.participants.length > 0 && (
          <p className="text-[10px] text-white/30 mt-1">
            {room.participants.slice(0, 3).map((p) => p.name).join("، ")}
            {room.participants.length > 3 && ` +${room.participants.length - 3}`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {room.closed_at && (
          <span className="text-[10px] text-white/25">
            {new Date(room.closed_at).toLocaleDateString("ar-YE")}
          </span>
        )}
        {isHost && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onReopen(room.id)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#F59E0B",
            }}
          >
            <RefreshCw className="w-3 h-3" />
            أعد الفتح
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const inviteType = "public";
  const [langInput, setLangInput] = useState("");
  const [languages, setLanguages] = useState<string[]>(["javascript"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addLang = () => {
    const l = langInput.trim().toLowerCase();
    if (l && !languages.includes(l)) setLanguages([...languages, l]);
    setLangInput("");
  };

  const removeLang = (l: string) => setLanguages(languages.filter((x) => x !== l));

  const handleSubmit = async () => {
    if (!title.trim()) { setError("العنوان مطلوب"); return; }
    if (languages.length === 0) { setError("اختر لغة واحدة على الأقل"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/coding-rooms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), languages, inviteType }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "فشل الإنشاء"); return; }
      onCreated(d.roomId);
    } catch {
      setError("خطأ في الشبكة");
    } finally {
      setLoading(false);
    }
  };

  const POPULAR_LANGS = ["javascript", "typescript", "python", "html", "css", "java", "cpp", "rust", "go", "php"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        style={{
          background: "linear-gradient(135deg, rgba(8,12,22,0.99) 0%, rgba(5,8,18,1) 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
          boxShadow: "0 0 60px rgba(16,185,129,0.1), 0 20px 60px rgba(0,0,0,0.6)",
        }}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-white">إنشاء غرفة برمجة</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">عنوان الغرفة *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثل: حل مشاريع JavaScript"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">وصف مختصر (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ما الذي ستعملون عليه؟"
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">اللغات</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {languages.map((l) => (
                <span
                  key={l}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-70 transition-opacity"
                  style={{ background: `${getLangColor(l)}20`, border: `1px solid ${getLangColor(l)}50`, color: getLangColor(l) }}
                  onClick={() => removeLang(l)}
                >
                  {l} ✕
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLang()}
                placeholder="اكتب لغة..."
                className="flex-1 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={addLang}
                className="px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
              >
                أضف
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {POPULAR_LANGS.filter((l) => !languages.includes(l)).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguages([...languages, l])}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
                >
                  + {l}
                </button>
              ))}
            </div>
          </div>


          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #10B981, #059669)",
              color: "white",
              boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
            }}
          >
            {loading ? "جاري الإنشاء..." : "🚀 إنشاء الغرفة"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CodingRooms() {
  const { user } = useAuth();
  const userId = (user as any)?.id ?? null;
  const [, navigate] = useLocation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<HistoryRoom[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/coding-rooms", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/coding-rooms/my-history", { credentials: "include" }).then((r) => r.json()),
      ]);
      setRooms(r1.rooms ?? []);
      setHistory(r2.history ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleJoin = async (roomId: number) => {
    try {
      const r = await fetch(`/api/coding-rooms/${roomId}/request-join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.status === "already_joined") {
        navigate(`/coding-room/${roomId}`);
      } else if (d.status === "waiting") {
        navigate(`/coding-room/${roomId}?waiting=1`);
      } else if (!r.ok) {
        alert(d.error ?? "فشل الطلب");
      }
    } catch {
      alert("خطأ في الشبكة");
    }
  };

  const handleReopen = async (roomId: number) => {
    try {
      const r = await fetch(`/api/coding-rooms/${roomId}/reopen`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (r.ok) {
        navigate(`/coding-room/${d.newRoomId}`);
      } else {
        alert(d.error ?? "فشل إعادة الفتح");
      }
    } catch {
      alert("خطأ في الشبكة");
    }
  };

  const handleCloseRoom = (roomId: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen"
        dir="rtl"
        style={{
          background: "radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.06) 0%, transparent 50%), hsl(222,28%,7%)",
        }}
      >
        <div className="container mx-auto px-4 py-8 max-w-5xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/learn">
                  <span className="text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 text-sm">
                    <ChevronLeft className="w-4 h-4" /> العودة
                  </span>
                </Link>
              </div>
              <h1
                className="text-3xl font-black"
                style={{
                  background: "linear-gradient(135deg, #10B981, #34D399)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                غرف البرمجة
              </h1>
              <p className="text-sm text-white/40 mt-1">تعاون مع زملائك في بيئة برمجة حية</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))",
                border: "1px solid rgba(16,185,129,0.4)",
                color: "#10B981",
                boxShadow: "0 0 20px rgba(16,185,129,0.15)",
              }}
            >
              <Plus className="w-4 h-4" />
              غرفة جديدة
            </motion.button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "غرف نشطة", value: rooms.length, icon: "💻", color: "#10B981" },
              { label: "متصلون الآن", value: rooms.reduce((s, r) => s + r.onlineCount, 0), icon: "👥", color: "#3B82F6" },
              { label: "جلساتي", value: history.length, icon: "📁", color: "#F59E0B" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 text-center"
                style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[11px] text-white/30">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="flex gap-1 p-1 rounded-xl w-fit shrink-0" style={{ background: "rgba(255,255,255,0.03)" }}>
              {[
                { key: "active", label: "الغرف النشطة", icon: <Code2 className="w-3.5 h-3.5" /> },
                { key: "history", label: "سجلّ جلساتي", icon: <Clock className="w-3.5 h-3.5" /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: tab === t.key ? "rgba(16,185,129,0.15)" : "transparent",
                    border: tab === t.key ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                    color: tab === t.key ? "#10B981" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "active" && (
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث باسم الغرفة…"
                  className="w-full rounded-xl pr-9 pl-4 py-2 text-sm text-white placeholder:text-white/20 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : tab === "active" ? (
            <AnimatePresence>
              {rooms.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24"
                >
                  <div className="text-6xl mb-4">🔭</div>
                  <p className="text-white/40 text-sm mb-6">لا توجد غرف نشطة الآن</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowCreate(true)}
                    className="px-6 py-3 rounded-xl font-bold text-sm"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.35)",
                      color: "#10B981",
                    }}
                  >
                    ابدأ أول غرفة
                  </motion.button>
                </motion.div>
              ) : (() => {
                const q = search.trim().toLowerCase();
                const filtered = q ? rooms.filter((r) => r.title.toLowerCase().includes(q) || r.host_name.toLowerCase().includes(q)) : rooms;
                return filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                    <Search className="w-10 h-10 mx-auto mb-3 text-white/10" />
                    <p className="text-white/35 text-sm">لا توجد نتائج لـ «{search}»</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((room) => (
                      <RoomCard key={room.id} room={room} onJoin={handleJoin} onClose={handleCloseRoom} userId={userId} />
                    ))}
                  </div>
                );
              })()}
            </AnimatePresence>
          ) : (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-24">
                  <div className="text-5xl mb-4">📂</div>
                  <p className="text-white/30 text-sm">لا توجد جلسات سابقة</p>
                </div>
              ) : (
                history.map((room) => (
                  <HistoryCard key={room.id} room={room} onReopen={handleReopen} />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreated={(id) => {
              setShowCreate(false);
              navigate(`/coding-room/${id}`);
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
