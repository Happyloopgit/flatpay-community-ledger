
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// Define TypeScript types for our invoice data
type Invoice = {
  id: number;
  invoice_number: string;
  billing_period_start: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  resident_name: string | null;
  unit_number: string | null;
  block_name: string | null;
};

interface InvoiceListProps {
  filterBatchId?: number;
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

// Helper function to determine badge variant based on invoice status
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    case "partially_paid":
      return "outline";
    default:
      return "secondary";
  }
};

const InvoiceList = ({ filterBatchId }: InvoiceListProps) => {
  const { profile } = useAuth();
  const societyId = profile?.society_id;

  // Fetch invoices with related data
  const fetchInvoices = async () => {
    if (!societyId) throw new Error("Society ID not available");

    let query = supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        billing_period_start,
        due_date,
        total_amount,
        amount_paid,
        balance_due,
        status,
        residents!left (
          name
        ),
        units!left (
          unit_number,
          society_blocks!left (
            block_name
          )
        )
      `)
      .eq("society_id", societyId);
      
    // Apply batch filter if provided
    if (filterBatchId) {
      query = query.eq("invoice_batch_id", filterBatchId);
    }
    
    query = query.order("due_date", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Transform the nested data to a flat structure
    return data.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      billing_period_start: invoice.billing_period_start,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      balance_due: invoice.balance_due,
      status: invoice.status,
      resident_name: invoice.residents?.name || null,
      unit_number: invoice.units?.unit_number || null,
      block_name: invoice.units?.society_blocks?.block_name || null,
    }));
  };

  // Use React Query to manage data fetching
  const {
    data: invoices,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices", societyId, filterBatchId],
    queryFn: fetchInvoices,
    enabled: !!societyId,
  });

  // Set up Realtime subscription for invoices table
  useEffect(() => {
    if (!societyId) return;

    // Subscribe to invoice changes for this society
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "invoices",
          filter: `society_id=eq.${societyId}`,
        },
        () => {
          console.log("Received invoice change notification, refetching data");
          refetch();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
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
          {error instanceof Error ? error.message : "Failed to load invoices"}
        </AlertDescription>
      </Alert>
    );
  }

  // Handle empty state
  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {filterBatchId 
          ? "No invoices found in this batch."
          : "No invoices found. Generate invoices using the button above."
        }
      </div>
    );
  }

  // Format unit display (Block - Unit #, or just Unit # if no block)
  const formatUnitDisplay = (invoice: Invoice) => {
    if (!invoice.unit_number) return "N/A";
    if (invoice.block_name) {
      return `${invoice.block_name} - ${invoice.unit_number}`;
    }
    return invoice.unit_number;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Resident</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Billing Period</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Amount Paid</TableHead>
            <TableHead>Balance Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>{invoice.resident_name || "N/A"}</TableCell>
              <TableCell>{formatUnitDisplay(invoice)}</TableCell>
              <TableCell>
                {invoice.billing_period_start
                  ? format(new Date(invoice.billing_period_start), "MMMM yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell>
                {invoice.due_date
                  ? format(new Date(invoice.due_date), "MMM d, yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
              <TableCell>{formatCurrency(invoice.amount_paid)}</TableCell>
              <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {invoice.status.replace("_", " ")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceList;
