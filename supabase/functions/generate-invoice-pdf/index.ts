
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Document, Font, rgb } from "https://deno.land/x/denopdf/mod.ts";

// Import shared CORS headers
import { corsHeaders } from "../_shared/cors.ts";

interface InvoiceData {
  id: number;
  invoice_number: string;
  society_id: number;
  unit_id: number;
  resident_id: number;
  billing_period_start: string;
  billing_period_end: string;
  generation_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number | null;
  balance_due: number | null;
  status: string;
}

interface InvoiceItemData {
  id: string;
  description: string;
  amount: number;
}

interface ResidentData {
  name: string;
  email: string | null;
  phone_number: string;
}

interface UnitData {
  unit_number: string;
  block_name: string | null;
}

interface SocietyData {
  name: string;
  address: string | null;
  logo_url: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { invoice_id } = await req.json();
    
    if (!invoice_id || typeof invoice_id !== 'number') {
      return new Response(
        JSON.stringify({ error: "Missing or invalid invoice_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get Supabase URL and key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize client with user JWT for validating user session
    const userToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    });
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser(userToken);
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Authenticated user:", user.id);
    
    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();
    
    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Fetch invoice items
    const { data: invoiceItems, error: itemsError } = await supabase
      .from("invoice_items")
      .select("id, description, amount")
      .eq("invoice_id", invoice_id);
    
    if (itemsError) {
      console.error("Invoice items fetch error:", itemsError);
      return new Response(
        JSON.stringify({ error: "Error fetching invoice items" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Fetch resident data
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("name, email, phone_number")
      .eq("id", invoice.resident_id)
      .single();
    
    if (residentError || !resident) {
      console.error("Resident fetch error:", residentError);
      return new Response(
        JSON.stringify({ error: "Error fetching resident data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Fetch unit data with block information
    const { data: unitData, error: unitError } = await supabase
      .from("units")
      .select(`
        unit_number,
        society_blocks(block_name)
      `)
      .eq("id", invoice.unit_id)
      .single();
    
    if (unitError || !unitData) {
      console.error("Unit fetch error:", unitError);
      return new Response(
        JSON.stringify({ error: "Error fetching unit data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Fetch society data
    const { data: society, error: societyError } = await supabase
      .from("societies")
      .select("name, address, logo_url")
      .eq("id", invoice.society_id)
      .single();
    
    if (societyError || !society) {
      console.error("Society fetch error:", societyError);
      return new Response(
        JSON.stringify({ error: "Error fetching society data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Structure data for PDF generation
    const invoiceData: InvoiceData = invoice as InvoiceData;
    const invoiceItemsData: InvoiceItemData[] = invoiceItems as InvoiceItemData[];
    const residentData: ResidentData = resident as ResidentData;
    const unit: UnitData = {
      unit_number: unitData.unit_number,
      block_name: unitData.society_blocks?.block_name || null
    };
    const societyData: SocietyData = society as SocietyData;
    
    // Generate PDF using DenoPDF
    console.log("Generating PDF...");
    
    // Helper functions for data formatting
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const formatCurrency = (amount: number | null) => {
      if (amount === null) return "₹0.00";
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount).replace(/^(\D+)/, '₹');
    };
    
    // Create a new PDF document
    const pdf = new Document();
    
    // Add a page
    const page = pdf.addPage();
    
    // Set font styles
    page.setFont(Font.Helvetica);
    
    // PDF constants for layout positioning
    const margin = 50;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    
    // Colors
    const primaryColor = rgb(0.145, 0.388, 0.922); // #2563eb
    const textColor = rgb(0.2, 0.2, 0.2);
    const lightGrayColor = rgb(0.9, 0.9, 0.9);
    
    // Header section
    page.setFontSize(24);
    page.setFontColor(primaryColor);
    page.drawText("INVOICE", margin, pageHeight - 70);
    
    page.setFontSize(12);
    page.setFontColor(textColor);
    page.drawText(societyData.name || "", margin, pageHeight - 90);
    if (societyData.address) {
      page.drawText(societyData.address, margin, pageHeight - 110);
    }
    
    // Invoice details (right aligned)
    page.setFontSize(11);
    page.setFontBold(true);
    const invoiceNoText = "Invoice #: " + invoiceData.invoice_number;
    const invoiceNoWidth = page.getTextWidth(invoiceNoText);
    page.drawText(invoiceNoText, pageWidth - margin - invoiceNoWidth, pageHeight - 70);
    
    page.setFontBold(false);
    const dateText = "Date: " + formatDate(invoiceData.generation_date || new Date().toISOString());
    const dateWidth = page.getTextWidth(dateText);
    page.drawText(dateText, pageWidth - margin - dateWidth, pageHeight - 90);
    
    const dueDateText = "Due Date: " + formatDate(invoiceData.due_date);
    const dueDateWidth = page.getTextWidth(dueDateText);
    page.drawText(dueDateText, pageWidth - margin - dueDateWidth, pageHeight - 110);
    
    // Billing details
    let yPos = pageHeight - 160;
    page.setFontBold(true);
    page.drawText("Bill To:", margin, yPos);
    page.setFontBold(false);
    
    yPos -= 20;
    page.drawText(residentData.name, margin, yPos);
    
    yPos -= 20;
    const unitText = "Unit: " + unit.unit_number + (unit.block_name ? ', Block: ' + unit.block_name : '');
    page.drawText(unitText, margin, yPos);
    
    yPos -= 20;
    page.drawText(residentData.phone_number, margin, yPos);
    
    if (residentData.email) {
      yPos -= 20;
      page.drawText(residentData.email, margin, yPos);
    }
    
    // Billing period (right aligned)
    page.setFontBold(true);
    const billingPeriodLabel = "Billing Period:";
    const billingLabelWidth = page.getTextWidth(billingPeriodLabel);
    page.drawText(billingPeriodLabel, pageWidth - margin - billingLabelWidth, pageHeight - 160);
    
    page.setFontBold(false);
    const periodText = `${formatDate(invoiceData.billing_period_start)} to ${formatDate(invoiceData.billing_period_end)}`;
    const periodWidth = page.getTextWidth(periodText);
    page.drawText(periodText, pageWidth - margin - periodWidth, pageHeight - 180);
    
    // Table header
    yPos = pageHeight - 240;
    
    // Draw table header background
    page.drawRectangle(margin, yPos - 10, contentWidth, 30, { fill: lightGrayColor });
    
    // Draw table headers
    page.setFontBold(true);
    page.drawText("Description", margin + 10, yPos);
    
    const amountText = "Amount";
    const amountWidth = page.getTextWidth(amountText);
    page.drawText(amountText, pageWidth - margin - amountWidth - 10, yPos);
    
    yPos -= 30;
    page.setFontBold(false);
    
    // Draw table rows for invoice items
    for (const item of invoiceItemsData) {
      page.drawText(item.description, margin + 10, yPos);
      
      const itemAmountText = formatCurrency(item.amount);
      const itemAmountWidth = page.getTextWidth(itemAmountText);
      page.drawText(itemAmountText, pageWidth - margin - itemAmountWidth - 10, yPos);
      
      yPos -= 25;
      
      // Draw light separator line
      page.setLineWidth(0.5);
      page.setStrokeColor(lightGrayColor);
      page.drawLine(margin, yPos + 10, margin + contentWidth, yPos + 10);
    }
    
    // Total row
    yPos -= 15;
    page.setFontBold(true);
    page.drawText("Total", pageWidth - margin - 100, yPos);
    
    const totalText = formatCurrency(invoiceData.total_amount);
    const totalWidth = page.getTextWidth(totalText);
    page.drawText(totalText, pageWidth - margin - totalWidth - 10, yPos);
    
    // Amount paid row (if applicable)
    if (invoiceData.amount_paid !== null && invoiceData.amount_paid > 0) {
      yPos -= 25;
      page.drawText("Amount Paid", pageWidth - margin - 100, yPos);
      
      const paidText = formatCurrency(invoiceData.amount_paid);
      const paidWidth = page.getTextWidth(paidText);
      page.drawText(paidText, pageWidth - margin - paidWidth - 10, yPos);
    }
    
    // Balance due row
    yPos -= 25;
    page.drawText("Balance Due", pageWidth - margin - 100, yPos);
    
    const balanceText = formatCurrency(invoiceData.balance_due || invoiceData.total_amount);
    const balanceWidth = page.getTextWidth(balanceText);
    page.drawText(balanceText, pageWidth - margin - balanceWidth - 10, yPos);
    
    // Payment instructions
    yPos -= 60;
    page.setFontBold(true);
    page.drawText("Payment Instructions:", margin, yPos);
    
    yPos -= 20;
    page.setFontBold(false);
    page.drawText("Please make payment by the due date to avoid late fees.", margin, yPos);
    
    // Footer
    page.setFontSize(10);
    page.setFontColor(rgb(0.4, 0.4, 0.4));
    const footerText = "This is a computer-generated invoice and does not require a signature.";
    const footerWidth = page.getTextWidth(footerText);
    page.drawText(footerText, (pageWidth - footerWidth) / 2, margin);
    
    // Get the PDF as a Uint8Array
    const pdfBytes = await pdf.save();
    
    // Create storage bucket if it doesn't exist
    const bucketName = "invoices";
    const { data: bucket, error: bucketError } = await supabase
      .storage
      .getBucket(bucketName);
    
    if (!bucket) {
      console.log("Creating invoices storage bucket");
      const { error: createBucketError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: false
        });
      
      if (createBucketError) {
        console.error("Error creating bucket:", createBucketError);
        return new Response(
          JSON.stringify({ error: "Error creating storage bucket" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Upload PDF to storage
    const filePath = `${invoice.society_id}/${invoice.id}-${invoice.invoice_number}.pdf`;
    console.log(`Uploading PDF to ${bucketName}/${filePath}`);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    
    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      return new Response(
        JSON.stringify({ error: "Error uploading PDF to storage" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get signed URL with 1 year expiry
    const { data: urlData } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    const pdfUrl = urlData?.signedUrl;
    
    // Update invoice record with PDF URL
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ invoice_pdf_url: pdfUrl })
      .eq("id", invoice_id);
    
    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return new Response(
        JSON.stringify({ error: "Error updating invoice with PDF URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: pdfUrl,
        message: "Invoice PDF generated successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
