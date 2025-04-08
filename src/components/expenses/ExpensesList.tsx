
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!profile?.society_id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("society_id", profile.society_id)
          .order("expense_date", { ascending: false })
          .limit(100);

        if (error) {
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
  }, [profile?.society_id]);

  // Subscribe to realtime changes for expenses table
  useEffect(() => {
    if (!profile?.society_id) return;

    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `society_id=eq.${profile.society_id}` },
        (payload) => {
          console.log("Expense change received:", payload);
          
          // Refresh the expenses list
          supabase
            .from("expenses")
            .select("*")
            .eq("society_id", profile.society_id)
            .order("expense_date", { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (data) setExpenses(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.society_id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
