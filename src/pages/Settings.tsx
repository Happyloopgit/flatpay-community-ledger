
import { MFAEnrollment } from "@/components/MFAEnrollment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Email:</div>
                <div className="col-span-2">{user?.email}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Last Sign In:</div>
                <div className="col-span-2">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <MFAEnrollment />
      </div>
    </div>
  );
};

export default Settings;
