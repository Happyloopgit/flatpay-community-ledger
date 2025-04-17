
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Get Supabase connection details from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log("Received request to /api/generate-pdf");
    
    // Validate required environment variables
    if (!supabaseUrl) {
      console.error("Missing VITE_SUPABASE_URL environment variable");
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase URL' });
    }

    if (!supabaseAnonKey) {
      console.error("Missing VITE_SUPABASE_ANON_KEY environment variable");
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase Anon Key' });
    }
    
    // --- Authentication/Authorization check ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    // Extract JWT token from header
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize user Supabase client with token
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    // Verify user session
    const { data: authData, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    const userId = authData.user.id;
    console.log(`Authenticated user ID: ${userId}`);
    
    // Get user profile to check society_id
    const { data: userProfile, error: profileError } = await userSupabase
      .from('profiles')
      .select('society_id')
      .eq('id', userId)
      .single();
    
    if (profileError || !userProfile) {
      console.error("Profile error:", profileError);
      return res.status(403).json({ error: 'Forbidden: User profile not found' });
    }
    
    const userSocietyId = userProfile.society_id;
    if (!userSocietyId) {
      return res.status(403).json({ error: 'Forbidden: User not associated with a society' });
    }
    
    // --- Get invoice_id from request body ---
    const { invoice_id } = req.body;
    if (!invoice_id) {
      return res.status(400).json({ error: 'Missing invoice_id in request body' });
    }
    
    console.log(`Processing PDF request for invoice ID: ${invoice_id}`);
    
    // --- Initialize Admin Supabase Client ---
    // Use Service Role Key for admin operations
    if (!supabaseServiceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // --- Fetch Data from Supabase ---
    console.log(`Fetching data for invoice ${invoice_id}...`);
    
    // Get invoice details
    const { data: invoice, error: invoiceError } = await adminSupabase
      .from('invoices')
      .select(`
        *,
        society:society_id(name, address),
        unit:unit_id(unit_number, society_blocks:block_id(block_name)),
        resident:resident_id(name, email, phone_number)
      `)
      .eq('id', invoice_id)
      .single();
    
    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return res.status(404).json({ error: `Invoice not found: ${invoiceError?.message || ''}` });
    }
    
    // Security check - ensure user can only access invoices for their society
    if (invoice.society_id !== userSocietyId) {
      console.error(`Society ID mismatch: User ${userSocietyId} vs Invoice ${invoice.society_id}`);
      return res.status(403).json({ error: 'Forbidden: Not authorized to access this invoice' });
    }
    
    // Get invoice items
    const { data: invoiceItems, error: itemsError } = await adminSupabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice_id);
    
    if (itemsError) {
      console.error("Invoice items fetch error:", itemsError);
      return res.status(500).json({ error: `Failed to fetch invoice items: ${itemsError.message}` });
    }
    
    // --- Generate PDF using pdfkit ---
    console.log("Generating PDF...");
    const doc = new PDFDocument({ bufferPages: true, size: 'A4', margin: 50 });
    
    // Collect the PDF data as a buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.on('end', async () => {
      try {
        // Combine collected buffers into a single PDF buffer
        const pdfData = Buffer.concat(buffers);
        
        // Create a unique filename for the invoice PDF
        const timestamp = new Date().getTime();
        const filePath = `invoices/${invoice.society_id}/${invoice_id}-${timestamp}.pdf`;
        
        console.log(`Uploading PDF to Supabase Storage: ${filePath}`);
        
        // Check if storage bucket exists, create if needed
        const { data: bucketData } = await adminSupabase.storage.getBucket('invoices');
        if (!bucketData) {
          console.log("Creating 'invoices' storage bucket...");
          await adminSupabase.storage.createBucket('invoices', { 
            public: true,
            fileSizeLimit: 5242880 // 5MB
          });
        }
        
        // Upload PDF to Supabase Storage
        const { data: uploadData, error: uploadError } = await adminSupabase.storage
          .from('invoices')
          .upload(filePath, pdfData, { contentType: 'application/pdf', upsert: true });
        
        if (uploadError) {
          console.error("PDF upload error:", uploadError);
          return res.status(500).json({ error: `Failed to upload PDF: ${uploadError.message}` });
        }
        
        // Get a public URL for the PDF
        const { data: publicUrlData } = await adminSupabase.storage
          .from('invoices')
          .getPublicUrl(filePath);
        
        const pdfUrl = publicUrlData.publicUrl;
        
        console.log(`PDF uploaded successfully. URL: ${pdfUrl}`);
        
        // Update invoice record with PDF URL
        const { error: updateError } = await adminSupabase
          .from('invoices')
          .update({ invoice_pdf_url: pdfUrl })
          .eq('id', invoice_id);
        
        if (updateError) {
          console.error("Invoice update error:", updateError);
          return res.status(500).json({ error: `Failed to update invoice record: ${updateError.message}` });
        }
        
        console.log(`Invoice record updated with PDF URL`);
        
        // Return success response
        return res.status(200).json({ 
          success: true,
          message: `PDF generated successfully for invoice ${invoice_id}`,
          pdfUrl: pdfUrl
        });
      } catch (error) {
        console.error("Error in PDF generation end handler:", error);
        return res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error during PDF processing'
        });
      }
    });
    
    // Start adding content to the PDF
    // Header with society name
    doc.font('Helvetica-Bold').fontSize(18).text(invoice.society.name, { align: 'center' });
    doc.font('Helvetica').fontSize(12).text(invoice.society.address || '', { align: 'center' });
    doc.moveDown(2);
    
    // Invoice title and details
    doc.font('Helvetica-Bold').fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice info table
    doc.font('Helvetica-Bold').fontSize(10).text('Invoice Number:', 50, doc.y).text(invoice.invoice_number, 200, doc.y);
    doc.moveDown(0.5);
    doc.text('Date:', 50, doc.y).text(format(new Date(invoice.generation_date), 'dd/MM/yyyy'), 200, doc.y);
    doc.moveDown(0.5);
    doc.text('Due Date:', 50, doc.y).text(format(new Date(invoice.due_date), 'dd/MM/yyyy'), 200, doc.y);
    doc.moveDown(2);
    
    // Bill To section
    doc.font('Helvetica-Bold').fontSize(12).text('Bill To:');
    doc.font('Helvetica').fontSize(10);
    doc.text(invoice.resident.name);
    
    // Show unit and block
    const blockName = invoice.unit.society_blocks?.block_name || '';
    let unitDisplay = invoice.unit.unit_number;
    if (blockName) {
      unitDisplay = `${blockName} - ${unitDisplay}`;
    }
    doc.text(`Unit: ${unitDisplay}`);
    
    if (invoice.resident.phone_number) {
      doc.text(`Phone: ${invoice.resident.phone_number}`);
    }
    if (invoice.resident.email) {
      doc.text(`Email: ${invoice.resident.email}`);
    }
    doc.moveDown(2);
    
    // Bill details
    doc.font('Helvetica-Bold').fontSize(12).text('Billing Period:');
    doc.font('Helvetica').fontSize(10).text(
      `${format(new Date(invoice.billing_period_start), 'dd/MM/yyyy')} to ${format(new Date(invoice.billing_period_end), 'dd/MM/yyyy')}`
    );
    doc.moveDown(2);
    
    // Invoice items table
    // Table headers
    const startY = doc.y;
    const tableTop = startY;
    const descriptionX = 50;
    const amountX = 450;
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', descriptionX, tableTop);
    doc.text('Amount', amountX, tableTop);
    doc.moveDown();
    
    // Underline
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Table rows
    let totalAmount = 0;
    doc.font('Helvetica').fontSize(10);
    
    if (invoiceItems?.length > 0) {
      invoiceItems.forEach(item => {
        const itemY = doc.y;
        doc.text(item.description, descriptionX, itemY);
        doc.text(formatCurrency(item.amount), amountX, itemY, { align: 'right' });
        totalAmount += Number(item.amount);
        doc.moveDown();
      });
    } else {
      doc.text('No items found', descriptionX, doc.y);
      doc.moveDown();
    }
    
    // Underline before total
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Total row
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Total:', 380, doc.y);
    doc.text(formatCurrency(invoice.total_amount), amountX, doc.y, { align: 'right' });
    
    // Add page number if multiple pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8);
      doc.text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
        align: 'center',
        width: doc.page.width - 100
      });
    }
    
    // Footer with payment instructions
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(4);
    doc.text('Payment Instructions:', { underline: true });
    doc.moveDown(0.5);
    doc.text('Please make payment by the due date to avoid late fees.', { width: 400 });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error("Error in /api/generate-pdf:", error);
    // Ensure error.message is included if available
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: errorMessage });
  }
}
