
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import { useResidents, ResidentFilter } from "@/hooks/useResidents";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ResidentsListProps {
  filter: ResidentFilter;
}

const ResidentsList = ({ filter }: ResidentsListProps) => {
  const { residents, isLoading, refetch } = useResidents(filter);

  // Set up realtime subscription
  useEffect(() => {
    // Hard-coded society_id to be replaced with dynamic value later
    const societyId = 1;

    const channel = supabase
      .channel('residents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
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
            <TableHead>Move In Date</TableHead>
            <TableHead>Status</TableHead>
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
                {resident.move_in_date ? format(new Date(resident.move_in_date), 'MMM d, yyyy') : 'Not set'}
              </TableCell>
              <TableCell>
                <Badge variant={resident.is_active ? "default" : "secondary"}>
                  {resident.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ResidentsList;
