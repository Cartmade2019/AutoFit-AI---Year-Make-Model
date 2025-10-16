import type { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, logger, api, connections }) => {
  // Validate
  if (!Array.isArray(params.productIds) || params.productIds.length === 0) {
    throw new Error("productIds must be a non-empty array");
  }
  if (!Array.isArray(params.tags) || params.tags.length === 0) {
    throw new Error("tags must be a non-empty array");
  }

  const rawShopId = connections.shopify.currentShopId;
  if (!rawShopId) throw new Error("No Shopify shop found in current context");
  const shopId = rawShopId.toString();

  // Normalize tags: trim, drop empties, dedupe
  const tags = Array.from(
    new Set(params.tags.map((t) => String(t).trim()).filter((t) => t.length > 0))
  );
  if (tags.length === 0) throw new Error("All provided tags were empty after normalization");

  const productIds: string[] = params.productIds;
  const totalProducts = productIds.length;

  logger.info(`Removing tags from ${totalProducts} products: ${tags.join(", ")}`);

  const BATCH_SIZE = 10;

  // Admin GraphQL: remove tags without overwriting
  const mutation = `
    mutation tagsRemove($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `;

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
    logger.info(`Batch ${batchNumber}/${totalBatches} size ${batch.length}`);

    const results = await Promise.allSettled(
      batch.map((pid) =>
        api.enqueue(api.writeToShopify, {
          shopId,
          mutation,
          variables: {
            id: `gid://shopify/Product/${pid}`,
            tags,
          },
        })
      )
    );

    for (let idx = 0; idx < results.length; idx++) {
      const pid = batch[idx];
      const r = results[idx];

      if (r.status === "fulfilled") {
        const payload: any = r.value;
        const userErrors = payload?.data?.tagsRemove?.userErrors ?? [];
        if (userErrors.length > 0) {
          errorCount++;
          const msg =
            `UserErrors for product ${pid}: ` +
            userErrors
              .map((e: any) => `${Array.isArray(e.field) ? e.field.join(".") : "field"}: ${e.message}`)
              .join(" | ");
          errors.push(msg);
          logger.error(msg);
        } else {
          successCount++;
          logger.info(`Queued tagsRemove for product ${pid}`);
        }
      } else {
        errorCount++;
        const msg = `Failed to queue product ${pid}: ${r.reason?.message ?? String(r.reason)}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    logger.info(`Completed batch ${batchNumber}/${totalBatches}. Success: ${successCount}, Errors: ${errorCount}`);

    if (i + BATCH_SIZE < productIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 150)); // gentle backoff
    }
  }

  const summary = {
    totalProducts,
    successCount,
    errorCount,
    errors: errors.slice(0, 10),
    tags,
    shopId,
  };

  logger.info(`Tags remove complete. Total: ${totalProducts}, Success: ${successCount}, Errors: ${errorCount}`);
  return summary;
};

export const params = {
  productIds: { type: "array", items: { type: "string" } },
  tags: { type: "array", items: { type: "string" } },
};

export const options: ActionOptions = {
  timeoutMS: 600000,
  returnType: true,
};
