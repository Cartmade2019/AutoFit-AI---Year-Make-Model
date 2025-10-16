import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

export const onSuccess: ActionOnSuccess = async ({ params, record, logger, api, connections }) => {
  try {
    // Early validation - check if we have required IDs
    if (!record?.id || !record?.productId) {
      logger.error({
        message: "Missing required variant or product ID for Supabase sync",
        variantId: record?.id,
        productId: record?.productId
      });
      return;
    }

    // Get shop domain directly from Shopify connection
    const storeDomain = connections.shopify.currentShop?.domain;
    if (!storeDomain) {
      logger.error({
        message: "Unable to retrieve shop domain from Shopify connection",
        variantId: record.id,
        productId: record.productId
      });
      return;
    }

    // Enqueue the sync operation to run in the background
    await api.enqueue(api.syncVariantToSupabase, {
      variantId: record.id,
      productId: record.productId,
      shopDomain: storeDomain,
      variantData: {
        id: record.id,
        title: record.title,
        sku: record.sku,
        price: record.price,
        compareAtPrice: record.compareAtPrice,
        availableForSale: record.availableForSale,
        imageUrl: null,
        updatedAt: record.updatedAt
      }
    });

    logger.info({
      message: "Successfully enqueued Supabase sync job",
      variantId: record.id,
      productId: record.productId,
      shopDomain: storeDomain
    });

  } catch (error) {
    // Log the error but don't throw - we don't want to fail the main Shopify operation
    logger.error({
      message: "Failed to enqueue Supabase sync job",
      variantId: record?.id,
      productId: record?.productId,
      error: error.message,
      stack: error.stack
    });
  }
};

export const options: ActionOptions = { actionType: "create" };