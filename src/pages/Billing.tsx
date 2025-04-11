import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, AlertCircle, CalendarIcon, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Billing = () => {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get previous month as default
  const getPreviousMonth = () => {
    const today = new Date();
    return subMonths(today, 1);
  };

  // Initialize with previous month
  const defaultDate = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState(defaultDate.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(defaultDate.getFullYear().toString());
  const [batchInfo, setBatchInfo] = useState(null);

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

  // Fetch batch status when selected period changes
  useEffect(() => {
    const fetchBatchStatus = async () => {
      if (!profile?.society_id) return;
      
      const billingPeriod = getBillingPeriodDates();
      setIsLoading(true);
      
      try {
        // Using type-safe approach with proper table name
        const { data, error } = await supabase
          .from('invoice_batches')
          .select('id, status')
          .eq('society_id', profile.society_id)
          .eq('billing_period_start', billingPeriod.start)
          .maybeSingle();
          
        if (error) throw error;
        setBatchInfo(data);
      } catch (error) {
        console.error("Error fetching batch status:", error);
        toast({
          title: "Error",
          description: "Could not fetch batch information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBatchStatus();
  }, [profile?.society_id, selectedMonth, selectedYear]);

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
        description: data.message || "Draft invoice batch created successfully.",
      });

      console.log("Function response:", data);
      
      // Refresh batch status
      const { data: updatedBatch, error: batchError } = await supabase
        .from('invoice_batches')
        .select('id, status')
        .eq('society_id', profile.society_id)
        .eq('billing_period_start', billingPeriod.start)
        .maybeSingle();
        
      if (!batchError) {
        setBatchInfo(updatedBatch);
      }
      
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

  const handleReviewDraftBatch = () => {
    // Placeholder for future implementation
    toast({
      title: "Info",
      description: "Review Draft Batch functionality will be implemented in the next phase.",
    });
  };

  const billingPeriod = getBillingPeriodDates();

  // Render status badge based on batch status
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'Pending':
        return <Badge variant="default">Pending</Badge>;
      case 'Sent':
        return <Badge variant="default">Sent</Badge>;
      default:
        return null;
    }
  };

  // Render action button based on batch status
  const renderActionButton = () => {
    if (isLoading) {
      return (
        <Button disabled className="flex items-center gap-2 whitespace-nowrap">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking status...</span>
        </Button>
      );
    }
    
    if (!batchInfo) {
      return (
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
              <span>Generate Draft Batch for {billingPeriod.label}</span>
            </>
          )}
        </Button>
      );
    }
    
    if (batchInfo.status === 'Draft') {
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleReviewDraftBatch}
            variant="default"
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>Review Draft Batch for {billingPeriod.label}</span>
          </Button>
          {/* Cancel button placeholder - to be implemented later */}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span>Invoices {batchInfo.status} for {billingPeriod.label}</span>
        {renderStatusBadge(batchInfo.status)}
      </div>
    );
  };

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
          
          {renderActionButton()}
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
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>
                Please configure your society details before generating invoices.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Use the controls above to select a billing period and generate invoice batches.
                {batchInfo && (
                  <> Current status for {billingPeriod.label}: {renderStatusBadge(batchInfo.status)}</>
                )}
              </p>
            </div>
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
