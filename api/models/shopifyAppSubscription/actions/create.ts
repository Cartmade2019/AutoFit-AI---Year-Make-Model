import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";
import { supabase } from "../../../../web/supabase/supabaseClient";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

export const onSuccess: ActionOnSuccess = async ({ params, record, logger, api, connections }: {params: any , record: any , logger: any , api: any , connections: any}) => {

    if(!record) return 

    const shopDomain = connections?.shopify?.currentShopDomain;
  
    const name = record?.name.split('-')[0].trim()
    const storeId = record.shop

    const {data: planData , error: planError} = await supabase.from('plans').select('id').eq('name', name).single()
    const planId = planData?.id

    await supabase.from('stores').update({plan_id : planId}).eq('shop_domain' , shopDomain)
  
};

export const options: ActionOptions = { actionType: "create" };
