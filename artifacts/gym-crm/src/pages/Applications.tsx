import { useListApplications, useApproveApplication, useRejectApplication, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { Check, X, ClipboardList, Phone, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Applications() {
  const { data: applications, isLoading } = useListApplications({}, { query: { queryKey: getListApplicationsQueryKey({}) } });
  const approveApp = useApproveApplication();
  const rejectApp = useRejectApplication();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approveApp.mutate(
      { id, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey({}) });
          toast({ title: "Application approved and subscriber created" });
        },
        onError: () => toast({ title: "Failed to approve application", variant: "destructive" })
      }
    );
  };

  const handleReject = (id: number) => {
    rejectApp.mutate(
      { id, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey({}) });
          toast({ title: "Application rejected" });
        },
        onError: () => toast({ title: "Failed to reject application", variant: "destructive" })
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Website Applications</h1>
        <p className="text-muted-foreground mt-1">Review registration requests from the public website</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : applications?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No applications</h3>
          <p className="text-muted-foreground text-sm mt-1">New website registrations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications?.map(app => (
            <Card key={app.id} className="shadow-sm border-l-4 border-l-primary overflow-hidden">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{app.firstName} {app.lastName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{app.phone}</span>
                        <span className="mx-1">•</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(new Date(app.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    <Badge variant={app.status === 'pending' ? 'default' : app.status === 'approved' ? 'outline' : 'destructive'} 
                           className={app.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                      {app.status}
                    </Badge>
                  </div>
                  
                  {app.planName && (
                    <div className="bg-secondary/50 p-2.5 rounded-md inline-block">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Requested Plan</span>
                      <span className="font-medium text-foreground">{app.planName}</span>
                    </div>
                  )}
                  
                  {app.notes && (
                    <div className="bg-slate-50 p-3 rounded-md border text-sm">
                      <span className="font-semibold block mb-1">Notes:</span>
                      {app.notes}
                    </div>
                  )}
                </div>

                {app.status === 'pending' && (
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                    <Button 
                      className="flex-1 md:w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => handleApprove(app.id)}
                      disabled={approveApp.isPending || rejectApp.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 md:w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleReject(app.id)}
                      disabled={approveApp.isPending || rejectApp.isPending}
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}