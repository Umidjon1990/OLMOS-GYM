import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";

interface BotStatus {
  enabled: boolean;
  botName?: string;
  botUsername?: string;
  adminChatIdSet?: boolean;
  message?: string;
}

export default function TelegramSettings() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/telegram/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ enabled: false, message: "API ga ulanib bo'lmadi" });
    }
  }

  async function saveAdminChat() {
    if (!chatId.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/telegram/set-admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatId.trim() }),
      });
      if (res.ok) {
        setSaveMsg("✅ Muvaffaqiyatli saqlandi! Telegram ga tasdiqlash xabari yuborildi.");
        setChatId("");
        fetchStatus();
      } else {
        setSaveMsg("❌ Saqlashda xatolik yuz berdi.");
      }
    } catch {
      setSaveMsg("❌ Serverga ulanib bo'lmadi.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg("");
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      if (res.ok) {
        setTestMsg("✅ Test xabari yuborildi!");
      } else {
        const d = await res.json();
        setTestMsg(`❌ ${d.error || "Xatolik"}`);
      }
    } catch {
      setTestMsg("❌ Serverga ulanib bo'lmadi.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> Telegram Bot
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Yangi arizalar va to'lovlar haqida Telegram orqali xabar oling.
          </p>
        </div>

        {/* Bot status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bot holati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === null ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda...
              </div>
            ) : status.enabled ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-700">Bot faol</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Bot nomi: <span className="font-medium text-foreground">{status.botName}</span></div>
                  <div>Username: <span className="font-mono font-medium text-foreground">@{status.botUsername}</span></div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {status.adminChatIdSet ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" /> Admin ulangan
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      <XCircle className="h-3 w-3 mr-1" /> Admin chat ID yo'q
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600">{status.message || "Bot ulangmagan"}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1-qadam: Botga yozing</CardTitle>
            <CardDescription>
              Chat ID olish uchun botga /start yuboring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`https://t.me/${status?.botUsername || "olmos_fitness_bot"}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                @{status?.botUsername || "..."} botni ochish
              </Button>
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Bot ochilganda <code className="bg-muted px-1 py-0.5 rounded">/start</code> yoki{" "}
              <code className="bg-muted px-1 py-0.5 rounded">/chatid</code> buyrug'ini yuboring.
              Bot sizning Chat ID ni ko'rsatadi.
            </p>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2-qadam: Chat ID kiriting</CardTitle>
            <CardDescription>
              Botdan olgan Chat ID raqamini kiriting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Masalan: 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveAdminChat()}
                type="number"
              />
              <Button
                onClick={saveAdminChat}
                disabled={saving || !chatId.trim()}
                className="olmos-primary-btn"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
              </Button>
            </div>
            {saveMsg && (
              <p className="text-sm">{saveMsg}</p>
            )}
          </CardContent>
        </Card>

        {/* Test */}
        {status?.adminChatIdSet && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Test xabar</CardTitle>
              <CardDescription>Bot to'g'ri ulanganini tekshirish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={sendTest} disabled={testing} variant="outline" className="gap-2">
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Test xabar yuborish
              </Button>
              {testMsg && <p className="text-sm">{testMsg}</p>}
            </CardContent>
          </Card>
        )}

        {/* What bot does */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bot nima qiladi?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-lg">📬</span>
                <span>Yangi ariza kelganda darhol xabar yuboradi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>To'lov tasdiqlanganida xabar yuboradi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">💬</span>
                <span><code className="bg-muted px-1 rounded">/chatid</code> — Chat ID ni ko'rsatadi</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
