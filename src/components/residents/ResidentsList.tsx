
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

interface ResidentsListProps {
  filter: ResidentFilter;
}

const ResidentsList = ({ filter }: ResidentsListProps) => {
  const { residents, isLoading } = useResidents(filter);

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
