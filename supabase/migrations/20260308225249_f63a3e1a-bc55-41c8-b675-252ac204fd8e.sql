-- Remove dangerous wallet UPDATE policy that allows users to set arbitrary balance
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

-- Remove dangerous wallet_transactions INSERT policy that allows fake transaction injection
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.wallet_transactions;