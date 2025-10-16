import {useMemo , useState , useEffect , memo , useRef , useCallback , useTransition} from 'react'
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
} from "@shopify/polaris"
import { ChevronUpIcon, ChevronDownIcon, XIcon, RefreshIcon } from "@shopify/polaris-icons";
import { checklistItems, sections } from "../constant/constant";
import CheckBoxTickIcon from "../components/icons/CheckBoxTickIcon";
import CheckBoxIcon from "../components/icons/CheckBoxIcon";
import ActivateAppIcon from "../components/icons/ActivateAppIcon";
import ActivateWidgetIcon from "../components/icons/ActivateWidgetIcon";
import ActivateDatabaseIcon from "../components/icons/ActivateDatabaseIcon";
import { useNavigate } from "@remix-run/react";
import { api } from "../api";
import type { GadgetWidgetData } from "../types/widgets";
import type { DashboardWidget } from "../types/widgets";
import {
  getAllWidgetStatuses,
  setWidgetEnabledStatus,
} from "../lib/widgetSettings";
import { hasFitmentSets } from "../lib/database";


export default function SetupCard  ({page}: {page: "dashboard" | "settings"})  {

  const navigate = useNavigate()
  const LS_KEY_DISMISSED = "cm_setup_dismissed_v2";
  type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

  const shopRef = useRef<string | null>(null)
  const [isPendingNav, startTransition] = useTransition();
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const [appStatus, setAppStatus] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardWidget[]>([]);

  const [isSetupGuideExpanded, setIsSetupGuideExpanded] = useState(true);
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(new Set());
  const [setupDismissed, setSetupDismissed] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

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

  const completedCount = useMemo(
    () => [appStatus, widgetStatus, databaseStatus].filter(Boolean).length,
    [appStatus, widgetStatus, databaseStatus]
  );

  const allComplete = page === "settings" ? false :  completedCount === 3
  const statusBadgeTone = allComplete ? "success" : "info";
  const leadLine = "Follow this setup guide to activate and configure the Fitment widgets.";

  const [pageLoadingState, setPageLoadingState] = useState<LoadingState>('loading');
  const [hydrated, setHydrated] = useState(false);


  const isReady = pageLoadingState === 'ready';
  const isLoading = pageLoadingState === 'loading';
  const hasErrors = pageLoadingState === 'error' || errors.length > 0

   const shouldShowSetup = isReady && !allComplete && !setupDismissed;
  const shouldShowCompletionBanner = isReady && allComplete && !setupDismissed;

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


    // Hydration + persistent dismissal check
  useEffect(() => {
    setHydrated(true);
    shopRef.current = (window as any)?.shopify?.config?.shop ?? null;
    try {
      // const dismissed = localStorage.getItem(LS_KEY_DISMISSED) === "1";
      const dismissed = false;
      setSetupDismissed(dismissed);
    } catch {}
  }, []);

  const handleToggleAll = useCallback(
    () => setIsSetupGuideExpanded((v) => !v),
    []
  );

  const handleDismissSetup = useCallback(() => {
    setSetupDismissed(true);
    try {
      localStorage.setItem(LS_KEY_DISMISSED, "1");
    } catch {}
  }, []);

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

  const loadAllData = async (shopDomain: string, isCancelled: boolean) => {
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

  useEffect(()=> {
     if(!hydrated) return 
     let isCancelled = false;
     const shopDomain = shopRef.current

     if(!shopDomain){
      setErrors(["Shop domain could not be detected."]);
      setPageLoadingState('error');
      return;
     }

     loadAllData(shopDomain , isCancelled)

     return () => {
      isCancelled = true;
    };
     
  }, [hydrated, refreshTrigger])

     const handleRefresh = useCallback(() => {
      setPageLoadingState("loading");
      setErrors([]);
      setRefreshTrigger((prev) => prev + 1);
    }, []);

  if(isLoading){
    return (
      <SkeletonSetupCard/>
    )
  }
  
  return (
    <>
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
                            page={page}
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
    </>
  )
}

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
  page
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
  page: "dashboard" | "settings"
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

                   if(page === "dashboard"){
                  const el = document.getElementById("fitment-widget-container");
                  if (el) {
                    const yOffset = -150; 
                    const y =
                      el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }     
                } else {
                     navigate('/')
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
})

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

/** ---------------- Skeleton Setup Card ---------------- */
const SkeletonSetupCard = memo(function SkeletonSetupCard() {
  return (
    <Card>
      <Box padding="200">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="100" blockAlign="center">
              <SkeletonDisplayText size="small" />
              <SkeletonDisplayText size="extraSmall" />
            </InlineStack>
            <SkeletonDisplayText size="extraSmall" />
          </InlineStack>
          <SkeletonBodyText lines={2} />
        </BlockStack>
      </Box>
    </Card>
  );
});