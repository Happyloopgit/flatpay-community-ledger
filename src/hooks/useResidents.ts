
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

export type Resident = {
  id: number;
  name: string;
  email: string | null;
  phone_number: string;
  primary_unit_id: number | null;
  society_id: number;
  move_in_date: string | null;
  move_out_date: string | null;
  is_active: boolean | null;
  whatsapp_opt_in: boolean;
  virtual_payment_upi_id: string | null;
  unit_number?: string;
  block_name?: string;
};

export type ResidentFilter = 'all' | 'active' | 'inactive';

export const fetchResidents = async (society_id: number) => {
  // Since we're fetching residents with their associated unit information,
  // we need to use a join query
  const { data, error } = await supabase
    .from("residents")
    .select(`
      *,
      units:primary_unit_id(
        unit_number,
        block_id,
        society_blocks:block_id(block_name)
      )
    `)
    .eq("society_id", society_id);

  if (error) {
    throw new Error(`Error fetching residents: ${error.message}`);
  }

  // Transform the data to flatten the structure for easier use in components
  return data.map((resident: any) => ({
    ...resident,
    unit_number: resident.units?.unit_number || null,
    block_name: resident.units?.society_blocks?.block_name || null,
  }));
};

export const useResidents = (filter: ResidentFilter = 'all') => {
  // For now, we'll hardcode the society ID until we implement society selection
  // In a real implementation, this would come from user context or URL parameters
  const society_id = 1; // Hardcoded for now
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);

  // Fetch residents using React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['residents', society_id],
    queryFn: () => fetchResidents(society_id),
  });

  // Update local state when React Query data changes
  useEffect(() => {
    if (data) {
      setResidents(data);
    }
  }, [data]);

  // Set up real-time subscription for residents table
  useEffect(() => {
    const channel = supabase
      .channel('residents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'residents',
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            const newResident = payload.new as Resident;
            
            // Fetch associated unit information for the new resident
            const fetchUnitInfo = async () => {
              if (newResident.primary_unit_id) {
                const { data: unitData } = await supabase
                  .from('units')
                  .select(`
                    unit_number,
                    society_blocks:block_id(block_name)
                  `)
                  .eq('id', newResident.primary_unit_id)
                  .single();
                
                if (unitData) {
                  const enrichedResident = {
                    ...newResident,
                    unit_number: unitData.unit_number,
                    block_name: unitData.society_blocks?.block_name || null,
                  };
                  
                  setResidents(prev => [...prev, enrichedResident]);
                  toast({
                    title: "Resident added",
                    description: `${newResident.name} has been added successfully.`,
                  });
                } else {
                  setResidents(prev => [...prev, newResident]);
                }
              } else {
                setResidents(prev => [...prev, newResident]);
              }
            };
            
            fetchUnitInfo();
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedResident = payload.new as Resident;
            
            // Handle updates similarly to inserts
            const fetchUpdatedUnitInfo = async () => {
              if (updatedResident.primary_unit_id) {
                const { data: unitData } = await supabase
                  .from('units')
                  .select(`
                    unit_number,
                    society_blocks:block_id(block_name)
                  `)
                  .eq('id', updatedResident.primary_unit_id)
                  .single();
                
                if (unitData) {
                  const enrichedResident = {
                    ...updatedResident,
                    unit_number: unitData.unit_number,
                    block_name: unitData.society_blocks?.block_name || null,
                  };
                  
                  setResidents(prev => 
                    prev.map(resident => 
                      resident.id === enrichedResident.id ? enrichedResident : resident
                    )
                  );
                  
                  toast({
                    title: "Resident updated",
                    description: `${updatedResident.name}'s information has been updated.`,
                  });
                } else {
                  setResidents(prev => 
                    prev.map(resident => 
                      resident.id === updatedResident.id ? updatedResident : resident
                    )
                  );
                }
              } else {
                setResidents(prev => 
                  prev.map(resident => 
                    resident.id === updatedResident.id ? updatedResident : resident
                  )
                );
              }
            };
            
            fetchUpdatedUnitInfo();
          } 
          else if (payload.eventType === 'DELETE') {
            const deletedResident = payload.old as Resident;
            setResidents(prev => 
              prev.filter(resident => resident.id !== deletedResident.id)
            );
            
            toast({
              title: "Resident removed",
              description: "The resident has been removed from the system.",
            });
          }
        }
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Filter residents based on the selected filter
  const filteredResidents = residents.filter(resident => {
    if (filter === 'active') return resident.is_active === true;
    if (filter === 'inactive') return resident.is_active === false;
    return true; // 'all' filter
  });

  return {
    residents: filteredResidents,
    isLoading,
    error,
    refetch,
  };
};
