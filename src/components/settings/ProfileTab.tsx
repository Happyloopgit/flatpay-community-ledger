
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ProfileTab = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Society Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div>
              <span className="font-medium">Society ID:</span> {profile?.society_id || "Not assigned"}
            </div>
            <div>
              <span className="font-medium">Admin Name:</span> {profile?.name || "Not available"}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            More society profile management features will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
