
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChargesList } from "@/components/charges/ChargesList";
import { AddChargeModal } from "@/components/charges/AddChargeModal";
import { useAuth } from "@/contexts/AuthContext";

export const ChargesTab = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<number | null>(null);

  // Fetch the society ID for the current user
  useEffect(() => {
    const fetchSocietyId = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('society_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching society ID:', error);
        toast({
          title: "Error",
          description: "Could not fetch society information.",
          variant: "destructive",
        });
        return;
      }

      if (data?.society_id) {
        setSocietyId(data.society_id);
      }
    };

    fetchSocietyId();
  }, [user, toast]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recurring Charges</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Charge
        </Button>
      </div>

      {societyId ? (
        <>
          <ChargesList societyId={societyId} />
          <AddChargeModal 
            open={isAddModalOpen} 
            onOpenChange={setIsAddModalOpen} 
            societyId={societyId} 
          />
        </>
      ) : (
        <div className="p-4 text-center">
          <p>Loading society information...</p>
        </div>
      )}
    </div>
  );
};
