
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "../_shared/cors.ts";

type RecurringCharge = {
  id: string;
  charge_name: string;
  calculation_type: string;
  amount_or_rate: number;
  frequency: string;
  is_active: boolean;
};

type Unit = {
  id: number;
  unit_number: string;
  size_sqft: number | null;
};

type Resident = {
  id: number;
  name: string;
  primary_unit_id: number;
  unit: Unit;
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { society_id, billing_period_start, billing_period_end } = await req.json();
    
    // Log request details
    console.log(`Received request to generate invoices for society ${society_id}`);
    console.log(`Billing period: ${billing_period_start} to ${billing_period_end}`);

    // Basic validation
    if (!society_id || !billing_period_start || !billing_period_end) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing required parameters: society_id, billing_period_start, billing_period_end" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse dates
    const startDate = new Date(billing_period_start);
    const endDate = new Date(billing_period_end);
    
    // Validate date format
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid date format. Use YYYY-MM-DD format." 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate date range
    if (endDate <= startDate) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "billing_period_end must be after billing_period_start" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing Authorization header" 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client with auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, society_id')
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Unauthorized or profile not found" 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure user has access to this society
    if (profile.society_id !== society_id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "You don't have permission to generate invoices for this society" 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing invoice batches in this period to prevent duplicates
    const { data: existingBatch, error: existingError } = await supabase
      .from('invoice_batches')
      .select('id')
      .eq('society_id', society_id)
      .eq('billing_period_start', billing_period_start);

    if (existingError) {
      console.error("Error checking existing invoice batches:", existingError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Database error: ${existingError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingBatch && existingBatch.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `An invoice batch already exists for this billing period` 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch society details for due date calculation
    const { data: society, error: societyError } = await supabase
      .from('societies')
      .select('due_date_days')
      .eq('id', society_id)
      .single();

    if (societyError || !society) {
      console.error("Error fetching society:", societyError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Error fetching society: ${societyError?.message || "Society not found"}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // After fetching society details
    console.log(`Generating invoices for Society ID: ${society_id}`);
    console.log(`Billing Period: ${billing_period_start} to ${billing_period_end}`);

    // Fetch active recurring charges
    const { data: charges, error: chargesError } = await supabase
      .from('recurring_charges')
      .select('*')
      .eq('society_id', society_id)
      .eq('is_active', true);

    if (chargesError) {
      console.error("Error fetching charges:", chargesError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Error fetching charges: ${chargesError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // After fetching active recurring charges
    if (charges && charges.length > 0) {
      console.log(`Found ${charges.length} active recurring charges for the society`);
      charges.forEach(charge => {
        console.log(`Charge Details: ${charge.charge_name}, Type: ${charge.calculation_type}, Amount/Rate: ${charge.amount_or_rate}`);
      });
    } else {
      console.log('No active recurring charges found for this society.');
    }

    // Fetch active residents with their associated units
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select(`
        id,
        name,
        primary_unit_id,
        units:primary_unit_id (
          id,
          unit_number,
          size_sqft
        )
      `)
      .eq('society_id', society_id)
      .eq('is_active', true)
      .not('primary_unit_id', 'is', null);

    if (residentsError) {
      console.error("Error fetching residents:", residentsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Error fetching residents: ${residentsError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format residents data
    const formattedResidents: Resident[] = residents?.map((resident: any) => ({
      id: resident.id,
      name: resident.name,
      primary_unit_id: resident.primary_unit_id,
      unit: {
        id: resident.units.id,
        unit_number: resident.units.unit_number,
        size_sqft: resident.units.size_sqft
      }
    })) || [];

    // After fetching residents
    console.log(`Found ${formattedResidents.length} active residents with assigned units.`);

    // Calculate generation date and due date
    const generationDate = new Date();
    const dueDate = new Date(generationDate);
    dueDate.setDate(dueDate.getDate() + society.due_date_days);

    // Format dates for database
    const formattedGenerationDate = generationDate.toISOString().split('T')[0];
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    // Create invoice batch record
    const { data: batch, error: batchError } = await supabase
      .from('invoice_batches')
      .insert({
        society_id: society_id,
        billing_period_start: billing_period_start,
        billing_period_end: billing_period_end,
        generated_by_profile_id: profile.id,
        status: 'Draft',
        generated_at: new Date().toISOString(),
        total_invoice_count: 0,
        total_amount: 0
      })
      .select('id')
      .single();

    if (batchError || !batch) {
      console.error("Error creating invoice batch:", batchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Error creating invoice batch: ${batchError?.message || "Unknown error"}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created invoice batch with ID: ${batch.id}`);

    // Counter for created invoices
    let createdInvoiceCount = 0;
    let totalBatchAmount = 0;
    const failedInvoices: { residentId: number, reason: string }[] = [];

    // Loop through residents and create invoices
    for (const resident of formattedResidents) {
      console.log(`Processing resident ID: ${resident.id}, Unit ID: ${resident.unit.id}, Unit Number: ${resident.unit.unit_number}`);

      // Calculate charges and build invoice items
      const invoiceItems: { description: string, amount: number, related_charge_id: string }[] = [];
      let totalAmount = 0;

      // Process each recurring charge
      for (const charge of charges) {
        let itemAmount = 0;

        console.log(`Evaluating charge: ${charge.charge_name} (${charge.calculation_type})`);

        switch (charge.calculation_type) {
          case 'fixed_per_unit':
            itemAmount = charge.amount_or_rate;
            console.log(` Applying fixed per unit charge: ${itemAmount}`);
            break;
          
          case 'per_sqft':
            if (resident.unit.size_sqft) {
              itemAmount = charge.amount_or_rate * resident.unit.size_sqft;
              console.log(` Applying per sqft charge: Rate ${charge.amount_or_rate} * Size ${resident.unit.size_sqft} = ${itemAmount}`);
            } else {
              console.warn(`Unit ${resident.unit.id} has no size_sqft. Skipping per_sqft charge for ${charge.charge_name}.`);
              continue;
            }
            break;
            
          default:
            console.warn(`Unsupported charge calculation_type: ${charge.calculation_type}. Skipping.`);
            continue;
        }

        // Add formatted item to the list
        const monthYear = new Date(billing_period_start).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        invoiceItems.push({
          description: `${charge.charge_name} - ${monthYear}`,
          amount: itemAmount,
          related_charge_id: charge.id
        });
        
        totalAmount += itemAmount;
      }

      // Log invoice details before insertion
      console.log(` Invoice for resident ${resident.id}: Total Amount = ${totalAmount}, Items = ${invoiceItems.length}`);

      // Skip if no charges apply (empty invoice)
      if (invoiceItems.length === 0) {
        console.log(` Skipping invoice for resident ${resident.id} - no applicable charges`);
        failedInvoices.push({
          residentId: resident.id, 
          reason: "No applicable charges"
        });
        continue;
      }

      try {
        // Generate unique invoice number
        const timestamp = Date.now();
        const invoiceNumber = `INV-${society_id}-${resident.id}-${timestamp}`;

        // Insert invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            society_id: society_id,
            unit_id: resident.unit.id,
            resident_id: resident.id,
            invoice_batch_id: batch.id,
            invoice_number: invoiceNumber,
            billing_period_start: billing_period_start,
            billing_period_end: billing_period_end,
            generation_date: formattedGenerationDate,
            due_date: formattedDueDate,
            total_amount: totalAmount,
            generated_by_profile_id: profile.id,
            status: 'draft'
          })
          .select('id')
          .single();

        if (invoiceError || !invoice) {
          console.error(`Error creating invoice for resident ${resident.id}:`, invoiceError);
          failedInvoices.push({
            residentId: resident.id, 
            reason: invoiceError?.message || "Unknown error creating invoice"
          });
          continue;
        }

        console.log(` Successfully inserted invoice ID: ${invoice.id} for resident ${resident.id}`);

        // Insert invoice items
        for (const item of invoiceItems) {
          const { error: itemError } = await supabase
            .from('invoice_items')
            .insert({
              invoice_id: invoice.id,
              description: item.description,
              amount: item.amount,
              related_charge_id: item.related_charge_id
            });

          if (itemError) {
            console.error(`Error creating invoice item for invoice ${invoice.id}:`, itemError);
          }
        }

        createdInvoiceCount++;
        totalBatchAmount += totalAmount;

      } catch (error) {
        console.error(`Error processing resident ${resident.id}:`, error);
        failedInvoices.push({
          residentId: resident.id, 
          reason: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Update the batch with final counts
    if (createdInvoiceCount > 0) {
      const { error: updateError } = await supabase
        .from('invoice_batches')
        .update({
          total_invoice_count: createdInvoiceCount,
          total_amount: totalBatchAmount
        })
        .eq('id', batch.id);
      
      if (updateError) {
        console.error("Error updating invoice batch totals:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Invoice generation completed`,
        summary: {
          society_id,
          billing_period: {
            start: billing_period_start,
            end: billing_period_end
          },
          batch_id: batch.id,
          invoices_created: createdInvoiceCount,
          total_amount: totalBatchAmount,
          failed_invoices: failedInvoices,
          generation_date: formattedGenerationDate,
          due_date: formattedDueDate
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-invoices function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
