import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import {
  Home,
  Users,
  CreditCard,
  ClipboardList,
  Menu,
  LogOut,
  Settings,
  Image,
  Gem,
  List
} from "lucide-react";
import { useListApplications, getListApplicationsQueryKey } from "@workspace/api-client-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  const { data: applications } = useListApplications({ status: "pending" }, { query: { queryKey: getListApplicationsQueryKey({ status: "pending" }) } });
  const pendingCount = applications?.length || 0;

  const navItems = [
    { href: "/admin", icon: Home, label: "Bosh sahifa" },
    { href: "/admin/subscribers", icon: Users, label: "A'zolar" },
    { href: "/admin/payments", icon: CreditCard, label: "To'lovlar" },
    { href: "/admin/applications", icon: ClipboardList, label: "Arizalar", badge: pendingCount },
  ];

  const moreItems = [
    { href: "/admin/plans", icon: List, label: "Rejalar" },
    { href: "/admin/trainers", icon: Gem, label: "Murabbiylar" },
    { href: "/admin/gallery", icon: Image, label: "Galereya" },
    { href: "/admin/website", icon: Settings, label: "Sayt sozlamalari" },
  ];

  const NavLinks = () => (
    <div className="flex flex-col space-y-1">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={location === item.href ? "secondary" : "ghost"}
            className="w-full justify-start relative h-12"
          >
            <item.icon className="mr-2 h-5 w-5" />
            {item.label}
            {item.badge > 0 && (
              <Badge variant="destructive" className="absolute right-2 top-1/2 -translate-y-1/2">
                {item.badge}
              </Badge>
            )}
          </Button>
        </Link>
      ))}
      <div className="h-4" />
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Boshqaruv</div>
      {moreItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={location === item.href ? "secondary" : "ghost"}
            className="w-full justify-start h-12"
          >
            <item.icon className="mr-2 h-5 w-5" />
            {item.label}
          </Button>
        </Link>
      ))}
      <div className="h-4" />
      <Button
        variant="ghost"
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 h-12"
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-5 w-5" />
        Chiqish
      </Button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r min-h-[100dvh]">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="olmos-gem-bg p-1.5 rounded-md text-white">
            <Gem className="h-5 w-5" />
          </div>
          <span className="font-black text-xl olmos-gradient-text uppercase tracking-tight">OLMOS FITNESS</span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b h-14 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="olmos-gem-bg p-1 rounded-md text-white">
            <Gem className="h-5 w-5" />
          </div>
          <span className="font-black text-lg olmos-gradient-text uppercase tracking-tight">OLMOS</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden relative">
              <Menu className="h-6 w-6" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 flex flex-col">
            <div className="p-4 border-b flex items-center gap-2">
              <Gem className="h-5 w-5 text-primary" />
              <span className="font-black text-lg olmos-gradient-text uppercase">Menyu</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-30 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1 h-full">
              <div className={`flex flex-col items-center justify-center h-full space-y-1 relative ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon className={`h-5 w-5 ${isActive ? 'fill-primary/10' : ''}`} />
                <span className="text-[10px] font-semibold">{item.label}</span>
                {item.badge > 0 && (
                  <Badge variant="destructive" className="absolute top-1 right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px] rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
