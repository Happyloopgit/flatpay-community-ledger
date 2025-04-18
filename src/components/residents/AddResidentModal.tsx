
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResidentForm, { ResidentFormValues } from "./ResidentForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AddResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddResidentModal = ({ open, onOpenChange }: AddResidentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Hardcoded society ID for now - in a real app this would come from a context or state
  const societyId = 1;

  const handleSubmit = async (values: ResidentFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Use RPC to call the create_resident database function
      const { data, error } = await supabase.rpc('create_resident', {
        p_society_id: societyId,
        p_name: values.name,
        p_phone_number: values.phone_number,
        p_email: values.email || null,
        p_primary_unit_id: values.primary_unit_id || null,
        p_move_in_date: values.move_in_date ? values.move_in_date.toISOString() : null,
        p_move_out_date: values.move_out_date ? values.move_out_date.toISOString() : null,
        p_is_active: values.is_active !== undefined ? values.is_active : true,
        p_whatsapp_opt_in: values.whatsapp_opt_in || false
      });

      if (error) {
        // Improved error handling with specific messages based on error type
        if (error.code === '23505' && error.message?.includes('residents_society_id_email_unique')) {
          // Email uniqueness constraint violation
          throw new Error("Email address already exists for this society.");
        } else if (error.message?.includes("Unit") && error.message?.includes("already assigned")) {
          // Unit assignment constraint from the database function
          throw new Error(error.message);
        } else {
          // Generic error with original message
          throw new Error(`Failed to add resident: ${error.message}`);
        }
      }

      toast({
        title: "Resident added",
        description: "New resident has been added successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding resident:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add resident. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Resident</DialogTitle>
        </DialogHeader>
        <ResidentForm 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          societyId={societyId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddResidentModal;
