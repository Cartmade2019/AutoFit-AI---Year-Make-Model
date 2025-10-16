type PlanKey = "starter" | "growth" | "pro" | "elite";
type IntervalKey = "monthly" | "annual";
type ActionKey = "create";

interface PricingInfo {
  amount: number;           
  name: string;
  trialDays: number;        
}

interface SelectedPlan {
  monthly: PricingInfo;
  annual: PricingInfo;
}

export const run: ActionRun = async ({ params, logger, api, connections }) => {
  const { planType, billingInterval, action } = params as {
    planType?: string;
    billingInterval?: string;
    action?: string;
  };

  // Try reading shop from DB as a fallback if not passed via params
  // const shopRow = await api.shopifyShop.findFirst().catch(() => null);
  // const rawShop = (shopRow?.name || "").trim();
  const shopId:any = connections?.shopify?.currentShopId;
   const shop = await api.shopifyShop.findOne(shopId, {
    select: { myshopifyDomain: true},
  });
  const rawShop = (shop?.myshopifyDomain || "").trim();

  // ---- Validation ----
  const validActions: ActionKey[] = ["create"];
  const validPlans: PlanKey[] = ["starter", "growth", "pro", "elite"];
  const validIntervals: IntervalKey[] = ["monthly", "annual"];

  if (!rawShop) {
    throw new Error("Missing required parameter: shop");
  }
  if (!planType || !validPlans.includes(planType as PlanKey)) {
    throw new Error(
      `Invalid or missing planType. Allowed: ${validPlans.join(", ")}`
    );
  }
  if (!billingInterval || !validIntervals.includes(billingInterval as IntervalKey)) {
    throw new Error(
      `Invalid or missing billingInterval. Allowed: ${validIntervals.join(", ")}`
    );
  }
  if (!action || !validActions.includes(action as ActionKey)) {
    throw new Error(`Invalid or missing action. Allowed: ${validActions.join(", ")}`);
  }

  // Normalize shop to example: mystore.myshopify.com
  const shopDomain = normalizeShopDomain(rawShop);
  if (!shopDomain) {
    throw new Error(
      "Invalid shop format. Expected a myshopify.com domain (e.g., mystore.myshopify.com)."
    );
  }

  // ---- Pricing table (numbers, not strings) ----
  const pricingPlans: Record<PlanKey, SelectedPlan> = {
    starter: {
      monthly: { amount: 50.0, name: "Starter - Monthly", trialDays: 14 },
      annual: { amount: 480.0, name: "Starter - Annual", trialDays: 14 },
    },
    growth: {
      monthly: { amount: 80.0, name: "Growth - Monthly", trialDays: 14 },
      annual: { amount: 768.0, name: "Growth - Annual", trialDays: 14 },
    },
    pro: {
      monthly: { amount: 150.0, name: "Pro - Monthly", trialDays: 14 },
      annual: { amount: 1440.0, name: "Pro - Annual", trialDays: 14 },
    },
    elite: {
      monthly: { amount: 250.0, name: "Elite - Monthly", trialDays: 14 },
      annual: { amount: 2400.0, name: "Elite - Annual", trialDays: 14 },
    },
  };

  const selectedPlan = pricingPlans[planType as PlanKey];
  const pricing = selectedPlan[billingInterval as IntervalKey];

  try {
    let result;
    switch (action as ActionKey) {
      case "create":
        result = await createSubscription({
          connections,
          shopDomain,
          pricing,
          billingInterval: billingInterval as IntervalKey,
        });
        break;
    }

    logger.info({ result }, "Subscription operation completed successfully");
    return result;
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    logger.error(
      { error: message, shop: shopDomain, planType, billingInterval, action },
      "Failed to manage subscription"
    );
    throw new Error(`Failed to ${action} subscription: ${message}`);
  }
};

function normalizeShopDomain(input: string): string | null {
  try {
    const candidate = input.includes("://") ? input : `https://${input}`;
    const url = new URL(candidate);

    if (url.hostname.endsWith(".myshopify.com")) {
      return url.hostname;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const storeIdx = parts.findIndex((p) => p === "store");
    if (url.hostname === "admin.shopify.com" && storeIdx !== -1 && parts[storeIdx + 1]) {
      return `${parts[storeIdx + 1]}.myshopify.com`;
    }
  } catch {
    // fallthrough
  }

  if (/^[a-z0-9-]+\.myshopify\.com$/i.test(input)) return input;
  if (/^[a-z0-9-]+$/i.test(input)) return `${input}.myshopify.com`;

  return null;
}

async function createSubscription({
  connections,
  shopDomain,
  pricing,
  billingInterval,
}: {
  connections: any;
  shopDomain: string;
  pricing: PricingInfo;
  billingInterval: IntervalKey;
}) {
  const mutation = `
    mutation appSubscriptionCreate(
      $name: String!,
      $lineItems: [AppSubscriptionLineItemInput!]!,
      $test: Boolean,
      $trialDays: Int,
      $returnUrl: URL!
    ) {
      appSubscriptionCreate(
        name: $name,
        lineItems: $lineItems,
        test: $test,
        trialDays: $trialDays,
        returnUrl: $returnUrl
      ) {
        appSubscription {
          id
          name
          status
          currentPeriodEnd
          trialDays
          test
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

  const shopName = shopDomain.replace(".myshopify.com", "");
  const returnUrl =
  process.env.NODE_ENV === "production"
    ? `https://admin.shopify.com/store/${shopName}/apps/autofit-ai-year-make-model`
    : `https://admin.shopify.com/store/${shopName}/apps/cm-ymm`;

  // Build line items based on interval
  const isMonthly = billingInterval === "monthly";

  const recurringLineItem = {
    plan: {
      appRecurringPricingDetails: {
        price: {
          amount: pricing.amount,
          currencyCode: "USD",
        },
        interval: isMonthly ? "EVERY_30_DAYS" : "ANNUAL",
      },
    },
  };

  // Monthly: include usage + recurring; Annual: only recurring
  // const lineItems = isMonthly
  //   ? [
  //       {
  //         plan: {
  //           appUsagePricingDetails: {
  //             terms: "$1 for 1000 token",
  //             cappedAmount: {
  //               amount: 20,
  //               currencyCode: "USD",
  //             },
  //           },
  //         },
  //       },
  //       recurringLineItem,
  //     ]
  //   : [recurringLineItem];

    const lineItems = [recurringLineItem];

  // Monthly keeps trialDays; Annual explicitly omits it by passing undefined
  const trialDays = isMonthly ? pricing.trialDays : undefined;

  const variables = {
    name: pricing.name,
    lineItems,
    test: process.env.NODE_ENV !== "production",
    trialDays,
    returnUrl,
  };

  // Execute GraphQL
  const raw = await connections.shopify.current.graphql(mutation, variables);

  // Defensive: GraphQL client shapes can vary; dig safely
  const payload =
    raw?.data?.appSubscriptionCreate ??
    raw?.appSubscriptionCreate ??
    raw;

  const userErrors = payload?.userErrors ?? [];
  if (Array.isArray(userErrors) && userErrors.length) {
    const msg =
      userErrors.map((e: any) => `${e?.field?.join(".") || "field"}: ${e?.message}`).join("; ") ||
      "Unknown Shopify API error";
    throw new Error(`Shopify API error: ${msg}`);
  }

  const subscription = payload?.appSubscription;
  const confirmationUrl = payload?.confirmationUrl;

  if (!subscription || !confirmationUrl) {
    throw new Error(
      "Unexpected Shopify response: missing subscription or confirmationUrl"
    );
  }

  return {
    subscription,
    confirmationUrl,
    status: "created",
  };
}

export const params = {
  planType: {
    type: "string",
    enum: ["starter", "growth", "pro", "elite"], 
  },
  billingInterval: {
    type: "string",
    enum: ["monthly", "annual"],
  },
  action: {
    type: "string",
    enum: ["create"],
  },
};
