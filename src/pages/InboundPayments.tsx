import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface InboundNotification {
  id: string;
  received_at: string;
  payload: any;
  matched_organization_id: string | null;
  matched_invoice_id: string | null;
  organization_name: string | null;
  contact_email: string | null;
  amount_paid: number | null;
  currency: string | null;
  paid_at: string | null;
  external_reference: string | null;
  status: string;
  error_message: string | null;
}

const statusVariant = (status: string) => {
  switch (status) {
    case "processed":
      return "default";
    case "unmatched":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
};

export default function InboundPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["inbound-payment-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_payment_notifications")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as InboundNotification[];
    },
  });

  const retry = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.functions.invoke("retry-payment-match", {
        body: { notification_id: notificationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      toast({
        title: res?.matched ? "Match found" : "Still unmatched",
        description: res?.matched
          ? `Linked to organization ${res.organization_id}`
          : "No matching organization could be found.",
      });
      queryClient.invalidateQueries({ queryKey: ["inbound-payment-notifications"] });
    },
    onError: (err: any) => {
      toast({
        title: "Retry failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbound Payment Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Membership payment webhooks received from Medius Events.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !data || data.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No payment notifications received yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((n) => (
                      <React.Fragment key={n.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpand(n.id)}
                            >
                              {expanded.has(n.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(n.received_at), "PPp")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {n.organization_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{n.contact_email || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {n.amount_paid != null
                              ? `${(n.currency || "usd").toUpperCase()} ${Number(n.amount_paid).toFixed(2)}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(n.status) as any}>{n.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {n.matched_organization_id ? (
                              <span className="text-muted-foreground">
                                Org linked{n.matched_invoice_id ? " · invoice updated" : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No match</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {n.status !== "processed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={retry.isPending && retry.variables === n.id}
                                onClick={() => retry.mutate(n.id)}
                              >
                                {retry.isPending && retry.variables === n.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Retry match
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {expanded.has(n.id) && (
                          <TableRow key={`${n.id}-details`}>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="text-xs space-y-2 py-2">
                                {n.error_message && (
                                  <div className="text-destructive">
                                    <strong>Error:</strong> {n.error_message}
                                  </div>
                                )}
                                {n.external_reference && (
                                  <div>
                                    <strong>Stripe session:</strong>{" "}
                                    <code className="font-mono">{n.external_reference}</code>
                                  </div>
                                )}
                                <details>
                                  <summary className="cursor-pointer text-muted-foreground">
                                    Raw payload
                                  </summary>
                                  <pre className="mt-2 p-3 bg-background rounded border overflow-x-auto text-[11px]">
                                    {JSON.stringify(n.payload, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
