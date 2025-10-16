import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  memo,
  useLayoutEffect,
  useDeferredValue,
} from "react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Collapsible,
  InlineStack,
  Page,
  Text,
  Icon,
  SkeletonBodyText,
  SkeletonDisplayText,
  Banner,
  Divider,
  InlineGrid,
  Link,
  ButtonGroup,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon, XIcon, RefreshIcon } from "@shopify/polaris-icons";
import { useNavigate } from "@remix-run/react";
import { api } from "../api";
import { hasFitmentSets } from "../lib/database";
import { checklistItems, sections } from "../constant/constant";
import CardSection from "../components/Dashboard/SettingCard";
import CardComponent from "../components/Dashboard/Card";
import CheckBoxTickIcon from "../components/icons/CheckBoxTickIcon";
import CheckBoxIcon from "../components/icons/CheckBoxIcon";
import ActivateAppIcon from "../components/icons/ActivateAppIcon";
import ActivateWidgetIcon from "../components/icons/ActivateWidgetIcon";
import ActivateDatabaseIcon from "../components/icons/ActivateDatabaseIcon";
import type { GadgetWidgetData , DashboardWidget } from "../types/widget";
import {
  getAllWidgetStatuses,
  setWidgetEnabledStatus,
} from "../lib/widgetSettings";

/** ---------------- Utils ---------------- */
const withTimeout = async <T,>(p: Promise<T>, ms = 12_000): Promise<T> => {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error("Request timed out")), ms);
  });
  try {
    return (await Promise.race([p, timeout])) as T;
  } finally {
    clearTimeout(t!);
  }
};

const raf = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

const LS_KEY_DISMISSED = "cm_setup_dismissed_v2";

/** ---------------- Loading States ---------------- */
type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

/** ---------------- Skeletons ---------------- */
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <Card>
      <Box padding="400">
        <InlineStack align="space-between" blockAlign="center">
          <SkeletonDisplayText size="small" />
          <SkeletonDisplayText size="small" />
        </InlineStack>
        <Divider />
        <Box paddingBlockStart="300">
          <SkeletonBodyText lines={3} />
        </Box>
      </Box>
    </Card>
  );
});

const SkeletonSetupCard = memo(function SkeletonSetupCard() {
  return (
    <Card>
      <Box padding="200">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="100" blockAlign="center">
              <SkeletonDisplayText size="small" />
              <SkeletonDisplayText size="small" />
            </InlineStack>
            <SkeletonDisplayText size="small" />
          </InlineStack>
          <SkeletonBodyText lines={2} />
        </BlockStack>
      </Box>
    </Card>
  );
});

const SkeletonSupportCard = memo(function SkeletonSupportCard() {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <BlockStack gap="200">
            <SkeletonDisplayText size="small" />
            <SkeletonBodyText lines={2} />
            <InlineStack gap="200">
              <SkeletonDisplayText size="small" />
              <SkeletonDisplayText size="small" />
            </InlineStack>
          </BlockStack>
          <InlineGrid columns={2} gap="400">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Box key={idx}>
                <SkeletonBodyText lines={3} />
              </Box>
            ))}
          </InlineGrid>
        </BlockStack>
      </Box>
    </Card>
  );
});

/** ---------------- Unified Loading Component ---------------- */
const UnifiedSkeleton = memo(function UnifiedSkeleton() {
  return (
    <BlockStack gap="300">
      {/* Setup Guide Skeleton */}
      <SkeletonSetupCard />
      
      {/* Dashboard Header Skeleton */}
      <Box paddingBlock="300">
        <BlockStack gap="100">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={1} />
        </BlockStack>
      </Box>
      
      {/* Widgets Skeleton */}
      <BlockStack gap="300">
        {Array.from({ length: 3 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </BlockStack>
      
      {/* Support Section Skeleton */}
      <Box paddingBlockStart="400">
        <SkeletonSupportCard />
      </Box>
    </BlockStack>
  );
});

/** ---------------- Enhanced Crossfade ---------------- */
const Crossfade = memo(function Crossfade({
  ready,
  skeleton,
  children,
  minHeightEstimate,
  delay = 0,
}: {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  minHeightEstimate?: number;
  delay?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [measuredH, setMeasuredH] = useState<number | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current.querySelector(
      "[data-crossfade-measure]"
    ) as HTMLElement | null;
    if (el) setMeasuredH(el.offsetHeight);
    else if (minHeightEstimate) setMeasuredH(minHeightEstimate);
  }, [minHeightEstimate]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    
    (async () => {
      // Add delay for coordinated loading
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await raf();
      await raf();
      
      if (!cancelled) {
        setShowSkeleton(false);
        setShowContent(true);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [ready, delay]);

  const reservedH = measuredH ?? minHeightEstimate ?? undefined;

  return (
    <div ref={wrapRef} style={{ position: "relative", minHeight: reservedH }}>
      <div
        aria-hidden={!showSkeleton}
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: showSkeleton ? 1 : 0,
          transition: "opacity 300ms ease",
          visibility: showSkeleton ? "visible" : "hidden",
        }}
      >
        <div data-crossfade-measure>{skeleton}</div>
      </div>
      <div
        style={{
          opacity: showContent ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
});

/** ---------------- Fade+Slide for setup ---------------- */
const FadeSlide = memo(function FadeSlide({
  show,
  children,
  delay = 0,
}: {
  show: boolean;
  children: React.ReactNode;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;
    
    if (show) {
      timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          if (active) setMounted(true);
        });
      }, delay);
    } else {
      setMounted(false);
    }
    
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [show, delay]);

  return (
    <div
      style={{
        transition: "opacity 300ms ease, transform 300ms ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
});

/** ---------------- Small helpers ---------------- */
const RightStepIllustration = memo(function RightStepIllustration({
  id,
  isOpen,
}: {
  id: string;
  isOpen: boolean;
}) {
  if (!isOpen) return null;
  if (id === "fillDatabase") return <ActivateDatabaseIcon />;
  if (id === "activateApp") return <ActivateAppIcon />;
  if (id === "activateWidgets") return <ActivateWidgetIcon />;
  return null;
});

/** ---------------- Step Card ---------------- */
const StepCard = memo(function StepCard({
  itemId,
  label,
  description,
  isCompleted,
  isOpen,
  onToggle,
  onGo,
  isPendingNav,
  shopURL,
}: {
  itemId: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onGo: (path: string) => void;
  isPendingNav: boolean;
  shopURL: string;
}) {
  const showChevron = !isCompleted;

  const handleHeaderClick = useCallback(() => {
    if (!isCompleted) onToggle(itemId);
  }, [isCompleted, onToggle, itemId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isCompleted) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(itemId);
      }
    },
    [isCompleted, onToggle, itemId]
  );

  const stop: React.MouseEventHandler = (e) => e.stopPropagation();

  return (
    <Card>
      <Box
        padding="200"
        tabIndex={0}
        aria-expanded={!isCompleted && isOpen}
        aria-controls={`step-${itemId}`}
        onClick={handleHeaderClick}
        onKeyDown={handleKeyDown}
      >
        <BlockStack gap="100">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              {isCompleted ? <CheckBoxTickIcon /> : <CheckBoxIcon />}
              <Text as="p" tone={isCompleted ? "success" : "subdued"} variant="bodySm">
                {label}
              </Text>
            </InlineStack>

            {showChevron && (
              <InlineStack gap="100" blockAlign="center">
                <RightStepIllustration id={itemId} isOpen={isOpen} />
                <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} />
              </InlineStack>
            )}
          </InlineStack>

          {!isCompleted && (
            <Collapsible
              id={`step-${itemId}`}
              open={isOpen}
              transition={{ duration: "150ms", timingFunction: "ease" }}
            >
              <BlockStack gap="400">
                <Text as="p" variant="bodySm">{description}</Text>

                {itemId === "fillDatabase" && (
                  <InlineStack>
                    <Button
                      variant="secondary"
                      size="medium"
                      loading={isPendingNav}
                      onClick={(e) => {
                        stop(e);
                        onGo("/database");
                      }}
                    >
                      Go to Database
                    </Button>
                  </InlineStack>
                )}

                {itemId === "activateApp" && (
                  <InlineStack>
                    <Button
                      variant="secondary"
                      size="medium"
                      onClick={(e) => {
                        stop(e);
                        window.open(
                          `https://${shopURL}/admin/themes/current/editor?context=apps&template=index&activateAppId=${shopify.config.apiKey}/asset-embed`,
                          "_blank"
                        );
                      }}
                    >
                      Go to Theme Customization
                    </Button>
                  </InlineStack>
                )}

                {itemId === "activateWidgets" && (
                  <InlineStack>
                    <Button
                  variant="secondary"
                  size="medium"
                  loading={isPendingNav}
                 onClick={(e) => {
                   stop(e);
                
                  const el = document.getElementById("fitment-widget-container");
                  if (el) {
                    const yOffset = -150; 
                    const y =
                      el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}

                >
                  Activate your Widgets
                </Button>

                  </InlineStack>
                )}
              </BlockStack>
            </Collapsible>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
});

/** ---------------- Main Component ---------------- */
export default function Index() {
  const navigate = useNavigate();

  // Unified loading state
  const [pageLoadingState, setPageLoadingState] = useState<LoadingState>('loading');
  const [hydrated, setHydrated] = useState(false);

  // UI states
  const [isSetupGuideExpanded, setIsSetupGuideExpanded] = useState(true);
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(new Set());
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Data
  const [dashboardData, setDashboardData] = useState<DashboardWidget[]>([]);
  const deferredDashboardData = useDeferredValue(dashboardData);
  const [appStatus, setAppStatus] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Other hooks
  const [isPendingNav, startTransition] = useTransition();
  const shopRef = useRef<string | null>(null);

  // --- Effects ---

  // Hydration + persistent dismissal check
  useEffect(() => {
    setHydrated(true);
    shopRef.current = (window as any)?.shopify?.config?.shop ?? null;
    try {
      const dismissed = localStorage.getItem(LS_KEY_DISMISSED) === "1";
      setSetupDismissed(dismissed);
    } catch {}
  }, []);

  // Unified data loading effect
  useEffect(() => {
    if (!hydrated) return;
    
    let isCancelled = false;
    const shopDomain = shopRef.current;

    if (!shopDomain) {
      setErrors(["Shop domain could not be detected."]);
      setPageLoadingState('error');
      return;
    }

    const loadAllData = async () => {
      try {
        const [widgetDataResult, widgetStatusesResult, appEmbedResult, databaseResult] =
          await Promise.allSettled([
            withTimeout(
              api.WidgetImage.findMany().then((res: any[]) =>
                res.map((x) => x.toJSON() as GadgetWidgetData)
              )
            ),
            withTimeout(getAllWidgetStatuses(shopDomain)),
            withTimeout(api.checkAppEmbed()),
            withTimeout(hasFitmentSets(shopDomain)),
          ]);

        if (isCancelled) return;

        const localErrors: string[] = [];
        let finalDashboardData: DashboardWidget[] = [];
        let anyWidgetEnabled = false;

        // Process widgets
        if (widgetDataResult.status === "fulfilled") {
          const visibleWidgets = widgetDataResult.value.filter((w) => w.isActive);
          const statusesMap = new Map<string, boolean>();

          if (widgetStatusesResult.status === "fulfilled") {
            (widgetStatusesResult.value as any[]).forEach((s: any) => {
              statusesMap.set(s.widget_type, s.enabled);
              if (s.enabled) anyWidgetEnabled = true;
            });
          } else {
            localErrors.push(
              `Widgets status check: ${
                widgetStatusesResult.reason?.message ?? "failed"
              }`
            );
          }

          finalDashboardData = visibleWidgets.map((w) => ({
            ...w,
            isEnabled: statusesMap.get(w.widget_type) ?? false,
          }));
        } else {
          localErrors.push(
            `Widgets: ${widgetDataResult.reason?.message ?? "failed"}`
          );
        }

        // Process app status
        const appOk =
          appEmbedResult.status === "fulfilled" && appEmbedResult.value;
        if (appEmbedResult.status === "rejected") {
          localErrors.push(
            `App status: ${appEmbedResult.reason?.message ?? "failed"}`
          );
        }

        // Process database status
        const dbOk =
          databaseResult.status === "fulfilled" && databaseResult.value;
        if (databaseResult.status === "rejected") {
          localErrors.push(
            `Database: ${databaseResult.reason?.message ?? "failed"}`
          );
        }

        // Update all states
        setDashboardData(finalDashboardData);
        setWidgetStatus(anyWidgetEnabled);
        setAppStatus(appOk);
        setDatabaseStatus(dbOk);
        
        if (localErrors.length > 0) {
          setErrors(localErrors);
        }

        setPageLoadingState('ready');
      } catch (error) {
        if (!isCancelled) {
          setErrors(["Failed to load dashboard data"]);
          setPageLoadingState('error');
        }
      }
    };

    loadAllData();
    return () => {
      isCancelled = true;
    };
  }, [hydrated, refreshTrigger]);

  // Effect to decide which setup step to open initially
  useEffect(() => {
    if (pageLoadingState !== 'ready') return;

    const statusMap = {
      activateApp: appStatus,
      activateWidgets: widgetStatus,
      fillDatabase: databaseStatus,
    };
    
    const firstIncompleteItem = checklistItems.find(
      (item) => !statusMap[item.id as keyof typeof statusMap]
    );

    if (firstIncompleteItem) {
      setOpenStepIds((prev) => {
        if (prev.size === 0) {
          return new Set([firstIncompleteItem.id]);
        }
        return prev;
      });
    }
  }, [pageLoadingState, appStatus, widgetStatus, databaseStatus]);

  // --- Memos and Callbacks ---
  const handleWidgetStatusChange = useCallback(
    async (widgetId: string, newStatus: boolean) => {
      const shop = shopRef.current;
      if (!shop) {
        setErrors((prev) => [...prev, "Shop domain not found."]);
        return;
      }
      
      const originalData = [...dashboardData];
      const widgetToUpdate = originalData.find((w) => w.id === widgetId);
      if (!widgetToUpdate) return;

      // Optimistic update
      const updatedData = dashboardData.map((w) =>
        w.id === widgetId ? { ...w, isEnabled: newStatus } : w
      );
      setDashboardData(updatedData);

      // Update widget status for setup guide
      const hasAnyActiveWidget = updatedData.some(w => w.isEnabled);
      setWidgetStatus(hasAnyActiveWidget);

      const { success, error } = await setWidgetEnabledStatus(
        shop,
        widgetToUpdate.widget_type,
        newStatus
      );

      // Revert on failure
      if (!success) {
        setErrors((prev) => [
          ...prev,
          `Failed to update ${widgetToUpdate.heading}: ${error}`,
        ]);
        setDashboardData(originalData);
        // Revert widget status
        const originalHasAnyActive = originalData.some(w => w.isEnabled);
        setWidgetStatus(originalHasAnyActive);
      }
    },
    [dashboardData]
  );

  const completedCount = useMemo(
    () => [appStatus, widgetStatus, databaseStatus].filter(Boolean).length,
    [appStatus, widgetStatus, databaseStatus]
  );
  const allComplete = completedCount === 3;

  const handleDismissSetup = useCallback(() => {
    setSetupDismissed(true);
    try {
      localStorage.setItem(LS_KEY_DISMISSED, "1");
    } catch {}
  }, []);

  const handleToggleAll = useCallback(
    () => setIsSetupGuideExpanded((v) => !v),
    []
  );

  const toggleStep = useCallback((id: string) => {
    setOpenStepIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const go = useCallback(
    (path: string) =>
      startTransition(() => {
        navigate(path);
      }),
    [navigate]
  );


   const handleRedirect = () => {
    setIsNavigating(true);
      navigate('/help');
  };

  // --- Render Logic ---
  const isLoading = pageLoadingState === 'loading';
  const isReady = pageLoadingState === 'ready';
  const hasErrors = pageLoadingState === 'error' || errors.length > 0;
  
  const statusBadgeTone = allComplete ? "success" : "info";
  const leadLine =
    "Follow this setup guide to activate and configure the Fitment widgets.";

  const shouldShowSetup =
    isReady && !allComplete && !setupDismissed;
  const shouldShowCompletionBanner =
    isReady && allComplete && !setupDismissed;

   const handleRefresh = useCallback(() => {
      setPageLoadingState("loading");
      setErrors([]);
      setRefreshTrigger((prev) => prev + 1);
    }, []);

  // Show unified loading for better UX
  if (isLoading) {
    return (
      <Page>
        <UnifiedSkeleton />
      </Page>
    );
  }

  return (
    <Page>
      {/* Errors */}
      {hasErrors && (
        <FadeSlide show={true}>
          <Box paddingBlockEnd="300">
            <Banner tone="warning" title="Some checks didn't complete">
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {errors.map((e, i) => (
                  <li key={i}>
                    <Text as="p" tone="subdued">
                      {e}
                    </Text>
                  </li>
                ))}
              </ul>
            </Banner>
          </Box>
        </FadeSlide>
      )}

      {/* Setup Guide */}
      {(shouldShowSetup || shouldShowCompletionBanner) && (
        <FadeSlide show={true} delay={100}>
          <Card>
            <Box padding="200">
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="100" blockAlign="center">
                    <Text as="h2" variant="headingXs">
                      Setup guide
                    </Text>
                    <Badge tone={statusBadgeTone}>{`${completedCount}/3 completed`}</Badge>
                  </InlineStack>

                  <InlineStack gap="0" blockAlign="center">
                    {!allComplete && (
          <ButtonGroup>
                     <Button textAlign="center" icon={RefreshIcon} onClick={handleRefresh} tone="success"> Recheck</Button>

                      <Button
                        variant="plain"
                        icon={
                          isSetupGuideExpanded ? (
                            <Icon source={ChevronUpIcon} />
                          ) : (
                            <Icon source={ChevronDownIcon} />
                          )
                        }
                        onClick={handleToggleAll}
                        accessibilityLabel={
                          isSetupGuideExpanded ? "Collapse setup" : "Expand setup"
                        }
                      />
          </ButtonGroup>
                    )}
                    {allComplete && (
                      <Button
                        variant="tertiary"
                        icon={<Icon source={XIcon} />}
                        accessibilityLabel="Hide setup guide"
                        onClick={handleDismissSetup}
                      />
                    )}
                  </InlineStack>
                </InlineStack>

                {!allComplete && <Text as="p" tone="subdued" variant="bodySm">{leadLine}</Text>}

                {allComplete ? (
                  <Box paddingBlockStart="100">
                    <Banner>
                      <p>
                        Your setup is complete. You can revisit any step later from <Link url="/settings">Settings</Link>.
                      </p>
                    </Banner>
                  </Box>
                ) : (
                  <Collapsible
                    open={isSetupGuideExpanded}
                    id="setup-collapsible"
                    transition={{ duration: "150ms", timingFunction: "ease" }}
                  >
                    <BlockStack gap="200">
                      {checklistItems.map((item) => {
                        const statusMap = {
                          activateApp: appStatus,
                          activateWidgets: widgetStatus,
                          fillDatabase: databaseStatus,
                        };
                        const isCompleted = statusMap[item.id as keyof typeof statusMap] ?? false;
                        const isOpen = openStepIds.has(item.id);
                        return (
                          <StepCard
                            key={item.id}
                            itemId={item.id}
                            label={item.label}
                            description={item.description}
                            isCompleted={isCompleted}
                            isOpen={isOpen}
                            onToggle={toggleStep}
                            onGo={go}
                            shopURL={shopRef.current!}
                            isPendingNav={isPendingNav}
                          />
                        );
                      })}
                    </BlockStack>
                  </Collapsible>
                )}
              </BlockStack>
            </Box>
          </Card>
        </FadeSlide>
      )}

      
      <div  id="fitment-widget-container">
</div>
      
      {/* Dashboard Header */}
      <FadeSlide show={true} delay={200}>
        <Box paddingBlock="300">
          <BlockStack gap="100">
            <Text as="p" variant="headingSm">
              Dashboard
            </Text>
            <Text as="p">Manage Your AutoFit AI Features and Widgets</Text>
          </BlockStack>
        </Box>
      </FadeSlide>

      {/* Widgets */}

      
      <Crossfade
        ready={isReady}
        skeleton={
          <BlockStack gap="300" data-crossfade-measure>
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </BlockStack>
        }
        minHeightEstimate={3 * 210}
        delay={300}
      >
        <BlockStack gap="300">
          {deferredDashboardData.length > 0 ? (
            deferredDashboardData.map((data) => (
              <CardComponent
                key={data.id}
                widgetId={data.id}
                widgetType={data.widget_type}
                isEnabled={data.isEnabled}
                heading={data.heading}
                description={data.description}
                imageSrc={data.image}
                route={data.route}
                availableToPlan={data.availableToPlan}
                onStatusChange={handleWidgetStatusChange}
              />
            ))
          ) : (
            <Card>
              <Box padding="400">
                <Text as="p" tone="subdued">
                  No widgets are available to display on the dashboard.
                </Text>
              </Box>
            </Card>
          )}
        </BlockStack>
      </Crossfade>

      {/* Support & Feedback */}
      <FadeSlide show={true} delay={500}>
        <Box paddingBlockStart="400">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingSm">
                    Support and feedback
                  </Text>
                  <Text as="p" tone="subdued">
                    Schedule a free onboarding call with our Merchant Support team, or chat with us now, to get set up.
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                     <Button variant="secondary" onClick={handleRedirect} loading={isNavigating}>
                    Contact Us
                  </Button>
  
                  </InlineStack>
                </BlockStack>

                <InlineGrid columns={2} gap="400">
                  {sections.map((section, index) => (
                    <CardSection
                      key={index}
                      icon={section.icon}
                      title={section.title}
                      description={section.description}
                      link={section.link}
                      isExternal={section.isExternal}
                    />
                  ))}
                </InlineGrid>
              </BlockStack>
            </Box>
          </Card>
          <Box paddingBlockEnd="800" />
        </Box>
      </FadeSlide>
    </Page>
  );
}