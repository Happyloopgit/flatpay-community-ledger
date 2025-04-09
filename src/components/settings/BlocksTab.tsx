
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus } from "lucide-react";

interface Block {
  id: string;
  block_name: string;
  society_id: number;
  created_at: string;
}

interface BlockFormData {
  id?: string;
  block_name: string;
}

export const BlocksTab = () => {
  const { profile } = useAuth();
  const [newBlockName, setNewBlockName] = useState("");
  const [editingBlock, setEditingBlock] = useState<BlockFormData | null>(null);
  const queryClient = useQueryClient();

  // Fetch blocks for the society
  const { data: blocks, isLoading } = useQuery({
    queryKey: ["blocks", profile?.society_id],
    queryFn: async () => {
      if (!profile?.society_id) return [];
      
      const { data, error } = await supabase
        .from("society_blocks")
        .select("*")
        .eq("society_id", profile.society_id);
        
      if (error) {
        console.error("Error fetching blocks:", error);
        toast({
          title: "Error fetching blocks",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      
      return data as Block[];
    },
    enabled: !!profile?.society_id,
  });

  // Add new block mutation
  const addBlockMutation = useMutation({
    mutationFn: async (block_name: string) => {
      if (!profile?.society_id) {
        throw new Error("Society ID not available");
      }
      
      const { data, error } = await supabase
        .from("society_blocks")
        .insert([{ block_name, society_id: profile.society_id }])
        .select();
        
      if (error) {
        if (error.code === "23505") {
          throw new Error("A block with this name already exists in your society");
        }
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", profile?.society_id] });
      setNewBlockName("");
      toast({
        title: "Block added",
        description: "The block has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update block mutation
  const updateBlockMutation = useMutation({
    mutationFn: async (block: BlockFormData) => {
      if (!block.id) {
        throw new Error("Block ID is required for updating");
      }
      
      const { error } = await supabase
        .from("society_blocks")
        .update({ block_name: block.block_name })
        .eq("id", block.id);
        
      if (error) {
        if (error.code === "23505") {
          throw new Error("A block with this name already exists in your society");
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", profile?.society_id] });
      setEditingBlock(null);
      toast({
        title: "Block updated",
        description: "The block has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if block has units before deletion
  const checkBlockUnits = async (blockId: string) => {
    const { data, error } = await supabase
      .from("units")
      .select("id")
      .eq("block_id", blockId)
      .limit(1);
      
    if (error) {
      throw new Error(error.message);
    }
    
    return data.length > 0;
  };

  // Delete block mutation
  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      // First check if there are units associated with this block
      const hasUnits = await checkBlockUnits(blockId);
      
      if (hasUnits) {
        throw new Error("Cannot delete this block as it has units assigned to it");
      }
      
      const { error } = await supabase
        .from("society_blocks")
        .delete()
        .eq("id", blockId);
        
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks", profile?.society_id] });
      toast({
        title: "Block deleted",
        description: "The block has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle add block
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName.trim()) {
      toast({
        title: "Invalid input",
        description: "Block name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    addBlockMutation.mutate(newBlockName.trim());
  };

  // Handle update block
  const handleUpdateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlock && editingBlock.block_name.trim()) {
      updateBlockMutation.mutate({
        id: editingBlock.id,
        block_name: editingBlock.block_name.trim(),
      });
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!profile?.society_id) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'society_blocks',
          filter: `society_id=eq.${profile.society_id}`
        }, 
        () => {
          queryClient.invalidateQueries({ queryKey: ["blocks", profile.society_id] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.society_id, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-1/2 space-y-4">
          <h3 className="text-lg font-medium">Add New Block</h3>
          <form onSubmit={handleAddBlock} className="flex gap-2">
            <Input
              placeholder="Enter block name"
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
              disabled={addBlockMutation.isPending}
            />
            <Button type="submit" disabled={addBlockMutation.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </form>
        </div>
        
        {editingBlock && (
          <div className="w-full md:w-1/2 space-y-4">
            <h3 className="text-lg font-medium">Edit Block</h3>
            <form onSubmit={handleUpdateBlock} className="flex gap-2">
              <Input
                placeholder="Edit block name"
                value={editingBlock.block_name}
                onChange={(e) => setEditingBlock({ ...editingBlock, block_name: e.target.value })}
                disabled={updateBlockMutation.isPending}
              />
              <Button 
                type="submit" 
                disabled={updateBlockMutation.isPending}
              >
                Update
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingBlock(null)} 
                disabled={updateBlockMutation.isPending}
              >
                Cancel
              </Button>
            </form>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Blocks</h3>
        {isLoading ? (
          <div className="text-center py-4">Loading blocks...</div>
        ) : blocks && blocks.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>{block.block_name}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingBlock({ id: block.id, block_name: block.block_name })}
                        disabled={!!editingBlock}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the block "{block.block_name}". 
                              This action cannot be undone if there are no units assigned to this block.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBlockMutation.mutate(block.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 border rounded-md bg-muted/10">
            No blocks found. Add your first block above.
          </div>
        )}
      </div>
    </div>
  );
};
