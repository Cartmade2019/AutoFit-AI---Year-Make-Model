// utils/supabaseUtils.ts
import { supabase } from "../supabase/supabaseClient";

export interface FitmentField {
  id: number;
  label: string;
  slug: string;
  field_type: 'int' | 'string' | 'range' | 'boolean';
  required: boolean;
  sort_order: number;
}

export interface ImportJob {
  id: number;
  store_id: number;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  error_log: string;
  started_at: string;
  finished_at: string;
  created_at: string;
}

/**
 * Get store by shop domain
 */
export async function getStoreByDomain(shopDomain: string) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('shop_domain', shopDomain)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get fitment fields for a store
 */
export async function getFitmentFields(storeId: number): Promise<FitmentField[]> {
  const { data, error } = await supabase
    .from('fitment_fields')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

/**
 * Get fitment fields by shop domain
 */
export async function getFitmentFieldsByDomain(shopDomain: string): Promise<FitmentField[]> {
  const store = await getStoreByDomain(shopDomain);
  return getFitmentFields(store.id);
}

/**
 * Create a new import job
 */
export async function createImportJob(storeId: number, totalRows: number) {
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      store_id: storeId,
      job_type: 'fitment_import',
      status: 'pending',
      total_rows: totalRows
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update import job status
 */
export async function updateImportJob(
  jobId: number, 
  updates: Partial<Pick<ImportJob, 'status' | 'processed_rows' | 'error_log' | 'started_at' | 'finished_at'>>
) {
  const { data, error } = await supabase
    .from('import_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get running import jobs for a store
 */
export async function getRunningImportJobs(storeId: number): Promise<ImportJob[]> {
  const { data, error } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'running')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Upload file to Supabase storage
 */
export async function uploadImportFile(file: File, shopDomain: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileExtension = file.name.split('.').pop();
  const fileName = `fitment_import__${shopDomain}__${timestamp}.${fileExtension}`;

  const { error } = await supabase.storage
    .from('import-files')
    .upload(fileName, file);

  if (error) throw error;
  return fileName;
}

/**
 * Create fitment set and related data
 */
export async function createFitmentSet(storeId: number, universalFit = false) {
  const { data, error } = await supabase
    .from('fitment_sets')
    .insert({
      store_id: storeId,
      universal_fit: universalFit
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create fitment set values
 */
export async function createFitmentSetValues(
  fitmentSetId: number,
  fieldId: number,
  value: string | number | boolean
) {
  const insertData: any = {
    fitment_set_id: fitmentSetId,
    field_id: fieldId
  };

  // Determine value type based on the value
  if (typeof value === 'string') {
    insertData.value_string = value;
  } else if (typeof value === 'number') {
    insertData.value_int = `[${value},${value}]`; // PostgreSQL int4range format
  } else if (typeof value === 'boolean') {
    insertData.value_bool = value;
  }

  const { data, error } = await supabase
    .from('fitment_set_values')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get or create product by SKU
 */
export async function getOrCreateProductBySku(storeId: number, sku: string) {
  // First try to find existing product
  const { data: existing } = await supabase
    .from('store_products')
    .select('*')
    .eq('store_id', storeId)
    .eq('sku', sku)
    .single();

  if (existing) return existing;

  // Create new product if not found
  const { data, error } = await supabase
    .from('store_products')
    .insert({
      store_id: storeId,
      sku: sku,
      title: `Product ${sku}`,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create product fitment relationship
 */
export async function createProductFitment(productId: number, fitmentSetId: number) {
  const { data, error } = await supabase
    .from('product_fitments')
    .insert({
      product_id: productId,
      fitment_set_id: fitmentSetId
    })
    .select()
    .single();

  // Ignore unique constraint violations (product already has this fitment)
  if (error && !error.message.includes('duplicate key')) {
    throw error;
  }
  
  return data;
}