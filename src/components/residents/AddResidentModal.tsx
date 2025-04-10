
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResidentForm, { ResidentFormValues } from "./ResidentForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

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
      // Convert dates to ISO strings for Supabase
      const dataToInsert = {
        ...values,
        move_in_date: values.move_in_date ? values.move_in_date.toISOString() : null,
        move_out_date: values.move_out_date ? values.move_out_date.toISOString() : null,
        society_id: societyId
      };

      const { error } = await supabase
        .from("residents")
        .insert([dataToInsert]);

      if (error) {
        throw error;
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
        description: "Failed to add resident. Please try again.",
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
