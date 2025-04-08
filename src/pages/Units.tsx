
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UnitsList from "@/components/units/UnitsList";
import AddUnitModal from "@/components/units/AddUnitModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Units = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [societyId, setSocietyId] = useState(null);

  useEffect(() => {
    const fetchUserSocietyId = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('society_id')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data && data.society_id) {
          setSocietyId(data.society_id);
        } else {
          toast({
            title: "Society not configured",
            description: "Please set up your society first",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching society ID:', error);
        toast({
          title: "Error",
          description: "Failed to load society information",
          variant: "destructive",
        });
      }
    };

    fetchUserSocietyId();
  }, [user, toast]);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!societyId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('units')
          .select('id, unit_number, size_sqft, occupancy_status')
          .eq('society_id', societyId)
          .order('unit_number', { ascending: true });
          
        if (error) throw error;
        
        setUnits(data || []);
      } catch (error) {
        console.error('Error fetching units:', error);
        toast({
          title: "Error",
          description: "Failed to load units",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();

    // Set up realtime subscription for units
    if (societyId) {
      const channel = supabase
        .channel('units-changes')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'units',
            filter: `society_id=eq.${societyId}`
          }, 
          (payload) => {
            console.log('Change received!', payload);
            
            // Handle different event types
            if (payload.eventType === 'INSERT') {
              setUnits(current => [...current, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setUnits(current => 
                current.map(unit => unit.id === payload.new.id ? payload.new : unit)
              );
            } else if (payload.eventType === 'DELETE') {
              setUnits(current => 
                current.filter(unit => unit.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [societyId, toast]);

  const handleUnitAdded = (newUnit) => {
    setIsAddModalOpen(false);
    // The realtime subscription should handle updating the list
    toast({
      title: "Success",
      description: `Unit ${newUnit.unit_number} has been added`,
    });
  };

  return (
    <div className="container px-4 py-6 mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Units</CardTitle>
          <Button onClick={() => setIsAddModalOpen(true)} className="ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </CardHeader>
        <CardContent>
          <UnitsList 
            units={units} 
            loading={loading} 
            societyId={societyId} 
          />
        </CardContent>
      </Card>
      
      {societyId && (
        <AddUnitModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)}
          onUnitAdded={handleUnitAdded}
          societyId={societyId}
        />
      )}
    </div>
  );
};

export default Units;
