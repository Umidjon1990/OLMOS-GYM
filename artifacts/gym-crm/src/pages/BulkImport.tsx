import { useRef, useState } from "react";
import { useListPlans, getListPlansQueryKey, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ParsedRow {
  firstName: string;
  lastName: string;
  phone: string;
  startDate: string;
  error?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  // DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  return null;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  // Skip header row
  const dataLines = lines.slice(1);
  return dataLines.map((line, i) => {
    // Handle quoted fields
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const [firstName = "", lastName = "", phone = "", rawDate = ""] = cols;
    const startDate = parseDate(rawDate);

    const errors: string[] = [];
    if (!firstName) errors.push("Ism bo'sh");
    if (!lastName) errors.push("Familiya bo'sh");
    if (!phone) errors.push("Telefon bo'sh");
    if (!startDate) errors.push(`Sana noto'g'ri: "${rawDate}"`);

    return {
      firstName,
      lastName,
      phone,
      startDate: startDate ?? "",
      error: errors.length ? errors.join("; ") : undefined,
    };
  });
}

function downloadTemplate() {
  const header = "Ism,Familiya,Telefon,Kelgan_sana";
  const examples = [
    "Aziz,Karimov,+998901234567,01.06.2026",
    "Malika,Yusupova,+998911234567,15.06.2026",
  ].join("\n");
  const csv = `${header}\n${examples}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "olmos_fitness_shablon.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const { toast } = useToast();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const validRows = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!planId || validRows.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: parseInt(planId),
          paymentStatus,
          rows: validRows.map(r => ({
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            startDate: r.startDate,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ImportResult = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({}) });
      toast({ title: `✅ ${data.imported} ta a'zo muvaffaqiyatli qo'shildi!` });
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/subscribers">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk import</h1>
          <p className="text-muted-foreground text-sm">Excel/CSV shablon orqali bir vaqtda ko'p a'zo qo'shish</p>
        </div>
      </div>

      {/* Step 1 — Download template */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">1</span>
            Shablon yuklab oling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            CSV faylni yuklab oling, to'ldiring va qayta yuklang.
            Sana formati: <code className="bg-secondary px-1 rounded text-xs">01.06.2026</code> yoki <code className="bg-secondary px-1 rounded text-xs">2026-06-01</code>
          </p>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Shablon yuklab olish (.csv)
          </Button>
          <div className="text-xs text-muted-foreground border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["Ism", "Familiya", "Telefon", "Kelgan_sana"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-1.5">Aziz</td>
                  <td className="px-3 py-1.5">Karimov</td>
                  <td className="px-3 py-1.5">+998901234567</td>
                  <td className="px-3 py-1.5">01.06.2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Upload file */}
      <Card className="border-l-4 border-l-amber-500 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="bg-amber-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">2</span>
            To'ldirilgan faylni yuklang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors
              ${fileName ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/50"}`}
          >
            {fileName ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                <span className="font-semibold text-primary">{fileName}</span>
                <span className="text-xs text-muted-foreground mt-1">{rows.length} ta satr topildi — boshqa fayl tanlash uchun bosing</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <span className="font-semibold">CSV faylni shu yerga tashlang yoki bosing</span>
                <span className="text-xs text-muted-foreground mt-1">.csv, .txt formatlar qabul qilinadi</span>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      {/* Step 3 — Preview + settings */}
      {rows.length > 0 && (
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">3</span>
              Ko'rib chiqing va import qiling
              <div className="ml-auto flex gap-2">
                {validRows.length > 0 && (
                  <Badge className="bg-green-500 hover:bg-green-600">{validRows.length} ta to'g'ri</Badge>
                )}
                {invalidRows.length > 0 && (
                  <Badge className="bg-red-500 hover:bg-red-600">{invalidRows.length} ta xato</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan & payment status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Reja *</label>
                {!plans ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={planId} onValueChange={setPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Reja tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} — {Number(p.price).toLocaleString("uz")} so'm ({p.durationDays} kun)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">To'lov holati</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⚠️ Qarz (to'lanmagan)</SelectItem>
                    <SelectItem value="paid">✅ To'langan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview table */}
            <div className="border rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Ism Familiya</th>
                    <th className="px-3 py-2 text-left font-semibold">Telefon</th>
                    <th className="px-3 py-2 text-left font-semibold">Kelgan sana</th>
                    <th className="px-3 py-2 text-left font-semibold">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-t ${row.error ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.firstName} {row.lastName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.startDate || "—"}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <div className="flex items-center gap-1 text-red-500 text-xs">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{row.error}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Tayyor</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Xatolik bor satrlar o'tkazib yuboriladi. Faqat {validRows.length} ta to'g'ri satr import qilinadi.</span>
              </div>
            )}

            <Button
              className="w-full olmos-primary-btn h-12 text-base font-semibold gap-2"
              onClick={handleImport}
              disabled={loading || !planId || validRows.length === 0}
            >
              {loading ? (
                <span className="animate-pulse">Import qilinmoqda...</span>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  {validRows.length} ta a'zoni import qilish
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/10">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Import muvaffaqiyatli!</h3>
                <p className="text-muted-foreground text-sm">
                  {result.imported} ta qo'shildi
                  {result.skipped > 0 ? `, ${result.skipped} ta o'tkazib yuborildi` : ""}
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="h-3 w-3 shrink-0" /> {e}
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/subscribers">
              <Button className="olmos-primary-btn gap-2">
                A'zolar ro'yxatiga o'tish
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
