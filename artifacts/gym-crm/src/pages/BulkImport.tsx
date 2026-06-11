import { useRef, useState, useEffect } from "react";
import { useListPlans, getListPlansQueryKey, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, ArrowLeft, FileSpreadsheet, ClipboardPaste, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ParsedRow {
  firstName: string;
  lastName: string;
  phone: string;
  startDate: string;
  amountPaid: number | null;
  error?: string;
}

function parseAmount(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  // Remove spaces, apostrophes and common thousands separators
  const cleaned = raw.replace(/[\s'`]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : Math.max(0, n);
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  return null;
}

function parseLine(line: string): string[] {
  // Tab-separated (Excel paste)
  if (line.includes("\t")) {
    return line.split("\t").map(c => c.trim());
  }
  // Quoted CSV
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  // Fallback: if only 1 col found, try splitting by multiple spaces
  if (cols.length < 3) {
    return line.split(/\s{2,}/).map(c => c.trim());
  }
  return cols;
}

function parseRows(text: string, hasHeader: boolean): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const cols = parseLine(line);
    const [firstName = "", lastName = "", phone = "", rawDate = "", rawAmount = ""] = cols;
    const startDate = parseDate(rawDate);
    const amountPaid = parseAmount(rawAmount);
    const errors: string[] = [];
    if (!phone) errors.push("Telefon bo'sh");
    if (!startDate) errors.push(`Sana noto'g'ri: "${rawDate}"`);
    return { firstName, lastName, phone, startDate: startDate ?? "", amountPaid, error: errors.length ? errors.join("; ") : undefined };
  });
}

function downloadTemplate() {
  const header = "Ism\tFamiliya\tTelefon\tKelgan_sana\tTolangan_summa";
  const examples = ["Aziz\tKarimov\t+998901234567\t01.06.2026\t350000", "Malika\tYusupova\t+998911234567\t15.06.2026\t100000"].join("\n");
  const csv = `${header}\n${examples}`;
  const blob = new Blob(["\uFEFF" + csv.replace(/\t/g, ",")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "olmos_fitness_shablon.csv"; a.click();
  URL.revokeObjectURL(url);
}

const TEXT_TEMPLATE = `Ism\tFamiliya\tTelefon\tKelgan_sana\tTolangan_summa
Aziz\tKarimov\t+998901234567\t01.06.2026\t350000
Malika\tYusupova\t+998911234567\t15.06.2026\t100000`;

type InputMode = "file" | "text";

export default function BulkImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const { toast } = useToast();

  const [mode, setMode] = useState<InputMode>("text");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>(TEXT_TEMPLATE);
  const [hasHeader, setHasHeader] = useState(true);

  useEffect(() => {
    if (plans && plans.length > 0 && !planId) {
      setPlanId(plans[0].id.toString());
    }
  }, [plans, planId]);

  const validRows = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);

  const selectedPlan = plans?.find(p => p.id.toString() === planId);
  const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;

  const computeRow = (row: ParsedRow) => {
    const paid = row.amountPaid != null
      ? row.amountPaid
      : (paymentStatus === "paid" ? planPrice : 0);
    const debt = Math.max(0, planPrice - paid);
    return { paid, debt };
  };

  const totalDebt = validRows.reduce((sum, r) => sum + computeRow(r).debt, 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseRows(text, true));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleTextParse = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRows(pasteText, hasHeader);
    setRows(parsed);
    setResult(null);
  };

  const handleClearText = () => {
    setPasteText("");
    setRows([]);
    setResult(null);
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
          rows: validRows.map(r => ({ firstName: r.firstName, lastName: r.lastName, phone: r.phone, startDate: r.startDate, amountPaid: r.amountPaid ?? undefined })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ImportResult = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey({}) });
      toast({ title: `✅ ${data.imported} ta a'zo muvaffaqiyatli qo'shildi!` });
      setRows([]);
      setFileName("");
      setPasteText("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/subscribers">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk import</h1>
          <p className="text-muted-foreground text-sm">Bir vaqtda ko'p a'zo qo'shish</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
        <button
          onClick={() => { setMode("text"); setRows([]); setResult(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "text" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ClipboardPaste className="h-4 w-4" /> Matn qo'shish
        </button>
        <button
          onClick={() => { setMode("file"); setRows([]); setResult(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "file" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="h-4 w-4" /> Fayl yuklash
        </button>
      </div>

      {/* ── TEXT MODE ─────────────────────────────────────── */}
      {mode === "text" && (
        <>
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4 text-primary" />
                Matnni joylashtiring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Excel yoki Google Sheets dan nusxa ko'chirib (Ctrl+C) quyidagi maydoniga joylashtiring (Ctrl+V).
                Ustunlar tartibi: <span className="font-semibold text-foreground">Ism · Familiya · Telefon · Sana · To'langan summa</span>
              </p>

              {/* Format hint */}
              <div className="bg-secondary/60 rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">
{`Ism         Familiya    Telefon           Sana          To'langan
Aziz        Karimov     +998901234567     01.06.2026    350000
Malika      Yusupova    +998911234567     2026-06-15    100000`}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 <b>To'langan summa</b> rejaning narxidan kam bo'lsa — farqi <b>qarz</b> sifatida yoziladi va a'zo qarzdorlar ro'yxatida turadi.
                Bo'sh qoldirilsa — pastdagi "To'lov holati" qo'llanadi.
              </p>

              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Ism\tFamiliya\tTelefon\tSana\tTo'langan\nAziz\tKarimov\t+998901234567\t01.06.2026\t350000"}
                className="font-mono text-sm min-h-[160px] resize-y"
                spellCheck={false}
              />

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  Birinchi qator — sarlavha (o'tkazib yuboriladi)
                </label>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleTextParse}
                  disabled={!pasteText.trim()}
                  className="olmos-primary-btn gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ko'rib chiqish
                </Button>
                {pasteText && (
                  <Button variant="outline" onClick={handleClearText}>Tozalash</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setPasteText(TEXT_TEMPLATE)} className="text-xs text-muted-foreground">
                  Namuna joylashtirish
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── FILE MODE ─────────────────────────────────────── */}
      {mode === "file" && (
        <>
          {/* Step 1 – template */}
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
                <Download className="h-4 w-4" /> Shablon yuklab olish (.csv)
              </Button>
              <div className="text-xs text-muted-foreground border rounded-lg overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-secondary/50">{["Ism","Familiya","Telefon","Kelgan_sana","Tolangan_summa"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                  <tbody><tr className="border-t"><td className="px-3 py-1.5">Aziz</td><td className="px-3 py-1.5">Karimov</td><td className="px-3 py-1.5">+998901234567</td><td className="px-3 py-1.5">01.06.2026</td><td className="px-3 py-1.5">350000</td></tr></tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 – upload */}
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-amber-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">2</span>
                To'ldirilgan faylni yuklang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} id="csv-upload" />
              <label htmlFor="csv-upload"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors
                  ${fileName ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/50"}`}
              >
                {fileName ? (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                    <span className="font-semibold text-primary">{fileName}</span>
                    <span className="text-xs text-muted-foreground mt-1">{rows.length} ta satr — boshqa fayl tanlash uchun bosing</span>
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
        </>
      )}

      {/* ── PREVIEW + IMPORT ──────────────────────────────── */}
      {rows.length > 0 && (
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold shrink-0">
                {mode === "text" ? "2" : "3"}
              </span>
              Ko'rib chiqing va import qiling
              <div className="ml-auto flex gap-2">
                {validRows.length > 0 && <Badge className="bg-green-500 hover:bg-green-600">{validRows.length} ta to'g'ri</Badge>}
                {invalidRows.length > 0 && <Badge className="bg-red-500 hover:bg-red-600">{invalidRows.length} ta xato</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Reja *</label>
                {!plans ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={planId} onValueChange={setPlanId}>
                    <SelectTrigger><SelectValue placeholder="Reja tanlang" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <th className="px-3 py-2 text-left font-semibold">Sana</th>
                    <th className="px-3 py-2 text-right font-semibold">To'langan</th>
                    <th className="px-3 py-2 text-right font-semibold">Qarz</th>
                    <th className="px-3 py-2 text-left font-semibold">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const { paid, debt } = computeRow(row);
                    return (
                    <tr key={i} className={`border-t ${row.error ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.firstName} {row.lastName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.phone}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.startDate || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.error ? "—" : selectedPlan ? `${paid.toLocaleString("uz")}` : <span className="text-muted-foreground text-xs">reja?</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.error ? "—" : !selectedPlan ? <span className="text-muted-foreground text-xs">—</span> : debt > 0 ? (
                          <span className="text-red-500 font-semibold">{debt.toLocaleString("uz")}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <div className="flex items-center gap-1 text-red-500 text-xs">
                            <XCircle className="h-3.5 w-3.5 shrink-0" /><span>{row.error}</span>
                          </div>
                        ) : !selectedPlan ? (
                          <span className="text-muted-foreground text-xs">Reja tanlang</span>
                        ) : debt > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertCircle className="h-3.5 w-3.5" /><span>Qarzdor</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /><span>To'langan</span>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Xatolik bor satrlar o'tkazib yuboriladi. Faqat <b>{validRows.length}</b> ta to'g'ri satr import qilinadi.</span>
              </div>
            )}

            {selectedPlan && validRows.length > 0 && totalDebt > 0 && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Jami qarz: <b>{totalDebt.toLocaleString("uz")} so'm</b> — bu a'zolar qarzdorlar ro'yxatida ko'rinadi.</span>
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
                <><Upload className="h-5 w-5" />{validRows.length} ta a'zoni import qilish</>
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
                  {result.imported} ta qo'shildi{result.skipped > 0 ? `, ${result.skipped} ta o'tkazib yuborildi` : ""}
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
              <Button className="olmos-primary-btn gap-2">A'zolar ro'yxatiga o'tish</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
