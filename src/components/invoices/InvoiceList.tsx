
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invoice {
  id: number;
  invoice_number: string;
  resident_id: number;
  unit_id: number;
  status: string;
  generation_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  resident_name?: string;
  unit_number?: string;
}

interface InvoiceListProps {
  filterBatchId?: number;
}

const InvoiceList = ({ filterBatchId }: InvoiceListProps) => {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending":
        return <Badge>Pending</Badge>;
      case "paid":
        return <Badge variant="secondary">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Fetch invoices with joined resident and unit data
  const fetchInvoices = async () => {
    if (!profile?.society_id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          residents (name),
          units (unit_number)
        `)
        .eq("society_id", profile.society_id);
      
      // Apply batch filter if provided
      if (filterBatchId) {
        query = query.eq("invoice_batch_id", filterBatchId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Process the joined data
      const processedInvoices = data.map(invoice => ({
        ...invoice,
        resident_name: invoice.residents?.name,
        unit_number: invoice.units?.unit_number,
      }));

      setInvoices(processedInvoices);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError("Failed to load invoices");
      toast({
        title: "Error",
        description: "Could not load invoices. " + err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view invoice
  const handleViewInvoice = (id: number) => {
    toast({
      title: "Coming Soon",
      description: "Invoice viewing will be implemented soon.",
    });
  };

  // Handle download invoice
  const handleDownloadInvoice = (id: number) => {
    toast({
      title: "Coming Soon",
      description: "Invoice downloading will be implemented soon.",
    });
  };

  // Subscribe to realtime updates and fetch initial data
  useEffect(() => {
    if (!profile?.society_id) return;
    
    fetchInvoices();
    
    // Set up subscription for realtime updates
    const channel = supabase
      .channel("invoices-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public", 
          table: "invoices",
          filter: `society_id=eq.${profile.society_id}${filterBatchId ? ` AND invoice_batch_id=eq.${filterBatchId}` : ''}`,
        },
        (payload) => {
          console.log("Realtime invoice update:", payload);
          fetchInvoices(); // Re-fetch all invoices when there's an update
        }
      )
      .subscribe();
      
    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.society_id, filterBatchId]);

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-2" onClick={fetchInvoices}>
          Try Again
        </Button>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No invoices found.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableCaption>List of invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Resident</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>{invoice.unit_number}</TableCell>
              <TableCell>{invoice.resident_name}</TableCell>
              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
              <TableCell>{formatDate(invoice.generation_date)}</TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleViewInvoice(invoice.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDownloadInvoice(invoice.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceList;
