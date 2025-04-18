
import { z } from "zod";

export const PaymentMethodEnum = {
  Cash: "Cash",
  Cheque: "Cheque",
  "Bank Transfer": "Bank Transfer",
  UPI: "UPI",
  Other: "Other",
} as const;

export const paymentFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.date(),
  payment_method: z.nativeEnum(PaymentMethodEnum),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;
