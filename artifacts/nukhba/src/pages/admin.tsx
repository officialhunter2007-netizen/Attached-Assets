import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { 
  useGetAdminStats, 
  useGetAdminSubscriptionRequests, 
  useGetActivationCards,
  useApproveSubscriptionRequest,
  useRejectSubscriptionRequest
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldAlert, Users, CreditCard, Ticket } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminSubscriptionRequestsQueryKey, getGetAdminStatsQueryKey } from "@workspace/api-client-react";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: stats } = useGetAdminStats();
  const { data: requests } = useGetAdminSubscriptionRequests();
  const { data: cards } = useGetActivationCards();

  const approveMutation = useApproveSubscriptionRequest();
  const rejectMutation = useRejectSubscriptionRequest();

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      toast({ title: "تم قبول الطلب", className: "bg-emerald-600 text-white border-none" });
      queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    } catch(e) {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync({ id });
      toast({ title: "تم رفض الطلب" });
      queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionRequestsQueryKey() });
    } catch(e) {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  const planLabels: Record<string, string> = { bronze: "البرونزية", silver: "الفضية", gold: "الذهبية", nukhba: "نُخبة", influencer: "مؤثر" };
  const regionLabels: Record<string, string> = { north: "شمال", south: "جنوب" };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-gold" />
          لوحة الإدارة
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500"><CreditCard /></div>
            <div><p className="text-sm text-muted-foreground">طلبات معلقة</p><p className="text-2xl font-bold">{stats?.pendingRequests || 0}</p></div>
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
            <TabsTrigger value="requests">طلبات الاشتراك</TabsTrigger>
            <TabsTrigger value="cards">بطاقات التفعيل</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="glass rounded-3xl border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-black/40">
                <TableRow className="border-white/5">
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الخطة</TableHead>
                  <TableHead className="text-right">المنطقة</TableHead>
                  <TableHead className="text-right">رقم المعاملة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد طلبات</TableCell></TableRow>
                ) : requests?.map((req) => (
                  <TableRow key={req.id} className="border-white/5">
                    <TableCell>
                      <div className="font-bold">{req.userName || 'بدون اسم'}</div>
                      <div className="text-xs text-muted-foreground">{req.userEmail}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="border-gold text-gold">{planLabels[req.planType] || req.planType}</Badge></TableCell>
                    <TableCell>{regionLabels[req.region] || req.region}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{req.transactionId}</TableCell>
                    <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : '-'}</TableCell>
                    <TableCell>
                      {req.status === 'pending' && <Badge className="bg-orange-500/20 text-orange-400">معلق</Badge>}
                      {req.status === 'approved' && <Badge className="bg-emerald-500/20 text-emerald-400">مقبول</Badge>}
                      {req.status === 'rejected' && <Badge className="bg-red-500/20 text-red-400">مرفوض</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-center gap-2">
                          <Button size="icon" variant="outline" className="w-8 h-8 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleApprove(req.id)}><Check className="w-4 h-4"/></Button>
                          <Button size="icon" variant="outline" className="w-8 h-8 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => handleReject(req.id)}><X className="w-4 h-4"/></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cards" className="glass rounded-3xl border-white/5 overflow-hidden">
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
                {cards?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد بطاقات</TableCell></TableRow>
                ) : cards?.map((card) => (
                  <TableRow key={card.id} className="border-white/5">
                    <TableCell className="font-mono tracking-widest text-sm" dir="ltr">{card.activationCode}</TableCell>
                    <TableCell><Badge variant="outline" className="border-emerald text-emerald">{planLabels[card.planType] || card.planType}</Badge></TableCell>
                    <TableCell>
                      {card.isUsed ? <Badge className="bg-red-500/20 text-red-400">مستخدمة</Badge> : <Badge className="bg-emerald-500/20 text-emerald-400">متاحة</Badge>}
                    </TableCell>
                    <TableCell>{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString('ar-YE') : 'لا يوجد'}</TableCell>
                    <TableCell>{card.usedAt ? new Date(card.usedAt).toLocaleDateString('ar-YE') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
