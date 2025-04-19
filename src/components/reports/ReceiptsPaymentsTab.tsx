
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ReceiptsPaymentsTab: React.FC = () => {
  const { profile } = useAuth();
  
  // Set default dates to previous month
  const defaultStartDate = startOfMonth(subMonths(new Date(), 1));
  const defaultEndDate = endOfMonth(subMonths(new Date(), 1));
  
  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [totalReceipts, setTotalReceipts] = useState<number | null>(null);
  const [totalPayments, setTotalPayments] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.society_id || !startDate || !endDate) {
        setError("Missing required data");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');

        // Fetch payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('society_id', profile.society_id)
          .gte('payment_date', formattedStartDate)
          .lte('payment_date', formattedEndDate);

        if (paymentsError) throw new Error('Failed to fetch payments');

        // Fetch expenses
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('society_id', profile.society_id)
          .gte('expense_date', formattedStartDate)
          .lte('expense_date', formattedEndDate);

        if (expensesError) throw new Error('Failed to fetch expenses');

        // Calculate totals
        const receiptsTotal = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;
        const paymentsTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) ?? 0;

        setTotalReceipts(receiptsTotal);
        setTotalPayments(paymentsTotal);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching report data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [profile?.society_id, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Date Range Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Results Display */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 rounded-lg border border-red-200 bg-red-50">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₹{totalReceipts?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₹{totalPayments?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReceiptsPaymentsTab;
