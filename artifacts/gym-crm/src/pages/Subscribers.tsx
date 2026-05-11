import { useListSubscribers, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { Search, Plus, UserX, UserCheck, Clock, CreditCard } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscribers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: subscribers, isLoading } = useListSubscribers(
    { search: search.length > 2 ? search : undefined, status: statusFilter !== "all" ? statusFilter as any : undefined },
    { query: { queryKey: getListSubscribersQueryKey({ search: search.length > 2 ? search : undefined, status: statusFilter !== "all" ? statusFilter as any : undefined }) } }
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500 hover:bg-green-600';
      case 'expired': return 'bg-red-500 hover:bg-red-600';
      case 'pending': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-slate-500';
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

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8 relative min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscribers</h1>
        <Link href="/admin/subscribers/new" className="hidden md:block">
          <Button className="font-semibold"><Plus className="mr-2 h-4 w-4"/> New Member</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sticky top-14 md:top-0 bg-background/95 z-20 py-2 backdrop-blur">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : subscribers?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <UserX className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No subscribers found</h3>
          <p className="text-muted-foreground max-w-sm mt-2">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscribers?.map(sub => (
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
                          {sub.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{sub.phone}</p>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs font-medium">
                        <div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-md">
                          <span className="truncate max-w-[100px]">{sub.planName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock className="h-3.5 w-3.5" />
                          <span className={sub.daysLeft <= 3 ? "text-red-500 font-bold" : ""}>
                            {sub.daysLeft > 0 ? `${sub.daysLeft} days left` : 'Expired'}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 ${getPaymentColor(sub.paymentStatus)} ml-auto`}>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span className="capitalize">{sub.paymentStatus}</span>
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

      {/* Floating Action Button for Mobile */}
      <Link href="/admin/subscribers/new" className="md:hidden">
        <Button 
          size="icon" 
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 z-40"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}