import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProviderData {
  supplier_id: string;
  provider_name: string;
  provider_email: string;
  expense_count: number;
  total_amount: number;
  expenses_data: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { competence, preview = false } = await req.json();

    if (!competence) {
      throw new Error('Competence month is required (format: YYYY-MM)');
    }

    console.log(`Processing protocols for competence: ${competence}, preview: ${preview}`);

    // Calculate date range for the competence month
    const startDate = `${competence}-01`;
    const year = parseInt(competence.split('-')[0]);
    const month = parseInt(competence.split('-')[1]);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${competence}-${lastDay}`;

    // Query expenses from service providers in this competence month
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        id,
        description,
        amount_base,
        data_competencia,
        fornecedor_id,
        document_ref,
        invoice_number,
        status,
        profiles!expenses_fornecedor_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('tipo_despesa', 'prestador')
      .gte('data_competencia', startDate)
      .lte('data_competencia', endDate)
      .not('fornecedor_id', 'is', null)
      .not('amount_base', 'is', null)
      .gt('amount_base', 0);

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      throw expensesError;
    }

    console.log(`Found ${expenses?.length || 0} service provider expenses`);

    // Group expenses by provider
    const providersMap = new Map<string, ProviderData>();
    
    expenses?.forEach((expense: any) => {
      const supplierId = expense.fornecedor_id;
      const profile = expense.profiles;
      
      if (!profile) {
        console.warn(`No profile found for expense ${expense.id}, fornecedor_id: ${supplierId}`);
        return;
      }

      if (!providersMap.has(supplierId)) {
        providersMap.set(supplierId, {
          supplier_id: supplierId,
          provider_name: profile.full_name || 'Prestador',
          provider_email: profile.email || '',
          expense_count: 0,
          total_amount: 0,
          expenses_data: [],
        });
      }

      const provider = providersMap.get(supplierId)!;
      provider.expense_count += 1;
      provider.total_amount += parseFloat(expense.amount_base || 0);
      provider.expenses_data.push({
        expense_id: expense.id,
        description: expense.description,
        amount: expense.amount_base,
        data_competencia: expense.data_competencia,
        document_ref: expense.document_ref,
        invoice_number: expense.invoice_number,
        status: expense.status,
      });
    });

    const providers = Array.from(providersMap.values());
    console.log(`Grouped into ${providers.length} providers`);

    // If preview mode, just return the providers list
    if (preview) {
      return new Response(
        JSON.stringify({ providers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate protocols
    let created = 0;
    let skipped = 0;

    for (const provider of providers) {
      // Check if protocol already exists
      const { data: existing } = await supabase
        .from('service_provider_protocols')
        .select('id')
        .eq('supplier_id', provider.supplier_id)
        .gte('competence_month', startDate)
        .lte('competence_month', endDate)
        .single();

      if (existing) {
        console.log(`Protocol already exists for supplier ${provider.supplier_id}`);
        skipped += 1;
        continue;
      }

      // Generate protocol number using database function
      const { data: protocolNumber, error: numberError } = await supabase
        .rpc('generate_protocol_number', {
          p_type: 'service_provider',
          p_competence_month: startDate,
          p_supplier_name: provider.provider_name,
        });

      if (numberError) {
        console.error('Error generating protocol number:', numberError);
        throw numberError;
      }

      // Create protocol
      const { error: insertError } = await supabase
        .from('service_provider_protocols')
        .insert({
          protocol_number: protocolNumber,
          competence_month: startDate,
          supplier_id: provider.supplier_id,
          provider_name: provider.provider_name,
          provider_email: provider.provider_email,
          total_amount: provider.total_amount,
          expense_count: provider.expense_count,
          expenses_data: provider.expenses_data,
          status: 'draft',
        });

      if (insertError) {
        console.error('Error inserting protocol:', insertError);
        throw insertError;
      }

      console.log(`Created protocol ${protocolNumber} for ${provider.provider_name}`);
      created += 1;
    }

    console.log(`Completed: ${created} created, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true,
        created,
        skipped,
        message: `${created} protocolo(s) gerado(s), ${skipped} já existente(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-provider-protocols:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
