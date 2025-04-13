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

// Define a type for the cancel_batch RPC response
interface CancelBatchResult {
  success: boolean;
  message: string;
  deleted_invoices: number;
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

    // --- START: Added Conversion & Check ---
    const numericBatchId = parseInt(batchId, 10); 
    if (isNaN(numericBatchId)) {
        console.error("Invalid Batch ID parameter:", batchId);
        setError("Invalid Batch ID in URL.");
        setIsLoading(false); // Make sure to stop loading if ID is invalid
        toast({ title: "Error", description: "Invalid Batch ID.", variant: "destructive" });
        return; 
    }
    // --- END: Added Conversion & Check ---
    
    setIsLoading(true);
    setError(null); // Reset error before fetch
    
    try {
      const { data, error } = await supabase
        .from("invoice_batches")
        .select("*")
        .eq("id", numericBatchId) // <--- Use the converted numeric ID here
        .eq("society_id", profile.society_id)
        .single();
        
      if (error) throw error; // Throw if Supabase returns an error
      
      if (!data) {
        // If no data and no error, it means not found for this user/society
        setError("Invoice batch not found or access denied."); 
        setBatch(null); // Clear any previous batch data
        toast({
          title: "Not Found",
          description: "Invoice batch not found.",
          variant: "destructive",
        });
        return;
      }
      
      setBatch(data); // Set the found batch data
    } catch (err: any) {
      // Catch errors from the try block (Supabase errors or the !data error)
      console.error("Error fetching invoice batch:", err);
      setError(err.message || "Failed to load invoice batch details");
      setBatch(null); // Clear batch data on error
      // Toast might be redundant if error is already set and displayed, but can keep
      toast({
        title: "Error",
        description: err.message || "Could not load batch details",
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
    // --- START: Added Conversion & Check at the beginning ---
    if (!batchId || typeof batchId !== 'string') { 
      console.error("Finalize failed: Batch ID is missing or invalid.");
      toast({ title: "Error", description: "Cannot finalize: Invalid Batch ID.", variant: "destructive" });
      setShowFinalizeDialog(false); // Close dialog on error
      return; 
    }
    const numericBatchId = parseInt(batchId, 10);
    if (isNaN(numericBatchId)) {
      console.error("Finalize failed: Invalid Batch ID format:", batchId);
      toast({ title: "Error", description: "Invalid Batch ID format.", variant: "destructive" });
      setShowFinalizeDialog(false); // Close dialog on error
      return; 
    }
    // --- END: Added Conversion & Check ---

    setIsProcessing(true);
    
    try {
      // Now call RPC with the guaranteed number
      const { data, error } = await supabase
        .rpc('finalize_batch', { p_batch_id: numericBatchId }); // <-- Use numericBatchId
      
      if (error) throw error; // Throw Supabase error to catch block
      
      // --- START: Added Explicit Check before Assertion ---
      if (!data || Array.isArray(data)) {
        // This case means the RPC succeeded but returned unexpected data
        console.error("Unexpected response format from finalize_batch:", data);
        throw new Error("Received unexpected response from server after finalizing.");
      }
      // --- END: Added Explicit Check ---

      // Type assertion is now safer
      const result = data as unknown as FinalizeBatchResult; 
      console.log("Batch finalized successfully:", result);
      
      // Show success toast (with optional chaining for safety)
      toast({
        title: "Batch Finalized",
        description: `Batch finalized successfully. ${result?.updated_invoices || 0} invoices marked as Pending.`, 
      });
      
      // Refresh batch data to update UI AFTER success
      fetchBatchData(); 

    } catch (err: any) {
      // Catch errors from the try block (Supabase errors or thrown errors)
      console.error("Error finalizing batch:", err);
      toast({
        title: "Error Finalizing Batch",
        description: err.message || "Failed to finalize batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      // This runs regardless of success or error
      setIsProcessing(false);
      setShowFinalizeDialog(false); // Ensure dialog closes
    }
  };

  // Handle cancel batch
  const handleCancelBatch = async () => {
    // Type and format validation
    if (!batchId || typeof batchId !== 'string') { 
      console.error("Cancel failed: Batch ID is missing or invalid.");
      toast({ 
        title: "Error", 
        description: "Cannot cancel: Invalid Batch ID.", 
        variant: "destructive" 
      });
      setShowCancelDialog(false);
      return; 
    }
    
    const numericBatchId = parseInt(batchId, 10);
    if (isNaN(numericBatchId)) {
      console.error("Cancel failed: Invalid Batch ID format:", batchId);
      toast({ 
        title: "Error", 
        description: "Invalid Batch ID format.", 
        variant: "destructive" 
      });
      setShowCancelDialog(false);
      return; 
    }

    setIsProcessing(true);
    
    try {
      // Call cancel_batch RPC function
      const { data, error } = await supabase
        .rpc('cancel_batch', { p_batch_id: numericBatchId });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error("No response received from server after cancelling batch.");
      }
      
      // Type assertion for the result
      const result = data as unknown as CancelBatchResult;
      
      console.log("Batch cancelled successfully:", result);
      
      // Show success toast
      toast({
        title: "Batch Cancelled",
        description: `Batch cancelled successfully. ${result.deleted_invoices} invoices deleted.`,
      });
      
      // Navigate back to the billing page
      navigate("/billing");
      
    } catch (err: any) {
      console.error("Error cancelling batch:", err);
      toast({
        title: "Error Cancelling Batch",
        description: err.message || "Failed to cancel batch. Please try again.",
        variant: "destructive",
      });
      // Keep the user on the page, since the batch might still exist
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
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
              onClick={() => setShowCancelDialog(true)}
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
          <InvoiceList filterBatchId={parseInt(batchId, 10)} />
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

      {/* Cancel Batch Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Draft Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this draft batch? All draft invoices within it will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>No, Keep Batch</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelBatch}
              disabled={isProcessing}
              className="gap-1"
              variant="destructive"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, Cancel Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BatchDetails;
