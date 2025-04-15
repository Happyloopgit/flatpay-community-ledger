
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type InvoiceBatch = {
  id: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  total_invoice_count: number;
  total_amount: number;
  generated_at: string;
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const InvoiceBatchList = () => {
  const { profile } = useAuth();
  const societyId = profile?.society_id;

  // Fetch invoice batches
  const fetchInvoiceBatches = async () => {
    if (!societyId) throw new Error("Society ID not available");

    const { data, error } = await supabase
      .from("invoice_batches")
      .select("*")
      .eq("society_id", societyId)
      .order("generated_at", { ascending: false });

    if (error) throw error;
    return data as InvoiceBatch[];
  };

  // Use React Query to manage data fetching
  const {
    data: batches,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoice-batches", societyId],
    queryFn: fetchInvoiceBatches,
    enabled: !!societyId,
  });

  // Set up Realtime subscription for invoice_batches table
  useEffect(() => {
    if (!societyId) return;

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoice_batches",
          filter: `society_id=eq.${societyId}`,
        },
        () => {
          console.log("Received invoice batch change notification, refetching data");
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [societyId, refetch]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load invoice batches"}
        </AlertDescription>
      </Alert>
    );
  }

  // Handle empty state
  if (!batches || batches.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No invoice batches found. Generate a new batch using the button above.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Billing Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right"># Invoices</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead>Generated On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>
                {format(new Date(batch.billing_period_start), "MMMM yyyy")}
              </TableCell>
              <TableCell>
                <span className="capitalize">{batch.status.toLowerCase()}</span>
              </TableCell>
              <TableCell className="text-right">{batch.total_invoice_count}</TableCell>
              <TableCell className="text-right">{formatCurrency(batch.total_amount)}</TableCell>
              <TableCell>
                {format(new Date(batch.generated_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View batch details</span>
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
