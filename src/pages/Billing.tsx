
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import InvoiceList from "@/components/invoices/InvoiceList";

const Billing = () => {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get current month details
  const currentDate = new Date();
  const currentMonthLabel = format(currentDate, 'MMMM yyyy');
  const billingPeriodStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const billingPeriodEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const handleGenerateInvoices = async () => {
    if (!profile || !profile.society_id) {
      toast({
        title: "Error",
        description: "Society information not available. Please set up your society first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-invoices', {
        body: {
          society_id: profile.society_id,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
        <Button 
          onClick={handleGenerateInvoices} 
          disabled={isGenerating || !profile?.society_id}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Generate Invoices for {currentMonthLabel}</span>
            </>
          )}
        </Button>
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
              Use the "Generate Invoices" button to create invoices for all active residents for the current billing period ({currentMonthLabel}).
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
