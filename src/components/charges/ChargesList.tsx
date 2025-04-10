
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditChargeModal } from "./EditChargeModal";

export interface RecurringCharge {
  id: string;
  society_id: number;
  charge_name: string;
  calculation_type: string;
  amount_or_rate: number;
  frequency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChargesListProps {
  societyId: number;
}

export const ChargesList = ({ societyId }: ChargesListProps) => {
  const [charges, setCharges] = useState<RecurringCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chargeToDelete, setChargeToDelete] = useState<string | null>(null);
  const [editingCharge, setEditingCharge] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_charges')
        .select('*')
        .eq('society_id', societyId)
        .order('charge_name', { ascending: true });

      if (error) throw error;
      setCharges(data || []);
    } catch (error: any) {
      console.error('Error fetching charges:', error);
      toast({
        title: "Error",
        description: "Failed to load charges. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      fetchCharges();
    }
  }, [societyId]);

  // Set up real-time subscription for changes to recurring_charges
  useEffect(() => {
    if (!societyId) return;

    const channel = supabase
      .channel('recurring_charges_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'recurring_charges',
          filter: `society_id=eq.${societyId}` 
        }, 
        (payload) => {
          console.log('Change received!', payload);
          fetchCharges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [societyId]);

  const handleEditClick = (chargeId: string) => {
    setEditingCharge(chargeId);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (chargeId: string) => {
    setChargeToDelete(chargeId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!chargeToDelete) return;
    
    setIsDeleting(chargeToDelete);
    
    try {
      const { error } = await supabase
        .from('recurring_charges')
        .delete()
        .eq('id', chargeToDelete);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Charge deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting charge:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete charge",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      setDeleteDialogOpen(false);
      setChargeToDelete(null);
    }
  };

  const formatCalculationType = (type: string) => {
    switch (type) {
      case 'fixed_per_unit':
        return 'Fixed per Unit';
      case 'per_sqft':
        return 'Per sq.ft';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableCaption>
          {charges.length === 0 ? 
            "No recurring charges defined yet. Add your first charge to get started." : 
            `A list of your society's recurring charges.`
          }
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Charge Name</TableHead>
            <TableHead>Calculation Type</TableHead>
            <TableHead className="text-right">Amount/Rate</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {charges.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No charges found. Add your first charge to get started.
              </TableCell>
            </TableRow>
          ) : (
            charges.map((charge) => (
              <TableRow key={charge.id}>
                <TableCell className="font-medium">{charge.charge_name}</TableCell>
                <TableCell>{formatCalculationType(charge.calculation_type)}</TableCell>
                <TableCell className="text-right">₹{charge.amount_or_rate.toFixed(2)}</TableCell>
                <TableCell className="capitalize">{charge.frequency}</TableCell>
                <TableCell>
                  <Badge variant={charge.is_active ? "default" : "outline"}>
                    {charge.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(charge.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(charge.id)}
                      disabled={isDeleting === charge.id}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring charge. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      {editingCharge && (
        <EditChargeModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          chargeId={editingCharge}
        />
      )}
    </div>
  );
};
