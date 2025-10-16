import { supabase } from '../supabase/supabaseClient';

/**
 * Fetches store settings from the store_settings table using shop domain.
 * @param shopDomain The store's unique Shopify domain.
 * @returns Promise<any | null> - Settings JSON or null if not found.
 */
export async function getStoreSettings(shopDomain: string): Promise<any | null> {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return null;
  }

  const storeId = storeData.id;

  const { data: settingsData, error: settingsError } = await supabase
    .from('store_settings')
    .select('json_data')
    .eq('store_id', storeId)
    .single();

  if (settingsError) {
    console.error('Error fetching store settings:', settingsError.message);
    return null;
  }

  return settingsData?.json_data ?? null;
}

/**
 * Updates store settings in the store_settings table.
 * Inserts a new record if one doesn't exist (upsert).
 * @param shopDomain The store's unique Shopify domain.
 * @param newSettings A JSON object containing the new settings.
 * @returns Promise<boolean> - true if update was successful.
 */
export async function updateStoreSettings(shopDomain: string, newSettings: any): Promise<boolean> {
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

  const { error: upsertError } = await supabase
    .from('store_settings')
    .upsert(
      { store_id: storeId, json_data: newSettings },
      { onConflict: 'store_id' }
    );

  if (upsertError) {
    console.error('Error updating store settings:', upsertError.message);
    return false;
  }

  return true;
}
