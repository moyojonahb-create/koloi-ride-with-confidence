DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_wallets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_earnings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.driver_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.admin_earnings REPLICA IDENTITY FULL;