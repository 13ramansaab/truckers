/*
  # Assign existing data to dev user

  1. Data Migration
    - Update all existing trips with null user_id to dev user
    - Update all existing fuel_purchases with null user_id to dev user  
    - Update all existing location_points with null user_id to dev user

  2. Schema Reload
    - Notify PostgREST to reload schema cache

  Note: Replace <MY_USER_ID> with your actual Supabase user UUID before running
*/

-- Assign existing data to dev user (replace <MY_USER_ID> with actual UUID)
UPDATE public.trips 
SET user_id = '<MY_USER_ID>' 
WHERE user_id IS NULL;

UPDATE public.fuel_purchases 
SET user_id = '<MY_USER_ID>' 
WHERE user_id IS NULL;

UPDATE public.location_points 
SET user_id = '<MY_USER_ID>' 
WHERE user_id IS NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';