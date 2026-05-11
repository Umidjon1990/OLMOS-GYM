import { useGetSubscriber, useGetSubscriberPayments, getGetSubscriberQueryKey, getGetSubscriberPaymentsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Edit, Clock, CreditCard, Calendar, Phone, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function SubscriberProfile() {
  const { id } = useParams();
  const subscriberId = parseInt(id as string, 10);
  
  const { data: subscriber, isLoading } = useGetSubscriber(subscriberId, { 
    query: { enabled: !!subscriberId, queryKey: getGetSubscriberQueryKey(subscriberId) } 
  });
  const { data: payments, isLoading: isPaymentsLoading } = useGetSubscriberPayments(subscriberId, { 
    query: { enabled: !!subscriberId, queryKey: getGetSubscriberPaymentsQueryKey(subscriberId) } 
  });

  if (isLoading || !subscriber) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/subscribers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Profile</h1>
        </div>
        <Link href={`/admin/subscribers/${subscriberId}/edit`}>
          <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mb-4">
                  {subscriber.firstName[0]}{subscriber.lastName[0]}
                </div>
                <h2 className="text-xl font-bold">{subscriber.firstName} {subscriber.lastName}</h2>
                <Badge className={`mt-2 ${getStatusColor(subscriber.status)} uppercase font-bold`}>
                  {subscriber.status}
                </Badge>
              </div>
              
              <div className="mt-8 space-y-4 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="h-4 w-4" />
                  <span>{subscriber.phone}</span>
                </div>
                {subscriber.telegramChatId && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <MessageCircle className="h-4 w-4" />
                    <span>Telegram connected</span>
                  </div>
                )}
                {subscriber.notes && (
                  <div className="flex items-start gap-3 text-slate-600">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="whitespace-pre-wrap">{subscriber.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Current Plan</span>
                  <div className="font-semibold text-lg">{subscriber.planName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Days Left</span>
                  <div className={`font-bold text-xl flex items-center gap-2 ${subscriber.daysLeft <= 3 ? 'text-red-500' : 'text-primary'}`}>
                    <Clock className="h-5 w-5" />
                    {subscriber.daysLeft > 0 ? subscriber.daysLeft : 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Period</span>
                  <div className="flex items-center gap-2 font-medium text-sm mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(subscriber.startDate), 'MMM d, yyyy')} - {format(new Date(subscriber.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Payment Status</span>
                  <div className="mt-1">
                    <Badge className={getPaymentColor(subscriber.paymentStatus)} variant="secondary">
                      {subscriber.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isPaymentsLoading ? (
                <div className="p-6"><Skeleton className="h-20 w-full" /></div>
              ) : payments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No payments found</div>
              ) : (
                <div className="divide-y">
                  {payments?.map(payment => (
                    <div key={payment.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-2 rounded-full">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold">${payment.amount} - {payment.planName}</div>
                          <div className="text-sm text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">{payment.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}