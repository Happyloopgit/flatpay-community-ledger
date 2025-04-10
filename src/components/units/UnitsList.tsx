
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EditUnitModal from "./EditUnitModal";

interface Unit {
  id: number;
  unit_number: string;
  size_sqft: number | null;
  occupancy_status: string;
  block_id: string | null;
  block: {
    block_name: string | null;
  } | null;
}

interface UnitsListProps {
  units: Unit[];
  loading: boolean;
  societyId: number | null;
}

const UnitsList = ({ units, loading, societyId }: UnitsListProps) => {
  const { toast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);

  const handleDeleteClick = (unit: Unit) => {
    setUnitToDelete(unit);
    setDeleteConfirmOpen(true);
  };

  const handleEditClick = (unit: Unit) => {
    setUnitToEdit(unit);
    setEditModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitToDelete.id);
        
      if (error) throw error;
      
      toast({
        title: "Unit Deleted",
        description: `Unit ${unitToDelete.unit_number} has been deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: "Failed to delete unit",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setUnitToDelete(null);
    }
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setUnitToEdit(null);
    toast({
      title: "Success",
      description: "Unit updated successfully",
    });
  };

  if (loading) {
    return <div className="text-center py-4">Loading units...</div>;
  }

  if (units.length === 0) {
    return <div className="text-center py-4">No units found. Add your first unit to get started.</div>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit Number</TableHead>
            <TableHead>Block</TableHead>
            <TableHead>Size (sq ft)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell className="font-medium">{unit.unit_number}</TableCell>
              <TableCell>{unit.block?.block_name || "N/A"}</TableCell>
              <TableCell>{unit.size_sqft || 'Not specified'}</TableCell>
              <TableCell>
                <span className={`capitalize ${unit.occupancy_status === 'vacant' ? 'text-green-600' : 'text-blue-600'}`}>
                  {unit.occupancy_status}
                </span>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditClick(unit)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDeleteClick(unit)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete unit {unitToDelete?.unit_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {unitToEdit && societyId && (
        <EditUnitModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          unit={unitToEdit}
          societyId={societyId}
        />
      )}
    </div>
  );
};

export default UnitsList;
