
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InvoiceBatch = {
  id: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  total_invoice_count: number;
  total_amount: number;
  generated_at: string;
};

const InvoiceBatchList = () => {
  const { profile } = useAuth();
  const [invoiceBatches, setInvoiceBatches] = useState<InvoiceBatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy");
  };

  // Format billing period (Month Year)
  const formatBillingPeriod = (dateString: string) => {
    return format(new Date(dateString), "MMMM yyyy");
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

  // Fetch invoice batches
  const fetchInvoiceBatches = async () => {
    if (!profile?.society_id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("invoice_batches")
        .select(
          "id, billing_period_start, billing_period_end, status, total_invoice_count, total_amount, generated_at"
        )
        .eq("society_id", profile.society_id)
        .order("billing_period_start", { ascending: false });

      if (error) throw error;
      
      setInvoiceBatches(data || []);
    } catch (err: any) {
      console.error("Error fetching invoice batches:", err);
      setError("Could not load invoice batches. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load invoice batches.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!profile?.society_id) return;
    
    fetchInvoiceBatches();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("invoice-batches-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "invoice_batches",
          filter: `society_id=eq.${profile.society_id}`,
        },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchInvoiceBatches(); // Re-fetch data when changes occur
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.society_id]);

  // Handle view details button click (placeholder for now)
  const handleViewDetails = (batchId: number) => {
    toast({
      title: "Info",
      description: `Batch details functionality will be implemented in the next phase. (Batch ID: ${batchId})`,
    });
  };

  if (isLoading && invoiceBatches.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={fetchInvoiceBatches}>
          Retry
        </Button>
      </div>
    );
  }

  if (invoiceBatches.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <p>No invoice batches found. Generate your first batch to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableCaption>List of all invoice batches for your society</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Billing Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Generated On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceBatches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">
                {formatBillingPeriod(batch.billing_period_start)}
              </TableCell>
              <TableCell>{renderStatusBadge(batch.status)}</TableCell>
              <TableCell className="text-right">{batch.total_invoice_count}</TableCell>
              <TableCell className="text-right">{formatCurrency(batch.total_amount)}</TableCell>
              <TableCell>{formatDate(batch.generated_at)}</TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => handleViewDetails(batch.id)}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  View Details
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceBatchList;
