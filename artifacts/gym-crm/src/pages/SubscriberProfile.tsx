import {
  useGetSubscriber,
  useGetSubscriberPayments,
  useCreatePayment,
  useListPlans,
  getGetSubscriberQueryKey,
  getGetSubscriberPaymentsQueryKey,
  getListPaymentsQueryKey,
  getListPlansQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Edit, Clock, CreditCard, Calendar, Phone, MessageCircle, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState } from "react";

export default function SubscriberProfile() {
  const { id } = useParams();
  const subscriberId = parseInt(id as string, 10);
  const { toast } = useToast();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPlanId, setPaymentPlanId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: subscriber, isLoading } = useGetSubscriber(subscriberId, {
    query: { enabled: !!subscriberId, queryKey: getGetSubscriberQueryKey(subscriberId) }
  });
  const { data: payments, isLoading: isPaymentsLoading } = useGetSubscriberPayments(subscriberId, {
    query: { enabled: !!subscriberId, queryKey: getGetSubscriberPaymentsQueryKey(subscriberId) }
  });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const createPayment = useCreatePayment();

  const handlePlanChange = (planId: string) => {
    setPaymentPlanId(planId);
    const plan = plans?.find(p => p.id.toString() === planId);
    if (plan) setPaymentAmount(plan.price.toString());
  };

  const handleAddPayment = () => {
    if (!paymentPlanId || !paymentAmount) return;
    createPayment.mutate(
      {
        data: {
          subscriberId,
          planId: parseInt(paymentPlanId),
          amount: parseFloat(paymentAmount),
          paymentDate,
          extendSubscription: true,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubscriberPaymentsQueryKey(subscriberId) });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "To'lov muvaffaqiyatli qo'shildi" });
          setPaymentOpen(false);
          setPaymentPlanId("");
          setPaymentAmount("");
          setPaymentDate(new Date().toISOString().split("T")[0]);
        },
        onError: () => toast({ title: "To'lov qo'shishda xatolik", variant: "destructive" })
      }
    );
  };

  if (isLoading || !subscriber) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'Faol';
      case 'expired': return 'Tugagan';
      case 'pending': return 'Kutilmoqda';
      case 'blocked': return 'Bloklangan';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getPaymentLabel = (status: string) => {
    switch(status) {
      case 'paid': return "To'langan";
      case 'pending': return "Kutilmoqda";
      case 'overdue': return "Muddati o'tgan";
      default: return status;
    }
  };

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getHistoryPaymentLabel = (status: string) => {
    switch(status) {
      case 'confirmed': return "Tasdiqlangan";
      case 'pending': return "Kutilmoqda";
      case 'cancelled': return "Bekor qilingan";
      default: return status;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/subscribers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">A'zo profili</h1>
        </div>
        <Link href={`/admin/subscribers/${subscriberId}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" /> Tahrirlash
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mb-4">
                  {subscriber.firstName[0]}{subscriber.lastName[0]}
                </div>
                <h2 className="text-xl font-bold">{subscriber.firstName} {subscriber.lastName}</h2>
                <Badge className={`mt-2 ${getStatusColor(subscriber.status)} uppercase font-bold`}>
                  {getStatusLabel(subscriber.status)}
                </Badge>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{subscriber.phone}</span>
                </div>
                {subscriber.telegramChatId && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span>Telegram ulangan</span>
                  </div>
                )}
                {subscriber.notes && (
                  <div className="flex items-start gap-3 text-slate-600">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="whitespace-pre-wrap">{subscriber.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obuna ma'lumotlari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Joriy reja</span>
                  <div className="font-semibold text-lg">{subscriber.planName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Qolgan kun</span>
                  <div className={`font-bold text-xl flex items-center gap-2 ${subscriber.daysLeft <= 3 ? 'text-red-500' : 'text-primary'}`}>
                    <Clock className="h-5 w-5" />
                    {subscriber.daysLeft > 0 ? subscriber.daysLeft : 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Davr</span>
                  <div className="flex items-center gap-2 font-medium text-sm mt-1 flex-wrap">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    {format(new Date(subscriber.startDate), 'dd.MM.yyyy')} — {format(new Date(subscriber.endDate), 'dd.MM.yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">To'lov holati</span>
                  <div className="mt-1">
                    <Badge className={getPaymentColor(subscriber.paymentStatus)} variant="secondary">
                      {getPaymentLabel(subscriber.paymentStatus)}
                    </Badge>
                  </div>
                </div>
                {subscriber.debtAmount > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Qarz</span>
                    <div className="font-bold text-xl text-red-500 mt-1">
                      {subscriber.debtAmount.toLocaleString("uz")} so'm
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">To'lovlar tarixi</CardTitle>
              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="olmos-primary-btn gap-1">
                    <Plus className="h-4 w-4" /> To'lov qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Yangi to'lov</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Reja</Label>
                      <Select value={paymentPlanId} onValueChange={handlePlanChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Reja tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} — {p.price.toLocaleString("uz")} so'm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Miqdor (so'm)</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="mt-1"
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <Label>To'lov sanasi</Label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      className="w-full olmos-primary-btn"
                      onClick={handleAddPayment}
                      disabled={!paymentPlanId || !paymentAmount || createPayment.isPending}
                    >
                      To'lovni saqlash
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {isPaymentsLoading ? (
                <div className="p-6"><Skeleton className="h-20 w-full" /></div>
              ) : payments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">To'lovlar yo'q</div>
              ) : (
                <div className="divide-y">
                  {payments?.map(payment => (
                    <div key={payment.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-2 rounded-full shrink-0">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">
                            {Number(payment.amount).toLocaleString("uz")} so'm — {payment.planName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), 'dd.MM.yyyy')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0 text-xs">
                        {getHistoryPaymentLabel(payment.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
