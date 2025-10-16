import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Frame,
  BlockStack,
  InlineGrid,
  Badge,
  SkeletonBodyText,
  SkeletonDisplayText,
  Icon,
  InlineStack,
  Button,
  Collapsible,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon } from "@shopify/polaris-icons";
import { useState, useEffect, useCallback } from "react";
import { useFindMany } from "@gadgetinc/react";
import { useNavigate } from "@remix-run/react";
import { api } from "../api";

interface Theme {
  id: string;
  name: string;
  role: string;
}

interface ThemeStatus {
  id: string;
  name: string;
  role: string;
  widgets: {
    fitment: boolean;
    verify: boolean;
    table: boolean;
    ai: boolean;
  };
}

export default function InstallationPage() {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeStatus, setThemeStatus] = useState<ThemeStatus[] | null>(null);
  const [themeStatusLoading, setThemeStatusLoading] = useState<boolean>(false);
  
  const [{ data: themes, fetching }] = useFindMany(api.shopifyTheme, {
    select: { id: true, name: true, role: true },
    sort: { role: "Ascending" },
  });

  const filteredThemes = (themes || []).filter(t => t.role !== "DEVELOPMENT");

  const fetchStatus = async () => {
    setThemeStatusLoading(true);
    try {
      const responseData = await api.getThemeStatus();
      setThemeStatus(responseData);
    } catch (error) {
      console.error('Error fetching theme status:', error);
      setThemeStatus([]);
    } finally {
      setThemeStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (filteredThemes && filteredThemes.length > 0 && !selectedTheme) {
      setSelectedTheme(filteredThemes[0]);
    }
  }, [filteredThemes, selectedTheme]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  const getWidgetsForTheme = (themeId: string) => {
    if (!themeStatus) {
      return {
        fitment: false,
        verify: false,
        table: false,
        ai: false,
      };
    }
    const match = themeStatus.find(
      (t: ThemeStatus) => t.id.endsWith(themeId) || t.id === themeId
    );
    return (
      match?.widgets || {
        fitment: false,
        verify: false,
        table: false,
        ai: false,
      }
    );
  };

  const getThemeIdFromShopifyId = (shopifyThemeId: string): string => {
    // Extract theme ID from Shopify GID format (gid://shopify/Theme/123456789)
    const parts = shopifyThemeId.split('/');
    return parts[parts.length - 1];
  };

  return (
    <Frame>
      <Page
        title="Installation"
        backAction={{ content: "Back", onAction: () => navigate("/") }}
        primaryAction={{
          content: "Refresh",
          onAction: fetchStatus,
          loading: themeStatusLoading,
        }}
      >
        <Card>
          <InlineGrid columns={["oneThird", "twoThirds"]} gap="800">
            {/* Left side: themes */}
            <BlockStack>
              {fetching ? (
                <Card>
                  <SkeletonBodyText lines={6} />
                </Card>
              ) : (
                <ResourceList
                  resourceName={{ singular: "theme", plural: "themes" }}
                  items={filteredThemes || []}
                  renderItem={(item) => {
                    const { id, name, role } = item;
                    return (
                      <ResourceItem
                        id={id}
                        onClick={() => setSelectedTheme(item)}
                        accessibilityLabel={`Select ${name}`}
                      >
                          <InlineStack align="start" blockAlign="center" gap="200">
                          <Text
                            as="h3"
                            variant="bodyMd"
                            fontWeight={selectedTheme?.id === id ? "bold" : "regular"}
                          >
                            {name} 
                          </Text>
                            {role === "MAIN" && (
                              <Badge tone="success" progress="complete">live</Badge>
                            )}
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </BlockStack>

            {/* Right side: widgets */}
            <BlockStack gap="400">
              {themeStatusLoading ? (
                <>
                  <SkeletonDisplayText size="medium" />
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <SkeletonBodyText lines={1} />
                    </Card>
                  ))}
                </>
              ) : selectedTheme ? (
                <>
                  <Text variant="headingMd" as="h2">
                    {selectedTheme.name}
                  </Text>
                  {Object.entries(getWidgetsForTheme(selectedTheme.id)).map(
                    ([key, active]) => (
                      <div
                        key={key}
                        style={{ cursor: "pointer" }}
                        onClick={() => toggle(key)}
                      >
                        <Card>
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Icon
                                source={open[key] ? ChevronUpIcon : ChevronDownIcon}
                              />
                              <Text as="span">{labelForWidget(key)}</Text>
                            </InlineStack>
                            <Badge tone={active ? "success" : "critical"}>
                              {active ? "Active" : "Inactive"}
                            </Badge>
                          </InlineStack>
                          <Collapsible id={key} open={open[key]}>
                            <div style={{marginTop: '1rem'}}>
                              <BlockStack gap="600">
                                <Text as="h3" variant="bodyMd">
                                  {active 
                                    ? `${labelForWidget(key)} is currently active on your theme.`
                                    : `Place ${labelForWidget(key)} to custom on-page position.`
                                  }
                                </Text>
                                {active ? (
                                  <DeactivateWidget 
                                    name={labelForWidget(key)} 
                                    widgetKey={key}
                                    themeId={getThemeIdFromShopifyId(selectedTheme.id)}
                                  />
                                ) : (
                                  <StepListExample 
                                    name={labelForWidget(key)} 
                                    url={urlForWidget(key, getThemeIdFromShopifyId(selectedTheme.id))} 
                                  />
                                )}
                                {!active && imageForWidget(key) && (
                                  <img
                                    src={imageForWidget(key)!}
                                    alt={labelForWidget(key)}
                                    style={{ maxWidth: "100%", borderRadius: "8px" }}
                                  />
                                )}
                              </BlockStack>
                            </div>
                          </Collapsible>
                        </Card>
                      </div>
                    )
                  )}
                </>
              ) : (
                <Text as="span">Select a theme from the left</Text>
              )}
            </BlockStack>
          </InlineGrid>
        </Card>
      </Page>
    </Frame>
  );
}

// Helper: human-friendly widget labels
function labelForWidget(key: string): string {
  switch (key) {
    case "fitment":
      return "Fitment Widget";
    case "verify":
      return "Verify Fitment Widget";
    case "table":
      return "Product Fitment Table";
    case "ai":
      return "Chatbot with AI Assistant";
    default:
      return key;
  }
}

function imageForWidget(key: string): string | null {
  switch (key) {
    case "fitment":
      return "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/screen-3.png?v=1757938089";
    case "verify":
      return "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/screen-2.png?v=1757938100";
    case "table":
      return "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/screen-1.png?v=1757938090";
    case "ai":
      return "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/screen-4.png?v=1757938090";
    default:
      return null;
  }
}

function urlForWidget(key: string, themeId: string): string {
  switch (key) {
    case "fitment":
      return `shopify://admin/themes/${themeId}/editor?template=index&addAppBlockId=${shopify.config.apiKey}/fitmentWidget&target=newAppsSection`;
    case "verify":
      return `shopify://admin/themes/${themeId}/editor?template=product&addAppBlockId=${shopify.config.apiKey}/verifyFitmentWidget&target=mainSection`;
    case "table":
      return `shopify://admin/themes/${themeId}/editor?template=product&addAppBlockId=${shopify.config.apiKey}/fitmentTable&target=newAppsSection`;
    case "ai":
      return `shopify://admin/themes/${themeId}/editor?context=apps&template=index&activateAppId=${shopify.config.apiKey}/asset-embed`;
    default:
      return "https://your-domain.com"; 
  }
}

function getDeactivateUrlForWidget(key: string, themeId: string): string {
  switch (key) {
    case "fitment":
      return `shopify://admin/themes/${themeId}/editor?template=index`;
    case "verify":
      return `shopify://admin/themes/${themeId}/editor?template=product`;
    case "table":
      return `shopify://admin/themes/${themeId}/editor?template=product`;
    case "ai":
      return `shopify://admin/themes/${themeId}/editor?context=apps&template=index`;
    default:
      return `shopify://admin/themes/${themeId}/editor`;
  }
}

function DeactivateWidget({ name, widgetKey, themeId }: { name: string; widgetKey: string; themeId: string }) {
  const deactivateUrl = getDeactivateUrlForWidget(widgetKey, themeId);
  
  return (
    <BlockStack gap="400">
    <InlineStack align="start">
      <Button
        variant="secondary"
        tone="critical"
        size="slim"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.open(deactivateUrl, "_blank");
        }}
      >
        Deactivate {name}
      </Button>
    </InlineStack>
      
      <Text as="span" variant="bodyMd" tone="subdued">
        Click to open theme editor and remove the widget
      </Text>
    </BlockStack>
  );
}

function StepListExample({ name, url }: { name: string; url: string }) {
  const steps = [
    {
      id: 1,
      content: (
        <InlineStack gap="200">
          Go to{" "}
          <Button
            variant="primary"
            size="slim"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.open(url, "_blank");
            }}
          >
            Theme customizer
          </Button>
        </InlineStack>
      ),
    },
    {
      id: 2,
      content:
        name === "Chatbot with AI Assistant" ? (
          <>Enable the app from app settings</>
        ) : (
          <InlineStack gap="200">
            Click <b>Add section</b> and choose <b>AutoFit AI {name}</b>
          </InlineStack>
        ),
    },
    {
      id: 3,
      content: <>Click <b>Save</b></>,
    },
  ];

  return (
    <BlockStack gap="300">
      {steps.map((step) => (
        <InlineStack key={step.id} gap="400" blockAlign="center">
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              border: "2px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {step.id}
          </div>
          <Text as="span" variant="bodyMd">
            {step.content}
          </Text>
        </InlineStack>
      ))}
    </BlockStack>
  );
}