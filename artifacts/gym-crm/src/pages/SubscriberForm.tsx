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
  firstName: z.string().min(2, "Ism kiritilishi shart"),
  lastName: z.string().min(2, "Familiya kiritilishi shart"),
  phone: z.string().min(10, "To'g'ri telefon raqam kiriting"),
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

  const form = useForm<z.infer<typeof subscriberSchema>>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      planId: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      paymentStatus: "paid",
      status: "active",
      notes: "",
      telegramChatId: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

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
    if (isNew) {
      createSubscriber.mutate(
        { data: values },
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
        { id: subscriberId, data: values },
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
                    <FormLabel>Ism</FormLabel>
                    <FormControl><Input placeholder="Jasur" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiya</FormLabel>
                    <FormControl><Input placeholder="Toshmatov" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon raqam</FormLabel>
                    <FormControl><Input type="tel" placeholder="+998901234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="planId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reja</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Reja tanlang" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} — {p.price.toLocaleString("uz")} so'm
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
                    <FormLabel>Tugash sanasi</FormLabel>
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
                  <FormLabel>Telegram Chat ID (ixtiyoriy)</FormLabel>
                  <FormControl><Input placeholder="123456789" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Eslatma (ixtiyoriy)</FormLabel>
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
