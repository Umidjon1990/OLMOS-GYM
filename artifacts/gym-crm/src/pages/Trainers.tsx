import { useListTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer, getListTrainersQueryKey } from "@workspace/api-client-react";
import { Plus, Edit, Trash2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const trainerSchema = z.object({
  name: z.string().min(2),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function Trainers() {
  const { data: trainers, isLoading } = useListTrainers({ query: { queryKey: getListTrainersQueryKey() } });
  const createTrainer = useCreateTrainer();
  const updateTrainer = useUpdateTrainer();
  const deleteTrainer = useDeleteTrainer();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);

  const form = useForm<z.infer<typeof trainerSchema>>({
    resolver: zodResolver(trainerSchema),
    defaultValues: { name: "", specialty: "", bio: "", photoUrl: "", isActive: true },
  });

  const handleEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    form.reset({
      name: trainer.name,
      specialty: trainer.specialty || "",
      bio: trainer.bio || "",
      photoUrl: trainer.photoUrl || "",
      isActive: trainer.isActive,
    });
    setOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTrainer(null);
    form.reset({ name: "", specialty: "", bio: "", photoUrl: "", isActive: true });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof trainerSchema>) => {
    if (editingTrainer) {
      updateTrainer.mutate(
        { id: editingTrainer.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTrainersQueryKey() });
            toast({ title: "Trainer updated" });
            setOpen(false);
          }
        }
      );
    } else {
      createTrainer.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTrainersQueryKey() });
            toast({ title: "Trainer created" });
            setOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this trainer?")) {
      deleteTrainer.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTrainersQueryKey() });
            toast({ title: "Trainer removed" });
          }
        }
      );
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trainers</h1>
          <p className="text-muted-foreground mt-1">Manage staff and personal trainers</p>
        </div>
        <Button onClick={handleOpenNew} className="hidden md:flex"><Plus className="mr-2 h-4 w-4" /> Add Trainer</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTrainer ? "Edit Trainer" : "Add Trainer"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="specialty" render={({ field }) => (
                <FormItem><FormLabel>Specialty (e.g. Weightlifting, Yoga)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="photoUrl" render={({ field }) => (
                <FormItem><FormLabel>Photo URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5"><FormLabel>Active Staff Member</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createTrainer.isPending || updateTrainer.isPending}>Save Trainer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : trainers?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Dumbbell className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No trainers added</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers?.map(trainer => (
            <Card key={trainer.id} className={`overflow-hidden ${!trainer.isActive ? 'opacity-60' : ''}`}>
              <div className="aspect-[4/3] bg-slate-100 relative">
                {trainer.photoUrl ? (
                  <img src={trainer.photoUrl} alt={trainer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Dumbbell className="h-12 w-12" />
                  </div>
                )}
                {!trainer.isActive && (
                  <div className="absolute top-2 right-2 bg-slate-800 text-white text-xs px-2 py-1 rounded font-bold uppercase">Inactive</div>
                )}
              </div>
              <CardContent className="p-5">
                <h3 className="text-xl font-bold">{trainer.name}</h3>
                <div className="text-sm font-medium text-primary mt-1">{trainer.specialty || "General Trainer"}</div>
                {trainer.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{trainer.bio}</p>}
                <div className="flex gap-2 mt-5">
                  <Button variant="outline" className="flex-1" onClick={() => handleEdit(trainer)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button variant="outline" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(trainer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
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