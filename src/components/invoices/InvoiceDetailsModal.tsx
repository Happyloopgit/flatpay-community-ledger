import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { getStatusBadgeVariant } from "@/lib/utils";
import { RecordPaymentModal } from "../payments/RecordPaymentModal";
import type { Payment } from "./types";

interface InvoiceDetailsModalProps {
  invoiceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

interface InvoiceDetails {
  id: number;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  residents: { name: string } | null;
  units: {
    unit_number: string;
    society_blocks: {
      block_name: string;
    } | null;
  } | null;
}

export function InvoiceDetailsModal({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceDetails | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const loadInvoiceData = async () => {
    if (!invoiceId) return;
    
    setIsLoading(true);
    setError(null);
    setPaymentsError(null);

    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `*, 
           residents(name),
           units(
             unit_number,
             society_blocks(block_name)
           )`
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw new Error(invoiceError.message);

      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (itemsError) throw new Error(itemsError.message);

      setInvoiceData(invoice);
      setInvoiceItems(items);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, payment_date, amount, payment_method, reference_number, notes')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw new Error(paymentsError.message);
      setPayments(paymentsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId, open]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const canRecordPayment = invoiceData && invoiceData.status !== "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : invoiceData ? (
          <>
            <DialogHeader>
              <DialogTitle>Invoice #{invoiceData.invoice_number}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Resident
                  </p>
                  <p className="text-sm">{invoiceData.residents?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unit</p>
                  <p className="text-sm">
                    {invoiceData.units?.society_blocks?.block_name
                      ? `${invoiceData.units.society_blocks.block_name} - ${invoiceData.units.unit_number}`
                      : invoiceData.units?.unit_number || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Billing Period
                  </p>
                  <p className="text-sm">
                    {format(
                      new Date(invoiceData.billing_period_start),
                      "MMMM yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Due Date
                  </p>
                  <p className="text-sm">{formatDate(invoiceData.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge variant={getStatusBadgeVariant(invoiceData.status)}>
                    {invoiceData.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80%]">Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Total Amount</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoiceData.total_amount)}
                    </TableCell>
                  </TableRow>
                  {invoiceData.amount_paid > 0 && (
                    <>
                      <TableRow>
                        <TableCell className="font-medium">Amount Paid</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoiceData.amount_paid)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Balance Due</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoiceData.balance_due)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Recorded Payments</h3>
              {payments === null ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{paymentsError}</AlertDescription>
                </Alert>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference #</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.reference_number || '-'}</TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {canRecordPayment && (
              <div className="flex justify-end mt-4">
                <Button onClick={() => setShowPaymentModal(true)}>
                  Record Payment
                </Button>
              </div>
            )}

            {invoiceData && (
              <RecordPaymentModal
                invoiceId={invoiceData.id}
                balanceDue={invoiceData.balance_due}
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                onPaymentRecorded={loadInvoiceData}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
