
import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/supabase";

type Block = Database['public']['Tables']['society_blocks']['Row'];

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
  occupancy_status: z.enum(["vacant", "occupied"]),
  block_id: z.string().uuid().nullable()
});

// This represents the output type after zod transformation
type UnitFormValues = z.infer<typeof unitSchema>;

interface UnitFormProps {
  onSubmit: (values: UnitFormValues) => void;
  initialData?: {
    unit_number: string;
    size_sqft: number | null;
    occupancy_status: string;
    block_id: string | null;
  };
  isSubmitting: boolean;
  societyId: number;
}

const UnitForm = ({ onSubmit, initialData, isSubmitting, societyId }: UnitFormProps) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: initialData?.unit_number || "",
      size_sqft: initialData?.size_sqft ?? null,
      occupancy_status: (initialData?.occupancy_status as "vacant" | "occupied") || "vacant",
      block_id: initialData?.block_id || null
    }
  });

  // Fetch blocks when component mounts
  useEffect(() => {
    const fetchBlocks = async () => {
      setIsLoadingBlocks(true);
      try {
        const { data, error } = await supabase
          .from("society_blocks")
          .select("id, block_name")
          .eq("society_id", societyId)
          .order("block_name");
          
        if (error) {
          console.error("Error fetching blocks:", error);
          return;
        }
        
        setBlocks(data || []);
      } catch (error) {
        console.error("Error fetching blocks:", error);
      } finally {
        setIsLoadingBlocks(false);
      }
    };

    if (societyId) {
      fetchBlocks();
    }
  }, [societyId]);

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
          name="block_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block (Optional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                value={field.value || "none"}
                disabled={isLoadingBlocks}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingBlocks ? "Loading blocks..." : "Select a block"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.block_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
