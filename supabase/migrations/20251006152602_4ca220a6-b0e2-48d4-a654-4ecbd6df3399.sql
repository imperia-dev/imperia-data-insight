-- Create the service-provider-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-provider-files', 'service-provider-files', true)
ON CONFLICT (id) DO NOTHING;