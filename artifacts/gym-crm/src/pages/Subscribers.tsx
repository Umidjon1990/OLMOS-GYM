import { useListSubscribers, useBulkDeleteSubscribers, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { Search, Plus, UserX, Clock, CreditCard, Upload, Trash2, CheckSquare, Square, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Subscribers() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const { toast } = useToast();

  const urlStatus = params.get("status") ?? "all";
  const urlPayment = params.get("payment") ?? "";
  const urlExpiring = params.get("filter") === "expiring";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [paymentFilter, setPaymentFilter] = useState<string>(urlPayment);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setStatusFilter(urlStatus);
    setPaymentFilter(urlPayment);
  }, [urlStatus, urlPayment]);

  // Exit select mode when filters change
  useEffect(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, [statusFilter, paymentFilter, search]);

  const queryParams = {
    search: search.length > 2 ? search : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    paymentStatus: (paymentFilter || undefined) as any,
  };

  const { data: subscribers, isLoading } = useListSubscribers(queryParams, {
    query: { queryKey: getListSubscribersQueryKey(queryParams) },
  });

  const bulkDelete = useBulkDeleteSubscribers({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({}) });
        toast({ title: `${selected.size} ta a'zo o'chirildi` });
        setSelected(new Set());
        setSelectMode(false);
      },
      onError: () => toast({ title: "O'chirishda xatolik", variant: "destructive" }),
    },
  });

  const filtered = urlExpiring && !paymentFilter
    ? (subscribers ?? []).filter(s => s.daysLeft >= 0 && s.daysLeft <= 3)
    : subscribers;

  const allIds = (filtered ?? []).map(s => s.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} ta a'zoni o'chirishni tasdiqlaysizmi?`)) return;
    bulkDelete.mutate({ data: { ids: Array.from(selected) } });
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'Faol';
      case 'expired': return 'Muddati tugagan';
      case 'pending': return 'Kutilmoqda';
      case 'blocked': return 'Bloklangan';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500 hover:bg-green-600';
      case 'expired': return 'bg-red-500 hover:bg-red-600';
      case 'pending': return 'bg-amber-500 hover:bg-amber-600';
      case 'blocked': return 'bg-slate-500 hover:bg-slate-600';
      default: return 'bg-slate-500';
    }
  };

  const getPaymentLabel = (status: string) => {
    switch(status) {
      case 'paid': return "To'langan";
      case 'pending': return "Qarz";
      case 'overdue': return "Muddati o'tgan";
      default: return status;
    }
  };

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-600';
      case 'pending': return 'text-amber-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-slate-500';
    }
  };

  const activeBanner = urlExpiring
    ? "⏰ Yaqin orada tugaydiganlar (3 kun)"
    : paymentFilter === "pending"
    ? "⚠️ Qarzdorlar ro'yxati"
    : statusFilter === "active"
    ? "✅ Faol a'zolar"
    : null;

  return (
    <div className="p-4 md:p-8 space-y-5 pb-24 md:pb-8 relative min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">A'zolar</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectMode(false); setSelected(new Set()); }}
            >
              <X className="h-4 w-4 mr-1" /> Bekor
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectMode(true)}
                className="hidden md:flex font-semibold gap-1.5"
              >
                <CheckSquare className="h-4 w-4" /> Tanlash
              </Button>
              <div className="hidden md:flex gap-2">
                <Link href="/admin/subscribers/bulk">
                  <Button variant="outline" className="font-semibold gap-1.5">
                    <Upload className="h-4 w-4" /> Bulk import
                  </Button>
                </Link>
                <Link href="/admin/subscribers/new">
                  <Button className="olmos-primary-btn font-semibold">
                    <Plus className="mr-2 h-4 w-4" /> Yangi a'zo
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {activeBanner && (
        <div className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          {activeBanner}
        </div>
      )}

      {/* Bulk action bar */}
      {selectMode && (
        <div className="flex items-center gap-3 bg-secondary/80 border rounded-xl px-4 py-3 sticky top-14 md:top-0 z-30">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-semibold shrink-0">
            {allSelected
              ? <CheckSquare className="h-5 w-5 text-primary" />
              : <Square className="h-5 w-5 text-muted-foreground" />}
            {allSelected ? "Hammasini bekor qil" : "Hammasini tanlash"}
          </button>
          <span className="text-sm text-muted-foreground flex-1">
            {selected.size > 0 ? `${selected.size} ta tanlandi` : ""}
          </span>
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0 || bulkDelete.isPending}
            onClick={handleBulkDelete}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            O'chirish ({selected.size})
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sticky top-14 md:top-0 bg-background/95 z-20 py-2 backdrop-blur">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism yoki telefon bo'yicha qidiring..."
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-[160px] h-11">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            <SelectItem value="active">Faol</SelectItem>
            <SelectItem value="expired">Muddati tugagan</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="blocked">Bloklangan</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setPaymentFilter(paymentFilter === "pending" ? "" : "pending")}
          className={`h-11 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            paymentFilter === "pending"
              ? "bg-red-500 text-white border-red-500"
              : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Qarzdorlar
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <UserX className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">A'zo topilmadi</h3>
          <p className="text-muted-foreground max-w-sm mt-2">Filtr yoki qidiruvni o'zgartiring.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map(sub => {
            const isChecked = selected.has(sub.id);
            return (
              <div key={sub.id} className="relative">
                {selectMode && (
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1"
                    onClick={(e) => toggleSelect(sub.id, e)}
                  >
                    {isChecked
                      ? <CheckSquare className="h-5 w-5 text-primary" />
                      : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>
                )}
                <Link href={selectMode ? "#" : `/admin/subscribers/${sub.id}`}>
                  <Card
                    className={`hover:border-primary/50 transition-colors cursor-pointer shadow-sm border overflow-hidden ${isChecked ? "border-primary bg-primary/5" : ""}`}
                    onClick={selectMode ? (e) => toggleSelect(sub.id, e as any) : undefined}
                  >
                    <CardContent className="p-0">
                      <div className={`flex items-center p-4 ${selectMode ? "pl-12" : ""}`}>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 mr-4">
                          {(sub.firstName?.[0] || sub.lastName?.[0] || "?")}{sub.firstName && sub.lastName ? sub.lastName[0] : ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-foreground truncate pr-2">
                              {sub.firstName || sub.lastName ? `${sub.firstName} ${sub.lastName}`.trim() : "Noma'lum"}
                            </h3>
                            <Badge className={`${getStatusColor(sub.status)} text-[10px] uppercase font-bold shrink-0`}>
                              {getStatusLabel(sub.status)}
                            </Badge>
                          </div>
                          <a
                            href={`tel:${sub.phone}`}
                            className="text-sm text-primary underline underline-offset-2 hover:opacity-80 active:opacity-60 transition-opacity truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sub.phone || "—"}
                          </a>

                          <div className="flex items-center gap-3 mt-3 text-xs font-medium flex-wrap">
                            <div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-md">
                              <span className="truncate max-w-[100px]">{sub.planName}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Clock className="h-3.5 w-3.5" />
                              <span className={sub.daysLeft <= 3 ? "text-red-500 font-bold" : ""}>
                                {sub.daysLeft > 0 ? `${sub.daysLeft} kun qoldi` : 'Tugagan'}
                              </span>
                            </div>
                            <div className={`flex items-center gap-1 ${getPaymentColor(sub.paymentStatus)} ml-auto`}>
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{getPaymentLabel(sub.paymentStatus)}</span>
                            </div>
                            {sub.debtAmount > 0 && (
                              <div className="flex items-center gap-1 text-red-500 font-bold bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md w-full justify-center mt-1">
                                <span>Qarz: {sub.debtAmount.toLocaleString("uz")} so'm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile: select mode toggle */}
      {!selectMode ? (
        <>
          <Link href="/admin/subscribers/new" className="md:hidden">
            <Button
              size="icon"
              className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 z-40 olmos-gem-bg"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed bottom-20 left-6 h-12 w-12 rounded-full shadow-lg z-40"
            onClick={() => setSelectMode(true)}
          >
            <CheckSquare className="h-5 w-5" />
          </Button>
        </>
      ) : (
        selected.size > 0 && (
          <Button
            variant="destructive"
            className="md:hidden fixed bottom-20 right-6 h-14 rounded-full shadow-xl z-40 px-6 gap-2"
            disabled={bulkDelete.isPending}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-5 w-5" />
            O'chirish ({selected.size})
          </Button>
        )
      )}
    </div>
  );
}
