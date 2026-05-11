import { useGetWebsiteSettings, useListPlans, useCreateApplication, getListPlansQueryKey, getGetWebsiteSettingsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Gem, MapPin, Phone, Clock, Instagram, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const applicationSchema = z.object({
  firstName: z.string().min(2, "Ism kiritilishi shart"),
  lastName: z.string().min(2, "Familiya kiritilishi shart"),
  phone: z.string().min(10, "To'g'ri telefon raqam kiriting"),
  planId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

// Gym hero image — gym machines & equipment rows, no people
const HERO_IMAGE = "https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=2070&auto=format&fit=crop";

export default function Home() {
  const { data: settings } = useGetWebsiteSettings({ query: { queryKey: getGetWebsiteSettingsQueryKey() } });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const { toast } = useToast();

  const createApplication = useCreateApplication();

  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", notes: "" },
  });

  const onSubmit = (values: z.infer<typeof applicationSchema>) => {
    createApplication.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Arizangiz qabul qilindi! Tez orada siz bilan bog'lanamiz." });
          form.reset();
        },
        onError: () => {
          toast({ title: "Ariza yuborishda xatolik. Qaytadan urinib ko'ring.", variant: "destructive" });
        }
      }
    );
  };

  const gymName = settings?.gymName || "OLMOS FITNESS";
  const tagline = settings?.tagline || "Sog'lom hayot uchun eng yaxshi tanlov";

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="olmos-gem-bg p-1.5 rounded-md text-white">
              <Gem className="h-5 w-5" />
            </div>
            <span className="font-black text-lg md:text-xl tracking-tight olmos-gradient-text uppercase">{gymName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#plans"   className="text-sm font-semibold text-slate-700 hover:text-primary transition-colors">A'zolik</a>
            <a href="#contact" className="text-sm font-semibold text-slate-700 hover:text-primary transition-colors">Aloqa</a>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white">Kirish</Button>
            </Link>
          </nav>
          <div className="flex md:hidden">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="text-xs border-primary text-primary">Kirish</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[85vh] flex items-center">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${settings?.bannerUrl || HERO_IMAGE})` }}
        />
        {/* Strong dark gradient so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/80" />

        <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/25 text-white/90 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Gem className="h-3 w-3 text-cyan-300" /> PREMIUM FITNESS
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight drop-shadow-2xl">
            {gymName}
          </h1>

          {/* Tagline */}
          <p className="mt-5 text-lg md:text-2xl font-semibold text-cyan-300 drop-shadow-lg">
            {tagline}
          </p>

          {/* Description */}
          {settings?.description && (
            <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl drop-shadow">
              {settings.description}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="#join">
              <Button size="lg" className="h-13 px-10 text-base md:text-lg font-bold olmos-primary-btn shadow-xl">
                💎 A'zo bo'lish
              </Button>
            </a>
            <a href="#plans">
              <Button
                variant="outline"
                size="lg"
                className="h-13 px-8 text-base md:text-lg font-semibold bg-white/10 text-white border-white/40 hover:bg-white/20 hover:border-white hover:text-white backdrop-blur-sm"
              >
                Rejalarni ko'rish
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="olmos-stats-bar py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">500+</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium mt-0.5">A'zolar</div>
            </div>
            <div className="border-x border-white/10">
              <div className="text-2xl md:text-3xl font-black text-white">3+</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium mt-0.5">Murabbiylar</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">24/7</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium mt-0.5">Xizmat</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLANS ── */}
      <section id="plans" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="olmos-section-badge mb-3">💎 REJALAR</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">A'zolik Rejalari</h2>
            <p className="mt-3 text-slate-500 text-base md:text-lg">O'zingizga mos rejani tanlang va bugun boshlang.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans?.filter(p => p.isActive).map((plan, i) => (
              <Card
                key={plan.id}
                className={`flex flex-col border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1
                  ${i === 1 ? 'border-primary shadow-lg olmos-plan-featured' : 'border-slate-200 hover:border-primary/40'}`}
              >
                {i === 1 && (
                  <div className="text-center py-1.5 olmos-featured-badge text-xs font-bold uppercase tracking-widest rounded-t-md">
                    ⭐ Mashhur tanlov
                  </div>
                )}
                <CardHeader className="text-center pb-2 pt-6">
                  <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                  <CardDescription className="text-sm font-medium mt-1">{plan.durationDays} kunlik a'zolik</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-1">
                  <div className="text-4xl font-black text-primary my-4">
                    {Number(plan.price).toLocaleString()}
                    <span className="text-base font-semibold text-slate-400 ml-1">so'm</span>
                  </div>
                  {plan.description && <p className="text-sm text-slate-500 mt-2">{plan.description}</p>}
                </CardContent>
                <CardFooter className="pb-6">
                  <Button
                    className={`w-full font-bold ${i === 1 ? 'olmos-primary-btn' : ''}`}
                    onClick={() => {
                      form.setValue('planId', plan.id);
                      document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Tanlash
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN / APPLICATION ── */}
      <section id="join" className="py-20 olmos-join-bg">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Left info */}
            <div>
              <span className="olmos-section-badge-light mb-4">💎 A'ZO BO'LISH</span>
              <h2 className="mt-4 text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-5">
                Bugun boshlang!
              </h2>
              <p className="text-white/80 text-base md:text-lg mb-8">
                Ariza to'ldiring — jamoamiz siz bilan bog'lanib, ro'yxatdan o'tkazadi.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2.5 rounded-xl shrink-0">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">{settings?.phone || "+998 99 004 95 95"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2.5 rounded-xl shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-base text-white/90">{settings?.address || "Namangan sh., Uychi MFY"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white/15 p-2.5 rounded-xl shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-base text-white/90 whitespace-pre-line">
                    {settings?.workingHours || "Du-Sha: 07:00-22:00\n(Yakshanba — dam olish kuni)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right form */}
            <Card className="border-0 shadow-2xl bg-white">
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="text-xl font-black text-slate-900">Ariza yuborish</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ism</FormLabel>
                          <FormControl><Input placeholder="Ali" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Familiya</FormLabel>
                          <FormControl><Input placeholder="Valiyev" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon raqam</FormLabel>
                        <FormControl><Input placeholder="+998 99 004 95 95" type="tel" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="planId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reja (ixtiyoriy)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Reja tanlang" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plans?.filter(p => p.isActive).map(plan => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name} — {Number(plan.price).toLocaleString()} so'm
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Izoh (ixtiyoriy)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Savollar yoki maqsadlaringiz..." className="resize-none" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-bold olmos-primary-btn"
                      disabled={createApplication.isPending}
                    >
                      {createApplication.isPending ? "Yuborilmoqda..." : "💎 Ariza yuborish"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gem className="h-6 w-6 text-cyan-400" />
              <span className="font-black text-xl olmos-gradient-text uppercase">{gymName}</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              {settings?.description || "Professional murabbiylar va zamonaviy jihozlar bilan sport maqsadlaringizga erishing."}
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Biz bilan bog'laning</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                <span className="text-sm">{settings?.phone || "+998 99 004 95 95"}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                <span className="text-sm">{settings?.address || "Namangan sh., Uychi MFY"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                <span className="text-sm whitespace-pre-line">
                  {settings?.workingHours || "Du-Sha: 07:00-22:00\n(Yakshanba — dam olish kuni)"}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Kuzating</h3>
            <div className="flex gap-3">
              {settings?.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noreferrer"
                  className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.telegramUrl && (
                <a href={settings.telegramUrl} target="_blank" rel="noreferrer"
                  className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Send className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © 2026 OLMOS FITNESS. Barcha huquqlar himoyalangan.
        </div>
      </footer>
    </div>
  );
}
