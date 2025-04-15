
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import InvoiceList from "@/components/invoices/InvoiceList";
import { supabase } from "@/lib/supabase";

const BatchDetails = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const numericBatchId = parseInt(batchId || "0", 10);

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ["invoice-batch", numericBatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_batches")
        .select("*")
        .eq("id", numericBatchId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!numericBatchId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load batch details"}
        </AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate("/billing")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Button>

        {/* Status-based action buttons */}
        <div className="flex gap-2">
          {batch.status === "Draft" && (
            <>
              <Button variant="default" className="gap-2">
                <Check className="h-4 w-4" />
                Finalize Batch
              </Button>
              <Button variant="destructive" className="gap-2">
                <X className="h-4 w-4" />
                Cancel Batch
              </Button>
            </>
          )}
          {batch.status === "Pending" && (
            <Button variant="default" className="gap-2">
              <Send className="h-4 w-4" />
              Send via WhatsApp
            </Button>
          )}
          {batch.status === "Sent" && (
            <span className="text-sm text-muted-foreground">
              Batch sent on{" "}
              {batch.sent_at
                ? format(new Date(batch.sent_at), "MMM d, yyyy")
                : "N/A"}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Billing Period
              </div>
              <div className="text-lg">
                {format(new Date(batch.billing_period_start), "MMMM yyyy")}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Status
              </div>
              <div className="text-lg capitalize">{batch.status.toLowerCase()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </div>
              <div className="text-lg">{batch.total_invoice_count}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Amount
              </div>
              <div className="text-lg">
                {formatCurrency(batch.total_amount)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Invoices in this Batch</h3>
            <InvoiceList filterBatchId={numericBatchId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchDetails;
