import { useGetSubscriber, useUpdateSubscriber, useCreateSubscriber, useListPlans, getGetSubscriberQueryKey, getListPlansQueryKey, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

const subscriberSchema = z.object({
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  planId: z.coerce.number().min(1, "Reja tanlanishi shart"),
  startDate: z.string().min(1, "Boshlanish sanasi kiritilishi shart"),
  endDate: z.string().min(1, "Tugash sanasi kiritilishi shart"),
  paymentStatus: z.enum(["paid", "pending", "overdue"]),
  status: z.enum(["active", "expired", "pending", "blocked"]),
  telegramChatId: z.string().optional(),
  notes: z.string().optional(),
});

export default function SubscriberForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isNew = !id || id === "new";
  const subscriberId = isNew ? 0 : parseInt(id as string, 10);

  const { data: subscriber, isLoading: isSubLoading } = useGetSubscriber(subscriberId, {
    query: { enabled: !isNew, queryKey: getGetSubscriberQueryKey(subscriberId) }
  });
  const { data: plans, isLoading: isPlansLoading } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });

  const createSubscriber = useCreateSubscriber();
  const updateSubscriber = useUpdateSubscriber();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });

  const form = useForm<z.infer<typeof subscriberSchema>>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      planId: 0,
      startDate: today,
      endDate: today,
      paymentStatus: "paid",
      status: "active",
      notes: "",
      telegramChatId: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  // Auto-select first plan for new subscribers
  useEffect(() => {
    if (isNew && plans && plans.length > 0 && form.getValues("planId") === 0) {
      const firstPlan = plans[0];
      form.setValue("planId", firstPlan.id);
      const start = form.getValues("startDate");
      if (start) {
        const d = new Date(start);
        d.setDate(d.getDate() + (firstPlan.durationDays ?? 30));
        form.setValue("endDate", d.toLocaleDateString("en-CA"));
      }
    }
  }, [plans, isNew, form]);

  // Auto-calculate endDate when plan changes
  const watchPlanId = form.watch("planId");
  const watchStartDate = form.watch("startDate");
  const prevPlanId = useRef<number>(0);

  useEffect(() => {
    if (!plans || watchPlanId === prevPlanId.current) return;
    prevPlanId.current = watchPlanId;
    const plan = plans.find(p => p.id === watchPlanId);
    if (!plan || !watchStartDate) return;
    const d = new Date(watchStartDate);
    d.setDate(d.getDate() + (plan.durationDays ?? 30));
    form.setValue("endDate", d.toLocaleDateString("en-CA"));
  }, [watchPlanId, watchStartDate, plans, form]);

  useEffect(() => {
    if (subscriber && !isNew && initializedForId.current !== subscriberId) {
      initializedForId.current = subscriberId;
      form.reset({
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        planId: subscriber.planId,
        startDate: subscriber.startDate.split('T')[0],
        endDate: subscriber.endDate.split('T')[0],
        paymentStatus: subscriber.paymentStatus,
        status: subscriber.status,
        notes: subscriber.notes || "",
        telegramChatId: subscriber.telegramChatId || "",
      });
    }
  }, [subscriber, isNew, subscriberId, form]);

  const onSubmit = (values: z.infer<typeof subscriberSchema>) => {
    const payload = {
      ...values,
      firstName: values.firstName || "",
      lastName: values.lastName || "",
      phone: values.phone || "",
    };
    if (isNew) {
      createSubscriber.mutate(
        { data: payload },
        {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey() });
            toast({ title: "A'zo muvaffaqiyatli qo'shildi" });
            setLocation(`/admin/subscribers/${data.id}`);
          },
          onError: () => toast({ title: "A'zo qo'shishda xatolik", variant: "destructive" })
        }
      );
    } else {
      updateSubscriber.mutate(
        { id: subscriberId, data: payload },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetSubscriberQueryKey(subscriberId), data);
            queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey() });
            toast({ title: "O'zgarishlar saqlandi" });
            setLocation(`/admin/subscribers/${subscriberId}`);
          },
          onError: () => toast({ title: "Saqlashda xatolik", variant: "destructive" })
        }
      );
    }
  };

  if ((!isNew && isSubLoading) || isPlansLoading) {
    return <div className="p-8 text-center text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "Yangi a'zo qo'shish" : "A'zoni tahrirlash"}
        </h1>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ism <span className="text-muted-foreground text-xs">(ixtiyoriy)</span></FormLabel>
                    <FormControl><Input placeholder="Jasur" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiya <span className="text-muted-foreground text-xs">(ixtiyoriy)</span></FormLabel>
                    <FormControl><Input placeholder="Toshmatov" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon raqam <span className="text-muted-foreground text-xs">(ixtiyoriy)</span></FormLabel>
                    <FormControl><Input type="tel" placeholder="+998901234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="planId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reja</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Reja tanlang" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} — {Number(p.price).toLocaleString("uz")} so'm / {p.durationDays} kun
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Boshlanish sanasi</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tugash sanasi <span className="text-muted-foreground text-xs">(avto)</span></FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Holat tanlang" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Faol</SelectItem>
                        <SelectItem value="expired">Muddati tugagan</SelectItem>
                        <SelectItem value="pending">Kutilmoqda</SelectItem>
                        <SelectItem value="blocked">Bloklangan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>To'lov holati</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="To'lov holatini tanlang" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">To'langan</SelectItem>
                        <SelectItem value="pending">Kutilmoqda</SelectItem>
                        <SelectItem value="overdue">Muddati o'tgan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="telegramChatId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telegram Chat ID <span className="text-muted-foreground text-xs">(ixtiyoriy)</span></FormLabel>
                  <FormControl><Input placeholder="123456789" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Eslatma <span className="text-muted-foreground text-xs">(ixtiyoriy)</span></FormLabel>
                  <FormControl><Textarea placeholder="A'zo haqida qo'shimcha ma'lumot..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-auto olmos-primary-btn"
                  disabled={createSubscriber.isPending || updateSubscriber.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? "A'zoni saqlash" : "O'zgarishlarni saqlash"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
