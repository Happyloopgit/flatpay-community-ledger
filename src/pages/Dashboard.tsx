
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to FlatPay</h1>
        <p className="text-muted-foreground">
          Easily manage your society's finances and operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Society</CardTitle>
            <CardDescription>Manage society details</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Configure your society information, address, and settings.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Residents</CardTitle>
            <CardDescription>Manage society residents</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Add, update, or remove residents in your society.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track society expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Record and manage expenses for your society.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Generate and track bills</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create invoices and track payment status.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
