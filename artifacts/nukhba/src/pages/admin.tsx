import { useState } from "react";
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
  getGetAdminSubscriptionRequestsQueryKey,
  getGetAdminStatsQueryKey,
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
  Copy, Plus, Filter, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

  const { data: stats, refetch: refetchStats } = useGetAdminStats();
  const { data: requests, refetch: refetchRequests } = useGetAdminSubscriptionRequests();
  const { data: cards, refetch: refetchCards } = useGetActivationCards();

  const approveMutation = useApproveSubscriptionRequest();
  const rejectMutation = useRejectSubscriptionRequest();
  const incompleteMutation = useMarkIncompleteSubscriptionRequest();

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

  const pendingCount = requests?.filter(r => r.status === 'pending').length ?? 0;
  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests?.filter(r => r.status === filterStatus);

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
      setApprovedUser({
        planType: req.planType,
        userName: req.userName || req.userEmail,
      });
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

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      const res = await fetch('/api/admin/cards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType: newCardPlan }),
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
    refetchStats();
    refetchRequests();
    refetchCards();
    toast({ title: "تم التحديث", className: "bg-black border-white/10 text-white" });
  };

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

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="mb-6 bg-glass border border-white/10">
            <TabsTrigger value="requests" className="relative">
              طلبات الاشتراك
              {pendingCount > 0 && (
                <span className="mr-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cards">بطاقات التفعيل</TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
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
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
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

          {/* Cards Tab */}
          <TabsContent value="cards">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">إجمالي البطاقات: {cards?.length ?? 0}</p>
              <Button
                className="gradient-gold text-primary-foreground gap-2 h-9"
                onClick={() => { setShowCreateCard(true); setCreatedCard(null); }}
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
              <Button
                variant="outline"
                className="border-white/10"
                onClick={() => setIncompleteTarget(null)}
              >
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
                disabled={isCreatingCard}
              >
                {isCreatingCard ? "جاري الإنشاء..." : "إنشاء البطاقة"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
