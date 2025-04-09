
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const UnitsTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Units Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Units management functionality will be implemented soon. This will allow you to manage
            all apartments or units in your society.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
