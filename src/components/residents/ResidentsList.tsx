
import { useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Pencil, MoreVertical, Trash2, Phone } from "lucide-react";
import { useResidents, ResidentFilter } from "@/hooks/useResidents";
import { format } from "date-fns";
import EditResidentModal from "./EditResidentModal";
import DeleteResidentModal from "./DeleteResidentModal";
import { Skeleton } from "@/components/ui/skeleton";

interface ResidentsListProps {
  filter: ResidentFilter;
}

const ResidentsList = ({ filter }: ResidentsListProps) => {
  const { residents, isLoading } = useResidents(filter);
  const [editingResident, setEditingResident] = useState<number | null>(null);
  const [deletingResident, setDeletingResident] = useState<number | null>(null);

  const handleEdit = (id: number) => {
    setEditingResident(id);
  };

  const handleDelete = (id: number) => {
    setDeletingResident(id);
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
            <TableHead>Unit</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Move In Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.map((resident) => (
            <TableRow key={resident.id}>
              <TableCell className="font-medium">{resident.name}</TableCell>
              <TableCell>
                {resident.unit_number ? 
                  `${resident.block_name ? `${resident.block_name} - ` : ''}${resident.unit_number}` : 
                  "No unit assigned"}
              </TableCell>
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
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEdit(resident.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(resident.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingResident !== null && (
        <EditResidentModal
          residentId={editingResident}
          open={!!editingResident}
          onOpenChange={() => setEditingResident(null)}
        />
      )}

      {deletingResident !== null && (
        <DeleteResidentModal
          residentId={deletingResident}
          open={!!deletingResident}
          onOpenChange={() => setDeletingResident(null)}
        />
      )}
    </div>
  );
};

export default ResidentsList;
