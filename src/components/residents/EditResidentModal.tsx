
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResidentForm, { ResidentFormValues } from "./ResidentForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface EditResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: number;
}

const EditResidentModal = ({ open, onOpenChange, residentId }: EditResidentModalProps) => {
  const [resident, setResident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Hardcoded society ID for now - in a real app this would come from a context or state
  const societyId = 1;

  useEffect(() => {
    const fetchResident = async () => {
      if (!residentId) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (error) {
          throw error;
        }

        setResident(data);
      } catch (error) {
        console.error("Error fetching resident:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load resident data. Please try again.",
        });
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && residentId) {
      fetchResident();
    }
  }, [residentId, open, toast, onOpenChange]);

  const handleSubmit = async (values: ResidentFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Convert dates to ISO strings for Supabase
      const dataToUpdate = {
        ...values,
        move_in_date: values.move_in_date ? values.move_in_date.toISOString() : null,
        move_out_date: values.move_out_date ? values.move_out_date.toISOString() : null,
      };

      const { error } = await supabase
        .from("residents")
        .update(dataToUpdate)
        .eq("id", residentId);

      if (error) {
        throw error;
      }

      toast({
        title: "Resident updated",
        description: "Resident information has been updated successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating resident:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update resident. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Resident</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : resident ? (
          <ResidentForm 
            onSubmit={handleSubmit} 
            initialData={resident}
            isSubmitting={isSubmitting}
            societyId={societyId}
          />
        ) : (
          <p>Failed to load resident data.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditResidentModal;
