import { supabase } from "../../web/supabase/supabaseClient";
import { ActionOptions } from "gadget-server";

type ActionRun = any;

// Types for Supabase operations
interface UpsertFitmentPayload {
  p_store_id: number;
  p_fitment_set_id: string | null;
  p_universal_fit: boolean;
  p_values: Array<{ field_slug: string; value: string }>;
  p_tags: string[];
  p_skus: string[];
}

interface UpsertFitmentResponse {
  out_fitment_set_id?: number;
  out_value_ids?: number[];
  out_tag_ids?: number[];
  out_product_ids?: number[];
  out_shopify_product_ids?: string[];
  out_product_fitment_ids?: number[];
  out_product_tag_rows?: number;
  out_missing_skus?: string[];
}

interface ProcessedRowResult {
  product_ids: number[];
  shopify_product_ids: string[];
  tags: string[];
  success: boolean;
  error?: string;
  missing_skus?: string[];
}

// Enhanced slugify: Converts to handle-style string with comprehensive sanitization
function slugify(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.toLowerCase().trim().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    // .toLowerCase()
    // .trim()
    // .replace(/[,\s_]+/g, "-")
    // .replace(/[^\w\s-]/g, "")
    // .replace(/-+/g, "-")
    // .replace(/^-+|-+$/g, "");
}

// Build slugified tags: returns array of handle-style strings
function buildSlugifiedTags(values: Array<{ field_slug: string; value: string }>): string[] {
  const validValues = values
    .filter((v) => v && v.value && typeof v.value === "string" && v.value.trim() !== "")
    .map((v) => v.value.trim());
  if (validValues.length === 0) return [];
  const joined = validValues.join(" ");
  return [slugify(joined)];
}

// Validate product IDs array
function validateProductIds(productIds: unknown): string[] {
  if (!Array.isArray(productIds)) return [];
  return productIds
    .filter((id) => id !== null && id !== undefined)
    .map((id) => String(id))
    .filter((id) => id.trim() !== "");
}

// Update job status using the new RPC function with proper error handling
async function updateJobStatus(
  jobId: number,
  status: 'pending' | 'running' | 'completed' | 'failed',
  options: {
    processedRows?: number;
    errorLog?: string | null;
    startedAt?: Date;
    finishedAt?: Date;
  } = {}
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('update_import_job_status', {
      p_job_id: jobId,
      p_status: status,
      p_processed_rows: options.processedRows ?? null,
      p_error_log: options.errorLog ?? null,
      p_started_at: options.startedAt ?? null,
      p_finished_at: options.finishedAt ?? null,
    });
    
    if (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    // Log but don't throw - we don't want status update failures to break the import
    console.error(`Error updating job ${jobId} status to ${status}:`, error);
    throw error;
  }
}

// Safely finalize job with fallback logic for status constraints
async function safeFinalizeJob(
  jobId: number,
  payload: {
    status: "completed" | "failed";
    processedRows: number;
    errorLog?: string | null;
    message?: string;
  }
): Promise<void> {
  const finishedAt = new Date();
  
  try {
    // Try to update with the preferred status
    await updateJobStatus(jobId, payload.status, {
      processedRows: payload.processedRows,
      errorLog: payload.errorLog ?? null,
      finishedAt,
    });
  } catch (error) {
    // If we were trying to set "failed" but it failed due to constraints,
    // fall back to "completed" with error information in the log
    if (payload.status === "failed") {
      try {
        const fallbackErrorLog = payload.errorLog
          ? `[failed status requested but not allowed]\n${payload.errorLog}`
          : "[failed status requested but not allowed by constraints]";
          
        await updateJobStatus(jobId, "completed", {
          processedRows: payload.processedRows,
          errorLog: fallbackErrorLog,
          finishedAt,
        });
      } catch (fallbackError) {
        console.error(`Failed to update job ${jobId} even with fallback status:`, fallbackError);
        // Don't throw - we've done our best to update the status
      }
    } else {
      console.error(`Failed to finalize job ${jobId}:`, error);
      // Don't throw - we've done our best to update the status
    }
  }
}

// Update progress only
async function updateProgress(jobId: number, processedRows: number): Promise<void> {
  try {
    // Use the RPC to update just the processed_rows count
    await updateJobStatus(jobId, 'running', {
      processedRows,
    });
  } catch (error) {
    // Log but don't throw - progress updates shouldn't break the import
    console.error(`Failed to update progress for job ${jobId}:`, error);
  }
}

export const run: ActionRun = async ({ params, logger, connections, api }) => {
  const { jobId, databaseStoreId, headers, rows, fileName } = params;

  // Accumulators that survive any mid-process errors
  let totalProcessedRows = 0;
  let totalUpdatedProducts = 0;
  const allProductIds: number[] = [];
  const allErrors: string[] = [];

  // Track if we reached "running" update
  let started = false;

  try {
    const storeId = connections?.shopify?.currentShopId;
    if (!storeId) throw new Error("No shop ID found in current session");

    logger.info(`Starting fitment import for job ${jobId}, file: ${fileName}`);

    // Set job to running using the new RPC function
    try {
      await updateJobStatus(jobId, 'running', {
        startedAt: new Date(),
      });
      started = true;
      logger.info(`Job ${jobId} status updated to running`);
    } catch (error) {
      logger.error(`Failed to update job ${jobId} to running status:`, error);
      throw new Error(`Could not start job: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Basic validation
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error("Invalid or missing headers");
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("Invalid or missing row data");
    }

    // Build header map
    const headerMap = headers.map((header) => ({
      original: header || "",
      slug: slugify(header || ""),
    }));
    logger.info("Header mapping:", headerMap);

    // Batch processing
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) batches.push(rows.slice(i, i + BATCH_SIZE));

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`);

      // Process each row of the batch
      const batchPromises = batch.map(async (row): Promise<ProcessedRowResult> => {
        try {
          if (!Array.isArray(row) || row.length < headers.length) {
            throw new Error("Invalid row structure");
          }

          // Build values excluding last column
          const values: Array<{ field_slug: string; value: string }> = [];
          for (let colIndex = 0; colIndex < headers.length - 1; colIndex++) {
            const header = headerMap[colIndex];
            const value = (row[colIndex] || "").toString().trim();
            if (value && header.slug) values.push({ field_slug: header.slug, value });
          }

          // Parse SKUs from last column
          const skusColumn = (row[headers.length - 1] || "").toString();
          const skus = skusColumn
            .split(",")
            .map((sku) => sku.trim())
            .filter((sku) => sku.length > 0);

          if (skus.length === 0) {
            const msg = "No SKUs found";
            logger.warn(msg, row);
            return { product_ids: [], shopify_product_ids: [], tags: [], success: false, error: msg };
          }

          // Build tags
          const tags = buildSlugifiedTags(values);
          if (tags.length === 0) {
            const msg = "No valid tags generated";
            logger.warn(msg, row);
            return { product_ids: [], shopify_product_ids: [], tags: [], success: false, error: msg };
          }

          const payload: UpsertFitmentPayload = {
            p_store_id: databaseStoreId!,
            p_fitment_set_id: null,
            p_universal_fit: false,
            p_values: values,
            p_tags: tags,
            p_skus: skus,
          };

          // RPC call
          const { data, error } = await supabase.rpc("upsert_fitment_bundle_by_skus", payload);
          if (error) {
            logger.error("Supabase RPC error:", error);
            return {
              product_ids: [],
              shopify_product_ids: [],
              tags: [],
              success: false,
              error: error.message || "RPC error",
            };
          }

          const result = (Array.isArray(data) ? data[0] : data) as UpsertFitmentResponse | undefined;
          const productIds = Array.isArray(result?.out_product_ids) ? result!.out_product_ids : [];
          const shopifyProductIds = validateProductIds(result?.out_shopify_product_ids);

          if (productIds.length === 0) {
            const msg = "No product IDs returned from fitment upsert";
            logger.warn(msg, result);
            return { product_ids: [], shopify_product_ids: [], tags, success: false, error: msg };
          }

          if (result?.out_missing_skus?.length) {
            logger.warn("Missing SKUs found:", result.out_missing_skus);
          }

          return {
            product_ids: productIds,
            shopify_product_ids: shopifyProductIds,
            tags,
            success: true,
            missing_skus: result?.out_missing_skus,
          };
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logger.error("Error processing row:", errorMessage, row);
          return { product_ids: [], shopify_product_ids: [], tags: [], success: false, error: errorMessage };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Bulk tag updates for successful results that have Shopify product IDs
      const successfulResults = batchResults.filter((r) => r.success && r.shopify_product_ids.length > 0);

      for (const result of successfulResults) {
        try {
          if (result.shopify_product_ids.length > 0 && result.tags.length > 0) {
            // Expecting { updatedCount: number, errors?: string[] } or similar
            const tagUpdateResult = await api.bulkUpdateProductTags({
              productIds: result.shopify_product_ids,
              tags: result.tags,
              shopId: String(connections.shopify.currentShopId),
            });

            const updatedCount: number =
              typeof tagUpdateResult?.updatedCount === "number"
                ? tagUpdateResult.updatedCount
                : Array.isArray(result.shopify_product_ids)
                ? result.shopify_product_ids.length
                : 0;

            // If the API returns per-item errors, record them
            const tagErrors: string[] = Array.isArray(tagUpdateResult?.errors) ? tagUpdateResult.errors : [];
            if (tagErrors.length) {
              allErrors.push(...tagErrors);
              logger.error(`Tag update reported ${tagErrors.length} errors`);
            }

            if (updatedCount > 0) {
              totalUpdatedProducts += updatedCount;
              logger.info(
                `Updated tags for ${updatedCount} products with tags: ${result.tags.join(", ")}`
              );
            } else {
              const msg = `Failed to update product tags for products: ${result.shopify_product_ids.join(", ")}`;
              allErrors.push(msg);
              logger.error(msg);
            }
          }
        } catch (tagError) {
          const msg = `Error updating tags for products ${result.shopify_product_ids.join(
            ", "
          )}: ${tagError instanceof Error ? tagError.message : String(tagError)}`;
          logger.error(msg);
          allErrors.push(msg);
        }
      }

      // Collect IDs and errors
      const batchProductIds = batchResults.filter((r) => r.success).flatMap((r) => r.product_ids);
      const batchErrors = batchResults.filter((r) => !r.success && r.error).map((r) => r.error!);

      allProductIds.push(...batchProductIds);
      allErrors.push(...batchErrors);
      totalProcessedRows += batch.length;

      const successCount = batchResults.filter((r) => r.success).length;
      logger.info(
        `Batch ${batchIndex + 1} complete: ${successCount}/${batch.length} fitments succeeded, ${
          successfulResults.length
        } had products for tag updates`
      );

      // Persist progress after each batch
      await updateProgress(jobId, totalProcessedRows);
    }

    // Finalize successfully
    const hasErrors = allErrors.length > 0;
    const finalStatus: "completed" | "failed" = hasErrors ? "failed" : "completed";
    const message = `Processed ${totalProcessedRows} rows, updated fitments for ${allProductIds.length} products, and applied tags to ${totalUpdatedProducts} products.${
      hasErrors ? ` ${allErrors.length} errors encountered.` : ""
    }`;

    logger.info(`Import completed. ${message}`);

    // Always finalize the job using the new RPC function
    await safeFinalizeJob(jobId, {
      status: finalStatus,
      processedRows: totalProcessedRows,
      errorLog: hasErrors ? allErrors.slice(0, 50).join("; ") : null, // keep log bounded
      message,
    });

    return {
      success: allProductIds.length > 0 || !hasErrors,
      processedRows: totalProcessedRows,
      updatedFitments: allProductIds.length,
      updatedProductTags: totalUpdatedProducts,
      errors: hasErrors ? allErrors : undefined,
      message,
    };
  } catch (fatal) {
    const errorMessage = fatal instanceof Error ? fatal.message : String(fatal);
    logger.error("Import encountered a fatal error:", errorMessage);

    // Use the safe finalize function for fatal errors
    await safeFinalizeJob(params.jobId, {
      status: "failed",
      processedRows: totalProcessedRows,
      errorLog: errorMessage,
      message: "Fatal error during import",
    });

    // Return a structured response rather than throwing, so the job record is the source of truth.
    return {
      success: false,
      processedRows: totalProcessedRows,
      updatedFitments: allProductIds.length,
      updatedProductTags: totalUpdatedProducts,
      errors: [errorMessage],
      message: `Completed with errors: ${errorMessage}`,
    };
  }
};

export const params = {
  jobId: { type: "number" },
  databaseStoreId: { type: "number" },
  headers: {
    type: "array",
    items: { type: "string" },
  },
  rows: {
    type: "array",
    items: {
      type: "array",
      items: { type: "string" },
    },
  },
  fileName: { type: "string" },
};

export const options: ActionOptions = {
  timeoutMS: 600000, // 10 minutes
  transactional: false,
};