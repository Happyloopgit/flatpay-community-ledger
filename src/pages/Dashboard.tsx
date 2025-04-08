
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  Home, 
  AlertCircle, 
  Plus, 
  FileText, 
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCollection: "₹0.00",
    pendingDues: "₹0.00",
    activeResidents: 0,
    unitsOccupied: 0,
    totalUnits: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch active residents count
        const { data: residentsData, error: residentsError } = await supabase
          .from("residents")
          .select("id")
          .eq("is_active", true);

        // Fetch units data
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("id, occupancy_status");

        if (residentsError) console.error("Error fetching residents:", residentsError);
        if (unitsError) console.error("Error fetching units:", unitsError);

        // Calculate stats
        const activeResidents = residentsData?.length || 0;
        const totalUnits = unitsData?.length || 0;
        const occupiedUnits = unitsData?.filter(unit => unit.occupancy_status === "occupied").length || 0;

        setStats({
          totalCollection: "₹0.00", // Placeholder
          pendingDues: "₹0.00", // Placeholder
          activeResidents,
          unitsOccupied: occupiedUnits,
          totalUnits
        });

        // Fetch placeholder data for recent payments and upcoming dues
        setRecentPayments([
          { id: 1, resident: "John Doe", amount: "₹2,500", date: "2025-04-05", status: "completed" },
          { id: 2, resident: "Jane Smith", amount: "₹3,000", date: "2025-04-03", status: "completed" },
          { id: 3, resident: "Robert Johnson", amount: "₹1,800", date: "2025-04-01", status: "completed" }
        ]);

        setUpcomingDues([
          { id: 1, resident: "Alice Brown", amount: "₹2,500", dueDate: "2025-04-15", status: "pending" },
          { id: 2, resident: "Mike Wilson", amount: "₹3,200", dueDate: "2025-04-15", status: "pending" },
          { id: 3, resident: "Sarah Lee", amount: "₹1,950", dueDate: "2025-04-15", status: "pending" }
        ]);

      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your society's financial and operational status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.totalCollection}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-4 w-4 inline mr-1 text-green-500" />
              <span className="text-green-500 font-medium">+0%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.pendingDues}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingDown className="h-4 w-4 inline mr-1 text-red-500" />
              <span className="text-red-500 font-medium">+0%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.activeResidents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total residents in your society
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Units Occupied</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 
                <Skeleton className="h-8 w-20" /> : 
                `${stats.unitsOccupied} / ${stats.totalUnits}`
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? 
                <Skeleton className="h-4 w-20" /> : 
                `${Math.round((stats.unitsOccupied / stats.totalUnits || 0) * 100)}% occupancy rate`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button>
            <DollarSign className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" /> Generate Bills
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
            <CardDescription>Latest payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.resident}</TableCell>
                        <TableCell>{payment.amount}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No payments recorded yet
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upcoming Dues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Dues</CardTitle>
            <CardDescription>Payments due in the next 15 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : upcomingDues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingDues.map(due => (
                      <TableRow key={due.id}>
                        <TableCell>{due.resident}</TableCell>
                        <TableCell>{due.amount}</TableCell>
                        <TableCell>{new Date(due.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {due.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No upcoming dues
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
