
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import InvoiceList from "@/components/invoices/InvoiceList";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface FinalizeBatchResult {
  id: number;
  society_id: number;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  generated_at: string;
  finalized_at: string;
  updated_at: string;
  created_at: string;
  generated_by_profile_id: string;
  total_invoice_count: number;
  total_amount: number;
  updated_invoices: number;
}

interface CancelBatchResult {
  success: boolean;
  message: string;
  deleted_invoices: number;
}

const BatchDetails = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const numericBatchId = parseInt(batchId || "0", 10);
  const { session } = useAuth();

  const { data: batch, isLoading, error, refetch: fetchBatchData } = useQuery({
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

  const handleFinalizeBatch = async () => {
    if (!batchId) return;

    const numericBatchId = parseInt(batchId, 10);
    if (isNaN(numericBatchId)) {
      toast({
        title: "Error",
        description: "Invalid batch ID.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error, data } = await supabase.rpc("finalize_batch", {
        p_batch_id: numericBatchId,
      });

      if (error) throw error;

      if (!data || Array.isArray(data)) {
        console.error("Unexpected response format from finalize_batch:", data);
        throw new Error("Received unexpected response from server after finalizing.");
      }

      const result = data as unknown as FinalizeBatchResult;

      toast({
        title: "Success",
        description: `${result?.updated_invoices || 0} invoices finalized.`,
      });

      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id")
        .eq("invoice_batch_id", numericBatchId);

      if (invoicesError) throw invoicesError;

      if (invoices && invoices.length > 0) {
        toast({
          title: "PDF Generation",
          description: `Starting PDF generation for ${invoices.length} invoices...`,
        });

        // Get auth token from session
        const token = session?.access_token;
        if (!token) {
          console.error("Authentication token not available");
          toast({
            title: "PDF Generation Error",
            description: "Authentication required for PDF generation. Please login again.",
            variant: "destructive",
          });
        } else {
          try {
            await Promise.all(
              invoices.map(async (invoice) => {
                try {
                  const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ invoice_id: invoice.id })
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `PDF generation failed for invoice ${invoice.id} with status ${response.status}`);
                  }

                  const result = await response.json();
                  console.log(`PDF generation triggered for invoice ${invoice.id}:`, result);
                } catch (fetchError) {
                  console.error(`Error triggering PDF generation for invoice ${invoice.id}:`, fetchError);
                  throw fetchError;
                }
              })
            );

            toast({
              title: "PDF Generation Initiated",
              description: `PDF generation started for ${invoices.length} invoices. They will be available shortly.`,
            });
          } catch (pdfError) {
            console.error("Error during PDF generation:", pdfError);
            toast({
              title: "PDF Generation Error",
              description: "Some PDFs may have failed to generate. Please check the invoices individually.",
              variant: "destructive",
            });
          }
        }
      }

      await fetchBatchData();
      setShowFinalizeDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to finalize batch: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBatch = async () => {
    if (!batchId) return;

    const numericBatchId = parseInt(batchId, 10);
    if (isNaN(numericBatchId)) {
      toast({
        title: "Error",
        description: "Invalid batch ID.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error, data } = await supabase.rpc("cancel_batch", {
        p_batch_id: numericBatchId,
      });

      if (error) throw error;

      if (!data || Array.isArray(data)) {
        console.error("Unexpected response format from cancel_batch:", data);
        throw new Error("Received unexpected response from server after cancelling.");
      }

      const result = data as unknown as CancelBatchResult;

      toast({
        title: "Success",
        description: `Draft batch cancelled. ${result?.deleted_invoices || 0} invoices deleted.`,
      });

      navigate("/billing");
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to cancel batch: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
  };

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

        <div className="flex gap-2">
          {batch.status === "Draft" && (
            <>
              <Button 
                variant="default" 
                className="gap-2" 
                onClick={() => setShowFinalizeDialog(true)}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4" />
                Finalize Batch
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={() => setShowCancelDialog(true)}
                disabled={isProcessing}
              >
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

      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Invoice Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finalize this invoice batch? Invoices will be marked as Pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizeBatch} disabled={isProcessing}>
              {isProcessing ? "Finalizing..." : "Finalize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Draft Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this draft batch? All draft invoices within it will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBatch} disabled={isProcessing}>
              {isProcessing ? "Cancelling..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BatchDetails;
