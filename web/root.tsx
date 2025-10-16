import type { LoaderFunctionArgs, MetaFunction, LinksFunction } from "@remix-run/node";
import "./i18n/config.ts";
import { json, redirect } from "@remix-run/node";
import {
  Meta,
  Links,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  Outlet,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Suspense, useMemo, useCallback } from "react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import {
  AppType,
  Provider as GadgetProvider,
} from "@gadgetinc/react-shopify-app-bridge";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import "./app.css";
import { api } from "./api";
import { AdaptorLink } from "./components/AdaptorLink";
import { FullPageSpinner } from "./components/FullPageSpinner";
import {
  ProductionErrorBoundary,
  DevelopmentErrorBoundary,
} from "gadget-server/remix";

// Enhanced type definitions
interface TrialInfo {
  readonly isInTrial: boolean;
  readonly trialExpired: boolean;
  readonly daysLeftInTrial: number;
  readonly trialEndDate: string | null;
  readonly installationDate?: string;
  readonly source: "subscription" | "free-trial" | "none";
}

interface SubscriptionStatus {
  readonly hasActiveSubscription?: boolean;
  readonly subscriptionActive?: boolean;
}

interface SubscriptionData {
  readonly subscription?: {
    readonly name?: string;
  };
  readonly status?: SubscriptionStatus;
  readonly trialInfo?: Partial<TrialInfo>;
}

interface LoaderData {
  readonly gadgetConfig: any;
  readonly initialShopDomain: string | null;
  readonly currentPlan: string | null;
  readonly subscriptionData: SubscriptionData | null;
  readonly trialInfo: TrialInfo;
  readonly isProduction: boolean;
}

// Constants
const DEFAULT_TRIAL_INFO: TrialInfo = {
  isInTrial: false,
  trialExpired: false,
  daysLeftInTrial: 0,
  trialEndDate: null,
  installationDate: undefined,
  source: "none",
} as const;

const BILLING_PATHS = ['/billing', '/subscription', '/payment'] as const;

// Helper functions
const isBillingPath = (pathname: string): boolean =>
  BILLING_PATHS.some(path => pathname.startsWith(path));

const sanitizeShopParam = (shop: string | null): string | null => {
  if (!shop) return null;
  // Basic validation for shop parameter
  const sanitized = shop.trim().toLowerCase();
  return sanitized.match(/^[a-z0-9\-]+\.myshopify\.com$|^[a-z0-9\-]+$/) ? sanitized : null;
};

const parseSubscriptionPlan = (subscriptionName?: string): string => {
  if (!subscriptionName?.trim()) return "paid";
  
  const planName = subscriptionName.split("-")[0].trim().toLowerCase();
  const validPlans = ["basic", "pro", "premium", "enterprise"];
  
  return validPlans.includes(planName) ? planName : "paid";
};

const determineTrialInfo = (
  subscriptionData: SubscriptionData | null,
  hasActiveSubscription: boolean
): TrialInfo => {
  const serverTrialInfo = subscriptionData?.trialInfo;
  
  // Merge server trial info with defaults
  let trialInfo: TrialInfo = {
    ...DEFAULT_TRIAL_INFO,
    ...serverTrialInfo,
  };

  // Determine source based on subscription and trial status
  if (hasActiveSubscription) {
    trialInfo = {
      ...trialInfo,
      source: trialInfo.isInTrial ? "free-trial" : "subscription",
    };
  } else if (trialInfo.isInTrial) {
    trialInfo = {
      ...trialInfo,
      source: "free-trial",
    };
  }

  return trialInfo;
};

const determineCurrentPlan = (
  subscriptionData: SubscriptionData | null,
  hasActiveSubscription: boolean,
  trialInfo: TrialInfo
): string | null => {
  if (hasActiveSubscription) {
    return parseSubscriptionPlan(subscriptionData?.subscription?.name);
  }
  
  if (trialInfo.isInTrial) {
    return "free-trial";
  }
  
  return null;
};

export const links: LinksFunction = () => [
  // DNS prefetch for better performance
  { rel: "dns-prefetch", href: "//cdn.shopify.com" },
  { rel: "dns-prefetch", href: "//assets.gadget.dev" },
  
  // Preconnects help with TLS/handshakes
  { rel: "preconnect", href: "https://cdn.shopify.com", crossOrigin: "anonymous" },
  { rel: "preconnect", href: "https://assets.gadget.dev", crossOrigin: "anonymous" },

  // Preload critical resources
  { rel: "preload", as: "style", href: polarisStyles },
  { rel: "preload", as: "script", href: "https://cdn.shopify.com/shopifycloud/app-bridge.js" },

  // Stylesheets (order matters for cascade)
  { rel: "stylesheet", href: "https://assets.gadget.dev/assets/reset.min.css" },
  { rel: "stylesheet", href: polarisStyles },
];

export const meta: MetaFunction = ({ location }) => {
  const baseTitle = "AutoFit AI - YMM";
  const title = location.pathname === "/" ? baseTitle : `${baseTitle} | ${location.pathname.slice(1)}`;
  
  return [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title },
    { name: "description", content: "AutoFit AI - Year Make Model application for Shopify" },
    // Security headers
    { "http-equiv": "X-Content-Type-Options", content: "nosniff" },
    { "http-equiv": "X-Frame-Options", content: "SAMEORIGIN" },
    // Shopify integration
    { name: "shopify-api-key", content: "%SHOPIFY_API_KEY%" },
  ];
};

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const rawShop = url.searchParams.get("shop");
  const host = url.searchParams.get("host") || "";
  
  // Sanitize shop parameter
  const shop = sanitizeShopParam(rawShop);
  
  // Early return if shop is invalid and required
  if (rawShop && !shop) {
    throw new Response("Invalid shop parameter", { status: 400 });
  }

  const isProduction = process.env.NODE_ENV === "production";
  
  let subscriptionData: SubscriptionData | null = null;
  let hasActiveSubscription = false;

  try {
    // Fetch subscription data with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Subscription API timeout")), 10000)
    );
    
    subscriptionData = await Promise.race([
      api.getActiveSubscription(),
      timeoutPromise
    ]);

    if (subscriptionData?.status) {
      const status = subscriptionData.status;
      hasActiveSubscription = Boolean(status.hasActiveSubscription || status.subscriptionActive);
    }
  } catch (error) {
    console.error("Failed to fetch subscription data:", error);
    
    // In production, you might want to handle this differently
    if (isProduction) {
      // Could set a flag to show a warning banner or retry mechanism
      console.warn("Subscription check failed, continuing with limited functionality");
    }
  }

  // Determine trial info and current plan
  const trialInfo = determineTrialInfo(subscriptionData, hasActiveSubscription);
  const currentPlan = determineCurrentPlan(subscriptionData, hasActiveSubscription, trialInfo);

  // Handle trial expiration redirect
  const shouldRedirectToBilling = trialInfo.trialExpired && 
                                  !hasActiveSubscription && 
                                  !isBillingPath(url.pathname);

  if (shouldRedirectToBilling && shop) {
    const redirectUrl = new URL("/billing", url.origin);
    redirectUrl.searchParams.set("shop", shop);
    if (host) redirectUrl.searchParams.set("host", host);
    redirectUrl.searchParams.set("reason", "trial_expired");
    
    throw redirect(redirectUrl.toString());
  }

  const loaderData: LoaderData = {
    gadgetConfig: context.gadgetConfig,
    initialShopDomain: shop,
    currentPlan,
    subscriptionData,
    trialInfo,
    isProduction,
  };

  // Cache subscription data for a short time to avoid repeated calls
  const headers: HeadersInit = {};
  if (subscriptionData && hasActiveSubscription) {
    headers["Cache-Control"] = "private, max-age=300"; // 5 minutes
  }

  return json(loaderData, { headers });
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <Meta />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
        <Links />
      </head>
      <body>
        <Suspense fallback={<FullPageSpinner />}>
          {children}
        </Suspense>
        <ScrollRestoration />
        <Scripts />
        <noscript>
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db' 
          }}>
            This app requires JavaScript to function properly. Please enable JavaScript in your browser.
          </div>
        </noscript>
      </body>
    </html>
  );
};

export default function App() {
  const { gadgetConfig, isProduction } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Memoize API key extraction with validation
  const apiKey = useMemo(() => {
    const key = gadgetConfig?.apiKeys?.shopify ?? "";
    
    if (!key && !isProduction) {
      console.warn("Shopify API key not found in gadgetConfig");
    }
    
    return key;
  }, [gadgetConfig?.apiKeys?.shopify, isProduction]);

  // Memoize provider props to prevent unnecessary re-renders
  const providerProps = useMemo(() => ({
    type: AppType.Embedded,
    shopifyApiKey: apiKey,
    api,
    location,
    shopifyInstallState: gadgetConfig?.shopifyInstallState,
  }), [apiKey, location, gadgetConfig?.shopifyInstallState]);

  // Error boundary fallback
  const handleError = useCallback((error: Error, errorInfo: any) => {
    if (!isProduction) {
      console.error("App boundary error:", error, errorInfo);
    }
    // Could send to error reporting service here
  }, [isProduction]);

  return (
    <GadgetProvider {...providerProps}>
      <AppProvider 
        i18n={enTranslations} 
        linkComponent={AdaptorLink}
        features={{ newDesignLanguage: true }}
      >
        <Outlet />
      </AppProvider>
    </GadgetProvider>
  );
}

export function HydrateFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa' 
    }}>
      <FullPageSpinner />
    </div>
  );
}

// Enhanced error boundary with better error handling
export function ErrorBoundary() {
  const error = useRouteError();
  const isProduction = process.env.NODE_ENV === "production";

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Oops! Something went wrong</h1>
        <p>Status: {error.status}</p>
        <p>{error.statusText}</p>
        {!isProduction && error.data && (
          <pre style={{ 
            textAlign: 'left', 
            backgroundColor: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(error.data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  // Use the appropriate error boundary based on environment
  const ErrorBoundaryComponent = isProduction ? ProductionErrorBoundary : DevelopmentErrorBoundary;
  return <ErrorBoundaryComponent />;
}