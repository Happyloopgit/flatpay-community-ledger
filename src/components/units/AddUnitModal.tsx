
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UnitForm from "./UnitForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitAdded: (unit: any) => void;
  societyId: number;
}

const AddUnitModal = ({ isOpen, onClose, onUnitAdded, societyId }: AddUnitModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase
        .from('units')
        .insert([
          {
            society_id: societyId,
            unit_number: values.unit_number,
            size_sqft: values.size_sqft,
            occupancy_status: values.occupancy_status,
            block_id: values.block_id
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      onUnitAdded(data);
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({
        title: "Error",
        description: "Failed to add unit",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>
        <UnitForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          societyId={societyId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddUnitModal;
