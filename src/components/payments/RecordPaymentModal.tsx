
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { PaymentForm } from "./PaymentForm";
import { PaymentFormData } from "./types";

interface RecordPaymentModalProps {
  invoiceId: number;
  balanceDue: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export function RecordPaymentModal({
  invoiceId,
  balanceDue,
  open,
  onOpenChange,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      // Use any type to bypass TypeScript RPC function name validation
      // since we know the function exists on the backend
      const { error } = await supabase.rpc("record_payment" as any, {
        p_invoice_id: invoiceId,
        p_amount: data.amount,
        p_payment_date: data.payment_date.toISOString().split("T")[0],
        p_payment_method: data.payment_method,
        p_reference_number: data.reference_number || null,
        p_notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Payment of ${data.amount} recorded successfully.`,
      });
      
      onPaymentRecorded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        variant: "destructive",
        title: "Error Recording Payment",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <PaymentForm
          balanceDue={balanceDue}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
