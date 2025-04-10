
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      // Call the update_resident RPC function using normal from/update instead of rpc
      // to avoid the type error while the types are being regenerated
      const { error } = await supabase
        .from('residents')
        .update({
          name: formData.name,
          phone_number: formData.phone_number,
          email: formData.email || null,
          primary_unit_id: formData.primary_unit_id || null,
          move_in_date: formData.move_in_date || null,
          move_out_date: formData.move_out_date || null,
          is_active: formData.is_active,
          whatsapp_opt_in: formData.whatsapp_opt_in
        })
        .eq('id', residentId);

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
            submitText="Update Resident"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditResidentModal;
