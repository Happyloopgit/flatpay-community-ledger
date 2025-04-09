
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { BlocksTab } from "@/components/settings/BlocksTab";
import { UnitsTab } from "@/components/settings/UnitsTab";
import { ResidentsTab } from "@/components/settings/ResidentsTab";
import { MFAEnrollment } from "@/components/MFAEnrollment";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Society Settings</h1>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Society Management</CardTitle>
            <CardDescription>Manage your society settings and configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="blocks">Blocks</TabsTrigger>
                <TabsTrigger value="units">Units</TabsTrigger>
                <TabsTrigger value="residents">Residents</TabsTrigger>
              </TabsList>
              <TabsContent value="profile">
                <ProfileTab />
              </TabsContent>
              <TabsContent value="blocks">
                <BlocksTab />
              </TabsContent>
              <TabsContent value="units">
                <UnitsTab />
              </TabsContent>
              <TabsContent value="residents">
                <ResidentsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <MFAEnrollment />
      </div>
    </div>
  );
};

export default Settings;
