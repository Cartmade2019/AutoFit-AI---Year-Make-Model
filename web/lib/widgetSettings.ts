import { supabase } from '../supabase/supabaseClient';

export async function getWidgetSettings(shopDomain: string, widgetType: string) {
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

  const { data, error } = await supabase
    .from('widget_settings')
    .select('settings_json')
    .eq('widget_type', widgetType)
    .eq('store_id', storeId)
    .single();

  if (error) {
    if ((error as any).code !== 'PGRST116') {
      console.error('Error fetching widget settings:', error);
    }
    return null;
  }

  return (data as any)?.settings_json ?? null;
}

export async function saveWidgetSettings(shopDomain: string, widgetType: string, settingsJson: object) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID for saving:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .upsert(
      {
        store_id: storeId,
        widget_type: widgetType,
        settings_json: settingsJson,
      },
      { onConflict: 'store_id, widget_type' },
    );

  if (error) {
    console.error('Error saving widget settings:', error);
    return { success: false, error: (error as any).message };
  }

  return { success: true, error: null };
}

export async function getAllWidgetStatuses(shopDomain: string) {
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

  const { data, error } = await supabase
    .from('widget_settings')
    .select('widget_type, enabled')
    .eq('store_id', storeId);

  if (error) {
    console.error('Error fetching widget statuses:', error);
    return null;
  }

  return data; // array of { widget_type, enabled }
}

export async function setWidgetEnabledStatus(
  shopDomain: string,
  widgetType: string,
  isEnabled: boolean
) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .update({ enabled: isEnabled })
    .eq('store_id', storeId)
    .eq('widget_type', widgetType);

  if (error) {
    console.error('Error updating widget enabled status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
