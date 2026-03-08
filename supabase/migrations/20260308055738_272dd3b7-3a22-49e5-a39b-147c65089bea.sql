
-- ═══════════════════════════════════════════════════════════
-- FIX: Attach missing triggers to tables
-- ═══════════════════════════════════════════════════════════

-- 1. Ride expiry trigger (set expires_at on pending rides)
DROP TRIGGER IF EXISTS tr_set_ride_expiry ON public.rides;
CREATE TRIGGER tr_set_ride_expiry
  BEFORE INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ride_expiry();

-- 2. Auto-create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. updated_at triggers for tables that have the column
DROP TRIGGER IF EXISTS tr_updated_at_rides ON public.rides;
CREATE TRIGGER tr_updated_at_rides
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_updated_at_drivers ON public.drivers;
CREATE TRIGGER tr_updated_at_drivers
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_updated_at_town_pricing ON public.town_pricing;
CREATE TRIGGER tr_updated_at_town_pricing
  BEFORE UPDATE ON public.town_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Driver rating average trigger
DROP TRIGGER IF EXISTS tr_update_driver_rating ON public.driver_ratings;
CREATE TRIGGER tr_update_driver_rating
  AFTER INSERT ON public.driver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_rating_avg();

-- 5. Referral code auto-generation
DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.profiles;
CREATE TRIGGER tr_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- 6. Ride negotiation updated_at
DROP TRIGGER IF EXISTS tr_ride_requests_updated ON public.ride_requests;
CREATE TRIGGER tr_ride_requests_updated
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ride_negotiation_updated_at();

DROP TRIGGER IF EXISTS tr_ride_offers_updated ON public.ride_offers;
CREATE TRIGGER tr_ride_offers_updated
  BEFORE UPDATE ON public.ride_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ride_negotiation_updated_at();
