
-- Convert Gwanda and Beitbridge to USD
UPDATE town_pricing
SET currency_code = 'USD',
    currency_symbol = '$',
    base_fare = 1.50,
    per_km_rate = 1.00,
    minimum_fare = 1.50,
    offer_floor = 1.00,
    offer_ceiling = 50.00,
    short_trip_fare = 1.50,
    short_trip_km = 2,
    updated_at = now()
WHERE town_id IN ('gwanda', 'beitbridge');

-- Also update platform_ledger default currency to USD
ALTER TABLE platform_ledger ALTER COLUMN currency SET DEFAULT 'USD';
UPDATE platform_ledger SET currency = 'USD' WHERE currency = 'ZAR';
