
-- Rider deposit requests table
CREATE TABLE public.rider_deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'ecocash',
  phone_number text NOT NULL,
  reference text NOT NULL,
  proof_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_deposit_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own deposits
CREATE POLICY "Users can insert their own rider deposits"
  ON public.rider_deposit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own deposits
CREATE POLICY "Users can view their own rider deposits"
  ON public.rider_deposit_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all rider deposits
CREATE POLICY "Admins can manage all rider deposits"
  ON public.rider_deposit_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for rider deposit proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('rider-deposit-proofs', 'rider-deposit-proofs', false)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload rider deposit proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rider-deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own rider deposit proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rider-deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all rider deposit proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rider-deposit-proofs' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin function to approve rider deposits
CREATE OR REPLACE FUNCTION public.admin_approve_rider_deposit(p_deposit_id uuid, p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dep rider_deposit_requests%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  SELECT * INTO v_dep FROM rider_deposit_requests WHERE id = p_deposit_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Deposit not found or already processed');
  END IF;

  -- Credit rider wallet (upsert)
  INSERT INTO wallets (user_id, balance)
  VALUES (v_dep.user_id, v_dep.amount_usd)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance,
        updated_at = now();

  -- Record transaction
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_dep.user_id;
  INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description)
  VALUES (v_wallet.id, v_dep.user_id, v_dep.amount_usd, 'deposit', 
    'Approved ' || v_dep.payment_method || ' deposit (Ref: ' || v_dep.reference || ')');

  -- Mark approved
  UPDATE rider_deposit_requests
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(), admin_note = p_note
  WHERE id = p_deposit_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
