
import { useState, useEffect } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface DeleteResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: number;
}

const DeleteResidentModal = ({ open, onOpenChange, residentId }: DeleteResidentModalProps) => {
  const [residentName, setResidentName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchResidentName = async () => {
      if (!residentId) return;
      
      try {
        const { data, error } = await supabase
          .from("residents")
          .select("name")
          .eq("id", residentId)
          .single();

        if (error) throw error;
        setResidentName(data.name);
      } catch (error) {
        console.error("Error fetching resident name:", error);
        setResidentName("this resident");
      }
    };

    if (open && residentId) {
      fetchResidentName();
    }
  }, [residentId, open]);

  const handleDelete = async () => {
    setIsSubmitting(true);
    
    try {
      // Check if there are any related invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id")
        .eq("resident_id", residentId)
        .limit(1);

      if (invoicesError) throw invoicesError;
      
      if (invoices && invoices.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "This resident has associated invoices and cannot be deleted. Consider marking them as inactive instead.",
        });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from("residents")
        .delete()
        .eq("id", residentId);

      if (error) throw error;

      toast({
        title: "Resident deleted",
        description: `${residentName} has been removed successfully.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting resident:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete resident. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {residentName}. This action cannot be undone.
            If this resident has any invoices or payment history, consider marking them as inactive instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteResidentModal;
