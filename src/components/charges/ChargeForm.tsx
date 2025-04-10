
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

// Define form validation schema
const chargeFormSchema = z.object({
  charge_name: z.string().min(2, "Charge name must be at least 2 characters."),
  calculation_type: z.enum(["fixed_per_unit", "per_sqft"]),
  amount_or_rate: z
    .number()
    .min(0.01, "Amount or rate must be greater than zero.")
    .refine((val) => !isNaN(val), "Amount must be a valid number"),
  is_active: z.boolean().default(true),
});

export type ChargeFormValues = z.infer<typeof chargeFormSchema>;

export interface ChargeFormProps {
  onSubmit: (data: ChargeFormValues) => Promise<void>;
  defaultValues?: Partial<ChargeFormValues>;
  isSubmitting?: boolean;
  submitText?: string;
}

export const ChargeForm = ({
  onSubmit,
  defaultValues = {
    charge_name: "",
    calculation_type: "fixed_per_unit",
    amount_or_rate: 0,
    is_active: true,
  },
  isSubmitting = false,
  submitText = "Save Charge",
}: ChargeFormProps) => {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues,
  });

  const handleSubmit = async (data: ChargeFormValues) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (error: any) {
      setFormError(error.message || "An error occurred while saving the charge.");
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="charge_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Charge Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Maintenance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="calculation_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Calculation Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed_per_unit" id="fixed_per_unit" />
                    <FormLabel htmlFor="fixed_per_unit" className="font-normal">
                      Fixed amount per unit
                    </FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_sqft" id="per_sqft" />
                    <FormLabel htmlFor="per_sqft" className="font-normal">
                      Rate per sq.ft
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount_or_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {form.watch("calculation_type") === "fixed_per_unit"
                  ? "Fixed Amount (₹)"
                  : "Rate per sq.ft (₹)"}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseFloat(e.target.value) || 0);
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Toggle to activate or deactivate this charge.
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {formError && (
          <div className="text-sm font-medium text-destructive">{formError}</div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitText}
        </Button>
      </form>
    </Form>
  );
};
