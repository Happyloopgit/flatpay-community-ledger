
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone, Pencil, ToggleRight, ToggleLeft } from "lucide-react";
import { useResidents, ResidentFilter } from "@/hooks/useResidents";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Resident } from "@/hooks/useResidents";
import { useToast } from "@/components/ui/use-toast";
import EditResidentModal from "./EditResidentModal";

interface ResidentsListProps {
  filter: ResidentFilter;
}

const ResidentsList = ({ filter }: ResidentsListProps) => {
  const { residents, isLoading, refetch } = useResidents(filter);
  const [editingResident, setEditingResident] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null);
  const { toast } = useToast();

  // Set up realtime subscription
  useEffect(() => {
    // Hard-coded society_id to be replaced with dynamic value later
    const societyId = 1;

    console.log('Setting up realtime subscription for residents');
    
    // Using the channel name 'residents-changes'
    const channel = supabase
      .channel('residents-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'residents',
          filter: `society_id=eq.${societyId}`
        },
        (payload) => {
          // Log the full payload for debugging
          console.log('Realtime update received for residents:', payload);
          
          // Check for specific event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            console.log(`Resident ${payload.eventType.toLowerCase()} detected, refetching data...`);
            // Explicitly refetch to update the list
            refetch();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleEditClick = (residentId: number) => {
    setEditingResident(residentId);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (resident: Resident) => {
    try {
      setIsUpdatingStatus(resident.id);
      
      const newStatus = !resident.is_active;
      const { error } = await supabase
        .from('residents')
        .update({ is_active: newStatus })
        .eq('id', resident.id);

      if (error) throw error;

      toast({
        title: `Resident ${newStatus ? 'activated' : 'deactivated'}`,
        description: `${resident.name} has been ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error("Error toggling resident status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update resident status. Please try again.",
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!residents || residents.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No residents found.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Primary Unit</TableHead>
            <TableHead>Move In Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.map((resident) => (
            <TableRow key={resident.id}>
              <TableCell className="font-medium">{resident.name}</TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  {resident.phone_number && (
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      <span className="text-sm">{resident.phone_number}</span>
                    </div>
                  )}
                  {resident.email && <span className="text-sm text-muted-foreground">{resident.email}</span>}
                </div>
              </TableCell>
              <TableCell>
                {resident.block_name && resident.unit_number ? (
                  `${resident.block_name} - ${resident.unit_number}`
                ) : resident.unit_number ? (
                  resident.unit_number
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell>
                {resident.move_in_date ? format(new Date(resident.move_in_date), 'MMM d, yyyy') : 'Not set'}
              </TableCell>
              <TableCell>
                <Badge variant={resident.is_active ? "default" : "secondary"}>
                  {resident.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditClick(resident.id)}
                    title="Edit resident"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(resident)}
                    disabled={isUpdatingStatus === resident.id}
                    title={resident.is_active ? "Deactivate resident" : "Activate resident"}
                  >
                    {resident.is_active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {editingResident && (
        <EditResidentModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          residentId={editingResident}
        />
      )}
    </div>
  );
};

export default ResidentsList;
