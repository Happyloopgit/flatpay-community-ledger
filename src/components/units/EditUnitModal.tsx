
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

interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit: {
    id: number;
    unit_number: string;
    size_sqft: number | null;
    occupancy_status: string;
    block_id: string | null;
  };
  societyId: number;
}

const EditUnitModal = ({ isOpen, onClose, onSuccess, unit, societyId }: EditUnitModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('units')
        .update({
          unit_number: values.unit_number,
          size_sqft: values.size_sqft,
          occupancy_status: values.occupancy_status,
          block_id: values.block_id
        })
        .eq('id', unit.id)
        .eq('society_id', societyId);
        
      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error('Error updating unit:', error);
      toast({
        title: "Error",
        description: "Failed to update unit",
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
          <DialogTitle>Edit Unit</DialogTitle>
        </DialogHeader>
        <UnitForm 
          onSubmit={handleSubmit}
          initialData={unit}
          isSubmitting={isSubmitting}
          societyId={societyId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditUnitModal;
