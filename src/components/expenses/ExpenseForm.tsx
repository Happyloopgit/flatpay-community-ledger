
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

// Define a custom type for expense insertion that omits the auto-generated fields
// We no longer need to include entered_by_profile_id since it's handled by the database function
type ExpenseInsert = Omit<
  Database["public"]["Tables"]["expenses"]["Insert"],
  "id" | "created_at" | "updated_at" | "entered_by_profile_id"
>;

const expenseFormSchema = z.object({
  expense_date: z.date({
    required_error: "Expense date is required",
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Amount must be a valid positive number" }
  ),
  allocation_rule: z.enum(["dont_allocate", "allocate_equal_all"]).default("dont_allocate"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_date: new Date(),
      category: "",
      description: "",
      amount: "",
      allocation_rule: "dont_allocate",
    },
  });

  async function onSubmit(data: ExpenseFormValues) {
    if (!user || !profile?.society_id) {
      toast({
        title: "Error",
        description: "You must be logged in with a society assigned to add expenses",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Use the create_expense RPC function instead of direct insert
      const { data: result, error } = await supabase.rpc('create_expense', {
        p_society_id: profile.society_id,
        p_expense_date: format(data.expense_date, "yyyy-MM-dd"),
        p_category: data.category,
        p_description: data.description || null,
        p_amount: parseFloat(data.amount),
        p_allocation_rule: data.allocation_rule,
        p_is_allocated_to_bill: false
      });

      if (error) throw error;

      toast({
        title: "Expense Added",
        description: "Your expense has been successfully recorded",
      });
      
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expense Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Maintenance, Utilities, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter details about the expense..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allocation_rule"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allocation Rule</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select allocation rule" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="dont_allocate">Don't Allocate</SelectItem>
                  <SelectItem value="allocate_equal_all">Allocate Equally to All Active Units</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Receipt Upload (Coming Soon)
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
