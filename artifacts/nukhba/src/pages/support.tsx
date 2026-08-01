import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Send, ShieldCheck, Loader2, MessageSquareDot,
  ChevronDown, CheckCheck, Sparkles,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";

interface SupportMessage {
  id: number;
  userId: number;
  userName: string | null;
  subject: string;
  message: string;
  isFromAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

function formatDate(d: string, lang: string, tr: any) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return tr.support.timeNow;
  if (diffMins < 60) return tr.support.timeMinutes.replace("{n}", String(diffMins));
  if (diffHours < 24) return tr.support.timeHours.replace("{n}", String(diffHours));
  if (diffDays < 7) return tr.support.timeDays.replace("{n}", String(diffDays));
  return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    day: "numeric", month: "short",
  });
}

export default function Support() {
  const { tr, lang } = useLang();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === "ar";

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/support/my-messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    fetch("/api/support/mark-read", { method: "POST", credentials: "include" }).catch(() => {});
    const interval = setInterval(() => {
      fetchMessages();
      fetch("/api/support/mark-read", { method: "POST", credentials: "include" }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (showCompose) {
      composeRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [showCompose]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ variant: "destructive", title: tr.support.toastErrTitle, description: tr.support.toastErrEmpty });
      return;
    }
    setSending(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        toast({ title: tr.support.toastSentTitle, description: tr.support.toastSentDesc, className: "bg-emerald-600 border-none text-white" });
        setMessage("");
        setSubject("");
        setShowCompose(false);
        fetchMessages();
      } else {
        toast({ variant: "destructive", title: tr.support.toastFailTitle, description: tr.support.toastFailDesc });
      }
    } catch {
      clearTimeout(timeout);
      toast({ variant: "destructive", title: tr.support.toastErrTitle, description: tr.support.toastErrGeneric });
    } finally {
      setSending(false);
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group consecutive messages by sender
  const grouped = sortedMessages.map((msg, i) => {
    const prev = sortedMessages[i - 1];
    const next = sortedMessages[i + 1];
    const isFirst = !prev || prev.isFromAdmin !== msg.isFromAdmin;
    const isLast = !next || next.isFromAdmin !== msg.isFromAdmin;
    return { ...msg, isFirst, isLast };
  });

  return (
    <AppLayout>
      <div className="min-h-[calc(100dvh-64px)] flex flex-col" dir={isRtl ? "rtl" : "ltr"}>

        {/* ── Header ────────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-20 border-b border-white/6"
          style={{ background: "rgba(10,13,22,0.92)", backdropFilter: "blur(16px)" }}
        >
          <div className="container mx-auto px-4 max-w-2xl py-3 flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0d16]" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-none mb-1">
                {tr.support.admin}
              </p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {isRtl ? "متاح للرد" : "Available"}
              </p>
            </div>
            {/* New message button */}
            <Button
              size="sm"
              onClick={() => setShowCompose(v => !v)}
              className={`text-xs h-8 px-3 rounded-lg font-bold gap-1.5 transition-all ${
                showCompose
                  ? "bg-white/8 text-foreground border border-white/10 hover:bg-white/12"
                  : "gradient-gold text-primary-foreground shadow-lg shadow-gold/20"
              }`}
            >
              {showCompose ? (
                <><ChevronDown className="w-3.5 h-3.5" />{isRtl ? "إخفاء" : "Hide"}</>
              ) : (
                <><MessageSquareDot className="w-3.5 h-3.5" />{isRtl ? "رسالة جديدة" : "New message"}</>
              )}
            </Button>
          </div>
        </div>

        {/* ── Messages area ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 max-w-2xl py-6">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-gold/50" />
                <span className="text-sm">{tr.support.loading}</span>
              </div>
            ) : grouped.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gold/5 border border-gold/15 flex items-center justify-center mb-2">
                  <Sparkles className="w-9 h-9 text-gold/60" />
                </div>
                <div>
                  <p className="font-black text-lg mb-1.5">{tr.support.emptyTitle}</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {tr.support.emptyDesc}
                  </p>
                </div>
                <Button
                  onClick={() => setShowCompose(true)}
                  className="gradient-gold text-primary-foreground font-bold h-10 px-6 rounded-xl shadow-lg shadow-gold/20 mt-2"
                >
                  <Send className="w-4 h-4 me-2" />
                  {tr.support.sendBtn}
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {grouped.map((msg, idx) => {
                  const isAdmin = msg.isFromAdmin;
                  const showAvatar = isAdmin && msg.isLast;
                  const showTimestamp = msg.isLast;

                  return (
                    <div key={msg.id}>
                      {/* Date separator — show if first msg of day */}
                      {(idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(grouped[idx - 1].createdAt).toDateString()) && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-white/6" />
                          <span className="text-[10px] text-muted-foreground/60 px-2">
                            {new Date(msg.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                              weekday: "long", day: "numeric", month: "long"
                            })}
                          </span>
                          <div className="flex-1 h-px bg-white/6" />
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isAdmin ? "justify-start" : "justify-end"} ${msg.isFirst ? "mt-3" : "mt-0.5"}`}>
                        {/* Admin avatar placeholder for alignment */}
                        {isAdmin && (
                          <div className={`w-7 h-7 flex-shrink-0 ${showAvatar ? "" : "opacity-0 pointer-events-none"}`}>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`max-w-[78%] group ${isAdmin ? "" : ""}`}>
                          {/* Subject pill — only on first message of a new subject */}
                          {msg.isFirst && msg.subject && (
                            <div className={`mb-1.5 ${isAdmin ? "ms-1" : "me-1 text-end"}`}>
                              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isAdmin
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-gold/10 text-gold border border-gold/20"
                              }`}>
                                {msg.subject}
                              </span>
                            </div>
                          )}

                          <div className={`relative px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isAdmin
                              ? `bg-white/5 border border-white/8 text-foreground ${
                                  msg.isFirst && msg.isLast ? "rounded-2xl" :
                                  msg.isFirst ? "rounded-2xl rounded-es-sm" :
                                  msg.isLast ? "rounded-2xl rounded-ss-sm" :
                                  "rounded-lg rounded-s-sm"
                                }`
                              : `bg-gold/15 border border-gold/20 text-foreground ${
                                  msg.isFirst && msg.isLast ? "rounded-2xl" :
                                  msg.isFirst ? "rounded-2xl rounded-ee-sm" :
                                  msg.isLast ? "rounded-2xl rounded-se-sm" :
                                  "rounded-lg rounded-e-sm"
                                }`
                          }`}>
                            {msg.message}
                          </div>

                          {/* Timestamp */}
                          {showTimestamp && (
                            <div className={`flex items-center gap-1 mt-1 ${isAdmin ? "ms-1 justify-start" : "me-1 justify-end"}`}>
                              <span className="text-[10px] text-muted-foreground/50">
                                {formatDate(msg.createdAt, lang, tr)}
                              </span>
                              {!isAdmin && (
                                <CheckCheck className={`w-3 h-3 ${msg.isRead ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Outgoing avatar spacer */}
                        {!isAdmin && <div className="w-0" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}

            {/* ── Compose box ─────────────────────────────────── */}
            {showCompose && (
              <div
                ref={composeRef}
                className="mt-6 rounded-2xl border border-gold/15 overflow-hidden"
                style={{ background: "rgba(10,13,22,0.8)", backdropFilter: "blur(12px)" }}
              >
                {/* Compose header */}
                <div className="px-4 py-3 border-b border-white/6 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-gold" />
                  <span className="text-sm font-bold">{tr.support.formTitle}</span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Subject */}
                  <Input
                    placeholder={tr.support.subjectPlaceholder}
                    dir={isRtl ? "rtl" : "ltr"}
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="bg-white/4 border-white/8 h-10 text-sm focus:border-gold/40 focus:ring-0 rounded-xl placeholder:text-muted-foreground/40"
                  />

                  {/* Message */}
                  <Textarea
                    placeholder={tr.support.messagePlaceholder}
                    dir={isRtl ? "rtl" : "ltr"}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    className="bg-white/4 border-white/8 text-sm focus:border-gold/40 focus:ring-0 rounded-xl resize-none placeholder:text-muted-foreground/40"
                  />

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-muted-foreground/50">
                      {isRtl ? "يصل للمشرف مباشرةً" : "Sent directly to admin"}
                    </span>
                    <Button
                      onClick={handleSend}
                      disabled={!subject.trim() || !message.trim() || sending}
                      className="gradient-gold text-primary-foreground font-bold h-9 px-5 rounded-xl shadow-lg shadow-gold/20 text-sm gap-2 disabled:opacity-40"
                    >
                      {sending ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />{tr.support.sendingBtn}</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" />{tr.support.sendBtn}</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-8" />
          </div>
        </div>

        {/* ── Sticky bottom bar (when no compose panel) ───────── */}
        {!showCompose && !loading && (
          <div
            className="sticky bottom-0 z-10 border-t border-white/6"
            style={{ background: "rgba(10,13,22,0.9)", backdropFilter: "blur(16px)" }}
          >
            <div className="container mx-auto px-4 max-w-2xl py-3">
              <button
                onClick={() => setShowCompose(true)}
                dir={isRtl ? "rtl" : "ltr"}
                className="w-full flex items-center gap-3 px-4 h-11 rounded-xl bg-white/4 border border-white/8 hover:border-gold/30 hover:bg-white/6 transition-all text-sm text-muted-foreground/60 hover:text-muted-foreground cursor-text"
              >
                <Send className="w-4 h-4 flex-shrink-0 text-gold/50" />
                <span>{tr.support.messagePlaceholder}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
