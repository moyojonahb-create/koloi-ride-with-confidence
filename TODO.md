# Driver Register Button Fix - TODO

## Steps:
- [ ] Create Supabase RLS migration for drivers registration
- [ ] Edit DriverRegistrationWizard.tsx for better error handling/logging
- [ ] Install Supabase CLI (`npm i -g supabase`) if not installed
- [ ] Login to Supabase CLI (`supabase login`)
- [ ] Link local project (`supabase link --project-ref jidfganntquilvsytslp`)
- [ ] Push migration (`supabase db push`)
- [ ] Create storage bucket `driver-documents` in dashboard if missing
- [ ] Run dev server (`vite`)
- [ ] Test full flow: DriverModeLanding -> Register -> Signup -> Wizard submit
- [ ] Mark complete
