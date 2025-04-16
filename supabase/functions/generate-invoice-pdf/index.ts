
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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
    
    // Generate HTML for PDF
    const htmlContent = generateInvoiceHTML(
      invoiceData,
      invoiceItemsData,
      residentData,
      unit,
      societyData
    );
    
    // Setup headless Chrome browser
    console.log("Launching headless browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    // Generate PDF
    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
    });
    
    await browser.close();
    
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
      .upload(filePath, pdfBuffer, {
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
    
    // Get public or signed URL
    const { data: urlData } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days expiry
    
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

// Helper function to generate HTML content for the invoice
function generateInvoiceHTML(
  invoice: InvoiceData,
  items: InvoiceItemData[],
  resident: ResidentData,
  unit: UnitData,
  society: SocietyData
): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Create line items HTML
  const itemsHTML = items.map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .invoice-details {
          margin-bottom: 30px;
        }
        .invoice-details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .invoice-details-column {
          flex: 1;
        }
        .label {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .value {
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f3f4f6;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #ddd;
        }
        .total-row {
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">INVOICE</div>
            <div style="color: #4b5563;">
              <div style="margin-top: 10px;">${society.name}</div>
              <div>${society.address || ''}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold;">Invoice #: ${invoice.invoice_number}</div>
            <div>Date: ${formatDate(invoice.generation_date || new Date().toISOString())}</div>
            <div>Due Date: ${formatDate(invoice.due_date)}</div>
          </div>
        </div>

        <div class="invoice-details">
          <div class="invoice-details-row">
            <div class="invoice-details-column">
              <div class="label">Bill To:</div>
              <div class="value">${resident.name}</div>
              <div class="value">Unit: ${unit.unit_number}${unit.block_name ? ', Block: ' + unit.block_name : ''}</div>
              <div class="value">${resident.phone_number}</div>
              <div class="value">${resident.email || ''}</div>
            </div>
            <div class="invoice-details-column">
              <div class="label">Billing Period:</div>
              <div class="value">${formatDate(invoice.billing_period_start)} to ${formatDate(invoice.billing_period_end)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
            <tr class="total-row">
              <td style="padding: 12px 8px; text-align: right; font-weight: bold;">Total</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${formatCurrency(invoice.total_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 40px;">
          <div class="label">Payment Instructions:</div>
          <div class="value">Please make payment by the due date to avoid late fees.</div>
        </div>

        <div class="footer">
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
