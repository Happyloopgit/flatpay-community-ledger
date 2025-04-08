
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Settings, Building, Users, FileText, DollarSign, LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();

  useEffect(() => {
    // This is where you could fetch user's society data, etc.
    console.log("Dashboard mounted, user:", user?.id);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">FlatPay</h1>
          <div className="flex items-center space-x-2">
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="flex flex-col">
                  <Link to="/" className="flex items-center space-x-2 p-3 bg-primary/10 text-primary border-l-4 border-primary">
                    <Home className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="#" className="flex items-center space-x-2 p-3 hover:bg-gray-100">
                    <Building className="h-5 w-5" />
                    <span>Units</span>
                  </Link>
                  <Link to="#" className="flex items-center space-x-2 p-3 hover:bg-gray-100">
                    <Users className="h-5 w-5" />
                    <span>Residents</span>
                  </Link>
                  <Link to="#" className="flex items-center space-x-2 p-3 hover:bg-gray-100">
                    <FileText className="h-5 w-5" />
                    <span>Invoices</span>
                  </Link>
                  <Link to="#" className="flex items-center space-x-2 p-3 hover:bg-gray-100">
                    <DollarSign className="h-5 w-5" />
                    <span>Expenses</span>
                  </Link>
                  <Link to="/settings" className="flex items-center space-x-2 p-3 hover:bg-gray-100">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <div className="col-span-1 md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Welcome to FlatPay</CardTitle>
                <CardDescription>
                  Manage your society's finances and operations from one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Get started by setting up your society details and adding units.
                  You can then invite residents and start generating invoices.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No invoices generated yet.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
