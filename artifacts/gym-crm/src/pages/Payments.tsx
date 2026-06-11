import {
  useListPayments,
  useConfirmPayment,
  useCreatePayment,
  useListSubscribers,
  useListPlans,
  getListPaymentsQueryKey,
  getListSubscribersQueryKey,
  getListPlansQueryKey,
} from "@workspace/api-client-react";
import { Check, CreditCard, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useSearch } from "wouter";

export default function Payments() {
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const urlStatusFilter = urlParams.get("status") ?? "all";

  const [statusView, setStatusView] = useState<string>(urlStatusFilter);

  const { data: allPayments, isLoading } = useListPayments({ query: { queryKey: getListPaymentsQueryKey() } });
  const payments = statusView === "all"
    ? allPayments
    : allPayments?.filter(p => p.status === statusView);
  const confirmPayment = useConfirmPayment();
  const createPayment = useCreatePayment();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [subscriberId, setSubscriberId] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: subscribers } = useListSubscribers({}, { query: { queryKey: getListSubscribersQueryKey({}) } });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });

  const handlePlanChange = (pid: string) => {
    setPlanId(pid);
    const plan = plans?.find(p => p.id.toString() === pid);
    if (plan) setAmount(plan.price.toString());
  };

  const handleConfirm = (id: number) => {
    confirmPayment.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "To'lov tasdiqlandi" });
        },
        onError: () => toast({ title: "Tasdiqlashda xatolik", variant: "destructive" })
      }
    );
  };

  const handleCreate = () => {
    if (!subscriberId || !planId || !amount) return;
    createPayment.mutate(
      {
        data: {
          subscriberId: parseInt(subscriberId),
          planId: parseInt(planId),
          amount: parseFloat(amount),
          paymentDate,
          extendSubscription: true,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "To'lov muvaffaqiyatli qo'shildi" });
          setOpen(false);
          setSubscriberId("");
          setPlanId("");
          setAmount("");
          setPaymentDate(new Date().toISOString().split("T")[0]);
        },
        onError: () => toast({ title: "To'lov qo'shishda xatolik", variant: "destructive" })
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-green-500 hover:bg-green-600">Tasdiqlangan</Badge>;
      case 'pending': return <Badge className="bg-amber-500 hover:bg-amber-600">Kutilmoqda</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 hover:bg-red-600">Bekor qilingan</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">To'lovlar</h1>
          <div className="flex gap-2 mt-2">
            {[
              { value: "all", label: "Barchasi" },
              { value: "pending", label: "⏳ Kutilmoqda" },
              { value: "confirmed", label: "✅ Tasdiqlangan" },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusView(tab.value)}
                className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${
                  statusView === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="olmos-primary-btn gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yangi to'lov</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Yangi to'lov qo'shish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>A'zo</Label>
                <Select value={subscriberId} onValueChange={setSubscriberId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="A'zo tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscribers?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.firstName} {s.lastName} ({s.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reja</Label>
                <Select value={planId} onValueChange={handlePlanChange}>
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
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
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
                onClick={handleCreate}
                disabled={!subscriberId || !planId || !amount || createPayment.isPending}
              >
                To'lovni saqlash
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : payments?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <CreditCard className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">To'lovlar yo'q</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {payments?.map(payment => (
            <Card key={payment.id} className="overflow-hidden shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${
                    payment.status === 'pending'
                      ? 'bg-amber-100 text-amber-600'
                      : payment.status === 'confirmed'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{payment.subscriberName}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-semibold text-primary">
                        {Number(payment.amount).toLocaleString("uz")} so'm
                      </span>
                      <span className="text-muted-foreground text-sm border-l pl-2">{payment.planName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(payment.paymentDate), 'dd.MM.yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {getStatusBadge(payment.status)}
                  {payment.status === 'pending' && (
                    <Button
                      size="sm"
                      className="olmos-primary-btn"
                      onClick={() => handleConfirm(payment.id)}
                      disabled={confirmPayment.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" /> Tasdiqlash
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
