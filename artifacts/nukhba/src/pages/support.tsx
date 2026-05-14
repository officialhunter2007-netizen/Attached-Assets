import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, ShieldCheck, Clock, CheckCircle2, HelpCircle, Inbox } from "lucide-react";
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

export default function Support() {
  const { tr, lang } = useLang();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ variant: "destructive", title: tr.support.toastErrTitle, description: tr.support.toastErrEmpty });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (res.ok) {
        toast({ title: tr.support.toastSentTitle, description: tr.support.toastSentDesc, className: "bg-emerald-600 border-none text-white" });
        setMessage("");
        fetchMessages();
      } else {
        toast({ variant: "destructive", title: tr.support.toastFailTitle, description: tr.support.toastFailDesc });
      }
    } catch {
      toast({ variant: "destructive", title: tr.support.toastErrTitle, description: tr.support.toastErrGeneric });
    }
    setSending(false);
  };

  const formatDate = (d: string) => {
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
    return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US");
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-3xl font-black mb-2">{tr.support.title}</h1>
          <p className="text-muted-foreground">{tr.support.desc}</p>
        </div>

        <div className="glass rounded-3xl border border-white/5 overflow-hidden mb-8">
          <div className="p-5 border-b border-white/5 bg-black/20">
            <h2 className="font-bold flex items-center gap-2">
              <Inbox className="w-5 h-5 text-gold" />
              {tr.support.inboxTitle}
            </h2>
          </div>

          <div className="min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin ml-2" />
                {tr.support.loading}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center">
                <HelpCircle className="w-10 h-10 mb-3 text-white/10" />
                <p className="font-bold mb-1">{tr.support.emptyTitle}</p>
                <p className="text-xs">{tr.support.emptyDesc}</p>
              </div>
            ) : (
              [...messages].reverse().map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.isFromAdmin
                      ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm'
                      : 'bg-gold/10 border border-gold/20 rounded-tl-sm'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {msg.isFromAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : null}
                      <span className={`text-xs font-bold ${msg.isFromAdmin ? 'text-emerald-400' : 'text-gold'}`}>
                        {msg.isFromAdmin ? tr.support.admin : tr.support.you}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 font-bold">{msg.subject}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-gold" />
            {tr.support.formTitle}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold mb-1.5 block">{tr.support.subjectLabel}</label>
              <Input
                placeholder={tr.support.subjectPlaceholder}
                className="bg-black/40 h-12 text-right"
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1.5 block">{tr.support.messageLabel}</label>
              <Textarea
                placeholder={tr.support.messagePlaceholder}
                className="bg-black/40 min-h-[120px]"
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
            <Button
              className="w-full gradient-gold text-primary-foreground font-bold h-12 rounded-xl text-lg shadow-lg shadow-gold/20"
              disabled={!subject.trim() || !message.trim() || sending}
              onClick={handleSend}
            >
              {sending ? tr.support.sendingBtn : tr.support.sendBtn}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center">
          <p className="text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline ml-1" />
            {tr.support.footerNote}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
