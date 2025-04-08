
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the input schema (what we expect from the form inputs)
const unitSchema = z.object({
  unit_number: z.string().min(1, "Unit number is required"),
  size_sqft: z.string().transform((val) => (val === "" ? null : parseFloat(val)))
    .refine((val) => val === null || !isNaN(val), "Must be a valid number")
    .nullable(),
  occupancy_status: z.enum(["vacant", "occupied"])
});

// Define a separate type for the form inputs specifically
type UnitFormInputs = {
  unit_number: string;
  size_sqft: string; // This matches the expected input type (string)
  occupancy_status: "vacant" | "occupied";
};

// The transformed output type from the schema
type UnitFormValues = z.infer<typeof unitSchema>;

interface UnitFormProps {
  onSubmit: (values: UnitFormValues) => void;
  initialData?: {
    unit_number: string;
    size_sqft: number | null;
    occupancy_status: string;
  };
  isSubmitting: boolean;
}

const UnitForm = ({ onSubmit, initialData, isSubmitting }: UnitFormProps) => {
  const form = useForm<UnitFormInputs>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: initialData?.unit_number || "",
      size_sqft: initialData?.size_sqft !== null ? String(initialData.size_sqft) : "",
      occupancy_status: (initialData?.occupancy_status as "vacant" | "occupied") || "vacant"
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="unit_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Number *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. A101" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="size_sqft"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Size (sq ft)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g. 1200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="occupancy_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occupancy Status</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Add Unit"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UnitForm;
