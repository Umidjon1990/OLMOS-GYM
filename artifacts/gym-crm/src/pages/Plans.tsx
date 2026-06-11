import { useListPlans, useUpdatePlan, useCreatePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import { Plus, Check, X, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const planSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  durationDays: z.coerce.number().min(1),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export default function Plans() {
  const { data: plans, isLoading } = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { name: "", price: 0, durationDays: 30, description: "", isActive: true },
  });

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      description: plan.description || "",
      isActive: plan.isActive,
    });
    setOpen(true);
  };

  const handleOpenNew = () => {
    setEditingPlan(null);
    form.reset({ name: "", price: 0, durationDays: 30, description: "", isActive: true });
    setOpen(true);
  };

  const onError = (err: unknown) => {
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: number }).status
        : undefined;
    if (status === 401) {
      toast({
        variant: "destructive",
        title: "Sessiya tugagan",
        description: "Iltimos, qaytadan tizimga kiring.",
      });
      setLocation("/login");
      return;
    }
    const message =
      err instanceof Error ? err.message : "Noma'lum xatolik yuz berdi";
    toast({
      variant: "destructive",
      title: "Saqlab bo'lmadi",
      description: message,
    });
  };

  const onSubmit = (values: z.infer<typeof planSchema>) => {
    if (editingPlan) {
      updatePlan.mutate(
        { id: editingPlan.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
            toast({ title: "Reja yangilandi" });
            setOpen(false);
          },
          onError,
        }
      );
    } else {
      createPlan.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
            toast({ title: "Reja yaratildi" });
            setOpen(false);
          },
          onError,
        }
      );
    }
  };

  const onInvalid = () => {
    toast({
      variant: "destructive",
      title: "Maydonlarni tekshiring",
      description: "Iltimos, barcha majburiy maydonlarni to'g'ri to'ldiring.",
    });
  };

  const toggleActive = (id: number, isActive: boolean) => {
    updatePlan.mutate(
      { id, data: { isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: isActive ? "Reja faollashtirildi" : "Reja o'chirildi" });
        },
        onError,
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
          <p className="text-muted-foreground mt-1">Manage gym membership offerings</p>
        </div>
        <Button onClick={handleOpenNew} className="hidden md:flex"><Plus className="mr-2 h-4 w-4" /> Add Plan</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationDays" render={({ field }) => (
                  <FormItem><FormLabel>Duration (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5"><FormLabel className="text-base">Active Status</FormLabel><div className="text-sm text-muted-foreground">Is this plan available for new signups?</div></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending}>Save Plan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans?.map(plan => (
            <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.durationDays} Days</CardDescription>
                  </div>
                  <div className="text-2xl font-bold text-primary">${plan.price}</div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground min-h-[40px]">{plan.description || "No description provided."}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-medium bg-secondary px-2 py-1 rounded-md">{plan.subscriberCount || 0} active members</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={plan.isActive} onCheckedChange={(checked) => toggleActive(plan.id, checked)} />
                    <span className="text-muted-foreground">{plan.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t mt-2">
                <Button variant="ghost" className="w-full" onClick={() => handleEdit(plan)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Plan
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Button size="icon" className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 z-40 md:hidden" onClick={handleOpenNew}>
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}