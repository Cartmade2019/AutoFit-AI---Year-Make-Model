import { ActionOptions } from "gadget-server";
import { supabase } from "../../web/supabase/supabaseClient";

/**
 * Background action for syncing product variants to Supabase.
 * 
 * This action should be run in the background using `api.enqueue()`
 * to handle the external API call without blocking the main Shopify operation.
 */
export const run: ActionRun = async ({ params, logger, api, connections }) => {
  try {
    // Validate required parameters
    if (!params.variantId || !params.productId || !params.shopDomain || !params.variantData) {
      throw new Error("variantId, productId, shopDomain, and variantData are required parameters");
    }

    // Use the variant data passed from the main file (no API call needed)
    const variant = params.variantData;

    // Fetch parent product with optimized field selection
    const product:any = await api.shopifyProduct.findOne(params.productId, {
      select: {
        id: true,
        title: true,
        handle: true,
        body: true,
        productType: true,
        vendor: true,
        tags: true,
        status: true
      }
    });

    if (!product) {
      throw new Error(`Product with ID ${params.productId} not found`);
    }

    // Validate required product fields
    if (!product.handle || !product.title) {
      throw new Error(`Product missing required fields - handle: ${product.handle}, title: ${product.title}`);
    }

    // Prepare variant data with proper null handling and type conversion
    const supabaseVariantData:any = {
      shop_domain: params?.shopDomain,
      shopify_product_id: params.productId,
      shopify_variant_id: params.variantId,
      handle: product.handle,
      title: product.title,
      variant_title: variant.title === 'Default Title' ? product.title : (variant.title || product.title),
      sku: variant.sku || null,
      description: product.body || null,
      seo_title: product.title,
      seo_description: product.body || null,
      product_type: product.productType || null,
      vendor: product.vendor || null,
      available: variant.availableForSale ? 'true' : 'false',
      tags: Array.isArray(product.tags) ? product.tags : (product.tags ? [product.tags] : []),
      collections: [], // Collections synced separately for efficiency
      price: variant.price ? parseFloat(variant.price.toString()) : null,
      compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.toString()) : null,
      status: product.status || 'draft',
      image_url: variant.imageUrl || null,
      updated_at: new Date().toISOString()
    };

    // Call the RPC function with proper error handling
    const { data, error } = await supabase
      .rpc('rpc_upsert_store_variant', { p: supabaseVariantData });

    if (error) {
      logger.error({
        message: "Supabase RPC function failed",
        variantId: params.variantId,
        productId: params.productId,
        shopDomain: params.shopDomain,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Supabase sync failed: ${error.message}`);
    }

    // Log success with result
    logger.info({
      message: "Successfully synced variant to Supabase",
      variantId: params.variantId,
      productId: params.productId,
      shopDomain: params.shopDomain,
      result: data
    });

    return {
      success: true,
      variantId: params.variantId,
      productId: params.productId,
      shopDomain: params.shopDomain,
      syncedAt: new Date().toISOString(),
      result: data
    };

  } catch (error) {
    logger.error({
      message: "Critical error during Supabase variant sync",
      variantId: params.variantId,
      productId: params.productId,
      shopDomain: params.shopDomain,
      error: error.message,
      stack: error.stack
    });
    
    // Re-throw to ensure the background job is marked as failed for retry
    throw error;
  }
};

// Define the parameters this action expects
export const params = {
  variantId: {
    type: "string"
  },
  productId: {
    type: "string"
  },
  shopDomain: {
    type: "string"
  },
  variantData: {
    type: "object",
     additionalProperties: true,
  }
};