import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: number;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  entered_by_profile_id: string;
  created_at: string;
}

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!profile?.society_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("society_id", profile.society_id)
          .order("expense_date", { ascending: false })
          .limit(100);

        if (error) {
          toast({
            title: "Error loading expenses",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }

        setExpenses(data || []);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [profile?.society_id, toast]);

  useEffect(() => {
    if (!profile?.society_id) return;

    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `society_id=eq.${profile.society_id}` },
        (payload) => {
          console.log("Expense change received:", payload);
          
          if (payload.eventType === "INSERT") {
            toast({
              title: "New expense added",
              description: "A new expense has been recorded.",
            });
          } else if (payload.eventType === "UPDATE") {
            toast({
              title: "Expense updated",
              description: "An expense has been modified.",
            });
          } else if (payload.eventType === "DELETE") {
            toast({
              title: "Expense deleted",
              description: "An expense has been removed.",
            });
          }
          
          supabase
            .from("expenses")
            .select("*")
            .eq("society_id", profile.society_id)
            .order("expense_date", { ascending: false })
            .limit(100)
            .then(({ data, error }) => {
              if (error) {
                toast({
                  title: "Error refreshing data",
                  description: error.message,
                  variant: "destructive",
                });
                return;
              }
              if (data) setExpenses(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.society_id, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!profile?.society_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-yellow-700">No society is assigned to your profile.</p>
            <p className="text-yellow-700 mt-2">Please contact your administrator.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No expenses recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.expense_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
