import { ActionOptions } from "gadget-server";

type TrialInfo = {
  isInTrial: boolean;
  trialExpired: boolean;
  daysLeftInTrial: number;
  trialEndDate: string | null;
  installationDate?: string; // only for free-trial path
  source: "subscription" | "free-trial" | "none";
};

type PlanDetail = {
  id: string;
  pricingDetails: unknown;
};

const SUBSCRIPTION_QUERY = `
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        trialDays
        currentPeriodEnd
        createdAt
        test
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppUsagePricing {
                balanceUsed { amount }
                cappedAmount { amount }
              }
            }
          }
        }
      }
    }
  }
`;

/** ---------- Pure utilities ---------- **/

const msPerDay = 24 * 60 * 60 * 1000;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

const ceilDays = (ms: number) => Math.ceil(ms / msPerDay);

/** Trial info derived from a Shopify subscription object */
function calcSubscriptionTrialInfo(sub: any): TrialInfo {
  const trialDays = Number(sub?.trialDays ?? 0);
  const createdAt = sub?.createdAt ? new Date(sub.createdAt) : null;

  if (!trialDays || !createdAt) {
    return {
      isInTrial: false,
      trialExpired: false,
      daysLeftInTrial: 0,
      trialEndDate: null,
      source: "subscription",
    };
  }

  const trialEndDate = new Date(createdAt.getTime() + trialDays * msPerDay);
  const daysLeft = ceilDays(trialEndDate.getTime() - Date.now());

  return {
    isInTrial: daysLeft > 0,
    trialExpired: daysLeft <= 0 && trialDays > 0,
    daysLeftInTrial: Math.max(0, daysLeft),
    trialEndDate: iso(trialEndDate),
    source: "subscription",
  };
}

/** Trial info derived from installation date for 7-day free trial */
function calcFreeTrialInfo(installationDate: Date): TrialInfo {
  const trialDays = 7;
  const createdAt = new Date(installationDate);
  const trialEndDate = new Date(createdAt.getTime() + trialDays * msPerDay);
  const daysLeft = ceilDays(trialEndDate.getTime() - Date.now());

  return {
    isInTrial: daysLeft > 0,
    trialExpired: daysLeft <= 0,
    daysLeftInTrial: Math.max(0, daysLeft),
    trialEndDate: iso(trialEndDate),
    installationDate: iso(createdAt) ?? undefined,
    source: "free-trial",
  };
}

/** ---------- Data access helpers ---------- **/

async function fetchActiveSubscriptions(connections: any) {
  const res = await connections.shopify.current.graphql(SUBSCRIPTION_QUERY);
  return res?.currentAppInstallation?.activeSubscriptions ?? [];
}

async function fetchShopById(api: any, shopId: string, logger: any) {
  const shop = await api.shopifyShop.findOne(shopId, {
    select: { id: true, createdAt: true, shopifyCreatedAt: true },
  });

  if (!shop) {
    logger.error(`Shop not found with ID: ${shopId}`);
    throw new Error("Shop not found");
  }
  return shop;
}

/** ---------- Response builders ---------- **/

function buildSubscriptionResponse(subscription: any) {
  const trialInfo = calcSubscriptionTrialInfo(subscription);

  const planDetails: PlanDetail[] =
    subscription?.lineItems?.map((item: any) => ({
      id: item.id,
      pricingDetails: item.plan?.pricingDetails,
    })) ?? [];

  return {
    subscription: {
      id: subscription.id,
      name: subscription.name,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialDays: subscription.trialDays,
      test: subscription.test,
      createdAt: subscription.createdAt,
      lineItems: subscription.lineItems,
    },
    trialInfo,
    planDetails,
    currentPlan: subscription?.name ?? null,
    status: {
      hasActiveSubscription: true,
      subscriptionActive: subscription.status === "ACTIVE",
      periodEnd: subscription.currentPeriodEnd,
      isTest: subscription.test,
    },
  };
}

function buildFreeTrialResponse(shop: any) {
  // Prefer the app install timestamp your system controls (`createdAt`), fallback to shopify's if needed
  const installDate: Date = shop.createdAt ?? shop.shopifyCreatedAt;
  const freeTrialInfo = calcFreeTrialInfo(installDate);

  return {
    subscription: null,
    trialInfo: freeTrialInfo,
    planDetails: null,
    currentPlan: freeTrialInfo.isInTrial ? "free-trial" : null,
    shopInstallationDate: iso(installDate),
    status: {
      hasActiveSubscription: false,
      message: freeTrialInfo.isInTrial
        ? "In 14-day free trial period"
        : "Trial period expired, subscription required",
    },
  };
}

/** ---------- Action ---------- **/

export const run: ActionRun = async ({ logger, api, connections }: {
  logger: any, api: any, connections: any
}) => {
  try {
    const shopId: string | undefined = connections?.shopify?.currentShop?.id;

    if (!shopId) {
      logger.error("currentShopId not available from Shopify connection");
      throw new Error("Unable to determine current shop");
    }

    // 1) Try active subscriptions first
    const activeSubscriptions = await fetchActiveSubscriptions(connections);

    if (activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0]; // Shopify typically has at most one
      logger.info(`Found active subscription: ${subscription.id} for shop ${shopId}`);
      return buildSubscriptionResponse(subscription);
    }

    // 2) No subs → check 7-day free trial based on install date
    logger.info(`No active subscriptions for shop ${shopId}, checking 7-day trial eligibility`);
    const shop = await fetchShopById(api, shopId, logger);

    const response = buildFreeTrialResponse(shop);

    logger.info(`Shop install date: ${shop.createdAt}, trial:`, {
      isInTrial: response.trialInfo.isInTrial,
      trialExpired: response.trialInfo.trialExpired,
      daysLeftInTrial: response.trialInfo.daysLeftInTrial,
    });

    return response;
  } catch (error: any) {
    logger.error(`Error retrieving subscription/trial for shop:`, error);
    throw new Error(`Failed to retrieve subscription/trial: ${error?.message ?? String(error)}`);
  }
};

export const params = {
  // no external params needed now
};

export const options: ActionOptions = {
  triggers: { api: true },
};
