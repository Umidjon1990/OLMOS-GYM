import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gem, Loader2, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const ok = await login(username.trim(), password);
      if (ok) {
        setLocation("/admin");
      } else {
        toast({
          title: "Kirish amalga oshmadi",
          description: "Login yoki parol noto'g'ri",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Xatolik",
        description: "Serverga ulanib bo'lmadi. Qayta urinib ko'ring.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="olmos-gem-bg p-3 rounded-2xl text-white mb-4 shadow-lg shadow-blue-500/30">
            <Gem className="h-8 w-8" />
          </div>
          <h1 className="font-black text-2xl text-white uppercase tracking-tight">
            OLMOS FITNESS
          </h1>
          <p className="text-slate-400 text-sm mt-1">Admin panelga kirish</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="username">Foydalanuvchi nomi</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                className="pl-9 h-12"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Parol</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-9 h-12"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full olmos-primary-btn h-12 text-base font-semibold gap-2"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Kirilmoqda...
              </>
            ) : (
              "Kirish"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
