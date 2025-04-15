
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_id } = await req.json();

    if (!batch_id || typeof batch_id !== 'number') {
      throw new Error('Invalid batch_id provided');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Start a transaction to delete invoices and update batch
    const { data: batchData, error: batchError } = await supabaseClient
      .from('invoice_batches')
      .select('status')
      .eq('id', batch_id)
      .single();

    if (batchError) throw batchError;
    if (!batchData) throw new Error('Batch not found');
    if (batchData.status !== 'Draft') throw new Error('Only draft batches can be cancelled');

    // Get count of invoices to be deleted
    const { count: invoiceCount, error: countError } = await supabaseClient
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_batch_id', batch_id);

    if (countError) throw countError;

    // Delete invoices
    const { error: deleteError } = await supabaseClient
      .from('invoices')
      .delete()
      .eq('invoice_batch_id', batch_id);

    if (deleteError) throw deleteError;

    // Delete the batch
    const { error: batchDeleteError } = await supabaseClient
      .from('invoice_batches')
      .delete()
      .eq('id', batch_id);

    if (batchDeleteError) throw batchDeleteError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Batch cancelled successfully',
        deleted_invoices: invoiceCount || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in cancel-batch function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to cancel batch',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
