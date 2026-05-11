import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Users, Clock, CreditCard, TrendingDown, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });

  if (isLoading || !stats) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bosh sahifa</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Faol a'zolar",
      value: stats.activeSubscribers,
      sub: `Jami ${stats.totalSubscribers} ta dan`,
      icon: <Users className="h-4 w-4 text-primary" />,
      border: "border-l-primary",
      href: "/admin/subscribers?status=active",
    },
    {
      title: "Yaqin orada tugaydiganlar",
      value: stats.expiringSoon,
      sub: "Keyingi 3 kun ichida",
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      border: "border-l-amber-500",
      href: "/admin/subscribers?filter=expiring",
    },
    {
      title: "Qarzdorlar",
      value: stats.pendingPayment,
      sub: "To'lov qilinmagan",
      icon: <TrendingDown className="h-4 w-4 text-red-500" />,
      border: "border-l-red-500",
      href: "/admin/subscribers?payment=pending",
    },
    {
      title: "To'lov kutilayotganlar",
      value: (stats as any).pendingPaymentsCount ?? 0,
      sub: "Tasdiq kutmoqda",
      icon: <CreditCard className="h-4 w-4 text-orange-500" />,
      border: "border-l-orange-500",
      href: "/admin/payments?status=pending",
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bosh sahifa</h1>
        <Link href="/admin/subscribers/new">
          <Button>➕ A'zo qo'shish</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className={`border-l-4 ${card.border} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer h-full`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rejalar bo'yicha</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.planBreakdown.map((plan, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-sm font-medium">{plan.planName}</div>
                  <div className="text-sm font-bold bg-secondary px-3 py-1 rounded-full">{plan.count} ta</div>
                </div>
              ))}
              {stats.planBreakdown.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">Faol rejalar yo'q</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Umumiy daromad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.totalRevenue.toLocaleString("uz")} so'm
            </div>
            <p className="text-sm text-muted-foreground mt-2">Barcha vaqt uchun tasdiqlangan to'lovlar</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
