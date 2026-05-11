import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Users, Clock, CreditCard, Activity, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });

  if (isLoading || !stats) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <Link href="/admin/subscribers/new">
          <Button>Add Member</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground mt-1">out of {stats.totalSubscribers} total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 3 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayment}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires action</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.planBreakdown.map((plan, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-sm font-medium">{plan.planName}</div>
                  <div className="text-sm font-bold bg-secondary px-3 py-1 rounded-full">{plan.count} members</div>
                </div>
              ))}
              {stats.planBreakdown.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">No active plans</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}