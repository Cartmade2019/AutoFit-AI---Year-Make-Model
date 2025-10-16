import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";
import { supabase } from "../../../../web/supabase/supabaseClient";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

export const onSuccess: ActionOnSuccess = async ({
  params,
  record,
  logger,
  api,
  connections
}: {
  params: any;
  record: any;
  logger: any;
  api: any;
  connections: any;
}) => {
  const shopDomain = record.myshopifyDomain;
  const accessToken = connections.shopify.currentAccessToken ?? "No token found.";
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("stores")
    .select("*")
    .eq("shop_domain", shopDomain)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    logger.error(`Error checking existing store: ${JSON.stringify(fetchError, null, 2)}`);
    return;
  }

  let error: any = null;

  if (existing) {
    const result = await supabase
      .from("stores")
      .update({
        status: "active",
        archived_at: null,
        updated_at: now,
        installation_count: existing.installation_count + 1
      })
      .eq("shop_domain", shopDomain);

    error = result.error;
  } else {
    const result = await supabase.from("stores").upsert([
      {
        shop_domain: shopDomain,
        access_token: accessToken,
        plan_id: null,
        status: "active",
        installed_at: now,
        archived_at: null,
        installation_count: 1,
        created_at: now,
        updated_at: now
      }
    ]);

    error = result.error;
  }

  try {
      await api.shopifySync.run({
        domain: record.domain,
        shop: { _link: record.id },
      });
      logger.info(
        { shopId: record.id },
        "Product and collection sync initiated for new installation"
      );
    } catch (syncError) {
      logger.error({ error: syncError, shopId: record.id }, "Failed to initiate sync for new installation");
      // Do not throw
    }

  if (error) {
    logger.error(`❌ Supabase operation failed: ${JSON.stringify(error, null, 2)}`);
  } else {
    logger.info(`✅ Store synced successfully: ${shopDomain}`);
  }
};

export const options: ActionOptions = {
  actionType: "update",
};
