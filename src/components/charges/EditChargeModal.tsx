
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChargeForm, ChargeFormValues } from "./ChargeForm";
import { RecurringCharge } from "./ChargesList";

interface EditChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeId: string;
}

export const EditChargeModal = ({
  open,
  onOpenChange,
  chargeId,
}: EditChargeModalProps) => {
  const [charge, setCharge] = useState<RecurringCharge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCharge = async () => {
      if (!chargeId || !open) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("recurring_charges")
          .select("*")
          .eq("id", chargeId)
          .single();

        if (error) throw error;
        setCharge(data);
      } catch (error: any) {
        console.error("Error fetching charge:", error);
        toast({
          title: "Error",
          description: "Failed to load charge details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharge();
  }, [chargeId, open, toast]);

  const handleSubmit = async (data: ChargeFormValues) => {
    if (!chargeId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("recurring_charges")
        .update({
          charge_name: data.charge_name,
          calculation_type: data.calculation_type,
          amount_or_rate: data.amount_or_rate,
          is_active: data.is_active,
        })
        .eq("id", chargeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Charge updated successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating charge:", error);
      
      if (error.code === "23505") {
        toast({
          title: "Error",
          description: "A charge with this name already exists in your society.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update charge. Please try again.",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Recurring Charge</DialogTitle>
          <DialogDescription>
            Update the details of this recurring charge.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center">Loading charge details...</div>
        ) : charge ? (
          <ChargeForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            defaultValues={{
              charge_name: charge.charge_name,
              calculation_type: charge.calculation_type as "fixed_per_unit" | "per_sqft",
              amount_or_rate: charge.amount_or_rate,
              is_active: charge.is_active,
            }}
            submitText="Update Charge"
          />
        ) : (
          <div className="py-6 text-center text-destructive">
            Charge not found or has been deleted.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
