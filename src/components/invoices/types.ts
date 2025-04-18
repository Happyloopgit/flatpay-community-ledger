
export interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
}
