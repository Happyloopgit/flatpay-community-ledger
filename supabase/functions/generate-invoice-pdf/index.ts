
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import PDFDocument from "https://deno.land/x/deno_pdfkit@0.2.0/mod.ts";

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
    
    console.log("Generating PDF for invoice:", invoiceData.invoice_number);
    
    // Create a new PDF document using deno-pdfkit
    const doc = new PDFDocument({ margin: 50 });
    
    // Initialize a buffer to store the PDF data
    const chunks: Uint8Array[] = [];
    
    // Collect PDF data chunks
    doc.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    
    // Promise to handle PDF generation completion
    const pdfPromise = new Promise<Uint8Array>((resolve) => {
      doc.on("end", () => {
        // Concatenate all chunks into a single Uint8Array
        const pdfLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const pdfBytes = new Uint8Array(pdfLength);
        
        let offset = 0;
        for (const chunk of chunks) {
          pdfBytes.set(chunk, offset);
          offset += chunk.length;
        }
        
        resolve(pdfBytes);
      });
    });
    
    // Format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };
    
    // Define some reusable styles
    const titleFontSize = 22;
    const headingFontSize = 14;
    const normalFontSize = 12;
    const smallFontSize = 10;
    
    const lineHeight = 20;
    const tableTop = 280;
    
    const colors = {
      primary: '#333333',
      secondary: '#777777',
      accent: '#4F46E5',
      border: '#DDDDDD'
    };
    
    // Define table columns
    const columns = [
      { x: 50, w: 300 }, // Description column 
      { x: 350, w: 100, align: 'right' } // Amount column
    ];
    
    // Start writing the PDF content
    
    // Add society name and logo
    doc
      .font('Helvetica-Bold')
      .fontSize(titleFontSize)
      .fillColor(colors.primary)
      .text(societyData.name, 50, 50);
    
    if (societyData.address) {
      doc
        .font('Helvetica')
        .fontSize(normalFontSize)
        .fillColor(colors.secondary)
        .text(societyData.address, 50, 75, { width: 250 });
    }
    
    // Add invoice title and number
    doc
      .font('Helvetica-Bold')
      .fontSize(headingFontSize)
      .fillColor(colors.accent)
      .text('INVOICE', 400, 50)
      .font('Helvetica')
      .fontSize(normalFontSize)
      .fillColor(colors.primary)
      .text(`#${invoiceData.invoice_number}`, 400, 70)
      .text(`Date: ${formatDate(invoiceData.generation_date)}`, 400, 90)
      .text(`Due Date: ${formatDate(invoiceData.due_date)}`, 400, 110);
    
    // Add billing period
    doc
      .font('Helvetica-Bold')
      .fontSize(normalFontSize)
      .text('Billing Period:', 50, 130)
      .font('Helvetica')
      .text(`${formatDate(invoiceData.billing_period_start)} to ${formatDate(invoiceData.billing_period_end)}`, 150, 130);
    
    // Add horizontal separator
    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(50, 150)
      .lineTo(550, 150)
      .stroke();
    
    // Add resident information
    doc
      .font('Helvetica-Bold')
      .fontSize(normalFontSize)
      .text('Bill To:', 50, 170);
    
    // Resident name and unit
    doc
      .font('Helvetica')
      .fontSize(normalFontSize)
      .text(residentData.name, 50, 190)
      .text(`Unit: ${unit.unit_number}${unit.block_name ? ', Block: ' + unit.block_name : ''}`, 50, 210);
    
    // Contact information
    if (residentData.phone_number) {
      doc.text(`Phone: ${residentData.phone_number}`, 50, 230);
    }
    
    if (residentData.email) {
      doc.text(`Email: ${residentData.email}`, 50, 250);
    }
    
    // Add table header
    doc
      .font('Helvetica-Bold')
      .fillColor(colors.primary)
      .lineWidth(1)
      .strokeColor(colors.border)
      .rect(50, tableTop, 500, 30)
      .stroke();
    
    doc
      .text('Description', columns[0].x + 10, tableTop + 10)
      .text('Amount', columns[1].x, tableTop + 10, { width: columns[1].w, align: 'right' });
    
    // Add table rows for each invoice item
    let y = tableTop + 30;
    
    for (const item of invoiceItemsData) {
      // Draw row background
      doc
        .rect(50, y, 500, 25)
        .stroke();
      
      // Add item data
      doc
        .font('Helvetica')
        .fillColor(colors.primary)
        .text(item.description, columns[0].x + 10, y + 7, { width: columns[0].w - 20 })
        .text(`₹${item.amount.toFixed(2)}`, columns[1].x, y + 7, { width: columns[1].w, align: 'right' });
      
      y += 25;
    }
    
    // Add totals section
    y += 20;
    
    // Format for total section
    const totalLineY = (lineText: string, amount: number | null, isBold = false) => {
      if (isBold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      doc.text(
        lineText,
        350,
        y,
        { width: 100, align: 'left' }
      );
      
      doc.text(
        `₹${(amount || 0).toFixed(2)}`,
        450,
        y,
        { width: 100, align: 'right' }
      );
      
      y += 20;
    };
    
    // Draw totals
    totalLineY('Total:', invoiceData.total_amount);
    
    if (invoiceData.amount_paid && invoiceData.amount_paid > 0) {
      totalLineY('Amount Paid:', invoiceData.amount_paid);
    }
    
    totalLineY('Balance Due:', invoiceData.balance_due || invoiceData.total_amount, true);
    
    // Add payment instructions
    y += 20;
    
    doc
      .font('Helvetica-Bold')
      .text('Payment Instructions:', 50, y);
    
    y += 20;
    
    doc
      .font('Helvetica')
      .text('Please make payment by the due date to avoid late fees.', 50, y);
    
    y += 30;
    
    doc
      .fontSize(smallFontSize)
      .fillColor(colors.secondary)
      .text('This is a computer-generated invoice and does not require a signature.', 50, y);
    
    // Finalize the PDF
    doc.end();
    
    // Wait for the PDF generation to complete
    const pdfBytes = await pdfPromise;
    
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
