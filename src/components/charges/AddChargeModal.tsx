
import { useState } from "react";
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

interface AddChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societyId: number;
}

export const AddChargeModal = ({
  open,
  onOpenChange,
  societyId,
}: AddChargeModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: ChargeFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("recurring_charges").insert({
        society_id: societyId,
        charge_name: data.charge_name,
        calculation_type: data.calculation_type,
        amount_or_rate: data.amount_or_rate,
        is_active: data.is_active,
        // Frequency is defaulted to 'monthly' in the database
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring charge added successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding charge:", error);
      
      if (error.code === "23505") {
        // Unique constraint violation - likely duplicate charge name
        toast({
          title: "Error",
          description: "A charge with this name already exists in your society.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add charge. Please try again.",
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
          <DialogTitle>Add Recurring Charge</DialogTitle>
          <DialogDescription>
            Create a new recurring charge for your society. This will be used for billing.
          </DialogDescription>
        </DialogHeader>

        <ChargeForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitText="Add Charge"
        />
      </DialogContent>
    </Dialog>
  );
};
