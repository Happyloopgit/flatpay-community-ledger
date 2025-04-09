
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

// Define the schema for form validation
const unitSchema = z.object({
  unit_number: z.string().min(1, "Unit number is required"),
  size_sqft: z.union([
    z.string().transform((val) => {
      if (val === "") return null;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    }),
    z.number().nullable()
  ]).nullable(),
  occupancy_status: z.enum(["vacant", "occupied"])
});

// This represents the output type after zod transformation
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
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: initialData?.unit_number || "",
      size_sqft: initialData?.size_sqft ?? null,
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
                <Input 
                  type="number" 
                  placeholder="e.g. 1200" 
                  value={field.value === null ? "" : field.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? null : parseFloat(val));
                  }}
                />
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
