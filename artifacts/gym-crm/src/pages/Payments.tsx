import { useListPayments, useConfirmPayment, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { Check, X, CreditCard, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments({ query: { queryKey: getListPaymentsQueryKey() } });
  const confirmPayment = useConfirmPayment();
  const { toast } = useToast();

  const handleConfirm = (id: number) => {
    confirmPayment.mutate(
      { id, data: {} }, // Confirm API endpoint takes empty body
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "Payment confirmed successfully" });
        },
        onError: () => toast({ title: "Failed to confirm payment", variant: "destructive" })
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-green-500 hover:bg-green-600">Confirmed</Badge>;
      case 'pending': return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 hover:bg-red-600">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">Manage subscriber payments and confirmations</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : payments?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <CreditCard className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No payments found</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {payments?.map(payment => (
            <Card key={payment.id} className="overflow-hidden shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${payment.status === 'pending' ? 'bg-amber-100 text-amber-600' : payment.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{payment.subscriberName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-primary">${payment.amount}</span>
                      <span className="text-muted-foreground text-sm border-l pl-2">{payment.planName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(payment.paymentDate), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {getStatusBadge(payment.status)}
                  {payment.status === 'pending' && (
                    <Button size="sm" onClick={() => handleConfirm(payment.id)} disabled={confirmPayment.isPending}>
                      <Check className="h-4 w-4 mr-1" /> Confirm
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}