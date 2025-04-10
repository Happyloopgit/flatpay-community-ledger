
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResidentsList from "@/components/residents/ResidentsList";
import AddResidentModal from "@/components/residents/AddResidentModal";
import { useResidents } from "@/hooks/useResidents";

const Residents = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const { isLoading, error } = useResidents();

  if (error) {
    toast({
      variant: "destructive",
      title: "Error loading residents",
      description: "Failed to fetch residents data. Please try again later."
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Residents Management</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Resident
        </Button>
      </div>

      <p className="text-muted-foreground pb-4">
        Add, update, and manage residents in your society. Changes to residents will be updated in real-time.
      </p>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Residents</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-4">
          <ResidentsList filter="all" />
        </TabsContent>
        <TabsContent value="active" className="pt-4">
          <ResidentsList filter="active" />
        </TabsContent>
        <TabsContent value="inactive" className="pt-4">
          <ResidentsList filter="inactive" />
        </TabsContent>
      </Tabs>

      <AddResidentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
};

export default Residents;
