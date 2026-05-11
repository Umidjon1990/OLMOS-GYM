import { useGetWebsiteSettings, useListPlans, useListTrainers, useCreateApplication, getListPlansQueryKey, getListTrainersQueryKey, getGetWebsiteSettingsQueryKey } from "@workspace/api-client-react";
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

export default function Home() {
  const { data: settings } = useGetWebsiteSettings({ query: { queryKey: getGetWebsiteSettingsQueryKey() } });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const { data: trainers } = useListTrainers({ query: { queryKey: getListTrainersQueryKey() } });
  const { toast } = useToast();

  const createApplication = useCreateApplication();

  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      notes: "",
    },
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

  const gymName = settings?.gymName || "OLMOS";
  const tagline = settings?.tagline || "Sog'lom hayot uchun eng yaxshi tanlov";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="olmos-gem-bg p-1.5 rounded-md text-white">
              <Gem className="h-5 w-5" />
            </div>
            <span className="font-black text-xl tracking-tight olmos-gradient-text uppercase">{gymName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#plans" className="text-sm font-medium hover:text-primary transition-colors">A'zolik</a>
            <a href="#trainers" className="text-sm font-medium hover:text-primary transition-colors">Murabbiylar</a>
            <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">Aloqa</a>
            <Link href="/admin">
              <Button variant="outline" size="sm">Kirish</Button>
            </Link>
          </nav>
          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="text-xs">Kirish</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 olmos-hero-overlay z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${settings?.bannerUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070'})` }}
        />
        {/* Diamond shimmer overlay */}
        <div className="absolute inset-0 z-10 olmos-diamond-overlay" />
        <div className="relative z-20 container mx-auto px-4 py-32 md:py-48 flex flex-col items-center text-center">
          <div className="flex items-center justify-center mb-6">
            <span className="olmos-badge-pill">💎 PREMIUM FITNESS</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight max-w-4xl uppercase olmos-hero-text">
            {gymName}
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-cyan-300 font-semibold tracking-wide">
            {tagline}
          </p>
          {settings?.description && (
            <p className="mt-4 text-base md:text-lg text-slate-300 max-w-2xl">
              {settings.description}
            </p>
          )}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="#join">
              <Button size="lg" className="h-14 px-10 text-lg font-bold olmos-primary-btn">
                💎 A'zo bo'lish
              </Button>
            </a>
            <a href="#plans">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg text-white border-white/40 hover:bg-white/10 hover:text-white hover:border-white">
                Rejalarni ko'rish
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="olmos-stats-bar py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">500+</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium">A'zolar</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">3+</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium">Murabbiylar</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-white">24/7</div>
              <div className="text-xs md:text-sm text-cyan-300 font-medium">Xizmat</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <section id="plans" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="flex justify-center mb-3">
              <span className="olmos-section-badge">💎 REJALAR</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">A'zolik Rejalari</h2>
            <p className="mt-3 text-slate-500 text-lg">O'zingizga mos rejani tanlang va bugun boshlang.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.filter(p => p.isActive).map((plan, i) => (
              <Card key={plan.id} className={`flex flex-col border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${i === 1 ? 'olmos-plan-featured border-primary shadow-lg' : 'border-slate-200 hover:border-primary/40'}`}>
                {i === 1 && (
                  <div className="text-center py-1.5 olmos-featured-badge text-xs font-bold uppercase tracking-widest">
                    💎 Mashhur tanlov
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                  <CardDescription className="text-base mt-1 font-medium">{plan.durationDays} kunlik a'zolik</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-1">
                  <div className="text-4xl font-black text-primary my-4">
                    {Number(plan.price).toLocaleString()} <span className="text-lg font-semibold text-slate-400">so'm</span>
                  </div>
                  {plan.description && <p className="text-sm text-slate-500 mt-3">{plan.description}</p>}
                </CardContent>
                <CardFooter>
                  <Button className={`w-full font-bold ${i === 1 ? 'olmos-primary-btn' : ''}`} onClick={() => {
                    form.setValue('planId', plan.id);
                    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
                  }}>Tanlash</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers Section */}
      {trainers && trainers.length > 0 && (
        <section id="trainers" className="py-20 olmos-trainers-bg">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="flex justify-center mb-3">
                <span className="olmos-section-badge-light">🏆 JAMOA</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">Bizning Murabbiylar</h2>
              <p className="mt-3 text-slate-300 text-lg">Professional murabbiylar bilan maqsadingizga erishing.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainers.filter(t => t.isActive).map((trainer) => (
                <Card key={trainer.id} className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full olmos-gem-bg flex items-center justify-center mb-3">
                      <Gem className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-white">{trainer.name}</CardTitle>
                    <CardDescription className="text-cyan-300 font-semibold">{trainer.specialty}</CardDescription>
                  </CardHeader>
                  {trainer.bio && (
                    <CardContent>
                      <p className="text-slate-300 text-sm">{trainer.bio}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Registration Section */}
      <section id="join" className="py-20 olmos-join-bg">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex mb-4">
                <span className="olmos-section-badge">💎 A'ZO BO'LISH</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-6">
                Bugun boshlang!
              </h2>
              <p className="text-white/80 text-lg mb-8">
                Ariza to'ldiring — jamoamiz siz bilan bog'lanib, ro'yxatdan o'tkazadi.
              </p>
              <div className="space-y-4">
                {settings?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-semibold text-white">{settings.phone}</span>
                  </div>
                )}
                {settings?.address && (
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg text-white/90">{settings.address}</span>
                  </div>
                )}
                {settings?.workingHours && (
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg text-white/90">{settings.workingHours}</span>
                  </div>
                )}
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-black text-slate-900">Ariza yuborish</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ism</FormLabel>
                            <FormControl><Input placeholder="Ali" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Familiya</FormLabel>
                            <FormControl><Input placeholder="Valiyev" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon raqam</FormLabel>
                          <FormControl><Input placeholder="+998 90 123 45 67" type="tel" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reja (ixtiyoriy)</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Reja tanlang" />
                              </SelectTrigger>
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
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Izoh (ixtiyoriy)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Savollar yoki maqsadlaringiz..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full h-12 text-base font-bold olmos-primary-btn" disabled={createApplication.isPending}>
                      {createApplication.isPending ? "Yuborilmoqda..." : "💎 Ariza yuborish"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4 text-white">
              <Gem className="h-6 w-6 text-cyan-400" />
              <span className="font-black text-2xl tracking-tight olmos-gradient-text uppercase">{gymName}</span>
            </div>
            <p className="text-sm max-w-xs text-slate-400">
              {settings?.description || "Professional trenerlar va zamonaviy jihozlar bilan sport maqsadlaringizga erishing."}
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Biz bilan bog'laning</h3>
            <ul className="space-y-3">
              {settings?.phone && (
                <li className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-cyan-500 shrink-0" />
                  <span>{settings.phone}</span>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-cyan-500 shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.workingHours && (
                <li className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-cyan-500 shrink-0" />
                  <span className="whitespace-pre-line">{settings.workingHours}</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Kuzating</h3>
            <div className="flex gap-3">
              {settings?.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.telegramUrl && (
                <a href={settings.telegramUrl} target="_blank" rel="noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Send className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © 2026 OLMOS Fitness Club. Barcha huquqlar himoyalangan.
        </div>
      </footer>
    </div>
  );
}
