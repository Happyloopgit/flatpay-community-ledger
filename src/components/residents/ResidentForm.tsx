import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/lib/supabase";

// Define a type for unit options
type UnitOption = {
  id: number;
  unit_number: string;
  block_name?: string | null;
};

const residentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      "Name should only contain letters, spaces, hyphens, and apostrophes"
    ),
  email: z.string().email("Invalid email").optional().nullable(),
  phone_number: z
    .string()
    .min(10, "Phone number should be at least 10 digits")
    .transform(val => val.replace(/[\s()+-]/g, '')) // Remove formatting characters
    .refine(
      val => /^\d{10}$/.test(val) || /^\d{12}$/.test(val), 
      "Phone number must contain exactly 10 digits (or 12 with country code)"
    ),
  primary_unit_id: z.number().nullable(),
  move_in_date: z.date().optional().nullable(),
  move_out_date: z.date().optional().nullable(),
  is_active: z.boolean().default(true),
  whatsapp_opt_in: z.boolean().default(false),
});

export type ResidentFormValues = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  onSubmit: (values: ResidentFormValues) => void;
  initialData?: {
    name: string;
    email: string | null;
    phone_number: string;
    primary_unit_id: number | null;
    move_in_date: string | null;
    move_out_date: string | null;
    is_active: boolean;
    whatsapp_opt_in: boolean;
  };
  isSubmitting: boolean;
  societyId: number;
  submitText?: string; // Added submitText prop
}

const ResidentForm = ({
  onSubmit,
  initialData,
  isSubmitting,
  societyId,
  submitText = "Submit", // Default value if not provided
}: ResidentFormProps) => {
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const form = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone_number: initialData?.phone_number || "",
      primary_unit_id: initialData?.primary_unit_id || null,
      move_in_date: initialData?.move_in_date ? new Date(initialData.move_in_date) : null,
      move_out_date: initialData?.move_out_date ? new Date(initialData.move_out_date) : null,
      is_active: initialData?.is_active ?? true,
      whatsapp_opt_in: initialData?.whatsapp_opt_in ?? false,
    },
  });

  useEffect(() => {
    const fetchUnits = async () => {
      setIsLoadingUnits(true);
      try {
        const { data, error } = await supabase
          .from("units")
          .select(`
            id, 
            unit_number,
            society_blocks:block_id (block_name)
          `)
          .eq("society_id", societyId)
          .order("unit_number");

        if (error) {
          console.error("Error fetching units:", error);
          return;
        }

        const formattedUnits = data.map((unit) => ({
          id: unit.id,
          unit_number: unit.unit_number,
          block_name: unit.society_blocks?.block_name || null,
        }));

        setUnits(formattedUnits);
      } catch (error) {
        console.error("Error fetching units:", error);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    if (societyId) {
      fetchUnits();
    }
  }, [societyId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Resident name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="Email address" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="primary_unit_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Unit</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                value={field.value ? field.value.toString() : "none"}
                disabled={isLoadingUnits}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingUnits ? "Loading units..." : "Select a unit"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.block_name ? `${unit.block_name} - ` : ""}{unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="move_in_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Move In Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
                      selected={field.value || undefined}
                      onSelect={(date) => field.onChange(date)}
                      disabled={(date) => 
                        form.getValues("move_out_date") 
                          ? date > form.getValues("move_out_date")! 
                          : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="move_out_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Move Out Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
                      selected={field.value || undefined}
                      onSelect={(date) => field.onChange(date)}
                      disabled={(date) => 
                        form.getValues("move_in_date") 
                          ? date < form.getValues("move_in_date")! 
                          : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Set whether this resident is currently active
                  </p>
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

          <FormField
            control={form.control}
            name="whatsapp_opt_in"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">WhatsApp Notifications</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Allow sending notifications via WhatsApp
                  </p>
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
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ResidentForm;
