import { useListSubscribers, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { Search, Plus, UserX, Clock, CreditCard, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscribers() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  // Initialize filter from URL params
  const urlStatus = params.get("status") ?? "all";
  const urlPayment = params.get("payment") ?? "";
  const urlExpiring = params.get("filter") === "expiring";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [paymentFilter, setPaymentFilter] = useState<string>(urlPayment);

  // Sync when URL changes (e.g. navigating from dashboard)
  useEffect(() => {
    setStatusFilter(urlStatus);
    setPaymentFilter(urlPayment);
  }, [urlStatus, urlPayment]);

  const queryParams = {
    search: search.length > 2 ? search : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    paymentStatus: (paymentFilter || undefined) as any,
  };

  const { data: subscribers, isLoading } = useListSubscribers(queryParams, {
    query: { queryKey: getListSubscribersQueryKey(queryParams) },
  });

  // Client-side filter for "expiring soon" (3 days)
  const filtered = urlExpiring && !paymentFilter
    ? (subscribers ?? []).filter(s => s.daysLeft >= 0 && s.daysLeft <= 3)
    : subscribers;

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

  // Banner for active filter from dashboard
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
      </div>

      {activeBanner && (
        <div className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          {activeBanner}
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
          <SelectTrigger className="w-full sm:w-[180px] h-11">
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
          {filtered?.map(sub => (
            <Link key={sub.id} href={`/admin/subscribers/${sub.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm border overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 mr-4">
                      {sub.firstName[0]}{sub.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-foreground truncate pr-2">{sub.firstName} {sub.lastName}</h3>
                        <Badge className={`${getStatusColor(sub.status)} text-[10px] uppercase font-bold shrink-0`}>
                          {getStatusLabel(sub.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{sub.phone}</p>

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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link href="/admin/subscribers/new" className="md:hidden">
        <Button
          size="icon"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 z-40 olmos-gem-bg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
