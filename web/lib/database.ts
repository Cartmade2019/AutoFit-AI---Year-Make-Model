import { supabase } from '../supabase/supabaseClient';

/**
 * Checks if the store has any fitment sets.
 * @param shopDomain The store's unique Shopify domain.
 * @returns Promise<boolean> - true if fitment sets exist, false otherwise.
 */
export async function hasFitmentSets(shopDomain: string): Promise<boolean> {
  // Get the store ID from the shop domain
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return false;
  }

  const storeId = storeData.id;

  // Check if any fitment sets exist for this store
  const { count, error: countError } = await supabase
    .from('fitment_sets')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  if (countError) {
    console.error('Error checking fitment sets:', countError.message);
    return false;
  }

  return (count ?? 0) > 0;
}
