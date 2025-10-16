import React, { useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  Grid,
  Divider,
  InlineStack,
  Banner,
  Box,
  List,
  ButtonGroup,
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { useRouteLoaderData, useNavigate } from "@remix-run/react";
import type { loader as rootLoader } from "~/root";
import { api } from "../api";
import { supabase } from "../supabase/supabaseClient";

// ---------- Helpers ----------
function formatCurrency(n: unknown) {
  if (typeof n !== "number") return n as any;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const PLAN_ORDER = ["Starter", "Growth", "Pro", "Elite", "Enterprise"] as const;

function parsePlanFromSubscriptionName(name?: string | null) {
  if (!name || typeof name !== "string") return { planName: null as string | null, billing: null as "annual" | "monthly" | null };
  let planName: string | null = null;
  let cycle: "annual" | "monthly" | null = null;

  const parts = name.split(" - ").map((s) => s?.trim());
  if (parts.length >= 1) {
    planName = PLAN_ORDER.includes(parts[0] as any) ? parts[0] : null;
  }
  if (!planName) {
    const lower = name.toLowerCase();
    planName = PLAN_ORDER.find((p) => lower.includes(p.toLowerCase())) ?? null;
  }
  if (parts.length >= 2) {
    const c = parts[1]?.toLowerCase();
    if (c === "annual" || c === "annually" || c === "yearly") cycle = "annual";
    if (c === "monthly" || c === "month") cycle = "monthly";
  }

  return { planName, billing: cycle };
}

function planIndex(name?: string | null) {
  const idx = PLAN_ORDER.indexOf((name ?? "") as any);
  return idx === -1 ? null : idx;
}

function getButtonStateForPlan({
  planName,
  activePlanName,
  hasActiveSubscription,
  fetching,
}: {
  planName: string;
  activePlanName: string | null;
  hasActiveSubscription: boolean;
  fetching: boolean;
}) {
  if (fetching) return { hidden: false, text: "Loading…", variant: "secondary" as const, disabled: true };

  if (!hasActiveSubscription || !activePlanName) {
    return { hidden: false, text: "Subscribe", variant: "primary" as const, disabled: false };
  }

  if (planName === activePlanName) {
    return { hidden: true, text: null, variant: "primary" as const, disabled: false };
  }

  const thisIdx = planIndex(planName);
  const activeIdx = planIndex(activePlanName);

  if (thisIdx == null || activeIdx == null) {
    return { hidden: false, text: "Subscribe", variant: "primary" as const, disabled: false };
  }

  if (thisIdx > activeIdx) {
    return { hidden: false, text: "Upgrade", variant: "primary" as const, disabled: false };
  }
  if (thisIdx < activeIdx) {
    return { hidden: false, text: "Downgrade", variant: "secondary" as const, disabled: false };
  }

  return { hidden: false, text: "Subscribe", variant: "primary" as const, disabled: false };
}

// ---------- Data ----------
const mainPlans = [
  {
    name: "Starter",
    price: 50,
    annualPrice: 480,
    description: "Best for small stores or new automotive businesses.",
    trialDays: 0,
    tokens: "150K",
    productSyncs: 500,
    fitmentFields: 3,
    vinLookups: 0,
    smartUpsell: false,
    featuresMonthly: [
      "Upto 2000 Product SKUs",
      "AI Chatbot – 1M tokens/month",
      "Fitment Widget–Search by Make/Model/Year",
      "Fitment Verification Widget",
      "Standard Support",
    ],
    featuresAnnual: [
      "Fitment Widget – Search by Make/Model/Year",
      "3 Fitment Fields",
      "500 Product Syncs",
      "7-Day Conversion Report",
      "24/7 Standard Support",
    ],
    cta: { text: "Subscribe" },
  },
  {
    name: "Growth",
    price: 80,
    annualPrice: 768,
    description: "For growing retailers looking to enhance product discovery.",
    tokens: "600K",
    productSyncs: 2000,
    fitmentFields: 5,
    vinLookups: 0,
    smartUpsell: false,
    featuresMonthly: [
       "Upto 5000 Product SKUs",
      "AI Chatbot - 2M tokens/month",
      "Fitment Widget–Search by Make/Model/Year",
      "Fitment Verification Widget",
      "Fitment Table",
      "Standard Support",
    ],
    featuresAnnual: [
      "Everything in Starter Plan",
      "Fitment Table Display",
      "“My Garage” – Save vehicles",
      "5 Fitment Fields",
      "2,000 Product Syncs",
      "24/7 Priority Support",
    ],
    isPopular: true,
    cta: { text: "Subscribe" },
  },
  {
    name: "Pro",
    price: 150,
    annualPrice: 1440,
    description: "For established eCommerce stores ready to scale.",
    tokens: "1.5M",
    productSyncs: "Unlimited",
    fitmentFields: "Unlimited",
    vinLookups: 500,
    smartUpsell: true,
    featuresMonthly: [
      "Upto 10,000 Product SKUs",
      "AI Chatbot - 3M tokens/month",
      "Fitment Widget–Search by Make/Model/Year",
      "Fitment Verification Widget",
      "Fitment Table",
      "Priority Support",
    ],
    featuresAnnual: [
      "Everything in Growth Plan",
      "AI-Powered Product Recommendations",
      "Smart Upsell & Cross-Sell Engine",
      "Advanced VIN Fitment (500 lookups/mo)",
      "Unlimited Product Syncs & Fields",
      "24/7 Priority Support",
    ],
    cta: { text: "Subscribe" },
  },
  {
    name: "Elite",
    price: 250,
    annualPrice: 2400,
    description: "For high-volume stores & enterprise operations.",
    tokens: "Unlimited",
    productSyncs: "Unlimited",
    fitmentFields: "Unlimited",
    vinLookups: 1000,
    smartUpsell: true,
    featuresMonthly: [
      "Upto 20,000 Product SKUs",
      "AI Chatbot - 5M tokens/month",
      "Fitment Widget–Search by Make/Model/Year",
      "Fitment Verification Widget",
      "Fitment Table",
      "Priority Support",
    ],
    featuresAnnual: [
      "Everything in Pro Plan",
      "VIN & Registration Fitment (1,000 lookups/mo)",
      "Early Access to New & Beta Features",
      "Premium Onboarding & Success Support",
      "VIP Queue for Support Requests",
    ],
    cta: { text: "Subscribe" },
  },
  // {
  //   name: "Enterprise",
  //   price: "Custom",
  //   annualPrice: "Custom",
  //   description: "For marketplaces & businesses with custom needs.",
  //   tokens: "Unlimited",
  //   productSyncs: "Unlimited",
  //   fitmentFields: "Unlimited",
  //   vinLookups: "Custom",
  //   smartUpsell: true,
  //   featuresMonthly: [
  //     "All Elite Plan features",
  //     "Dedicated Account Manager",
  //     "Custom Feature Development",
  //     "White-Label Solutions",
  //     "Full Data Export & Integration Tools",
  //     "SLA-Based Support & Reporting",
  //   ],
  //   featuresAnnual: [
  //     "All Elite Plan features",
  //     "Dedicated Account Manager",
  //     "Custom Feature Development",
  //     "White-Label Solutions",
  //     "Full Data Export & Integration Tools",
  //     "SLA-Based Support & Reporting",
  //   ],
  //   cta: { text: "Contact sales", variant: "primary" as const },
  // },
];

const allPlans = [...mainPlans];

// ---------- UI Building Blocks ----------
function BillingCycleToggle({
  selectedCycle,
  onChange,
}: {
  selectedCycle: "monthly" | "annual";
  onChange: (c: "monthly" | "annual") => void;
}) {
  return (
    <ButtonGroup segmented>
      <Button pressed={selectedCycle === "monthly"} onClick={() => onChange("monthly")}>
        Monthly
      </Button>
      <Button pressed={selectedCycle === "annual"} onClick={() => onChange("annual")}>
        Annual (Save 20%)
      </Button>
    </ButtonGroup>
  );
}

function PriceBlock({ plan, billingCycle }: { plan: any; billingCycle: "monthly" | "annual" }) {
  const isAnnual = billingCycle === "annual";
  const price = isAnnual ? plan.annualPrice : plan.price;

  if (price === "Custom") {
    return (
      <Text as="h3" variant="headingXl">
        Custom
      </Text>
    );
  }

  const unitPrice = isAnnual ? Math.round((price as number) / 12) : (price as number);

  return (
    <BlockStack gap="200">
      <InlineStack align="start" gap="100" blockAlign="end" wrap={false}>
        <Text as="h3" variant="headingXl" numeric>
          {formatCurrency(unitPrice) as any}
        </Text>
        <Box paddingBlockEnd="100">
          <Text as="span" variant="bodyMd" tone="subdued">
            /month
          </Text>
        </Box>
      </InlineStack>
      {isAnnual && <Text variant="bodySm" tone="subdued">Billed as {formatCurrency(price) as any}/year</Text>}
    </BlockStack>
  );
}

const PlanCard = React.memo(function PlanCard({
  plan,
  billingCycle,
  activePlanName,
  hasActiveSubscription,
  fetchingSubscription,
  isActivePlan,
  trialDaysLeft,
  isInTrial,
  trialExpired,
  onManageBilling,
  managing,
}: {
  plan: any;
  billingCycle: "monthly" | "annual";
  activePlanName: string | null;
  hasActiveSubscription: boolean;
  fetchingSubscription: boolean;
  isActivePlan: boolean;
  trialDaysLeft: number | null;
  isInTrial: boolean;
  trialExpired: boolean;
  onManageBilling: (plan: any, cycle: "monthly" | "annual") => void;
  managing: boolean;
}) {
  const buttonState = getButtonStateForPlan({
    planName: plan.name,
    activePlanName,
    fetching: fetchingSubscription || managing,
    hasActiveSubscription,
  });

  const isEnterprise = plan.name === "Enterprise";
  const hideButton = (isEnterprise && isActivePlan) || buttonState.hidden;

  const features =
    billingCycle === "annual"
      ? plan.featuresAnnual || plan.featuresMonthly || plan.features || []
      : plan.featuresMonthly || plan.features || [];

  const showTrialBadge = !isActivePlan && plan.trialDays && billingCycle !== "annual";

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Card background={plan.isPopular ? "bg-surface-secondary" : "bg-surface"}>
        <BlockStack gap="400" padding="500">
          <InlineStack align="space-between" blockAlign="start" wrap>
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingLg">
                  {plan.name}
                </Text>
                {isActivePlan && <Badge tone="success">Active</Badge>}
                {isActivePlan && isInTrial && !trialExpired && billingCycle !== "annual" && (
                  <Badge tone="attention">{trialDaysLeft ?? 0} days left (trial)</Badge>
                )}
                {plan.isPopular && <Badge tone="info">Most popular</Badge>}
              </InlineStack>
            </BlockStack>

            {showTrialBadge ? <Badge tone="success">{plan.trialDays}-day free trial</Badge> : null}
          </InlineStack>

          <Text variant="bodyMd" tone="subdued">
            {plan.description}
          </Text>

          <Divider />
          <PriceBlock plan={plan} billingCycle={billingCycle} />
          <Divider />
          <div style={{ minHeight: "193px" }}>
          <BlockStack gap="300">
            <Text variant="bodySm" tone="subdued">
              INCLUDES:
            </Text>
            <List type="bullet" spacing="tight">
              {features.map((feature: string) => (
                <List.Item key={feature}>
                  <Text as="span" variant="bodyMd">
                    {feature}
                  </Text>
                </List.Item>
              ))}
            </List>
          </BlockStack>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "var(--p-space-100)" }}>
            {!hideButton ? (
              <Button
                variant={isEnterprise ? (plan.cta.variant ?? "primary") : buttonState.variant}
                fullWidth
                size="large"
                disabled={buttonState.disabled}
                onClick={() => onManageBilling(plan, billingCycle)}
              >
                {managing ? <Spinner accessibilityLabel="Loading" size="small" /> : isEnterprise ? plan.cta.text : buttonState.text}
              </Button>
            ) : null}
          </div>
        </BlockStack>
      </Card>
    </div>
  );
});

function Addons() {
  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg">
        Suggested add-ons
      </Text>
      <Grid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
        <Card>
          <BlockStack gap="200" padding="400">
            <Text as="h3" variant="headingMd">
              Additional VIN lookups
            </Text>
            <Text variant="bodyMd">
              Starting at <b>$25</b> per 250 lookups
            </Text>
            <Text variant="bodySm" tone="subdued">
              Available for Pro plan & up.
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="200" padding="400">
            <Text as="h3" variant="headingMd">
              Extra AI tokens
            </Text>
            <Text variant="bodyMd">
              <b>$19</b> per 100K tokens
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="200" padding="400">
            <Text as="h3" variant="headingMd">
              Onboarding call
            </Text>
            <Text variant="bodyMd">
              <b>$49</b> one-time (Free for Pro+)
            </Text>
          </BlockStack>
        </Card>
      </Grid>
    </BlockStack>
  );
}

function ComparisonTable({ plans, billingCycle }: { plans: any[]; billingCycle: "monthly" | "annual" }) {
  const visiblePlans = useMemo(() => plans.filter((p) => p.name !== "Enterprise"), [plans]);

  const baseRows = useMemo(
    () => [
      { label: "AI tokens", values: visiblePlans.map((p) => p.tokens) },
      { label: "Fitment fields", values: visiblePlans.map((p) => p.fitmentFields) },
      { label: "VIN lookups", values: visiblePlans.map((p) => p.vinLookups) },
      { label: "Product syncs", values: visiblePlans.map((p) => p.productSyncs) },
      { label: "Smart Upsell / AI", values: visiblePlans.map((p) => p.smartUpsell) },
    ],
    [visiblePlans]
  );

  const rows = useMemo(() => {
    // Hide "AI tokens" row for annual billing (not token-based display)
    if (billingCycle === "annual") {
      return baseRows.filter((r) => r.label !== "AI tokens");
    }
    return baseRows;
  }, [baseRows, billingCycle]);

  const columnCount = 1 + visiblePlans.length;
  return (
    <Card>
      <BlockStack gap="400" padding="500">
        <Text as="h2" variant="headingLg">
          Which plan is right for you?
        </Text>
        <Text variant="bodyMd" tone="subdued">
          Compare the essentials at a glance.
        </Text>
      </BlockStack>
      <BlockStack>
        <div style={{ overflowX: "hidden" }}>
          <div style={{ minWidth: `${columnCount * 450}px` }}>
            <Box padding={{ xs: "400", sm: "500" }}>
              <BlockStack gap="400">
                <Grid columns={columnCount} gap="400">
                  <Text variant="bodyMd" fontWeight="bold">
                    Feature
                  </Text>
                  {visiblePlans.map((p) => (
                    <Text key={p.name} variant="bodyMd" fontWeight="bold" alignment="center">
                      {p.name}
                    </Text>
                  ))}
                </Grid>
                {rows.map((row) => (
                  <React.Fragment key={row.label}>
                    <Divider />
                    <Grid columns={columnCount} gap="400" blockAlign="center">
                      <Text variant="bodyMd">{row.label}</Text>
                      {row.values.map((val: any, i: number) => (
                        <InlineStack key={i} align="center" blockAlign="center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Badge tone="success" icon={CheckIcon} />
                            ) : (
                              <Text tone="subdued" as="span">
                                —
                              </Text>
                            )
                          ) : (
                            <Text variant="bodyMd" numeric>
                              {val ?? "—"}
                            </Text>
                          )}
                        </InlineStack>
                      ))}
                    </Grid>
                  </React.Fragment>
                ))}
              </BlockStack>
            </Box>
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

function PlansSkeleton() {
  return (
    <Grid columns={{ xs: 1, md: 2, lg: 3 }} gap="400">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Box padding="500">
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <SkeletonDisplayText size="small" />
                <SkeletonDisplayText size="small" />
              </InlineStack>
              <SkeletonBodyText lines={2} />
              <Divider />
              <SkeletonDisplayText size="small" />
              <Divider />
              <SkeletonBodyText lines={4} />
              <Button disabled fullWidth>
                Loading…
              </Button>
            </BlockStack>
          </Box>
        </Card>
      ))}
    </Grid>
  );
}

// ---------- Main Billing Route ----------
export default function BillingPage() {
  // Get data that root.tsx already fetched (no additional API calls here)
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [subscriptionError, setSubscriptionError] = useState<unknown>(null);
  const [managingPlan, setManagingPlan] = useState<string | null>(null);

  // Guard if root data isn't ready yet (very brief during hydration)
  if (!rootData) {
    return (
      <Page title="Pricing plans">
        <Layout>
          <Layout.Section>
            <PlansSkeleton />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { subscriptionData, trialInfo } = rootData;

  // Derive state from server-provided payload
  const derived = useMemo(() => {
    const hasActiveSubscription = Boolean(
      subscriptionData?.status?.hasActiveSubscription || subscriptionData?.status?.subscriptionActive
    );

    const subName: string | null = subscriptionData?.subscription?.name ?? subscriptionData?.currentPlan ?? null;
    const parsed = parsePlanFromSubscriptionName(subName ?? undefined);
    const activePlanName =
      hasActiveSubscription && parsed.planName && PLAN_ORDER.includes(parsed.planName as any)
        ? parsed.planName
        : null;

    const activeBilling = parsed.billing ?? null;

    const isInTrial = Boolean(trialInfo?.isInTrial);
    const trialExpired = Boolean(trialInfo?.trialExpired);
    const trialDaysLeft =
      typeof trialInfo?.daysLeftInTrial === "number" ? (trialInfo.daysLeftInTrial as number) : null;
    const trialEndDate = trialInfo?.trialEndDate ?? null;

    return {
      hasActiveSubscription,
      activePlanName,
      activeBilling,
      isInTrial,
      trialExpired,
      trialDaysLeft,
      trialEndDate,
    };
  }, [subscriptionData, trialInfo]);

  const handleManageBilling = async (plan: any, cycle: "monthly" | "annual") => {
    try {
      setSubscriptionError(null);
      setManagingPlan(plan.name);
      const result = await api.manageBillingSubscription({
        action: "create",
        billingInterval: cycle,
        planType: plan.name.toLowerCase(),
        // root payload doesn't include shop explicitly; backend can infer, fallback safe:
        shop: undefined,
      });
      if (result?.confirmationUrl) {
        // Keep spinner visible; redirect immediately


      
        window.top.location.href = result.confirmationUrl;
        return; // do not clear managingPlan; page will navigate
      }
      throw new Error("No confirmation URL returned");
    } catch (e) {
      setSubscriptionError(e);
      setManagingPlan(null); // stop spinner on error
    }
  };

  // Decide which banner to show at the top without affecting layout
  const topBanner = (() => {
    if (subscriptionError) {
      return (
        <Banner tone="critical" title="Couldn’t load subscription">
          <p>{String(subscriptionError)}</p>
        </Banner>
      );
    }

    // 🔔 Alert when on free trial (free plan)
    if (trialInfo?.source === "free-trial" && !derived.trialExpired) {
      return (
        <Banner tone="warning" title="You're on a free trial">
          <p>
            {typeof derived.trialDaysLeft === "number"
              ? `${derived.trialDaysLeft} day${derived.trialDaysLeft === 1 ? "" : "s"} left`
              : "Limited time remaining"}
            {" • "}
            Upgrade anytime to keep your features active.
          </p>
        </Banner>
      );
    }

    // ⚠️ Alert when trial expired and no active subscription
    if (derived.trialExpired && !derived.hasActiveSubscription) {
      return (
        <Banner tone="critical" title="Trial expired – subscription required">
          <p>Please choose a plan to continue using AutoFit AI features.</p>
        </Banner>
      );
    }

    // Default informational banner
    return (
      <Banner
        tone="info"
        title="Power up your automotive store with intelligent chat, vehicle fitment tools, and AI-driven sales features."
      />
    );
  })();

  return (
    <Page 
      backAction={{ content: 'Back', onAction: () => navigate('/') }}
      title="Pricing plans"
      >
      <Layout>
        <Layout.Section>
          <BlockStack gap={{ xs: "600", sm: "800" }}>
            {topBanner}

            {/* <BlockStack inlineAlign="center">
              <BillingCycleToggle selectedCycle={billingCycle} onChange={setBillingCycle} />
            </BlockStack> */}

            <Grid columns={{ xs: 1, md: 2, lg: 3 }} gap="400">
              {mainPlans.map((plan) => {
                const isActivePlan = derived.hasActiveSubscription && derived.activePlanName === plan.name;
                return (
                  <PlanCard
                    key={plan.name}
                    plan={plan}
                    billingCycle={billingCycle}
                    activePlanName={derived.activePlanName}
                    hasActiveSubscription={derived.hasActiveSubscription}
                    fetchingSubscription={false /* no client fetch; root handled it */}
                    isActivePlan={isActivePlan}
                    isInTrial={derived.isInTrial}
                    trialDaysLeft={derived.trialDaysLeft}
                    trialExpired={derived.trialExpired}
                    onManageBilling={handleManageBilling}
                    managing={managingPlan === plan.name}
                  />
                );
              })}
            </Grid>

            {/* <Addons />
            <ComparisonTable plans={allPlans} billingCycle={billingCycle} /> */}
            <Box paddingBlockEnd="800" />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
