
import { useState } from "react";
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
  console.log("Fetching residents for society:", society_id);
  
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

  console.log("Residents fetched:", data.length);
  
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

  // Use React Query for data fetching and caching
  const { data: residents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['residents', society_id, filter],
    queryFn: async () => {
      const allResidents = await fetchResidents(society_id);
      
      // Apply filtering
      if (filter === 'all') return allResidents;
      if (filter === 'active') return allResidents.filter(r => r.is_active === true);
      if (filter === 'inactive') return allResidents.filter(r => r.is_active === false);
      
      return allResidents;
    },
  });

  // Error handling for React Query
  if (error) {
    console.error("Error in useResidents hook:", error);
  }

  return {
    residents,
    isLoading,
    error,
    refetch,
  };
};
