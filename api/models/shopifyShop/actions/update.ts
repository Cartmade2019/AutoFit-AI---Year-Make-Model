import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

export const onSuccess: ActionOnSuccess = async ({ params, record, logger, api, connections }) => {
       // logger.info({ shopId: record.id }, "Product and collection sync initiated for new installation update");
 
      //   await api.shopifySync.run({
      //   domain: record.domain,
      //   shop: {
      //     _link: record.id,
      //   },
      // });
};

export const options: ActionOptions = {
  actionType: "update",
  triggers: { api: true },
};
