import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";
import { supabase } from "../../../../web/supabase/supabaseClient";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

export const onSuccess: ActionOnSuccess = async ({ params, record, logger, api, connections }) => {
  const shopDomain = record.myshopifyDomain;

  const { error } = await supabase
    .from("stores")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("shop_domain", shopDomain);

  if (error) {
    logger.error(`Failed to delete store: ${JSON.stringify(error, null, 2)}`);
  } else {
    logger.info(`Successfully deleted store: ${shopDomain}`);
  }
};

export const options: ActionOptions = {
  actionType: "delete",
  triggers: {
    shopify: {
      uninstall: true
    }
  }
};
