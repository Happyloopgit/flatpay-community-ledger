
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import ResidentForm from "./ResidentForm";

interface EditResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: number;
}

const EditResidentModal = ({ open, onOpenChange, residentId }: EditResidentModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [residentData, setResidentData] = useState<any>(null);
  const { toast } = useToast();

  // Fetch resident data when modal opens
  useEffect(() => {
    if (open && residentId) {
      fetchResidentData(residentId);
    }
  }, [open, residentId]);

  const fetchResidentData = async (id: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`
          *,
          units:primary_unit_id(
            id,
            unit_number,
            block_id,
            society_blocks:block_id(block_name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Transform the data to match the form structure
      const formattedData = {
        ...data,
        primary_unit_id: data.primary_unit_id || null,
        unit_number: data.units?.unit_number || "",
        block_name: data.units?.society_blocks?.block_name || "",
      };

      setResidentData(formattedData);
    } catch (error: any) {
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

  const handleSubmit = async (formData: any) => {
    setIsSaving(true);
    try {
      // Use the update_resident RPC function as intended
      const { error } = await supabase.rpc('update_resident', {
        p_resident_id: residentId,
        p_name: formData.name,
        p_phone_number: formData.phone_number,
        p_email: formData.email || null,
        p_primary_unit_id: formData.primary_unit_id || null,
        p_move_in_date: formData.move_in_date || null,
        p_move_out_date: formData.move_out_date || null,
        p_is_active: formData.is_active,
        p_whatsapp_opt_in: formData.whatsapp_opt_in
      });

      if (error) throw error;

      toast({
        title: "Resident updated",
        description: "Resident information has been updated successfully.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating resident:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update resident: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Resident</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading resident data...</span>
          </div>
        ) : (
          <ResidentForm
            initialData={residentData}
            onSubmit={handleSubmit}
            isSubmitting={isSaving}
            societyId={residentData?.society_id}
            submitText="Update Resident"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditResidentModal;
