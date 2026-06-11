import { type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Subscribers from "@/pages/Subscribers";
import SubscriberProfile from "@/pages/SubscriberProfile";
import SubscriberForm from "@/pages/SubscriberForm";
import Plans from "@/pages/Plans";
import Payments from "@/pages/Payments";
import Applications from "@/pages/Applications";
import WebsiteSettingsPage from "@/pages/WebsiteSettings";
import Gallery from "@/pages/Gallery";
import Trainers from "@/pages/Trainers";
import TelegramSettings from "@/pages/TelegramSettings";
import BulkImport from "@/pages/BulkImport";
import AdminLayout from "@/components/layout/AdminLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function FullScreenLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  return isAuthenticated ? <Redirect to="/admin" /> : <Home />;
}

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {() => (
        <Protected>
          <AdminLayout>
            <Component />
          </AdminLayout>
        </Protected>
      )}
    </Route>
  );
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated) return <Redirect to="/admin" />;
  return <Login />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginRoute} />

      <ProtectedRoute path="/admin" component={Dashboard} />
      <ProtectedRoute path="/admin/subscribers" component={Subscribers} />
      <ProtectedRoute path="/admin/subscribers/new" component={SubscriberForm} />
      <ProtectedRoute path="/admin/subscribers/bulk" component={BulkImport} />
      <ProtectedRoute path="/admin/subscribers/:id/edit" component={SubscriberForm} />
      <ProtectedRoute path="/admin/subscribers/:id" component={SubscriberProfile} />
      <ProtectedRoute path="/admin/plans" component={Plans} />
      <ProtectedRoute path="/admin/payments" component={Payments} />
      <ProtectedRoute path="/admin/applications" component={Applications} />
      <ProtectedRoute path="/admin/website" component={WebsiteSettingsPage} />
      <ProtectedRoute path="/admin/gallery" component={Gallery} />
      <ProtectedRoute path="/admin/trainers" component={Trainers} />
      <ProtectedRoute path="/admin/telegram" component={TelegramSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </QueryClientProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
