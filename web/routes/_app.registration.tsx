import {
  Page,
  Card,
  BlockStack,
  Text,
  Box,
  Layout,
  Tabs,
  TextField,
  FormLayout,
  Grid,
  Select,
  InlineStack,
  Checkbox,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonTabs,
  Toast,
} from "@shopify/polaris";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "@remix-run/react";
import { getWidgetSettings, saveWidgetSettings } from "../lib/widgetSettings";
import type { RegistrationWidgetConfig } from "../types/widget";
import ColorSwatch from "../components/ColorSwatch";
import { api } from "../api";

export default function RegistrationWidgetSettingsPage() {
  const navigate = useNavigate();
  
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] = useState<RegistrationWidgetConfig | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const [toast, setToast] = useState<{
    active: boolean;
    message: string;
    isError: boolean;
  }>({
    active: false,
    message: "",
    isError: false,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  const shopDomain: any = (window as any)?.shopify?.config?.shop;

  const tabs = [
    { id: "appearance", content: "Appearance" },
    { id: "options", content: "Options" },
    { id: "translations", content: "Translations" },
    { id: "country", content: "Country" },
  ];


useEffect(() => {
  (async () => {
    try {
      const shop = await api.shopifyShop.findFirst({
        filter: { domain: { equals: shopDomain } },
        select: {
          country: true,
          countryCode: true,
          countryName: true,
        },
      });

      console.log("Shop data:", shop);

      // Normalize country value
      const country = shop?.countryCode;
      if (!country) return;

      const normalized = country.toString().trim().toUpperCase();
      console.log("Normalized country:", normalized);

      const flagMap: Record<string, string> = {
        GB: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/UK.svg?v=1758772686",
        NL: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/Netherlands.svg?v=1758772686",
        US: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/USA.svg?v=1758772685",
        NZ: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/NZ.svg?v=1758772685",
        CA: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/Canada.svg?v=1758772685",
        AU: "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/AUS.svg?v=1758774302",
      };

      setImageUrl(
        flagMap[normalized] ||
          "https://cdn.shopify.com/s/files/1/0960/4159/9311/files/UK.svg?v=1758772686"
      );
    } catch (err) {
      console.error("Error fetching shop country:", err);
    }
  })();
}, [shopDomain]);


  const defaultConfig: RegistrationWidgetConfig = {
    options: { show_icons: true, show_title: true, rate_limit: "5", countries: [] },
    appearance: {
      title: "Vehicle Selector",
      placeholder: "Enter your registration number.",
      colors: {
        text_color: "#000000",
        border_color: "#CCCCCC",
        background_color: "#FFFFFF",
        primary_button_color: "#4CAF50",
        primary_button_text_color: "#FFFFFF",
        input_background_color: "#FFD100",
      },
      layout: "horizontal",
      submit_button: { icon: "search", show: true, label: "Find Parts" },
    },
    translations: {
      no_fit_message: "We couldn't find matching parts for your vehicle.",
      submit_button_text: "Find Parts",
      cap_exceed_message: "Sorry Your Cap Exceed",
      rate_limit_message: "Your IP has been blocked for using our service so often."
    },
  };

  /* ---------------- Fetch Settings ---------------- */
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const shopDomain = (window as any)?.shopify?.config?.shop;
        const settings = await getWidgetSettings(shopDomain, "registration_widget");

        const mergedConfig = {
          ...defaultConfig,
          ...settings,
          options: { ...defaultConfig.options, ...settings?.options },
          appearance: {
            ...defaultConfig.appearance,
            ...settings?.appearance,
            colors: {
              ...defaultConfig.appearance.colors,
              ...settings?.appearance?.colors,
            },
          },
          translations: {
            ...defaultConfig.translations,
            ...settings?.translations,
          },
        };

        setConfig(mergedConfig);
      } catch (error) {
        console.error("Something Wrong Happened", error);
        setConfig(defaultConfig);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /* ---------------- Update Config ---------------- */
  const updateConfig = useCallback((path: string, value: any) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = window.setTimeout(() => {
      setConfig((prevConfig: any) => {
        if (!prevConfig) return null;

        const pathArray = path.split(".");
        const newConfig: any = JSON.parse(JSON.stringify(prevConfig));
        let current = newConfig;

        for (let i = 0; i < pathArray.length - 1; i++) {
          current = current[pathArray[i]];
        }

        current[pathArray[pathArray.length - 1]] = value;
        return newConfig as RegistrationWidgetConfig;
      });

      setIsDirty(true);
    }, 120);
  }, []);

  /* ---------------- Save Handler ---------------- */
  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);

    try {
      const shopDomain: any = (window as any)?.shopify?.config?.shop;
      const { success, error } = await saveWidgetSettings(shopDomain, "registration_widget", config);

      if (success) {
        setToast({ active: true, message: "Configuration saved successfully!", isError: false });
        setIsDirty(false);
      } else {
        throw new Error(error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setToast({ active: true, message: `Save failed: ${error.message}`, isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  /* ---------------- Skeleton Loader ---------------- */
  if (loading || !config) {
    return (
      <Frame>
        <SkeletonPage primaryAction>
          <Layout>
            <Layout.Section>
              <Card>
                <SkeletonDisplayText size="medium" />
                <Box paddingBlockStart="200">
                  <SkeletonBodyText lines={6} />
                </Box>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <SkeletonTabs />
              <Card>
                <SkeletonBodyText lines={8} />
              </Card>
            </Layout.Section>
          </Layout>
        </SkeletonPage>
      </Frame>
    );
  }

  /* ---------------- Preview ---------------- */
  const renderPreview = () => {
    const isHorizontal = config.appearance.layout === "horizontal";

    const shellStyle: React.CSSProperties = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: config.appearance.colors.background_color,
      padding: "14px",
      borderRadius: "8px",
      border: `1px solid ${config.appearance.colors.border_color}`,
    };

    return (
      <Card>
        <BlockStack gap="300" inlineAlign="start">
          <div style={{ padding: "12px 12px 0 12px", width: "100%" }}>
            <Text variant="headingMd" as="h3">
              Live Preview
            </Text>
            <Box paddingBlockStart="100">
              <Text variant="bodySm" as="p" tone="subdued">
                This is only a preview of settings. The data shown here is dummy.
                The actual registration widget preview on the storefront may differ based on real data.
              </Text>
            </Box>
          </div>

          <div style={{ padding: "12px", backgroundColor: "#f9fafb", width: "100%" }}>
            <div style={shellStyle}>
              <div
                style={
                  isHorizontal
                    ? { display: "flex", alignItems: "center", justifyContent: "center", gap: "4rem" }
                    : { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }
                }
              >
                {/* Input */}
                <div
                  style={{
                    display: "flex",
                    background: config.appearance.colors.input_background_color,
                    alignItems: "center",
                    width: "360px",
                    height: "70px",
                    border: "3px solid black",
                    borderRadius: "16px",
                    fontFamily: "'Charles Wright', sans-serif",
                  }}
                >
                  <div
                    style={{
                      background: "rgb(49,96,173)",
                      height: "100%",
                      width: "60px",
                      borderRadius: "13px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="UK flag"
                      style={{ height: "40%" }}
                    />
                  </div>
                  <div style={{ fontSize: "34px" }}>
                    <input
                      placeholder={config.appearance.placeholder}
                      style={{
                        width: "300px",
                        fontWeight: 700,
                        padding: "0 50px",
                        height: "60px",
                        backgroundColor: config.appearance.colors.input_background_color,
                        border: "none",
                        outline: "none",
                        borderRadius: "12px",
                        fontSize: "32px",
                      }}
                    />
                  </div>
                </div>

                {/* Button */}
                <button
                  style={{
                    backgroundColor: config.appearance.colors.primary_button_color,
                    color: config.appearance.colors.primary_button_text_color,
                    fontWeight: "bold",
                    fontSize: "18px",
                    padding: "12px 32px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  {config.translations.submit_button_text}
                </button>
              </div>

              {/* Title + Icon */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "1rem" }}>
                {config.options.show_icons && (
                  <img
                    src="https://cdn.shopify.com/s/files/1/0960/4159/9311/files/info.bf6e58ee.svg?v=1758702787"
                    alt="Info Icon"
                    style={{ width: "24px", height: "24px" }}
                  />
                )}
                {config.options.show_title && (
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: config.appearance.colors.text_color }}>
                    {config.appearance.title}
                  </h2>
                )}
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    );
  };

  return (
    <Frame>
      {toast.active && (
        <Toast
          content={toast.message}
          onDismiss={() => setToast({ ...toast, active: false })}
          duration={4000}
          error={toast.isError}
        />
      )}

      <Page
        title="Search By Registration/VIN Configuration"
        backAction={{ content: "Back", onAction: () => navigate("/") }}
        primaryAction={{
          content: "Save Configuration",
          onAction: handleSave,
          disabled: !isDirty || isSaving,
          loading: isSaving,
        }}
      >
        <Layout>
          <Layout.Section>{renderPreview()}</Layout.Section>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: "12px" }}>
                {selectedTab === 0 && <AppearanceTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 1 && <OptionTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 2 && <TranslationTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 3 && <CountryTab config={config} updateConfig={updateConfig} />}
              </div>
            </Tabs>
          </Layout.Section>
        </Layout>
        <Box paddingBlockEnd="600" />
      </Page>
    </Frame>
  );
}


/* ---------------- Tabs ---------------- */

const AppearanceTab: React.FC<{ config: RegistrationWidgetConfig ; updateConfig: (path: string, value: any) => void}> = ({config , updateConfig}) => {
  const [title, setTitle] = useState(config.appearance.title);
  const [placeholder , setPlaceholder] = useState(config.appearance.placeholder)

  useEffect(() => {
    setTitle(config.appearance.title)
    setPlaceholder(config.appearance.placeholder)
  },[config.appearance.title , config.appearance.placeholder])
 
  return (
    <BlockStack gap="400">
      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">
            Text & Layout
          </Text>
          <TextField
            label="Title"
            value={title}
            onChange={(value: string) => {setTitle(value) ; updateConfig('appearance.title', value)}}
            autoComplete="off"
          />
          <FormLayout.Group condensed>
            <Select
              label="Layout"
              options={[
                { label: "Horizontal", value: "horizontal" },
                { label: "Vertical", value: "vertical" },
              ]}
              value={config.appearance.layout}
              onChange={(value) => updateConfig('appearance.layout', value) }
            />
            <TextField
              label="Enter Your Placeholder"
              autoComplete="off"
              value={placeholder}
              onChange={(value) => {setPlaceholder(value); updateConfig('appearance.placeholder', value); }}
            />
          </FormLayout.Group>
        </FormLayout>
      </Card>

      <Card>
        <Text variant="headingMd" as="h3">
          Colors
        </Text>
        <div style={{ marginTop: "12px" }}>
          <Grid>
            {Object.entries(config.appearance.colors).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <Grid.Cell key={key} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <ColorSwatch
                    label={label}
                    color={value as string}
                    onChange={(newValue) => updateConfig(`appearance.colors.${key}`, newValue)}
                  />
                </Grid.Cell>
              );
            })}
          </Grid>
        </div>
      </Card>
    </BlockStack>
  );
};

const OptionTab: React.FC<{ config: RegistrationWidgetConfig; updateConfig: (path: string, value: any) => void}> = ({config , updateConfig}) => (
  <BlockStack gap="400">
    <Card>
      <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
        <Text variant="headingMd" as="h3">
          Display Options
        </Text>
      </div>
      <InlineStack gap="800">
        <Checkbox
          label="Show Title"
          checked={config.options.show_title}
          onChange={(value) => updateConfig('options.show_title', value)}
        />
        <Checkbox
          label="Show Icons"
          checked={config.options.show_icons}
          onChange={(value) => updateConfig('options.show_icons', value)}
        />
      </InlineStack>
      <div style={{marginTop: "2rem" , marginBottom: '1rem'}}>
        <Text variant="headingMd" as="h3">
          Rate Limiting (Per IP Address/ Per Month)
        </Text>
      </div>
      <Select
         label=""
         options={[
                { label: "5 Request", value: "5" },
                { label: "10 Request", value: "10" },
                { label: "15 Request", value: "15" },
                { label: "20 Request", value: "20" },
              ]}
         value={config.options.rate_limit} 
         onChange={(value) => updateConfig('options.rate_limit', value) }
        >
      </Select>
    </Card>
  </BlockStack>
);

const TranslationTab : React.FC<{ config: RegistrationWidgetConfig; updateConfig: (path: string, value: any) => void}> = ({config , updateConfig}) => {

  const [noFitMessage, setNoFitMessage] = useState(config.translations.no_fit_message);
  const [submitButtonText, setSubmitButtonText] = useState(config.translations.submit_button_text);
  const [capExceedMessage , setCapExceedMessage] = useState(config.translations.cap_exceed_message)
  const [ipAddMessage , setIpAddMessage] = useState(config.translations.rate_limit_message)

  useEffect(()=> {
    setNoFitMessage(config.translations.no_fit_message);
    setSubmitButtonText(config.translations.submit_button_text);
    setCapExceedMessage(config.translations.cap_exceed_message)
    setIpAddMessage(config.translations.rate_limit_message)
  },[config.translations])
  
  return (
  <Card>
    <FormLayout>
      <FormLayout.Group condensed>
      <TextField
        label="No Fit Message"
        value={config.translations.no_fit_message}
        onChange={(value) => {
            setNoFitMessage(value);
            updateConfig('translations.no_fit_message', value);
          }}
        autoComplete="off"
      />
        <TextField
          label="Submit Button Text"
          value={config.translations.submit_button_text}
          onChange={(value) => {
              setSubmitButtonText(value);
              updateConfig('translations.submit_button_text', value);
            }}
          autoComplete="off"
        />
      </FormLayout.Group>
      <FormLayout.Group condensed>
           <TextField label="Cap Exceed Message" autoComplete="off" value={config.translations.cap_exceed_message} onChange={(value)=> {setCapExceedMessage(value) ; updateConfig('translations.cap_exceed_message' , value)}} />
           <TextField label="IP Rate Limit Message" autoComplete="off" value={config.translations.rate_limit_message} onChange={(value)=> {setIpAddMessage(value) ; updateConfig('translations.rate_limit_message' , value)}} />           
      </FormLayout.Group>
    </FormLayout>
  </Card>
)};


const CountryTab: React.FC<{
  config: RegistrationWidgetConfig;
  updateConfig: (path: string, value: any) => void;
}> = ({ config, updateConfig }) => {
  const countryMap: Record<string, string> = {
    UK: "United Kingdom",
    NL: "Netherlands",
    US: "United States",
    NZ: "New Zealand",
    CA: "Canada",
    AU: "Australia",
  };

  const availableCountries = Object.keys(countryMap);

  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    config.options?.countries || []
  );

  const handleToggle = (code: string) => {
    setSelectedCountries((prev) => {
      const exists = prev.includes(code);
      const next = exists ? prev.filter((c) => c !== code) : [...prev, code];
      updateConfig("options.countries", next);
      return next;
    });
  };

  return (
    <Card>
      <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
        <Text variant="headingMd" as="h3">
          Available Countries
        </Text>
      </div>

      <BlockStack gap="300">
        {/* First row */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {availableCountries.slice(0, 3).map((code) => (
            <div key={code} style={{ flex: 1 }}>
              <Checkbox
                label={countryMap[code]}
                checked={selectedCountries.includes(code)}
                onChange={() => handleToggle(code)}
              />
            </div>
          ))}
        </div>

        {/* Second row */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {availableCountries.slice(3, 6).map((code) => (
            <div key={code} style={{ flex: 1 }}>
              <Checkbox
                label={countryMap[code]}
                checked={selectedCountries.includes(code)}
                onChange={() => handleToggle(code)}
              />
            </div>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
};