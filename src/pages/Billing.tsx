
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, AlertCircle, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import InvoiceList from "@/components/invoices/InvoiceList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Billing = () => {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get previous month as default
  const getPreviousMonth = () => {
    const today = new Date();
    return subMonths(today, 1);
  };

  // Initialize with previous month
  const defaultDate = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState(defaultDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(defaultDate.getFullYear().toString());

  // Generate array of years (current year +/- 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  
  // Array of months
  const months = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];

  // Calculate billing period dates based on selected month and year
  const getBillingPeriodDates = () => {
    // Create date from selected year and month
    const billingDate = new Date(parseInt(selectedYear), parseInt(selectedMonth));
    
    const periodStart = startOfMonth(billingDate);
    const periodEnd = endOfMonth(billingDate);
    
    return {
      start: format(periodStart, 'yyyy-MM-dd'),
      end: format(periodEnd, 'yyyy-MM-dd'),
      label: format(billingDate, 'MMMM yyyy')
    };
  };

  const handleGenerateInvoices = async () => {
    if (!profile || !profile.society_id) {
      toast({
        title: "Error",
        description: "Society information not available. Please set up your society first.",
        variant: "destructive",
      });
      return;
    }

    const billingPeriod = getBillingPeriodDates();
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-invoices', {
        body: {
          society_id: profile.society_id,
          billing_period_start: billingPeriod.start,
          billing_period_end: billingPeriod.end,
        }
      });

      if (error) {
        throw error;
      }

      // Show success toast
      toast({
        title: "Success",
        description: data.message || "Invoices generation initiated successfully.",
      });

      console.log("Function response:", data);
    } catch (error) {
      console.error("Error generating invoices:", error);
      
      // Show error toast
      toast({
        title: "Invoice Generation Failed",
        description: error.message || "An error occurred while generating invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const billingPeriod = getBillingPeriodDates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateInvoices} 
            disabled={isGenerating || !profile?.society_id}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Generate Invoices for {billingPeriod.label}</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>
            Generate and manage invoices for your society residents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!profile?.society_id ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <span>Please configure your society details before generating invoices.</span>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Use the "Generate Invoices" button to create invoices for all active residents for the selected billing period. 
              The default selection is set to the previous month.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoices List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            View and manage generated invoices for your society
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceList />
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
