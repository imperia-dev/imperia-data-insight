DO $$ DECLARE f text; BEGIN
FOREACH f IN ARRAY ARRAY[
 'accept_trial_order(uuid)','advance_trial_order_processing(uuid)','approve_trial_customer(uuid)',
 'check_rate_limit_v2(text,text,integer,integer)','check_secret_expiration()','cleanup_expired_idempotency_keys()',
 'cleanup_expired_reset_tokens()','cleanup_old_backups()','cleanup_rate_limit_entries()','confirm_trial_order_received(uuid)',
 'create_company(text,text)','deactivate_trial_customer(uuid)','generate_mfa_backup_codes()',
 'generate_protocol_number(text,date,text)','generate_trial_order_number()','get_trial_usage(uuid)',
 'is_protocol_delayed(uuid,text)','mark_trial_order_delivered(uuid)','reject_trial_customer(uuid,text)',
 'set_trial_order_processing_step(uuid,smallint)','start_trial_order_processing(uuid)','test_backup()','verify_mfa_backup_code(text)']
LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f); END LOOP;
FOREACH f IN ARRAY ARRAY['check_rate_limit_v2(text,text,integer,integer)','check_secret_expiration()','cleanup_expired_idempotency_keys()',
 'cleanup_expired_reset_tokens()','cleanup_old_backups()','cleanup_rate_limit_entries()','test_backup()']
LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', f);
     EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f); END LOOP;
FOREACH f IN ARRAY ARRAY['accept_trial_order(uuid)','advance_trial_order_processing(uuid)','approve_trial_customer(uuid)','confirm_trial_order_received(uuid)',
 'create_company(text,text)','deactivate_trial_customer(uuid)','generate_mfa_backup_codes()','generate_protocol_number(text,date,text)',
 'generate_trial_order_number()','get_trial_usage(uuid)','is_protocol_delayed(uuid,text)','mark_trial_order_delivered(uuid)',
 'reject_trial_customer(uuid,text)','set_trial_order_processing_step(uuid,smallint)','start_trial_order_processing(uuid)','verify_mfa_backup_code(text)']
LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f); END LOOP;
END $$;

ALTER TABLE public.contact_messages
 ADD CONSTRAINT contact_messages_len CHECK (char_length(coalesce(name,''))<=200 AND char_length(coalesce(email,''))<=255
 AND char_length(coalesce(phone,''))<=40 AND char_length(coalesce(company,''))<=200 AND char_length(coalesce(subject,''))<=300
 AND char_length(coalesce(message,''))<=5000) NOT VALID;
ALTER TABLE public.bad_news_reports
 ADD CONSTRAINT bad_news_len CHECK (char_length(coalesce(problem_type,''))<=200 AND char_length(coalesce(description,''))<=10000) NOT VALID;
ALTER TABLE public.lead_page_views
 ADD CONSTRAINT lead_page_views_len CHECK (char_length(coalesce(session_id,''))<=200 AND char_length(coalesce(page_url,''))<=2048
 AND char_length(coalesce(page_title,''))<=500 AND char_length(coalesce(page_path,''))<=2048) NOT VALID;