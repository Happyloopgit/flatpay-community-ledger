
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ResidentsTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Residents Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Residents management functionality will be implemented soon. This will allow you to 
            manage all residents in your society.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
