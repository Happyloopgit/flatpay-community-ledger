
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Resident {
  id: number;
  name: string;
  unit_number?: string;
  block_name?: string;
}

interface LedgerEntry {
  date: string;
  description: string;
  charge: number | null;
  payment: number | null;
  balance: number;
}

const MemberLedgerTab: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [residentsList, setResidentsList] = useState<Resident[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isLoadingResidents, setIsLoadingResidents] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch residents on mount
  useEffect(() => {
    async function fetchResidents() {
      if (!profile?.society_id) return;

      try {
        const { data, error } = await supabase
          .from('residents')
          .select(`
            id,
            name,
            units:primary_unit_id (
              unit_number,
              society_blocks:block_id (
                block_name
              )
            )
          `)
          .eq('society_id', profile.society_id)
          .eq('is_active', true);

        if (error) throw error;

        const formattedResidents: Resident[] = data.map(resident => ({
          id: resident.id,
          name: resident.name,
          unit_number: resident.units?.unit_number,
          block_name: resident.units?.society_blocks?.block_name
        }));

        setResidentsList(formattedResidents);
      } catch (err) {
        console.error('Error fetching residents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch residents');
      } finally {
        setIsLoadingResidents(false);
      }
    }

    fetchResidents();
  }, [profile?.society_id]);

  const fetchLedgerData = async () => {
    if (!selectedResidentId || !startDate || !endDate || !profile?.society_id) {
      toast({
        title: "Missing Information",
        description: "Please select a resident and date range",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLedger(true);
    setError(null);

    try {
      // Convert selectedResidentId from string to number
      const numericResidentId = parseInt(selectedResidentId, 10);
      
      if (isNaN(numericResidentId)) {
        throw new Error("Invalid resident ID");
      }
      
      console.log('Selected Resident ID (string):', selectedResidentId);
      console.log('Selected Resident ID (number):', numericResidentId);
      console.log('Selected Dates:', { startDate, endDate });

      // Format dates for queries
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      // Fetch opening balance (invoices and payments before start date)
      const { data: previousInvoices, error: invError } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('resident_id', numericResidentId)
        .lt('generation_date', formattedStartDate);

      // Create a subquery to get invoice IDs for this resident
      const { data: invoiceIds, error: idError } = await supabase
        .from('invoices')
        .select('id')
        .eq('resident_id', numericResidentId);
        
      if (idError) throw idError;
      
      // Use the invoice IDs to query payments
      const invoiceIdArray = invoiceIds?.map(inv => inv.id) || [];
      
      const { data: previousPayments, error: payError } = await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', invoiceIdArray)
        .lt('payment_date', formattedStartDate);

      if (invError) throw invError;
      if (payError) throw payError;

      // Calculate opening balance
      const totalInvoices = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0;
      const totalPayments = previousPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) ?? 0;
      const calculatedOpeningBalance = totalInvoices - totalPayments;
      setOpeningBalance(calculatedOpeningBalance);
      
      console.log('Calculated Opening Balance:', calculatedOpeningBalance);

      // Fetch transactions within date range
      const { data: invoices, error: currInvError } = await supabase
        .from('invoices')
        .select('id, invoice_number, generation_date, total_amount')
        .eq('resident_id', numericResidentId)
        .gte('generation_date', formattedStartDate)
        .lte('generation_date', formattedEndDate);

      const { data: payments, error: currPayError } = await supabase
        .from('payments')
        .select('id, payment_date, amount, reference_number')
        .in('invoice_id', invoiceIdArray)
        .gte('payment_date', formattedStartDate)
        .lte('payment_date', formattedEndDate);

      if (currInvError) throw currInvError;
      if (currPayError) throw currPayError;
      
      console.log('Fetched Transactions:', { 
        invoices: invoices?.length || 0, 
        payments: payments?.length || 0
      });

      // Combine and sort transactions
      let entries: LedgerEntry[] = [];
      let runningBalance = calculatedOpeningBalance;

      // Add invoices to entries
      const invoiceEntries = invoices?.map(inv => ({
        date: inv.generation_date,
        description: `Invoice #${inv.invoice_number}`,
        charge: inv.total_amount,
        payment: null,
        balance: (runningBalance += inv.total_amount)
      })) ?? [];

      // Add payments to entries
      const paymentEntries = payments?.map(pay => ({
        date: pay.payment_date,
        description: `Payment Received${pay.reference_number ? ` (Ref: ${pay.reference_number})` : ''}`,
        charge: null,
        payment: pay.amount,
        balance: (runningBalance -= pay.amount)
      })) ?? [];

      // Combine and sort all entries by date
      entries = [...invoiceEntries, ...paymentEntries].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Recalculate running balance
      let balance = calculatedOpeningBalance;
      entries = entries.map(entry => ({
        ...entry,
        balance: balance = balance + (entry.charge || 0) - (entry.payment || 0)
      }));
      
      console.log('Final Ledger Entries:', entries);

      setLedgerEntries(entries);
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ledger data');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  if (isLoadingResidents) {
    return (
      <div className="flex justify-center p-8">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Resident</label>
            <Select value={selectedResidentId ?? undefined} onValueChange={setSelectedResidentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a resident" />
              </SelectTrigger>
              <SelectContent>
                {residentsList.map((resident) => (
                  <SelectItem key={resident.id} value={resident.id.toString()}>
                    {resident.name} {resident.unit_number && `(${resident.unit_number}${resident.block_name ? `/${resident.block_name}` : ''})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
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
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
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
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={fetchLedgerData}
              disabled={!selectedResidentId || !startDate || !endDate || isLoadingLedger}
              className="w-full"
            >
              {isLoadingLedger ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              View Ledger
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      ) : null}

      {ledgerEntries.length > 0 && !isLoadingLedger ? (
        <Card className="p-6">
          <div className="mb-4">
            <strong>Opening Balance:</strong>{' '}
            <span className={cn(
              openingBalance < 0 ? "text-green-600" : openingBalance > 0 ? "text-red-600" : ""
            )}>
              ₹{Math.abs(openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {openingBalance < 0 ? " Cr" : openingBalance > 0 ? " Dr" : ""}
            </span>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Charges (Dr)</TableHead>
                <TableHead className="text-right">Payments (Cr)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map((entry, index) => (
                <TableRow key={`${entry.date}-${index}`}>
                  <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    {entry.charge ? `₹${entry.charge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.payment ? `₹${entry.payment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    entry.balance < 0 ? "text-green-600" : entry.balance > 0 ? "text-red-600" : ""
                  )}>
                    ₹{Math.abs(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {entry.balance < 0 ? " Cr" : entry.balance > 0 ? " Dr" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
};

export default MemberLedgerTab;
