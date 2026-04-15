import { useState, useEffect } from "react";
import { Shield, ExternalLink, Award, Flame, ChevronDown, ChevronUp, Loader2, Link2, Unlink, Trophy, Target, UserPlus, Search, CheckCircle2, ArrowLeft, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface THMRoom {
  code: string;
  name: string;
  nameAr: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  tags: string[];
  isFree: boolean;
}

interface StageRooms {
  stageIndex: number;
  stageName: string;
  rooms: THMRoom[];
}

interface THMProfile {
  linked: boolean;
  username?: string;
  profile?: {
    userRank: number;
    points: number;
    streak?: number;
  };
  badges?: Array<{ name: string; description: string }>;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = {
    easy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    hard: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels = { easy: "سهل", medium: "متوسط", hard: "صعب" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${colors[difficulty as keyof typeof colors] || colors.easy}`}>
      {labels[difficulty as keyof typeof labels] || difficulty}
    </span>
  );
}

function RoomCard({ room }: { room: THMRoom }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 hover:border-red-500/30 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white truncate">{room.nameAr}</span>
            <DifficultyBadge difficulty={room.difficulty} />
          </div>
          <p className="text-xs text-muted-foreground/80 font-mono" dir="ltr">{room.name}</p>
        </div>
        {room.isFree && (
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-bold shrink-0">
            مجاني
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{room.description}</p>
      <a
        href={`https://tryhackme.com/room/${room.code}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        فتح في TryHackMe
      </a>
    </div>
  );
}

export function TryHackMePanel({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<THMProfile | null>(null);
  const [rooms, setRooms] = useState<StageRooms[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [profileRes, roomsRes] = await Promise.all([
        fetch("/api/tryhackme/profile", { credentials: "include" }),
        fetch(`/api/tryhackme/rooms/${encodeURIComponent(subjectId)}`, { credentials: "include" }),
      ]);
      if (!profileRes.ok || !roomsRes.ok) { setLoadError(true); setLoading(false); return; }
      const profileData = await profileRes.json();
      const roomsData = await roomsRes.json();
      setProfile(profileData);

      const allRooms: THMRoom[] = roomsData.rooms || [];
      const mappingRes = await fetch("/api/tryhackme/mappings", { credentials: "include" });
      if (mappingRes.ok) {
        const mappingData = await mappingRes.json();
        const subjectMapping = mappingData.mappings?.find((m: any) => m.subjectId === subjectId);
        if (subjectMapping) {
          setRooms(subjectMapping.stages);
        } else {
          setRooms([{ stageIndex: 0, stageName: "الغرف المتاحة", rooms: allRooms }]);
        }
      } else {
        setRooms([{ stageIndex: 0, stageName: "الغرف المتاحة", rooms: allRooms }]);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const extractUsername = (input: string): string => {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/tryhackme\.com\/(?:p|r)\/([a-zA-Z0-9._-]+)/);
    if (urlMatch) return urlMatch[1];
    return trimmed;
  };

  const handleLink = async () => {
    if (!linkInput.trim()) return;
    setLinking(true);
    setLinkError("");
    const username = extractUsername(linkInput);
    if (!username || username.length < 2) {
      setLinkError("اسم المستخدم غير صالح");
      setLinking(false);
      return;
    }
    try {
      const res = await fetch("/api/tryhackme/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error || "حدث خطأ");
      } else {
        setProfile({ linked: true, username: data.username, profile: data.profile });
        setLinkInput("");
      }
    } catch {
      setLinkError("خطأ في الاتصال");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    try {
      const res = await fetch("/api/tryhackme/unlink", { method: "POST", credentials: "include" });
      if (res.ok) {
        setProfile({ linked: false });
      }
    } catch {}
  };

  const toggleStage = (idx: number) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Shield className="w-10 h-10 text-red-400/50" />
        <p className="text-sm text-muted-foreground">تعذّر تحميل بيانات TryHackMe</p>
        <button
          onClick={loadData}
          className="text-xs font-bold text-red-400 hover:text-red-300 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-red-600/10 to-red-900/10 border border-red-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">TryHackMe</h3>
            <p className="text-xs text-muted-foreground">منصة التدريب العملي على الأمن السيبراني</p>
          </div>
        </div>

        {profile?.linked ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{profile.username}</span>
              </div>
              <button
                onClick={handleUnlink}
                className="text-[11px] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Unlink className="w-3 h-3" />
                إلغاء الربط
              </button>
            </div>
            {profile.profile && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/20 rounded-lg p-2.5 text-center border border-white/5">
                  <Trophy className="w-4 h-4 text-gold mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{profile.profile.userRank || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">الترتيب</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5 text-center border border-white/5">
                  <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{profile.profile.points || 0}</div>
                  <div className="text-[10px] text-muted-foreground">النقاط</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5 text-center border border-white/5">
                  <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{profile.profile.streak || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Streak</div>
                </div>
              </div>
            )}
            {profile.badges && profile.badges.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                  <Award className="w-3 h-3" /> الشارات ({profile.badges.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.badges.slice(0, 8).map((b, i) => (
                    <span key={i} className="text-[10px] bg-gold/10 text-gold border border-gold/20 rounded-full px-2 py-0.5">
                      {b.name}
                    </span>
                  ))}
                  {profile.badges.length > 8 && (
                    <span className="text-[10px] text-muted-foreground">+{profile.badges.length - 8}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-bold text-white">كيف أربط حسابي؟</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex gap-3 items-start bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-black text-red-400">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white mb-1">أنشئ حساباً مجانياً في TryHackMe</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                      اذهب إلى موقع TryHackMe وسجّل حساباً جديداً مجاناً. يمكنك التسجيل بالبريد الإلكتروني أو حساب Google.
                    </p>
                    <a
                      href="https://tryhackme.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      إنشاء حساب TryHackMe
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-black text-red-400">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white mb-1">انسخ اسم المستخدم أو رابط ملفك الشخصي</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      بعد التسجيل، اذهب إلى ملفك الشخصي. يمكنك نسخ اسم المستخدم أو الرابط كاملاً — النظام يستخرج الاسم تلقائياً:
                    </p>
                    <div className="mt-1.5 bg-black/40 rounded-lg px-3 py-1.5 border border-white/5 space-y-1">
                      <p className="text-[10px] text-muted-foreground/70 font-mono" dir="ltr">tryhackme.com/p/<span className="text-red-400 font-bold">username</span></p>
                      <p className="text-[10px] text-muted-foreground/50">أو فقط: <span className="text-red-400 font-bold font-mono">username</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-black text-red-400">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white mb-1">الصق اسم المستخدم هنا</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                      أدخل اسم المستخدم في الحقل أدناه واضغط "ربط". سيتحقق النظام تلقائياً من صحة الحساب.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-red-400" />
                ربط الحساب
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={e => { setLinkInput(e.target.value); setLinkError(""); }}
                  placeholder="ahmed123 أو رابط الملف الشخصي"
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none focus:border-red-500/40 font-mono"
                  dir="ltr"
                  onKeyDown={e => e.key === "Enter" && handleLink()}
                />
                <button
                  onClick={handleLink}
                  disabled={linking || !linkInput.trim()}
                  className="px-5 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Link2 className="w-3.5 h-3.5" /> ربط</>}
                </button>
              </div>
              {linkError && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400">{linkError}</p>
                </div>
              )}
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
              <p className="text-[11px] text-emerald-400/80 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>بعد الربط، سيتمكن المعلم الذكي من رؤية تقدمك ونقاطك وترتيبك في TryHackMe، وسيوصيك بالغرف التدريبية المناسبة لمستواك.</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <div className="w-1.5 h-5 bg-red-500 rounded-full" />
          الغرف التدريبية حسب المرحلة
        </h4>

        {rooms.map(stage => (
          <div key={stage.stageIndex} className="border border-white/8 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStage(stage.stageIndex)}
              className="w-full text-right px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-xs font-bold text-red-400">
                  {stage.stageIndex + 1}
                </span>
                <span className="text-sm font-medium">{stage.stageName}</span>
                <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                  {stage.rooms.length} غرف
                </span>
              </div>
              {expandedStages.has(stage.stageIndex)
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </button>
            <AnimatePresence>
              {expandedStages.has(stage.stageIndex) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2.5 border-t border-white/5 pt-3">
                    {stage.rooms.map(room => (
                      <RoomCard key={room.code} room={room} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
