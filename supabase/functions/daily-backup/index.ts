import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const startTime = Date.now();
    const backupDate = new Date().toISOString().split('T')[0];
    
    // Parse request body
    const { backup_type = 'daily', tables = null } = await req.json().catch(() => ({}));
    
    console.log(`Starting ${backup_type} backup for ${backupDate}`);
    
    // Create backup log entry
    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .insert({
        backup_date: backupDate,
        backup_type,
        status: 'in_progress',
        metadata: { started_at: new Date().toISOString() }
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Error creating backup log:', logError);
      throw logError;
    }
    
    // Tables to backup (you can customize this list)
    const tablesToBackup = tables || [
      'profiles',
      'orders',
      'documents',
      'pendencies',
      'financial_entries',
      'financial_records',
      'company_costs',
      'service_provider_costs_masked', // Using masked view for security
      'productivity',
      'balance_sheet_items',
      'cash_flow_categories',
      'financial_indicators',
      'financial_projections',
      'unit_economics',
      'system_settings'
    ];
    
    const backupData: Record<string, any[]> = {};
    let totalSize = 0;
    let tablesBackedUp = 0;
    
    // Backup each table
    for (const table of tablesToBackup) {
      try {
        console.log(`Backing up table: ${table}`);
        
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.error(`Error backing up ${table}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          backupData[table] = data;
          tablesBackedUp++;
          // Estimate size (rough calculation)
          totalSize += JSON.stringify(data).length;
        }
      } catch (err) {
        console.error(`Failed to backup ${table}:`, err);
      }
    }
    
    // Create backup file
    const backupContent = JSON.stringify({
      version: '1.0',
      created_at: new Date().toISOString(),
      backup_type,
      backup_date: backupDate,
      tables: Object.keys(backupData),
      data: backupData
    }, null, 2);
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `backup_${backup_type}_${backupDate}_${timestamp}.json`;
    const filePath = `${backupDate.substring(0, 7)}/${fileName}`; // Organize by year-month
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filePath, new Blob([backupContent], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading backup:', uploadError);
      throw uploadError;
    }
    
    // Calculate duration and size
    const duration = Math.round((Date.now() - startTime) / 1000);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    // Update backup log with success
    const { error: updateError } = await supabase
      .from('backup_logs')
      .update({
        status: 'success',
        size_mb: parseFloat(sizeInMB),
        duration_seconds: duration,
        tables_backed_up: tablesBackedUp,
        storage_location: filePath,
        metadata: {
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          tables: Object.keys(backupData),
          records_count: Object.entries(backupData).reduce((acc, [_, data]) => acc + data.length, 0)
        }
      })
      .eq('id', backupLog.id);
    
    if (updateError) {
      console.error('Error updating backup log:', updateError);
    }
    
    console.log(`Backup completed successfully: ${fileName}`);
    
    // If it's the first day of the week, also create a weekly backup
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 && backup_type === 'daily') { // Sunday
      // Trigger weekly backup
      await fetch(`${supabaseUrl}/functions/v1/daily-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backup_type: 'weekly', tables: tablesToBackup })
      });
    }
    
    // If it's the first day of the month, also create a monthly backup
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth === 1 && backup_type === 'daily') {
      // Trigger monthly backup
      await fetch(`${supabaseUrl}/functions/v1/daily-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backup_type: 'monthly', tables: tablesToBackup })
      });
    }
    
    // Clean up old backups
    if (backup_type === 'daily') {
      try {
        const { error: cleanupError } = await supabase.rpc('cleanup_old_backups');
        if (cleanupError) {
          console.error('Error cleaning up old backups:', cleanupError);
        }
      } catch (err) {
        console.error('Cleanup failed:', err);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Backup completed successfully`,
        backup_id: backupLog.id,
        file_name: fileName,
        size_mb: sizeInMB,
        duration_seconds: duration,
        tables_backed_up: tablesBackedUp
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('Backup failed:', error);
    
    // Try to update the log with failure
    if (error.backupLogId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          metadata: {
            error_details: String(error),
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', error.backupLogId);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Backup failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});