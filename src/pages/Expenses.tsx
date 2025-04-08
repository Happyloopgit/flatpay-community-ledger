
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { ExpensesList } from "@/components/expenses/ExpensesList";

const Expenses = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-1">Expenses Management</h1>
          <p className="text-muted-foreground">
            Track and manage society expenses and receipts.
          </p>
        </div>
        <AddExpenseModal />
      </div>
      
      <ExpensesList />
    </div>
  );
};

export default Expenses;
