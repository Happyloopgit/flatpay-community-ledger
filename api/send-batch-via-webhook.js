
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract batch_id from request body
    const { batch_id } = req.body;
    
    if (!batch_id || isNaN(Number(batch_id))) {
      return res.status(400).json({ error: 'Valid batch_id is required' });
    }
    
    // Verify JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Get user's profile to check their society_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('society_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || !profile.society_id) {
      console.error('Profile error:', profileError);
      return res.status(403).json({ error: 'User not associated with any society' });
    }
    
    // Check if the batch exists and belongs to user's society
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('invoice_batches')
      .select('*')
      .eq('id', batch_id)
      .eq('society_id', profile.society_id)
      .eq('status', 'Pending')
      .single();
    
    if (batchError || !batch) {
      console.error('Batch error:', batchError);
      return res.status(404).json({ 
        error: 'Batch not found, does not belong to your society, or is not in Pending status' 
      });
    }
    
    // Verify Interakt environment variables
    const interaktWebhookUrl = process.env.INTERAKT_WEBHOOK_URL;
    const interaktApiKey = process.env.INTERAKT_API_KEY;
    
    if (!interaktWebhookUrl || !interaktApiKey) {
      return res.status(500).json({ error: 'Interakt webhook configuration is missing' });
    }
    
    // Fetch all pending invoices for this batch
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id, 
        invoice_number, 
        total_amount, 
        due_date, 
        invoice_pdf_url,
        residents (
          name, 
          phone_number
        )
      `)
      .eq('invoice_batch_id', batch_id)
      .eq('status', 'pending');
    
    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
    
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ error: 'No pending invoices found in this batch' });
    }
    
    // Track webhook results
    let successCount = 0;
    let failureCount = 0;
    const successfulInvoiceIds = [];
    const webhookPromises = [];
    
    // Process each invoice
    for (const invoice of invoices) {
      // Skip if missing required data
      if (!invoice.residents || !invoice.residents.phone_number || !invoice.invoice_pdf_url) {
        console.warn(`Skipping invoice ${invoice.id}: missing phone number or PDF URL`);
        failureCount++;
        continue;
      }
      
      // Format phone number (ensure it has country code)
      let phoneNumber = invoice.residents.phone_number;
      if (!phoneNumber.startsWith('+')) {
        // Assuming India (+91) as default country code
        phoneNumber = phoneNumber.startsWith('91') ? `+${phoneNumber}` : `+91${phoneNumber}`;
      }
      
      // Construct webhook payload
      const payload = {
        phoneNumber: phoneNumber,
        event: "InvoiceSent",
        traits: {
          name: invoice.residents.name,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.total_amount,
          dueDate: new Date(invoice.due_date).toLocaleDateString('en-IN'),
          invoiceUrl: invoice.invoice_pdf_url
        }
      };
      
      // Send webhook
      const webhookPromise = fetch(interaktWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': interaktApiKey
        },
        body: JSON.stringify(payload)
      }).then(async response => {
        const responseData = await response.json();
        
        if (response.ok) {
          console.log(`Successfully sent webhook for invoice ${invoice.id}`);
          successCount++;
          successfulInvoiceIds.push(invoice.id);
          return { success: true, invoiceId: invoice.id };
        } else {
          console.error(`Failed to send webhook for invoice ${invoice.id}:`, responseData);
          failureCount++;
          return { success: false, invoiceId: invoice.id, error: responseData };
        }
      }).catch(error => {
        console.error(`Error sending webhook for invoice ${invoice.id}:`, error);
        failureCount++;
        return { success: false, invoiceId: invoice.id, error: error.message };
      });
      
      webhookPromises.push(webhookPromise);
    }
    
    // Wait for all webhook calls to complete
    const webhookResults = await Promise.allSettled(webhookPromises);
    
    // Update statuses for successful webhook calls
    if (successfulInvoiceIds.length > 0) {
      // Update invoices status to 'Sent'
      const { error: updateInvoicesError } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'sent' })
        .in('id', successfulInvoiceIds);
      
      if (updateInvoicesError) {
        console.error('Error updating invoice statuses:', updateInvoicesError);
      }
      
      // Update batch status to 'Sent'
      const { error: updateBatchError } = await supabaseAdmin
        .from('invoice_batches')
        .update({ 
          status: 'Sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', batch_id);
      
      if (updateBatchError) {
        console.error('Error updating batch status:', updateBatchError);
      }
    }
    
    // Return summary
    return res.status(200).json({
      success: successCount > 0,
      messages_triggered: successCount,
      trigger_failures: failureCount,
      total_invoices: invoices.length
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
