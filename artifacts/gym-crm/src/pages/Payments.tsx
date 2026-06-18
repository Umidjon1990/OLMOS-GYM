import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useListSubscribers,
  useListPlans,
  getListPaymentsQueryKey,
  getListSubscribersQueryKey,
  getListPlansQueryKey,
} from "@workspace/api-client-react";
import { CreditCard, Calendar, Plus, ChevronsUpDown, Search, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import { useState, useMemo } from "react";
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

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subscriberId, setSubscriberId] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const [editOpen, setEditOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<{ id: number; amount: string; paymentDate: string; notes: string } | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: subscribers } = useListSubscribers({}, { query: { queryKey: getListSubscribersQueryKey({}) } });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });

  const selectedSubscriber = useMemo(
    () => subscribers?.find(s => s.id.toString() === subscriberId),
    [subscribers, subscriberId]
  );

  const selectedPlan = useMemo(
    () => plans?.find(p => p.id.toString() === planId),
    [plans, planId]
  );

  const newEndDate = useMemo(() => {
    if (!selectedSubscriber?.endDate || !selectedPlan?.durationDays) return null;
    const base = new Date(selectedSubscriber.endDate);
    return addDays(base, selectedPlan.durationDays);
  }, [selectedSubscriber, selectedPlan]);

  const handleSubscriberSelect = (sid: string) => {
    setSubscriberId(sid);
    setSubOpen(false);
    const sub = subscribers?.find(s => s.id.toString() === sid);
    if (sub) {
      const matchingPlan = plans?.find(p => p.id === sub.planId);
      if (matchingPlan) {
        setPlanId(matchingPlan.id.toString());
        setAmount(matchingPlan.price.toString());
      }
    }
  };

  const handlePlanChange = (pid: string) => {
    setPlanId(pid);
    const plan = plans?.find(p => p.id.toString() === pid);
    if (plan) setAmount(plan.price.toString());
  };

  const resetForm = () => {
    setSubscriberId("");
    setPlanId("");
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
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
          queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({}) });
          toast({ title: "✅ To'lov qabul qilindi va bildirishnomalar yuborildi" });
          setOpen(false);
          resetForm();
        },
        onError: () => toast({ title: "To'lov qo'shishda xatolik", variant: "destructive" })
      }
    );
  };

  const openEditDialog = (p: { id: number; amount: number; paymentDate: string; notes?: string | null }) => {
    setEditPayment({
      id: p.id,
      amount: String(p.amount),
      paymentDate: p.paymentDate,
      notes: p.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editPayment) return;
    updatePayment.mutate(
      {
        id: editPayment.id,
        data: {
          amount: parseFloat(editPayment.amount),
          paymentDate: editPayment.paymentDate,
          notes: editPayment.notes,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "✅ To'lov tahrirlandi" });
          setEditOpen(false);
          setEditPayment(null);
        },
        onError: () => toast({ title: "Tahrirlashda xatolik", variant: "destructive" })
      }
    );
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deletePayment.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "🗑 To'lov o'chirildi" });
          setDeleteOpen(false);
          setDeleteId(null);
        },
        onError: () => toast({ title: "O'chirishda xatolik", variant: "destructive" })
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500 hover:bg-green-600 text-white">✅ Tasdiqlangan</Badge>;
      case 'pending':   return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">⏳ Kutilmoqda</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 hover:bg-red-600 text-white">❌ Bekor qilingan</Badge>;
      default:          return <Badge variant="outline">{status}</Badge>;
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
              { value: "confirmed", label: "✅ Tasdiqlangan" },
              { value: "cancelled", label: "❌ Bekor qilingan" },
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

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
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
                <Popover open={subOpen} onOpenChange={setSubOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full mt-1 justify-between font-normal h-10">
                      {selectedSubscriber
                        ? `${selectedSubscriber.firstName} ${selectedSubscriber.lastName}`.trim() || selectedSubscriber.phone || "A'zo"
                        : "A'zo qidiring..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Ism, familiya yoki telefon..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="flex flex-col items-center py-4 text-muted-foreground">
                            <Search className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-sm">A'zo topilmadi</p>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {subscribers?.map(s => {
                            const name = `${s.firstName} ${s.lastName}`.trim() || "Noma'lum";
                            return (
                              <CommandItem
                                key={s.id}
                                value={`${s.firstName} ${s.lastName} ${s.phone}`}
                                onSelect={() => handleSubscriberSelect(s.id.toString())}
                                className="flex flex-col items-start gap-0.5 cursor-pointer"
                              >
                                <span className="font-medium">{name}</span>
                                <span className="text-xs text-muted-foreground">{s.phone || "—"}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedSubscriber && (
                  <div className="mt-2 text-xs rounded-lg border border-border bg-secondary/50 px-3 py-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joriy muddat tugashi:</span>
                      <span className="font-semibold text-amber-600">
                        {format(new Date(selectedSubscriber.endDate), 'dd.MM.yyyy')}
                      </span>
                    </div>
                    {newEndDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Yangi muddat tugashi:</span>
                        <span className="font-semibold text-green-600">
                          {format(newEndDate, 'dd.MM.yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
                <Label>To'lov qabul qilingan sana</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obuna muddati a'zoning oxirgi tugash sanasidan hisoblanadi.
                </p>
              </div>

              <Button
                className="w-full olmos-primary-btn"
                onClick={handleCreate}
                disabled={!subscriberId || !planId || !amount || createPayment.isPending}
              >
                {createPayment.isPending ? "Saqlanmoqda..." : "✅ To'lovni qabul qilish"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
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
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-full shrink-0 ${
                    payment.status === 'cancelled'
                      ? 'bg-red-100 text-red-500'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{payment.subscriberName}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-semibold text-primary">
                        {Number(payment.amount).toLocaleString("uz")} so'm
                      </span>
                      <span className="text-muted-foreground text-sm border-l pl-2">{payment.planName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(payment.paymentDate), 'dd.MM.yyyy')}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">📝 {payment.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  {getStatusBadge(payment.status)}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 gap-1 text-xs"
                      onClick={() => openEditDialog(payment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Tahrirlash</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => openDeleteConfirm(payment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">O'chirish</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditPayment(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>To'lovni tahrirlash</DialogTitle>
          </DialogHeader>
          {editPayment && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Miqdor (so'm)</Label>
                <Input
                  type="number"
                  value={editPayment.amount}
                  onChange={e => setEditPayment({ ...editPayment, amount: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={editPayment.paymentDate}
                  onChange={e => setEditPayment({ ...editPayment, paymentDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Izoh (ixtiyoriy)</Label>
                <Input
                  value={editPayment.notes}
                  onChange={e => setEditPayment({ ...editPayment, notes: e.target.value })}
                  className="mt-1"
                  placeholder="Masalan: qisman to'lov..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setEditOpen(false); setEditPayment(null); }}
                >
                  Bekor qilish
                </Button>
                <Button
                  className="flex-1 olmos-primary-btn"
                  onClick={handleEdit}
                  disabled={updatePayment.isPending}
                >
                  {updatePayment.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteId(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              To'lovni o'chirish
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ushbu to'lov yozuvini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setDeleteOpen(false); setDeleteId(null); }}
            >
              <X className="h-4 w-4 mr-1" /> Bekor
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deletePayment.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deletePayment.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
