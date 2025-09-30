-- Create Facebook marketing tables
CREATE TABLE public.facebook_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.facebook_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.facebook_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL UNIQUE,
  campaign_name TEXT NOT NULL,
  status TEXT NOT NULL,
  objective TEXT,
  budget_total NUMERIC,
  budget_spent NUMERIC,
  created_time TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.facebook_ad_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.facebook_campaigns(id) ON DELETE CASCADE,
  adset_id TEXT NOT NULL UNIQUE,
  adset_name TEXT NOT NULL,
  status TEXT NOT NULL,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  bid_amount NUMERIC,
  targeting JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.facebook_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adset_id UUID REFERENCES public.facebook_ad_sets(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL UNIQUE,
  ad_name TEXT NOT NULL,
  status TEXT NOT NULL,
  creative JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.facebook_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.facebook_accounts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.facebook_campaigns(id) ON DELETE CASCADE,
  adset_id UUID REFERENCES public.facebook_ad_sets(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.facebook_ads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, campaign_id, adset_id, ad_id)
);

-- Enable RLS
ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Marketing users can view Facebook data" 
ON public.facebook_accounts FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage Facebook accounts" 
ON public.facebook_accounts FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Marketing users can view campaigns" 
ON public.facebook_campaigns FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage campaigns" 
ON public.facebook_campaigns FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Marketing users can view ad sets" 
ON public.facebook_ad_sets FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage ad sets" 
ON public.facebook_ad_sets FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Marketing users can view ads" 
ON public.facebook_ads FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage ads" 
ON public.facebook_ads FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Marketing users can view metrics" 
ON public.facebook_metrics FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner can manage metrics" 
ON public.facebook_metrics FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create indexes for better performance
CREATE INDEX idx_facebook_campaigns_account_id ON public.facebook_campaigns(account_id);
CREATE INDEX idx_facebook_ad_sets_campaign_id ON public.facebook_ad_sets(campaign_id);
CREATE INDEX idx_facebook_ads_adset_id ON public.facebook_ads(adset_id);
CREATE INDEX idx_facebook_metrics_date ON public.facebook_metrics(date);
CREATE INDEX idx_facebook_metrics_campaign_id ON public.facebook_metrics(campaign_id);

-- Create update trigger
CREATE TRIGGER update_facebook_accounts_updated_at BEFORE UPDATE ON public.facebook_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facebook_campaigns_updated_at BEFORE UPDATE ON public.facebook_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facebook_ad_sets_updated_at BEFORE UPDATE ON public.facebook_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facebook_ads_updated_at BEFORE UPDATE ON public.facebook_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facebook_metrics_updated_at BEFORE UPDATE ON public.facebook_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();