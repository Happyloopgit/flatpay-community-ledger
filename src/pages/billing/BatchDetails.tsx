
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Loader2, ArrowLeft, CheckCircle2, Check, Send, XCircle } from "lucide-react";
import InvoiceList from "@/components/invoices/InvoiceList";

type InvoiceBatch = {
  id: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  total_invoice_count: number;
  total_amount: number;
  generated_at: string;
  finalized_at: string | null;
  sent_at: string | null;
};

// Define a type for the finalize_batch RPC response
interface FinalizeBatchResult extends InvoiceBatch {
  updated_invoices: number;
}

const BatchDetails = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [batch, setBatch] = useState<InvoiceBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMM yyyy, h:mm a");
  };

  // Format billing period (Month Year)
  const formatBillingPeriod = (dateString: string) => {
    return format(new Date(dateString), "MMMM yyyy");
  };

  // Fetch batch data
  const fetchBatchData = async () => {
    if (!batchId || !profile?.society_id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("invoice_batches")
        .select("*")
        .eq("id", batchId)
        .eq("society_id", profile.society_id)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        setError("Invoice batch not found");
        return;
      }
      
      setBatch(data);
    } catch (err: any) {
      console.error("Error fetching invoice batch:", err);
      setError(err.message || "Failed to load invoice batch details");
      toast({
        title: "Error",
        description: "Could not load batch details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchBatchData();
  }, [batchId, profile?.society_id]);

  // Subscribe to realtime updates for this specific batch
  useEffect(() => {
    if (!batchId) return;
    
    const channel = supabase
      .channel(`batch-${batchId}-changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoice_batches",
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          console.log("Realtime batch update:", payload);
          // Update the UI with the new batch data
          if (payload.eventType === "DELETE") {
            // Batch was deleted, navigate back
            toast({
              title: "Batch Deleted",
              description: "This invoice batch has been deleted.",
            });
            navigate("/billing");
          } else if (payload.new) {
            setBatch(payload.new as InvoiceBatch);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchId, navigate]);

  // Handle finalize batch
  const handleFinalizeBatch = async () => {
    if (!batchId) return;
    
    setIsProcessing(true);
    
    try {
      // Convert batchId from string to number
      const batchIdNumber = parseInt(batchId, 10);
      
      // Check if the conversion resulted in a valid number
      if (isNaN(batchIdNumber)) {
        throw new Error("Invalid batch ID");
      }
      
      const { data, error } = await supabase
        .rpc('finalize_batch', { p_batch_id: batchIdNumber });
      
      if (error) throw error;
      
      // Use type assertion to access the updated_invoices property
      const result = data as FinalizeBatchResult;
      console.log("Batch finalized successfully:", result);
      
      // Show success toast
      toast({
        title: "Batch Finalized",
        description: `Batch finalized successfully. ${result.updated_invoices || 0} invoices marked as Pending.`,
      });
      
      // Refresh batch data to update UI
      fetchBatchData();
    } catch (err: any) {
      console.error("Error finalizing batch:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to finalize batch",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowFinalizeDialog(false);
    }
  };
  
  const handleCancelBatch = () => {
    // This is just a placeholder for now - logic will be implemented later
    toast({
      title: "Coming Soon",
      description: "Batch cancellation will be implemented later.",
    });
  };
  
  const handleSendBatchWhatsApp = () => {
    // This is just a placeholder for now - logic will be implemented later
    toast({
      title: "Coming Soon",
      description: "WhatsApp sending will be implemented later.",
    });
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "Pending":
        return <Badge variant="default">Pending</Badge>;
      case "Sent":
        return <Badge>Sent</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render action buttons based on batch status
  const renderActionButtons = () => {
    if (!batch) return null;

    switch (batch.status) {
      case "Draft":
        return (
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowFinalizeDialog(true)}
              className="gap-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Finalize Batch
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancelBatch}
              className="gap-1"
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4" />
              Cancel Batch
            </Button>
          </div>
        );
      case "Pending":
        return (
          <Button 
            onClick={handleSendBatchWhatsApp}
            className="gap-1"
            disabled={isProcessing}
          >
            <Send className="h-4 w-4" />
            Send Batch via WhatsApp
          </Button>
        );
      case "Sent":
        return (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>Sent on {formatDate(batch.sent_at)}</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-1" onClick={() => navigate("/billing")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Button>
        
        <Alert variant="destructive">
          <AlertDescription>{error || "Batch not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="gap-1" onClick={() => navigate("/billing")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Button>
        <h1 className="text-3xl font-bold">Invoice Batch Details</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span>Billing Period: {formatBillingPeriod(batch.billing_period_start)}</span>
            {renderStatusBadge(batch.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-xl font-semibold">{batch.total_invoice_count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-semibold">{formatCurrency(batch.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Generated On</p>
              <p className="text-xl font-semibold">{formatDate(batch.generated_at)}</p>
            </div>
          </div>
          
          <div className="mt-4 mb-8">
            {renderActionButtons()}
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Invoices in this Batch</h2>
          <InvoiceList filterBatchId={Number(batchId)} />
        </CardContent>
      </Card>

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Invoice Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finalize this batch? Associated invoices will be marked as Pending.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalizeBatch}
              disabled={isProcessing}
              className="gap-1"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BatchDetails;
