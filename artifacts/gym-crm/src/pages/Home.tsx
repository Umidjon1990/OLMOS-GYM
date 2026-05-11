import { useGetWebsiteSettings, useListPlans, useListTrainers, useListGallery, useCreateApplication, getListPlansQueryKey, getListTrainersQueryKey, getListGalleryQueryKey, getGetWebsiteSettingsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Dumbbell, MapPin, Phone, Clock, Instagram, Facebook, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const applicationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  planId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export default function Home() {
  const { data: settings } = useGetWebsiteSettings({ query: { queryKey: getGetWebsiteSettingsQueryKey() } });
  const { data: plans } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const { data: trainers } = useListTrainers({ query: { queryKey: getListTrainersQueryKey() } });
  const { data: gallery } = useListGallery({ query: { queryKey: getListGalleryQueryKey() } });
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
          toast({ title: "Application submitted successfully! We'll contact you soon." });
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to submit application. Please try again.", variant: "destructive" });
        }
      }
    );
  };

  const gymName = settings?.gymName || "FitAdmin Gym";
  const tagline = settings?.tagline || "Push Your Limits";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">{gymName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#plans" className="text-sm font-medium hover:text-primary transition-colors">Memberships</a>
            <a href="#trainers" className="text-sm font-medium hover:text-primary transition-colors">Trainers</a>
            <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</a>
            <Link href="/admin">
              <Button variant="outline" size="sm">Member Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-slate-900/80 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${settings?.bannerUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070'})` }}
        />
        <div className="relative z-20 container mx-auto px-4 py-32 md:py-48 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl uppercase">
            {tagline}
          </h1>
          {settings?.description && (
            <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl">
              {settings.description}
            </p>
          )}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="#join">
              <Button size="lg" className="h-14 px-8 text-lg font-bold">Join Now</Button>
            </a>
            <a href="#plans">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg text-white border-white hover:bg-white/10 hover:text-white">
                View Plans
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-foreground">Membership Plans</h2>
            <p className="mt-4 text-muted-foreground text-lg">Choose the right plan for your fitness journey.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans?.filter(p => p.isActive).map((plan) => (
              <Card key={plan.id} className="flex flex-col border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{plan.durationDays} Days Access</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-1">
                  <div className="text-4xl font-bold text-primary my-4">${plan.price}</div>
                  {plan.description && <p className="text-sm text-muted-foreground mt-4">{plan.description}</p>}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => {
                    form.setValue('planId', plan.id);
                    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
                  }}>Select Plan</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Section */}
      <section id="join" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-6">Start Your Journey Today</h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Fill out the form to request a membership. Our team will contact you to complete the registration.
              </p>
              <div className="space-y-4">
                {settings?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-6 w-6 opacity-80" />
                    <span className="text-xl font-medium">{settings.phone}</span>
                  </div>
                )}
                {settings?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 opacity-80" />
                    <span className="text-lg">{settings.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Card className="border-0 shadow-2xl bg-background text-foreground">
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input placeholder="John" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input placeholder="Doe" {...field} /></FormControl>
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input placeholder="(555) 123-4567" type="tel" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interested Plan (Optional)</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {plans?.filter(p => p.isActive).map(plan => (
                                <SelectItem key={plan.id} value={plan.id.toString()}>{plan.name} - ${plan.price}</SelectItem>
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
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any questions or goals?" className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={createApplication.isPending}>
                      {createApplication.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4 text-white">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl tracking-tight">{gymName}</span>
            </div>
            <p className="text-sm max-w-xs">{settings?.description || "A premium fitness facility dedicated to helping you achieve your goals."}</p>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contact Us</h3>
            <ul className="space-y-3">
              {settings?.phone && (
                <li className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-slate-500 shrink-0" />
                  <span>{settings.phone}</span>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.workingHours && (
                <li className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-slate-500 shrink-0" />
                  <span className="whitespace-pre-line">{settings.workingHours}</span>
                </li>
              )}
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Follow Us</h3>
            <div className="flex gap-4">
              {settings?.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-primary hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
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
      </footer>
    </div>
  );
}