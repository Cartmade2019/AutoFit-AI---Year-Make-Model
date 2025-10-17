import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Page,
  Layout,
  Tabs,
  BlockStack,
  Card,
  FormLayout,
  Text,
  Checkbox,
  InlineStack,
  Select,
  Frame,
  Toast,
  TextField,
  SkeletonBodyText,
  SkeletonDisplayText,
  Grid,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { getWidgetSettings, saveWidgetSettings } from "../lib/widgetSettings";
import type { GarageWidgetConfig } from "../types/widget";
import ColorSwatch from "../components/ColorSwatch";
import GaragePreview from "../components/GaragePreview"

export default function GarageWidgetPage() {
  const navigate = useNavigate();

  // Tabs
  const [selectedTab, setSelectedTab] = useState(0);
  const tabs = [
    { id: "appearance", content: "Appearance" },
    { id: "translations", content: "Translations" },
  ];

  // Global state
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<GarageWidgetConfig | null>(null);
  const debounceTimeout = useRef<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Toaster
  const [toast, setToast] = useState<{
    active: boolean;
    message: string;
    isError: boolean;
  }>({
    active: false,
    message: "",
    isError: false,
  });

  // Default config
  const defaultConfig: GarageWidgetConfig = {
    appearance: {
      show_title: true,
      show_icons: true,
      garage_icon_url:
        "https://cdn-icons-png.flaticon.com/512/4712/4712027.png",
      position: "right",
      colors: {
        text_color: "#000000",
        border_color: "#CCCCCC",
        background_color: "#FFFFFF",
        primary_button_color: "#007BFF",
        secondary_button_color: "#6C757D",
        primary_button_text_color: "#FFFFFF",
        secondary_button_text_color: "#FFFFFF",
        selected_border_color: "#000000",
        input_background_color: "#FFF",
      },
    },
    translations: {
      title: "Garage",
      open_title: "Your Garage",
      empty_state: "You have not selected any vehicles.",
      select_vehicle: "Select Your Vehicle.",
      add_button: "Add a Vehicle",
      cancel_button: "Cancel",
      add_garage_button: "Add to garage",
    },
  };

  // Fetch settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = (window as any)?.shopify?.config?.shop;
        const settings = await getWidgetSettings(shopDomain, "garage_widget");

        const mergedConfig = {
          ...defaultConfig,
          ...settings,
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
        console.error("Error fetching settings", error);
        setConfig(defaultConfig);
        setToast({
          active: true,
          message: "Could not load settings.",
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Debounced config update
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
        return newConfig as GarageWidgetConfig;
      });
      setIsDirty(true);
    }, 120);
  }, []);

  // Save config
  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const shopDomain: any = (window as any)?.shopify?.config?.shop;
      const { success, error } = await saveWidgetSettings(
        shopDomain,
        "garage_widget",
        config
      );

      if (success) {
        setToast({
          active: true,
          message: "Configuration saved successfully!",
          isError: false,
        });
        setIsDirty(false);
      } else {
        throw new Error(error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setToast({
        active: true,
        message: `Save failed: ${error.message}`,
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  // Loading skeleton
  if (loading || !config) {
    return (
      <Frame>
        <Page title="My Garage Widget">
          <Layout>
            <Layout.Section>
              <Card>
                <SkeletonDisplayText size="small" />
                <div style={{ marginTop: "1rem" }}>
                  <SkeletonBodyText lines={10} />
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  return (
    <>
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
          title="My Garage Widget"
          backAction={{ content: "Back", onAction: () => navigate("/") }}
          subtitle="This is only a preview of settings. The data shown here is dummy. The actual widget preview on the storefront may differ based on real data."
          primaryAction={{
            content: "Save Configuration",
            onAction: handleSave,
            disabled: !isDirty || isSaving,
            loading: isSaving,
          }}
        >
          {/* Garage preview */}
           <GaragePreview config={config}/>
          {/* Settings UI */}
          <Layout>
            <Layout.Section>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <div style={{ marginTop: "12px" }}>
                  {selectedTab === 0 && (
                    <AppearanceTab
                      config={config}
                      updateConfig={updateConfig}
                    />
                  )}
                  {selectedTab === 1 && (
                    <TranslationTab
                      config={config}
                      updateConfig={updateConfig}
                    />
                  )}
                </div>
              </Tabs>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    </>
  );
}

const AppearanceTab: React.FC<{
  config: GarageWidgetConfig;
  updateConfig: (path: string, value: any) => void;
}> = ({ config, updateConfig }) => {
  const [showFormTitle, setShowFormTitle] = useState(
    config.appearance.show_title
  );
  const [showIcon, setShowIcon] = useState(config.appearance.show_icons);
  const [position, setPosition] = useState<string>(config.appearance.position);

  useEffect(() => {
    setShowFormTitle(config.appearance.show_title);
    setShowIcon(config.appearance.show_icons);
    setPosition(config.appearance.position);
  }, [
    config.appearance.show_title,
    config.appearance.show_icons,
    config.appearance.position,
  ]);

  return (
    <BlockStack gap="400">
      <Card>
        <FormLayout>
          <div style={{ marginTop: "0.5rem" }}>
            <Text variant="headingMd" as="h3">
              Display Options
            </Text>
          </div>
          <InlineStack gap="400">
            <Checkbox
              label="Show Form Title"
              checked={showFormTitle}
              onChange={(value) => {
                setShowFormTitle(value);
                updateConfig("appearance.show_title", value);
              }}
            />
            <Checkbox
              label="Show Icon"
              checked={showIcon}
              onChange={(value) => {
                setShowIcon(value);
                updateConfig("appearance.show_icons", value);
              }}
            />
          </InlineStack>
          <div style={{ marginTop: "0.5rem" }}>
            <Text variant="headingMd" as="h3">
              Garage Widget Icon URL
            </Text>
          </div>

          <TextField
            label=""
            value={config.appearance.garage_icon_url}
            onChange={(value) =>
              updateConfig("appearance.garage_icon_url", value)
            }
            autoComplete="off"
            helpText="Icon displayed on the garage widget lookup."
          />

          <div style={{ marginTop: "0.5rem" }}>
            <Text variant="headingMd" as="h3">
              Widget Position
            </Text>
          </div>
          <Select
            label=""
            options={[
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
              { label: "Bottom", value: "bottom" },
            ]}
            value={position}
            onChange={(value) => {
              setPosition(value);
              updateConfig("appearance.position", value);
            }}
          />
        </FormLayout>
      </Card>

      <Card>
        <Text variant="headingMd" as="h3">
          Colors
        </Text>
        <div style={{ marginTop: "12px" }}>
          <Grid>
            {Object.entries(config.appearance.colors).map(([key, value]) => {
              const label = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <Grid.Cell
                  key={key}
                  columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                >
                  <ColorSwatch
                    label={label}
                    color={value as string}
                    onChange={(newValue) =>
                      updateConfig(`appearance.colors.${key}`, newValue)
                    }
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

const TranslationTab: React.FC<{ config: GarageWidgetConfig; updateConfig: (path: string, value: any) => void }> = ({config , updateConfig}) => {

   const [title , setTitle] = useState(config.translations.title)
   const [openTitle , setOpenTitle] = useState(config.translations.open_title)
   const [emptyState , setEmptyState] = useState(config.translations.empty_state)
   const [selectVehicle , setSelectVehicle] = useState(config.translations.select_vehicle)
   const [addButton , setAddButton] = useState(config.translations.add_button)
   const [cancelButton , setCancelButton] = useState(config.translations.cancel_button)
   const [addGarageButton , setAddGarageButton] = useState(config.translations.add_garage_button)

  useEffect(()=> {
    setTitle(config.translations.title)
    setOpenTitle(config.translations.open_title)
    setEmptyState(config.translations.empty_state)
    setSelectVehicle(config.translations.select_vehicle)
    setAddButton(config.translations.add_button)
    setCancelButton(config.translations.cancel_button)
    setAddGarageButton(config.translations.add_garage_button)
  },[config.translations.title,config.translations.open_title,config.translations.empty_state,config.translations.select_vehicle,config.translations.add_button,config.translations.cancel_button,config.translations.add_garage_button])
  
  return (
     <>
       <Card>
         <FormLayout>
         <FormLayout.Group condensed>
           <TextField label="Title" autoComplete="off" value={title} onChange={(value)=> {setTitle(value) ; updateConfig('translations.title', value)}} />
           <TextField label="Open Title" autoComplete="off" value={openTitle} onChange={(value)=> {setOpenTitle(value) ; updateConfig('translations.open_title', value)}} />
         </FormLayout.Group>
         <FormLayout.Group condensed>
           <TextField label="Empty State" autoComplete="off" value={emptyState} onChange={(value)=> {setEmptyState(value) ; updateConfig('translations.empty_state', value)}} />
           <TextField label="Select Vehicle" autoComplete="off" value={selectVehicle} onChange={(value)=> {setSelectVehicle(value) ; updateConfig('translations.select_vehicle', value)}} />
          </FormLayout.Group>
          <FormLayout.Group condensed>
           <TextField label="Add Button" autoComplete="off" value={addButton} onChange={(value)=> {setAddButton(value) ; updateConfig('translations.add_button', value)}} />
           <TextField label="Cancel Button" autoComplete="off" value={cancelButton} onChange={(value)=> {setCancelButton(value) ; updateConfig('translations.cancel_button', value)}} />
           </FormLayout.Group>
           <TextField label="Add Garage Button" autoComplete="off" value={addGarageButton} onChange={(value)=> {setAddGarageButton(value) ; updateConfig('translations.add_garage_button', value)}} />
         </FormLayout>
         </Card>
     </>
  )
}
