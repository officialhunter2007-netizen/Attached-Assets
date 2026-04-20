import React, { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import {
  useGetAdminStats,
  useGetAdminSubscriptionRequests,
  useGetActivationCards,
  useApproveSubscriptionRequest,
  useRejectSubscriptionRequest,
  useMarkIncompleteSubscriptionRequest,
  useGetAdminUsers,
  useCancelUserSubscription,
  getGetAdminSubscriptionRequestsQueryKey,
  getGetAdminStatsQueryKey,
  getGetAdminUsersQueryKey,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check, X, ShieldAlert, Users, CreditCard, Ticket,
  Copy, Plus, Filter, RefreshCw, AlertTriangle, Ban,
  Zap, Star, Gem, MessageCircle, Activity, Search,
  BookOpen, Gift, Trash2, Clock, CalendarDays, ChevronDown, Brain,
} from "lucide-react";
import { AdminInsightsChat } from "@/components/admin-insights-chat";
import { AdminTeacherMessagesPanel } from "@/components/admin-teacher-messages-panel";
import { useQueryClient } from "@tanstack/react-query";
import { university, skills } from "@/lib/curriculum";

const allSubjectsFlat = [
  ...university.map(s => ({ id: s.id, name: s.name, emoji: s.emoji })),
  ...skills.flatMap(cat => cat.subjects.map(s => ({ id: s.id, name: s.name, emoji: s.emoji }))),
];

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "incomplete">("pending");
  const [approvedUser, setApprovedUser] = useState<{ planType: string; userName: string } | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newCardPlan, setNewCardPlan] = useState<"bronze" | "silver" | "gold">("silver");
  const [createdCard, setCreatedCard] = useState<{ code: string; planType: string } | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const [incompleteTarget, setIncompleteTarget] = useState<{ id: number; userName: string } | null>(null);
  const [incompleteNote, setIncompleteNote] = useState("");

  const [cancelTarget, setCancelTarget] = useState<{ id: number; name: string } | null>(null);
  const [userSearch, setUserSearch] = useState("");

  // Per-subject subscription management
  const [grantTarget, setGrantTarget] = useState<{ userId: number; name: string } | null>(null);
  const [grantPlan, setGrantPlan] = useState<"bronze" | "silver" | "gold">("silver");
  const [grantSubjectId, setGrantSubjectId] = useState("");
  const [grantSubjectName, setGrantSubjectName] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [userSubjectSubs, setUserSubjectSubs] = useState<Record<number, any[]>>({});
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // All subject subscriptions tab
  const [allSubjectSubs, setAllSubjectSubs] = useState<any[] | null>(null);
  const [isLoadingAllSubs, setIsLoadingAllSubs] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [extendDialog, setExtendDialog] = useState<{ subId: number; userName: string; subjectName: string } | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [isExtending, setIsExtending] = useState(false);

  // Card creation subject
  const [newCardSubjectId, setNewCardSubjectId] = useState("");
  const [newCardSubjectName, setNewCardSubjectName] = useState("");
  const [cardSubjectSearch, setCardSubjectSearch] = useState("");
  const [showCardSubjectPicker, setShowCardSubjectPicker] = useState(false);

  // Grant subject picker
  const [grantSubjectSearch, setGrantSubjectSearch] = useState("");
  const [showGrantSubjectPicker, setShowGrantSubjectPicker] = useState(false);

  // Support messages
  const [supportThreads, setSupportThreads] = useState<any[]>([]);
  const [supportUnread, setSupportUnread] = useState(0);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Live users
  const [liveUsersList, setLiveUsersList] = useState<any[]>([]);

  useEffect(() => {
    const fetchSupportData = () => {
      fetch("/api/admin/support/threads", { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setSupportThreads(d); })
        .catch(() => {});
      fetch("/api/admin/support/unread-count", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setSupportUnread(d.count ?? 0))
        .catch(() => {});
    };
    const fetchLiveUsers = () => {
      fetch("/api/admin/live-users", { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setLiveUsersList(d); })
        .catch(() => {});
    };
    fetchSupportData();
    fetchLiveUsers();
    const interval = setInterval(() => { fetchSupportData(); fetchLiveUsers(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSupportReply = async (userId: number, subject: string) => {
    if (!replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await fetch("/api/admin/support/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subject, message: replyMessage.trim() }),
      });
      setReplyMessage("");
      toast({ title: "تم الرد", description: "تم إرسال الرد بنجاح", className: "bg-emerald-600 border-none text-white" });
      const res = await fetch("/api/admin/support/threads", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSupportThreads(data);
        const updated = data.find((t: any) => t.userId === userId);
        if (updated) setSelectedThread(updated);
      }
      fetch("/api/admin/support/unread-count", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setSupportUnread(d.count ?? 0))
        .catch(() => {});
    } catch {}
    setIsSendingReply(false);
  };

  const { data: stats, refetch: refetchStats } = useGetAdminStats();
  const { data: requests, refetch: refetchRequests } = useGetAdminSubscriptionRequests();
  const { data: cards, refetch: refetchCards } = useGetActivationCards();
  const { data: allUsers, refetch: refetchUsers } = useGetAdminUsers();

  const approveMutation = useApproveSubscriptionRequest();
  const rejectMutation = useRejectSubscriptionRequest();
  const incompleteMutation = useMarkIncompleteSubscriptionRequest();
  const cancelSubMutation = useCancelUserSubscription();

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="container mx-auto py-20 text-center flex flex-col items-center">
          <ShieldAlert className="w-20 h-20 text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-2">غير مصرح</h1>
          <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          <Button onClick={() => setLocation("/")}>العودة للرئيسية</Button>
        </div>
      </AppLayout>
    );
  }

  const planLabels: Record<string, string> = { bronze: "البرونزية", silver: "الفضية", gold: "الذهبية" };
  const regionLabels: Record<string, string> = { north: "شمال", south: "جنوب" };

  const planIcons: Record<string, React.ReactNode> = {
    bronze: <Zap className="w-3.5 h-3.5 text-orange-400" />,
    silver: <Star className="w-3.5 h-3.5 text-slate-300" />,
    gold: <Gem className="w-3.5 h-3.5 text-gold" />,
  };

  const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0;
  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests?.filter(r => r.status === filterStatus);

  const filteredUsers = allUsers?.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName ?? "").toLowerCase().includes(q)
    );
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    refetchRequests();
    refetchStats();
  };

  const handleApprove = async (req: any) => {
    try {
      await approveMutation.mutateAsync({ id: req.id });
      toast({ title: "تم تفعيل الاشتراك مباشرة", className: "bg-emerald-600 text-white border-none" });
      setApprovedUser({ planType: req.planType, userName: req.userName || req.userEmail });
      invalidateAll();
      refetchCards();
    } catch {
      toast({ variant: "destructive", title: "حدث خطأ أثناء القبول" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync({ id });
      toast({ title: "تم رفض الطلب" });
      invalidateAll();
    } catch {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  const handleIncompleteOpen = (req: any) => {
    setIncompleteTarget({ id: req.id, userName: req.userName || req.userEmail });
    setIncompleteNote("");
  };

  const handleIncompleteSubmit = async () => {
    if (!incompleteTarget || !incompleteNote.trim()) return;
    try {
      await incompleteMutation.mutateAsync({
        id: incompleteTarget.id,
        data: { adminNote: incompleteNote.trim() },
      });
      toast({ title: "تم إرسال إشعار المبلغ الناقص", className: "bg-orange-500 text-white border-none" });
      setIncompleteTarget(null);
      setIncompleteNote("");
      invalidateAll();
    } catch {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelTarget) return;
    try {
      await cancelSubMutation.mutateAsync({ id: cancelTarget.id });
      toast({ title: "تم إلغاء الاشتراك", className: "bg-red-600 text-white border-none" });
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      refetchUsers();
      refetchStats();
    } catch {
      toast({ variant: "destructive", title: "حدث خطأ أثناء الإلغاء" });
    }
  };

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      const res = await fetch('/api/admin/cards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType: newCardPlan, subjectId: newCardSubjectId, subjectName: newCardSubjectName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedCard({ code: data.activationCode, planType: data.planType });
      refetchCards();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
      setIsCreatingCard(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم النسخ!", className: "bg-black border-white/10 text-white" });
  };

  const handleRefreshAll = () => {
    refetchStats(); refetchRequests(); refetchCards(); refetchUsers();
    toast({ title: "تم التحديث", className: "bg-black border-white/10 text-white" });
  };

  const loadUserSubjectSubs = async (userId: number) => {
    if (userSubjectSubs[userId]) return;
    try {
      const r = await fetch(`/api/admin/subject-subscriptions/${userId}`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setUserSubjectSubs(prev => ({ ...prev, [userId]: data }));
      }
    } catch {}
  };

  const handleToggleExpand = (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      loadUserSubjectSubs(userId);
    }
  };

  const handleGrantSubjectSubscription = async () => {
    if (!grantTarget || !grantSubjectId.trim()) return;
    setIsGranting(true);
    try {
      const r = await fetch("/api/admin/grant-subject-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: grantTarget.userId,
          subjectId: grantSubjectId.trim(),
          subjectName: grantSubjectName.trim() || grantSubjectId.trim(),
          plan: grantPlan,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast({ title: "تم منح الاشتراك بنجاح", className: "bg-emerald-600 text-white border-none" });
      const targetUserId = grantTarget.userId;
      setGrantTarget(null);
      setGrantSubjectId("");
      setGrantSubjectName("");
      // Force refetch user's subject subs
      try {
        const r2 = await fetch(`/api/admin/subject-subscriptions/${targetUserId}`, { credentials: "include" });
        if (r2.ok) {
          const data = await r2.json();
          setUserSubjectSubs(prev => ({ ...prev, [targetUserId]: data }));
        }
      } catch {}
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeSubjectSubscription = async (subId: number, userId: number) => {
    try {
      const r = await fetch(`/api/admin/revoke-subject-subscription/${subId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast({ title: "تم إلغاء الاشتراك", className: "bg-red-600 text-white border-none" });
      setUserSubjectSubs(prev => ({
        ...prev,
        [userId]: (prev[userId] ?? []).filter(s => s.id !== subId),
      }));
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    }
  };

  const loadAllSubjectSubs = async () => {
    setIsLoadingAllSubs(true);
    try {
      const r = await fetch("/api/admin/all-subject-subscriptions", { credentials: "include" });
      const data = await r.json();
      setAllSubjectSubs(Array.isArray(data) ? data : []);
    } catch {
      setAllSubjectSubs([]);
    } finally {
      setIsLoadingAllSubs(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!extendDialog) return;
    setIsExtending(true);
    try {
      const r = await fetch(`/api/admin/subject-subscriptions/${extendDialog.subId}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: extendDays }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast({ title: `تم تمديد الاشتراك ${extendDays} يوماً`, className: "bg-emerald-600 text-white border-none" });
      setExtendDialog(null);
      loadAllSubjectSubs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
      setIsExtending(false);
    }
  };

  const handleRevokeFromAllTab = async (subId: number) => {
    try {
      const r = await fetch(`/api/admin/revoke-subject-subscription/${subId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast({ title: "تم إلغاء الاشتراك", className: "bg-red-600 text-white border-none" });
      setAllSubjectSubs(prev => prev ? prev.filter(s => s.id !== subId) : prev);
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    }
  };

  const filteredAllSubs = useMemo(() => {
    if (!allSubjectSubs) return [];
    if (!subjectFilter) return allSubjectSubs;
    return allSubjectSubs.filter(s => s.subjectId === subjectFilter);
  }, [allSubjectSubs, subjectFilter]);

  const uniqueSubjectIds = useMemo(() => {
    if (!allSubjectSubs) return [];
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string }> = [];
    for (const s of allSubjectSubs) {
      if (!seen.has(s.subjectId)) {
        seen.add(s.subjectId);
        result.push({ id: s.subjectId, name: s.subjectName ?? s.subjectId });
      }
    }
    return result;
  }, [allSubjectSubs]);

  const filteredCardSubjects = useMemo(() => {
    const q = cardSubjectSearch.toLowerCase();
    if (!q) return allSubjectsFlat;
    return allSubjectsFlat.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [cardSubjectSearch]);

  const filteredGrantSubjects = useMemo(() => {
    const q = grantSubjectSearch.toLowerCase();
    if (!q) return allSubjectsFlat;
    return allSubjectsFlat.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [grantSubjectSearch]);

  const filterOptions = [
    { value: 'pending', label: 'معلق' },
    { value: 'incomplete', label: 'ناقص' },
    { value: 'approved', label: 'مقبول' },
    { value: 'rejected', label: 'مرفوض' },
    { value: 'all', label: 'الكل' },
  ] as const;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-gold" />
            لوحة الإدارة
          </h1>
          <Button variant="outline" size="sm" className="border-white/10 gap-2" onClick={handleRefreshAll}>
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 relative">
              <CreditCard />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">طلبات معلقة</p>
              <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-400' : ''}`}>{stats?.pendingRequests || 0}</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Check /></div>
            <div><p className="text-sm text-muted-foreground">اشتراكات فعالة</p><p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p></div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500"><Users /></div>
            <div><p className="text-sm text-muted-foreground">إجمالي المستخدمين</p><p className="text-2xl font-bold">{stats?.totalUsers || 0}</p></div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500"><Ticket /></div>
            <div><p className="text-sm text-muted-foreground">إجمالي البطاقات</p><p className="text-2xl font-bold">{stats?.totalCards || 0}</p></div>
          </div>
        </div>

        {(stats?.recentlyExpiredSubscriptions ?? 0) > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-300 text-sm">اشتراكات منتهية مؤخراً</p>
              <p className="text-xs text-red-200/60">{stats.recentlyExpiredSubscriptions} اشتراك انتهى خلال آخر ٧ أيام — تحقق من تبويب "اشتراكات المواد" للتفاصيل</p>
            </div>
          </div>
        )}

        {liveUsersList.length > 0 && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                متصلون الآن ({liveUsersList.length})
              </h3>
              <span className="text-[10px] text-muted-foreground">يتحدث كل ١٥ ثانية</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {liveUsersList.map(u => {
                const pageNames: Record<string, string> = {
                  '/': 'الرئيسية', '/learn': 'التعلّم', '/dashboard': 'لوحتي',
                  '/subscription': 'الاشتراك', '/support': 'الدعم', '/admin': 'الإدارة',
                };
                const pageName = pageNames[u.page] || (u.page.startsWith('/subject/') ? 'جلسة تعلّم' : u.page);
                return (
                  <div key={u.userId} className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2 border border-white/5">
                    {u.profileImage ? (
                      <img src={u.profileImage} className="w-6 h-6 rounded-full border border-emerald-500/30" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Users className="w-3 h-3 text-emerald-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate max-w-[120px]">{u.name || u.email}</p>
                      <p className="text-[10px] text-emerald-400">{pageName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="mb-6 bg-glass border border-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="requests" className="relative">
              طلبات الاشتراك
              {pendingCount > 0 && (
                <span className="mr-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              المستخدمون
            </TabsTrigger>
            <TabsTrigger
              value="subject-subs"
              className="flex items-center gap-1.5"
              onClick={() => { if (!allSubjectSubs && !isLoadingAllSubs) loadAllSubjectSubs(); }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              اشتراكات المواد
            </TabsTrigger>
            <TabsTrigger value="cards">بطاقات التفعيل</TabsTrigger>
            <TabsTrigger value="support" className="relative flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              الرسائل
              {supportUnread > 0 && (
                <span className="mr-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse">{supportUnread}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center gap-1.5 bg-gradient-to-l from-amber-500/15 to-purple-500/10 data-[state=active]:from-amber-500/30 data-[state=active]:to-purple-500/20 data-[state=active]:border-amber-400/40">
              <Brain className="w-3.5 h-3.5" />
              مساعد ذكي
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-l from-amber-500 to-purple-500 text-white">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {/* Karimi accounts reference */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 bg-black/30 border border-gold/20 rounded-xl px-4 py-3">
                <img src="/karimi-logo.png" alt="كريمي" className="w-7 h-7 rounded-md object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">المحافظات الشمالية (ريال يمني)</p>
                  <p className="font-mono font-bold text-gold text-sm tracking-widest" dir="ltr">3165778412</p>
                  <p className="text-xs text-muted-foreground">باسم: عمرو خالد عبد المولى</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-black/30 border border-gold/20 rounded-xl px-4 py-3">
                <img src="/karimi-logo.png" alt="كريمي" className="w-7 h-7 rounded-md object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">المحافظات الجنوبية (عملة جنوبية)</p>
                  <p className="font-mono font-bold text-gold text-sm tracking-widest" dir="ltr">3167076083</p>
                  <p className="text-xs text-muted-foreground">باسم: عمرو خالد عبد المولى</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filterStatus === opt.value
                      ? 'bg-gold text-primary-foreground'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="glass rounded-3xl border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الخطة</TableHead>
                    <TableHead className="text-right">المادة</TableHead>
                    <TableHead className="text-right">المنطقة</TableHead>
                    <TableHead className="text-right">اسم الحساب المرسل</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredRequests?.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        {filterStatus === 'pending' ? 'لا توجد طلبات معلقة 🎉' : 'لا توجد طلبات'}
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.map((req) => (
                    <TableRow
                      key={req.id}
                      className={`border-white/5 transition-colors ${
                        req.status === 'pending' ? 'bg-orange-500/5 hover:bg-orange-500/10' :
                        req.status === 'incomplete' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' :
                        'hover:bg-white/3'
                      }`}
                    >
                      <TableCell>
                        <div className="font-bold text-sm">{req.userName || 'بدون اسم'}</div>
                        <div className="text-xs text-muted-foreground">{req.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gold text-gold text-xs">
                          {planLabels[req.planType] || req.planType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(req as any).subjectName ? (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-gold shrink-0" />
                            <span className="text-xs font-medium">{(req as any).subjectName}</span>
                          </div>
                        ) : (req as any).subjectId && (req as any).subjectId !== 'all' ? (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-gold shrink-0" />
                            <code className="text-xs font-mono text-muted-foreground">{(req as any).subjectId}</code>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-medium">عام (قديم)</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{regionLabels[req.region] || req.region}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-foreground">
                            {(req as any).accountName || '—'}
                          </span>
                          {(req as any).accountName && (
                            <button
                              onClick={() => copyCode((req as any).accountName)}
                              className="text-muted-foreground hover:text-gold transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground max-w-[140px]">
                          {(req as any).adminNote
                            ? <span className="text-orange-400 font-medium">{(req as any).adminNote}</span>
                            : (req as any).notes || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : '-'}
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && <Badge className="bg-orange-500/20 text-orange-400 border-0">معلق</Badge>}
                        {req.status === 'approved' && <Badge className="bg-emerald-500/20 text-emerald-400 border-0">مقبول</Badge>}
                        {req.status === 'rejected' && <Badge className="bg-red-500/20 text-red-400 border-0">مرفوض</Badge>}
                        {req.status === 'incomplete' && <Badge className="bg-yellow-500/20 text-yellow-400 border-0">ناقص</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {(req.status === 'pending' || req.status === 'incomplete') && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 gap-1 h-8 text-xs"
                              disabled={approveMutation.isPending}
                              onClick={() => handleApprove(req)}
                            >
                              <Check className="w-3.5 h-3.5" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 gap-1 h-8 text-xs"
                              disabled={incompleteMutation.isPending}
                              onClick={() => handleIncompleteOpen(req)}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              ناقص
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-8 h-8 text-red-500 border-red-500/30 hover:bg-red-500/10"
                              disabled={rejectMutation.isPending}
                              onClick={() => handleReject(req.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <span className="text-xs text-emerald-400 font-medium">✓ مفعّل</span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="text-xs text-red-400">✗ مرفوض</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد..."
                  className="bg-black/40 pr-10"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="glass rounded-3xl border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الاشتراك</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> الرسائل</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> النشاط</div>
                    </TableHead>
                    <TableHead className="text-right">الطلبات</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredUsers?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        {userSearch ? 'لا توجد نتائج' : 'لا يوجد مستخدمون'}
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map((u) => {
                    return (
                    <React.Fragment key={u.id}>
                    <TableRow className="border-white/5 hover:bg-white/3">
                      <TableCell>
                        <div className="font-bold text-sm">{u.displayName || 'بدون اسم'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        {u.role === 'admin' && (
                          <Badge className="bg-gold/20 text-gold border-0 text-xs mt-0.5">مشرف</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(u.activeSubjectSubscriptionsCount ?? 0) > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 text-sm font-bold">{u.activeSubjectSubscriptionsCount}</span>
                            <span className="text-xs text-muted-foreground">اشتراك نشط</span>
                          </div>
                        ) : u.firstLessonComplete ? (
                          <span className="text-xs text-amber-400">بحاجة للاشتراك</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">بدون اشتراك</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(u.messagesLimit ?? 0) > 0 ? (
                          <div className="text-sm">
                            <span className={`font-bold ${(u.messagesLeft ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {u.messagesLeft ?? 0}
                            </span>
                            <span className="text-muted-foreground text-xs"> / {u.messagesLimit ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="text-muted-foreground">نقاط: <span className="text-foreground font-medium">{u.points}</span></div>
                          <div className="text-muted-foreground">تتابع: <span className="text-foreground font-medium">{u.streakDays} يوم</span></div>
                          {u.lastActive && (
                            <div className="text-muted-foreground">آخر نشاط: <span className="text-foreground">{new Date(u.lastActive).toLocaleDateString('ar-YE')}</span></div>
                          )}
                          {u.firstLessonComplete && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">أكمل الدرس الأول</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="text-muted-foreground">الإجمالي: <span className="text-foreground font-medium">{u.totalSubscriptionRequests}</span></div>
                          {u.lastRequestStatus && (
                            <div>
                              {u.lastRequestStatus === 'approved' && <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">مقبول</Badge>}
                              {u.lastRequestStatus === 'pending' && <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">معلق</Badge>}
                              {u.lastRequestStatus === 'rejected' && <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">مرفوض</Badge>}
                              {u.lastRequestStatus === 'incomplete' && <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs">ناقص</Badge>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-YE') : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-1.5 items-center">
                          {u.role !== 'admin' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 gap-1"
                              onClick={() => {
                                setGrantTarget({ userId: u.id, name: u.displayName || u.email });
                                setGrantPlan("silver");
                                setGrantSubjectId("");
                                setGrantSubjectName("");
                              }}
                            >
                              <Gift className="w-3 h-3" />
                              منح اشتراك مادة
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-white/10 text-muted-foreground hover:text-white gap-1"
                            onClick={() => handleToggleExpand(u.id)}
                          >
                            <BookOpen className="w-3 h-3" />
                            {expandedUserId === u.id ? "إخفاء المواد" : "عرض المواد"}
                          </Button>
                          {u.nukhbaPlan && u.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1"
                              onClick={() => setCancelTarget({ id: u.id, name: u.displayName || u.email })}
                            >
                              <Ban className="w-3 h-3" />
                              إلغاء العالمي
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded subject subscriptions row */}
                    {expandedUserId === u.id && (
                      <TableRow className="border-white/5 bg-black/20">
                        <TableCell colSpan={7} className="py-3 px-6">
                          <div className="text-sm font-semibold text-gold mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            اشتراكات المواد الخاصة بـ {u.displayName || u.email}
                          </div>
                          {!userSubjectSubs[u.id] ? (
                            <p className="text-xs text-muted-foreground">جاري التحميل...</p>
                          ) : userSubjectSubs[u.id].length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا توجد اشتراكات مواد لهذا المستخدم</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {userSubjectSubs[u.id].map((s: any) => {
                                const isActive = new Date(s.expiresAt) > new Date() && s.messagesUsed < s.messagesLimit;
                                return (
                                  <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${isActive ? "border-gold/30 bg-gold/5" : "border-white/10 bg-white/3 opacity-60"}`}>
                                    <span className="font-medium">{s.subjectName ?? s.subjectId}</span>
                                    <span className={`font-bold ${s.plan === "gold" ? "text-gold" : s.plan === "silver" ? "text-slate-300" : "text-orange-400"}`}>
                                      {planLabels[s.plan] ?? s.plan}
                                    </span>
                                    <span className="text-muted-foreground">{s.messagesLimit - s.messagesUsed}/{s.messagesLimit}</span>
                                    {!isActive && <span className="text-red-400">منتهي</span>}
                                    <button
                                      className="text-red-400 hover:text-red-300 ml-1"
                                      onClick={() => handleRevokeSubjectSubscription(s.id, u.id)}
                                      title="إلغاء هذا الاشتراك"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Subject Subscriptions Tab */}
          <TabsContent value="subject-subs">
            <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <select
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-right"
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value)}
                >
                  <option value="">كل المواد</option>
                  {uniqueSubjectIds.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">
                  {filteredAllSubs.length} اشتراك
                </span>
              </div>
              <Button size="sm" variant="outline" className="border-white/10 gap-2" onClick={loadAllSubjectSubs} disabled={isLoadingAllSubs}>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAllSubs ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {allSubjectSubs === null ? (
              <div className="text-center py-16 text-muted-foreground">جاري تحميل الاشتراكات...</div>
            ) : (
              <div className="glass rounded-3xl border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="border-white/5">
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">المادة</TableHead>
                      <TableHead className="text-right">الباقة</TableHead>
                      <TableHead className="text-right">الرسائل</TableHead>
                      <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-center">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllSubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد اشتراكات</TableCell>
                      </TableRow>
                    ) : filteredAllSubs.map(s => {
                      const now = new Date();
                      const isExpired = new Date(s.expiresAt) < now;
                      const isExhausted = s.messagesUsed >= s.messagesLimit;
                      const statusLabel = s.status === "active" ? "نشط" : s.status === "expired" ? "منتهي" : "مُستنفد";
                      const statusColor = s.status === "active" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground bg-white/5 border-white/10";
                      return (
                        <TableRow key={s.id} className="border-white/5 hover:bg-white/3">
                          <TableCell>
                            <div className="font-semibold text-sm">{s.userName ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{s.subjectName ?? s.subjectId}</div>
                            <code className="text-xs text-muted-foreground font-mono">{s.subjectId}</code>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              s.plan === "gold" ? "bg-gold/20 text-gold" :
                              s.plan === "silver" ? "bg-slate-500/20 text-slate-300" :
                              "bg-orange-500/20 text-orange-400"
                            }`}>
                              {planLabels[s.plan] ?? s.plan}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-bold">{s.messagesLimit - s.messagesUsed}</span>
                            <span className="text-xs text-muted-foreground"> / {s.messagesLimit}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.expiresAt).toLocaleDateString("ar-YE")}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5 justify-center">
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 gap-1"
                                onClick={() => setExtendDialog({ subId: s.id, userName: s.userName ?? s.userEmail, subjectName: s.subjectName ?? s.subjectId })}
                              >
                                <CalendarDays className="w-3 h-3" />
                                تمديد
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 gap-1"
                                onClick={() => handleRevokeFromAllTab(s.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                                إلغاء
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">إجمالي البطاقات: {cards?.length ?? 0}</p>
              <Button
                className="gradient-gold text-primary-foreground gap-2 h-9"
                onClick={() => { setShowCreateCard(true); setCreatedCard(null); setNewCardSubjectId(""); setNewCardSubjectName(""); setCardSubjectSearch(""); setShowCardSubjectPicker(false); }}
              >
                <Plus className="w-4 h-4" />
                إنشاء بطاقة جديدة
              </Button>
            </div>

            <div className="glass rounded-3xl border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5">
                    <TableHead className="text-right">الكود</TableHead>
                    <TableHead className="text-right">الخطة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-right">تاريخ الاستخدام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!cards?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد بطاقات</TableCell></TableRow>
                  ) : cards.map((card) => (
                    <TableRow key={card.id} className="border-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono tracking-widest text-sm" dir="ltr">{card.activationCode}</code>
                          <button onClick={() => copyCode(card.activationCode)} className="text-muted-foreground hover:text-gold transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald text-emerald">{planLabels[card.planType] || card.planType}</Badge>
                      </TableCell>
                      <TableCell>
                        {card.isUsed
                          ? <Badge className="bg-slate-500/20 text-slate-400 border-0">مستخدمة</Badge>
                          : <Badge className="bg-emerald-500/20 text-emerald-400 border-0">متاحة</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('ar-YE') : 'لا يوجد'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{card.usedAt ? new Date(card.usedAt).toLocaleDateString('ar-YE') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Support Messages Tab */}
          <TabsContent value="support">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
                <h3 className="font-bold text-sm text-muted-foreground mb-3">المحادثات ({supportThreads.length})</h3>
                {supportThreads.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">لا توجد رسائل بعد</div>
                ) : (
                  supportThreads.map(thread => (
                    <button
                      key={thread.userId}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full text-right p-4 rounded-2xl border transition-all ${
                        selectedThread?.userId === thread.userId
                          ? 'border-gold/40 bg-gold/5'
                          : 'border-white/5 glass hover:border-gold/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm truncate">{thread.userName || 'مستخدم'}</span>
                        {thread.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{thread.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{thread.userEmail}</p>
                      <p className="text-xs text-gold/80 mt-1 truncate">{thread.lastSubject}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(thread.lastAt).toLocaleDateString("ar-SA")} — {thread.totalMessages} رسالة
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="md:col-span-2">
                {!selectedThread ? (
                  <div className="glass rounded-3xl border border-white/5 flex items-center justify-center h-[400px] text-muted-foreground text-center">
                    <div>
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-white/10" />
                      <p className="font-bold">اختر محادثة من القائمة</p>
                      <p className="text-xs mt-1">لعرض الرسائل والرد عليها</p>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-black/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{selectedThread.userName || 'مستخدم'}</p>
                          <p className="text-xs text-muted-foreground">{selectedThread.userEmail}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{selectedThread.totalMessages} رسالة</span>
                      </div>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto p-4 space-y-3">
                      {[...selectedThread.messages].reverse().map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl p-3 ${
                            msg.isFromAdmin
                              ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm'
                              : 'bg-blue-500/10 border border-blue-500/20 rounded-tl-sm'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold ${msg.isFromAdmin ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {msg.isFromAdmin ? 'أنت (المشرف)' : msg.userName || 'المستخدم'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            </div>
                            <p className="text-xs text-gold/80 mb-1 font-bold">{msg.subject}</p>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
                      <Textarea
                        placeholder="اكتب ردك هنا..."
                        className="bg-black/40 min-h-[80px]"
                        dir="rtl"
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                      />
                      <Button
                        className="w-full gradient-gold text-primary-foreground font-bold h-11 rounded-xl"
                        disabled={!replyMessage.trim() || isSendingReply}
                        onClick={() => handleSupportReply(selectedThread.userId, selectedThread.lastSubject)}
                      >
                        {isSendingReply ? "جاري الإرسال..." : "إرسال الرد"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights">
            <div className="space-y-6">
              <AdminTeacherMessagesPanel />
              <AdminInsightsChat />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Success Dialog */}
      <Dialog open={!!approvedUser} onOpenChange={() => setApprovedUser(null)}>
        <DialogContent className="glass border-emerald/30 max-w-sm text-center" hideCloseButton>
          <DialogTitle className="sr-only">تم القبول</DialogTitle>
          <div className="p-6">
            <div className="w-16 h-16 rounded-full bg-emerald/10 border-2 border-emerald/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald" />
            </div>
            <h3 className="text-xl font-bold mb-2">تم تفعيل الاشتراك!</h3>
            <p className="text-sm text-muted-foreground mb-5">
              تم قبول طلب <strong className="text-foreground">{approvedUser?.userName}</strong> وتفعيل باقة{" "}
              <strong className="text-gold">{planLabels[approvedUser?.planType ?? ''] ?? ''}</strong> مباشرةً على حسابه.
            </p>
            <Button className="w-full gradient-gold text-primary-foreground font-bold" onClick={() => setApprovedUser(null)}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incomplete Payment Dialog */}
      <Dialog open={!!incompleteTarget} onOpenChange={(open) => { if (!open) setIncompleteTarget(null); }}>
        <DialogContent className="glass border-yellow-500/30 max-w-sm">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            إشعار مبلغ ناقص
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              سيتلقى <strong className="text-foreground">{incompleteTarget?.userName}</strong> إشعاراً بأن مبلغه ناقص مع رسالتك أدناه.
            </p>
            <div className="space-y-2">
              <Label>الرسالة للمستخدم</Label>
              <Textarea
                placeholder="مثال: المبلغ المرسل ١٠٠٠ ريال فقط، والمطلوب ٢٠٠٠ ريال. يرجى إكمال المبلغ وإرسال طلب جديد."
                className="bg-black/40 min-h-[100px]"
                value={incompleteNote}
                onChange={(e) => setIncompleteNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30 font-bold"
                disabled={!incompleteNote.trim() || incompleteMutation.isPending}
                onClick={handleIncompleteSubmit}
              >
                {incompleteMutation.isPending ? "جاري الإرسال..." : "إرسال الإشعار"}
              </Button>
              <Button variant="outline" className="border-white/10" onClick={() => setIncompleteTarget(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirm Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="glass border-red-500/30 max-w-sm text-center">
          <DialogTitle className="sr-only">إلغاء الاشتراك</DialogTitle>
          <div className="p-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">إلغاء الاشتراك</h3>
            <p className="text-sm text-muted-foreground mb-6">
              هل أنت متأكد من إلغاء اشتراك <strong className="text-foreground">{cancelTarget?.name}</strong>؟ سيفقد المستخدم الوصول فوراً.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 font-bold"
                disabled={cancelSubMutation.isPending}
                onClick={handleCancelSubscription}
              >
                {cancelSubMutation.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
              <Button variant="outline" className="flex-1 border-white/10" onClick={() => setCancelTarget(null)}>
                تراجع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Subject Subscription Dialog */}
      <Dialog open={!!grantTarget} onOpenChange={(open) => { if (!open) setGrantTarget(null); }}>
        <DialogContent className="glass border-gold/30 max-w-sm">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" />
            منح اشتراك مادة
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              سيحصل <strong className="text-foreground">{grantTarget?.name}</strong> على وصول لمادة معينة.
            </p>
            <div className="space-y-2">
              <Label>المادة (إلزامي)</Label>
              {grantSubjectId ? (
                <div className="flex items-center gap-2 bg-gold/5 border border-gold/30 rounded-xl px-4 py-3">
                  <span className="font-bold text-gold flex-1 text-sm">{grantSubjectName || grantSubjectId}</span>
                  <button onClick={() => { setGrantSubjectId(""); setGrantSubjectName(""); setShowGrantSubjectPicker(true); }} className="text-xs text-muted-foreground hover:text-white">تغيير</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowGrantSubjectPicker(p => !p)}
                  className="w-full flex items-center justify-between gap-2 bg-black/30 border border-white/10 hover:border-gold/30 rounded-xl px-4 py-3 text-sm text-muted-foreground"
                >
                  اختر المادة...
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
              {showGrantSubjectPicker && (
                <div className="bg-black/90 border border-white/10 rounded-2xl p-3 max-h-56 overflow-y-auto">
                  <div className="relative mb-2">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      className="bg-black/60 h-8 pr-9 text-xs"
                      value={grantSubjectSearch}
                      onChange={e => setGrantSubjectSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredGrantSubjects.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setGrantSubjectId(s.id); setGrantSubjectName(s.name); setShowGrantSubjectPicker(false); setGrantSubjectSearch(""); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-right"
                      >
                        <span>{s.emoji}</span>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>الباقة</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['bronze', 'silver', 'gold'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setGrantPlan(p)}
                    className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                      grantPlan === p
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {planLabels[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 gradient-gold text-primary-foreground font-bold"
                disabled={!grantSubjectId.trim() || isGranting}
                onClick={handleGrantSubjectSubscription}
              >
                {isGranting ? "جاري المنح..." : "منح الاشتراك"}
              </Button>
              <Button variant="outline" className="border-white/10" onClick={() => { setGrantTarget(null); setShowGrantSubjectPicker(false); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Card Dialog */}
      <Dialog open={showCreateCard} onOpenChange={setShowCreateCard}>
        <DialogContent className="glass border-white/10 max-w-sm">
          <DialogTitle className="text-lg font-bold">إنشاء بطاقة تفعيل جديدة</DialogTitle>
          {createdCard ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-7 h-7 text-gold" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">تم إنشاء بطاقة {planLabels[createdCard.planType]} — شارك الكود مع المستخدم:</p>
              <div className="bg-black/50 border border-gold/20 rounded-xl p-4 mb-5 flex items-center justify-between gap-3">
                <code className="font-mono text-gold text-lg tracking-widest" dir="ltr">{createdCard.code}</code>
                <button onClick={() => copyCode(createdCard.code)} className="text-muted-foreground hover:text-gold transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setShowCreateCard(false); setCreatedCard(null); }}>
                إغلاق
              </Button>
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              <div>
                <Label className="mb-2 block">المادة (إلزامي)</Label>
                {newCardSubjectId ? (
                  <div className="flex items-center gap-2 bg-gold/5 border border-gold/30 rounded-xl px-4 py-3">
                    <span className="font-bold text-gold flex-1">{newCardSubjectName || newCardSubjectId}</span>
                    <button onClick={() => { setNewCardSubjectId(""); setNewCardSubjectName(""); setShowCardSubjectPicker(true); }} className="text-xs text-muted-foreground hover:text-white">تغيير</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCardSubjectPicker(p => !p)}
                    className="w-full flex items-center justify-between gap-2 bg-black/30 border border-white/10 hover:border-gold/30 rounded-xl px-4 py-3 text-sm text-muted-foreground"
                  >
                    اختر المادة...
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
                {showCardSubjectPicker && (
                  <div className="mt-2 bg-black/90 border border-white/10 rounded-2xl p-3 max-h-64 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="بحث..."
                        className="bg-black/60 h-8 pr-9 text-xs"
                        value={cardSubjectSearch}
                        onChange={e => setCardSubjectSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {filteredCardSubjects.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setNewCardSubjectId(s.id); setNewCardSubjectName(s.name); setShowCardSubjectPicker(false); setCardSubjectSearch(""); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-right"
                        >
                          <span>{s.emoji}</span>
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">نوع الباقة</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bronze', 'silver', 'gold'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewCardPlan(p)}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                        newCardPlan === p
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-white/10 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      {planLabels[p]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-black/30 rounded-xl p-3 border border-white/5">
                ستُنشئ بطاقة غير مستخدمة يمكن للمستخدم تفعيلها بنفسه عبر حقل "تفعيل عبر كود" في صفحة الاشتراك.
              </p>
              <Button
                className="w-full gradient-gold text-primary-foreground font-bold h-11"
                onClick={handleCreateCard}
                disabled={isCreatingCard || !newCardSubjectId}
              >
                {isCreatingCard ? "جاري الإنشاء..." : "إنشاء البطاقة"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Extend Subscription Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(open) => { if (!open) setExtendDialog(null); }}>
        <DialogContent className="glass border-emerald-500/30 max-w-sm">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            تمديد الاشتراك
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              تمديد اشتراك <strong className="text-foreground">{extendDialog?.userName}</strong> في مادة{" "}
              <strong className="text-foreground">{extendDialog?.subjectName}</strong>
            </p>
            <div className="space-y-2">
              <Label>عدد أيام التمديد</Label>
              <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setExtendDays(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                      extendDays === d ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {d} يوم
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold"
                onClick={handleExtendSubscription}
                disabled={isExtending}
              >
                {isExtending ? "جاري التمديد..." : `تمديد ${extendDays} يوم`}
              </Button>
              <Button variant="outline" className="border-white/10" onClick={() => setExtendDialog(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
