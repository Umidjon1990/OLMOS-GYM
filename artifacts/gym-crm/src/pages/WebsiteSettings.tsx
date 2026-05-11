import { useGetWebsiteSettings, useUpdateWebsiteSettings, getGetWebsiteSettingsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

const settingsSchema = z.object({
  gymName: z.string().min(2),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
  instagramUrl: z.string().optional(),
  telegramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function WebsiteSettingsPage() {
  const { data: settings, isLoading } = useGetWebsiteSettings({ query: { queryKey: getGetWebsiteSettingsQueryKey() } });
  const updateSettings = useUpdateWebsiteSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gymName: "", tagline: "", description: "", logoUrl: "", bannerUrl: "",
      phone: "", address: "", workingHours: "", instagramUrl: "", telegramUrl: "", facebookUrl: "", isActive: true
    },
  });

  const initRef = useRef(false);

  useEffect(() => {
    if (settings && !initRef.current) {
      initRef.current = true;
      form.reset({
        gymName: settings.gymName,
        tagline: settings.tagline || "",
        description: settings.description || "",
        logoUrl: settings.logoUrl || "",
        bannerUrl: settings.bannerUrl || "",
        phone: settings.phone || "",
        address: settings.address || "",
        workingHours: settings.workingHours || "",
        instagramUrl: settings.instagramUrl || "",
        telegramUrl: settings.telegramUrl || "",
        facebookUrl: settings.facebookUrl || "",
        isActive: settings.isActive,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetWebsiteSettingsQueryKey(), data);
          toast({ title: "Website settings saved successfully" });
        },
        onError: () => toast({ title: "Failed to save settings", variant: "destructive" })
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your public-facing gym website</p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Globe className="h-5 w-5 mr-2" /> Public Website Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-bold">Enable Public Website</FormLabel>
                    <div className="text-sm text-muted-foreground">When disabled, visitors will see a "Coming Soon" page.</div>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="gymName" render={({ field }) => (
                <FormItem><FormLabel>Gym Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tagline" render={({ field }) => (
                <FormItem><FormLabel>Hero Tagline</FormLabel><FormControl><Input placeholder="Push Your Limits" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>About/Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact & Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Public Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Physical Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="workingHours" render={({ field }) => (
                <FormItem><FormLabel>Working Hours</FormLabel><FormControl><Textarea placeholder="Mon-Fri: 6AM-10PM&#10;Sat-Sun: 8AM-8PM" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Media & Social</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="bannerUrl" render={({ field }) => (
                <FormItem><FormLabel>Hero Banner Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem><FormLabel>Logo Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                  <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                  <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telegramUrl" render={({ field }) => (
                  <FormItem><FormLabel>Telegram URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" size="lg" className="w-full md:hidden" disabled={updateSettings.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}