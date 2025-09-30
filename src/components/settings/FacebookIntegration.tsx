import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Facebook, Key, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function FacebookIntegration() {
  const [accountId, setAccountId] = useState("");
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  useEffect(() => {
    checkTokenStatus();
    getLastSyncDate();
  }, []);

  const checkTokenStatus = async () => {
    try {
      // Just check if we can reach the function - it will tell us if token is configured
      const { data } = await supabase.functions.invoke('sync-facebook-data', {
        body: { accountId: 'test', dateFrom: new Date().toISOString().split('T')[0], dateTo: new Date().toISOString().split('T')[0] }
      });
      
      // If we get the specific error about token, it's not configured
      // Otherwise, token is configured (even if account ID is invalid)
      if (data?.error === 'Facebook access token not configured') {
        setIsTokenSet(false);
      } else {
        setIsTokenSet(true);
      }
    } catch (error) {
      // Network error - assume token might be set
      console.log('Could not check token status:', error);
      setIsTokenSet(true);
    }
  };

  const getLastSyncDate = async () => {
    const { data } = await supabase
      .from('facebook_metrics')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setLastSyncDate(new Date(data.updated_at).toLocaleString());
    }
  };

  const handleSyncData = async () => {
    if (!accountId) {
      toast.error("Please enter your Facebook Account ID");
      return;
    }

    setIsSyncing(true);
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase.functions.invoke('sync-facebook-data', {
        body: {
          accountId,
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error === 'Facebook access token not configured') {
          toast.error("Please configure your Facebook access token first");
          setIsTokenSet(false);
        } else {
          toast.error(data.error);
        }
      } else {
        toast.success(`Successfully synced ${data.campaigns || 0} campaigns`);
        await getLastSyncDate();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Failed to sync Facebook data");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddToken = () => {
    toast.info("Please add the FACEBOOK_ACCESS_TOKEN secret in your Supabase project settings");
    window.open(`https://supabase.com/dashboard/project/agttqqaampznczkyfvkf/settings/functions`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5" />
          Facebook Integration
        </CardTitle>
        <CardDescription>
          Connect your Facebook Ads account to sync campaign data and metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Access Token Status</p>
              <p className="text-sm text-muted-foreground">
                {isTokenSet ? "Token is configured" : "Token not configured"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTokenSet ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            {!isTokenSet && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Configure Token
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Configure Facebook Access Token</AlertDialogTitle>
                    <AlertDialogDescription>
                      To use the Facebook integration, you need to add your Facebook Access Token as a secret in your Supabase project.
                      <br /><br />
                      1. Go to Facebook Developers and get your access token
                      <br />
                      2. Click "Add Secret" below to open Supabase settings
                      <br />
                      3. Add a new secret named "FACEBOOK_ACCESS_TOKEN" with your token value
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddToken}>
                      Add Secret
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Account Configuration */}
        <div className="space-y-2">
          <Label htmlFor="account-id">Facebook Account ID</Label>
          <Input
            id="account-id"
            placeholder="Enter your Facebook Ads Account ID (e.g., act_123456789)"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            You can find this in your Facebook Business Manager
          </p>
        </div>

        {/* Last Sync Info */}
        {lastSyncDate && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Last synchronized: {lastSyncDate}
            </p>
          </div>
        )}

        {/* Sync Button */}
        <Button 
          onClick={handleSyncData} 
          disabled={!isTokenSet || isSyncing || !accountId}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Facebook Data
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Data will be synced for the last 30 days. You can set up automatic syncing using a cron job.
        </p>
      </CardContent>
    </Card>
  );
}