import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Tabs,
  TextField,
  Checkbox,
  Frame,
  Toast,
  FormLayout,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Box,
  Grid,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris';
import { getWidgetSettings, saveWidgetSettings } from '../lib/widgetSettings';
import type { FitmentWidgetConfig } from '../types/widget';
import ColorSwatch from '../components/ColorSwatch';

/* -------------------- Tab Components -------------------- */

/**
 * @component AppearanceTab
 * @description Manages and renders the "Appearance" settings for the widget.
 * This component was extracted from the main FitmentWidget to solve a React hook error.
 * By being a separate component, it can manage its own state without violating the Rules of Hooks.
 */
const AppearanceTab: React.FC<{ config: FitmentWidgetConfig; updateConfig: (path: string, value: any) => void }> = ({ config, updateConfig }) => {
  const [title, setTitle] = useState<string>(config.appearance.title);
  const [subtitle, setSubtitle] = useState<string>(config.appearance.subtitle);
  const [titleAlignment, setTitleAlignment] = useState<string>(config.appearance.title_alignment);
  const [subtitleAlignment, setSubtitleAlignment] = useState<string>(config.appearance.subtitle_alignment);

  // Effect to sync local state when the main config object changes from parent
  useEffect(() => {
    setTitle(config.appearance.title);
    setSubtitle(config.appearance.subtitle);
    setTitleAlignment(config.appearance.title_alignment);
    setSubtitleAlignment(config.appearance.subtitle_alignment);
  }, [config.appearance.title, config.appearance.subtitle, config.appearance.title_alignment, config.appearance.subtitle_alignment]);

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
            onChange={(value) => {
              setTitle(value);
              updateConfig('appearance.title', value);
            }}
            autoComplete="off"
          />
          <FormLayout.Group condensed>
          <TextField
            label="Subtitle"
            value={subtitle}
            onChange={(value) => {
              setSubtitle(value);
              updateConfig('appearance.subtitle', value);
            }}
            autoComplete="off"
          />
             <Select
              label="Submit Button Position"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ]}
              value={config.appearance.submit_button_position}
              onChange={(value) => updateConfig('appearance.submit_button_position', value)}
            />
          </FormLayout.Group>
          <FormLayout.Group condensed>
            <Select
              label="Layout"
              options={[
                { label: 'Horizontal', value: 'horizontal' },
                { label: 'Vertical', value: 'vertical' },
                {label: 'Flex' , value: 'flex'}
              ]}
              value={config.appearance.layout}
              onChange={(value) => updateConfig('appearance.layout', value)}
            />
            <Select
              label="Title Alignment"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
              ]}
              value={titleAlignment}
              onChange={(value) => {
                setTitleAlignment(value);
                updateConfig('appearance.title_alignment', value);
              }}
            />
            <Select
              label="Subtitle Alignment"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
              ]}
              value={subtitleAlignment}
              onChange={(value) => {
                setSubtitleAlignment(value);
                updateConfig('appearance.subtitle_alignment', value);
              }}
            />
          </FormLayout.Group>
        </FormLayout>
      </Card>

      <Card>
        <Text variant="headingMd" as="h3">
          Colors
        </Text>
        <div style={{ marginTop: '12px' }}>
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

/**
 * @component OptionsTab
 * @description Manages and renders the "Options" settings for the widget.
 */
const OptionsTab: React.FC<{ config: FitmentWidgetConfig; updateConfig: (path: string, value: any) => void }> = ({ config, updateConfig }) => {
  const [autoSubmit, setAutoSubmit] = useState(config.options.auto_submit);
  const [hideSubmitButton, setHideSubmitButton] = useState(config.options.hide_submit_button);
  const [rememberSelection, setRememberSelection] = useState(config.options.remember_selection);
  const [applyAcrossCollections, setApplyAcrossCollections] = useState(config.options.apply_across_collections);
  const [searchCurrentCollection, setSearchCurrentCollection] = useState(config.options.search_current_collection);
  const [displayAllFitmentFields, setDisplayAllFitmentFields] = useState(config.options.display_all_fitment_fields);
  const [firstView, setFirstView] = useState(config.options.first_view);

  // Effect to sync local state
  useEffect(() => {
    setAutoSubmit(config.options.auto_submit);
    setHideSubmitButton(config.options.hide_submit_button);
    setRememberSelection(config.options.remember_selection);
    setApplyAcrossCollections(config.options.apply_across_collections);
    setSearchCurrentCollection(config.options.search_current_collection);
    setDisplayAllFitmentFields(config.options.display_all_fitment_fields);
    setFirstView(config.options.first_view || 3);
  }, [config.options]);

  return (
    <Card>
      <FormLayout>
        <Text variant="headingMd" as="h3">
          Behavior
        </Text>
        <Checkbox
          label="Auto Submit"
          checked={autoSubmit}
          onChange={(value) => {
            setAutoSubmit(value);
            updateConfig('options.auto_submit', value);
          }}
        />
        {autoSubmit && (
          <Checkbox
            label="Hide Submit Button"
            checked={hideSubmitButton}
            onChange={(value) => {
              setHideSubmitButton(value);
              updateConfig('options.hide_submit_button', value);
            }}
          />
        )}
        <Checkbox
          label="Remember Selection"
          checked={rememberSelection}
          onChange={(value) => {
            setRememberSelection(value);
            updateConfig('options.remember_selection', value);
          }}
        />
        
        <div style={{ marginTop: '0.5rem' }}>
          <Text variant="headingMd" as="h3">
            Field Display Options
          </Text>
        </div>
        <Checkbox
          label="Display All Fitment Fields"
          helpText="When enabled, all fitment fields are shown at once. When disabled, fields are shown progressively based on selection."
          checked={displayAllFitmentFields}
          onChange={(value) => {
            setDisplayAllFitmentFields(value);
            updateConfig('options.display_all_fitment_fields', value);
          }}
        />
        {!displayAllFitmentFields && (
          <Select
            label="First View Fields"
            helpText="Number of fields to show initially when progressive display is enabled"
            options={[
              { label: '1 Field', value: '1' },
              { label: '2 Fields', value: '2' },
              { label: '3 Fields', value: '3' },
              { label: '4 Fields', value: '4' },
              { label: '5 Fields', value: '5' },
              { label: '6 Fields', value: '6' },
              { label: '7 Fields', value: '7' },
              { label: '8 Fields', value: '8' },
            ]}
            value={firstView ? firstView.toString() : '3'}
            onChange={(value) => {
              const numValue = parseInt(value, 10);
              setFirstView(numValue);
              updateConfig('options.first_view', numValue);
            }}
          />
        )}
        
        <div style={{ marginTop: '0.5rem' }}>
          <Text variant="headingMd" as="h3">
            Display Options
          </Text>
        </div>
        <InlineStack gap="400">
          <Checkbox
            label="Show Title"
            checked={config.appearance.show_title}
            onChange={(value) => updateConfig('appearance.show_title', value)}
          />
          <Checkbox
            label="Show Subtitle"
            checked={config.appearance.show_subtitle}
            onChange={(value) => updateConfig('appearance.show_subtitle', value)}
          />
          <Checkbox
            label="Show Icons"
            checked={config.appearance.show_icons}
            onChange={(value) => updateConfig('appearance.show_icons', value)}
          />
        </InlineStack>
        
        <div style={{ marginTop: '0.5rem' }}>
          <Text variant="headingMd" as="h3">
            Search Scope
          </Text>
        </div>
        <Checkbox
          label="Apply to All Collections (Make sure to add the widget to collection template as well.)"
          checked={applyAcrossCollections}
          onChange={(value) => {
            setApplyAcrossCollections(value);
            updateConfig('options.apply_across_collections', value);
          }}
        />
        <Checkbox
          label="Search Current Collection"
          checked={searchCurrentCollection}
          onChange={(value) => {
            setSearchCurrentCollection(value);
            updateConfig('options.search_current_collection', value);
          }}
        />
      </FormLayout>
    </Card>
  );
};

/**
 * @component TranslationsTab
 * @description Manages and renders the "Translations" settings for the widget.
 */
const TranslationsTab: React.FC<{ config: FitmentWidgetConfig; updateConfig: (path: string, value: any) => void }> = ({ config, updateConfig }) => {
  const [noFitMessage, setNoFitMessage] = useState(config.translations.no_fit_message);
  const [clearButtonText, setClearButtonText] = useState(config.translations.clear_button_text);
  const [submitButtonText, setSubmitButtonText] = useState(config.translations.submit_button_text);

  // Effect to sync local state
  useEffect(() => {
    setNoFitMessage(config.translations.no_fit_message);
    setClearButtonText(config.translations.clear_button_text);
    setSubmitButtonText(config.translations.submit_button_text);
  }, [config.translations]);

  return (
    <Card>
      <FormLayout>
        <TextField
          label="No Fit Message"
          value={noFitMessage}
          onChange={(value) => {
            setNoFitMessage(value);
            updateConfig('translations.no_fit_message', value);
          }}
          autoComplete="off"
        />
        <FormLayout.Group condensed>
          <TextField
            label="Clear Button Text"
            value={clearButtonText}
            onChange={(value) => {
              setClearButtonText(value);
              updateConfig('translations.clear_button_text', value);
            }}
            autoComplete="off"
          />
          <TextField
            label="Submit Button Text"
            value={submitButtonText}
            onChange={(value) => {
              setSubmitButtonText(value);
              updateConfig('translations.submit_button_text', value);
            }}
            autoComplete="off"
          />
        </FormLayout.Group>
      </FormLayout>
    </Card>
  );
};


/* -------------------- Main Component -------------------- */
const FitmentWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<FitmentWidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({
    active: false,
    message: '',
    isError: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: FitmentWidgetConfig = {
    options: {
      first_view: 3,
      auto_submit: false,
      hide_submit_button: false,
      remember_selection: true,
      apply_across_collections: false,
      search_current_collection: true,
      display_all_fitment_fields: false,
    },
    appearance: {
      title: "Vehicle Selector",
      colors: {
        text_color: "#000000",
        border_color: "#CCCCCC",
        background_color: "#FFFFFF",
        primary_button_color: "#007BFF",
        secondary_button_color: "#6C757D",
        primary_button_text_color: "#FFFFFF",
        secondary_button_text_color: "#FFFFFF",
      },
      layout: "horizontal",
      subtitle: "Choose your vehicle to find matching parts",
      show_icons: true,
      show_title: true,
      clear_button: { icon: "close", show: true, label: "Reset" },
      show_subtitle: true,
      submit_button: { icon: "search", show: true, label: "Find Parts" },
      submit_button_position: "left",
      title_alignment: "center",
      subtitle_alignment: "center",
    },
    translations: {
      no_fit_message: "We couldn't find matching parts for your vehicle.",
      clear_button_text: "Reset",
      submit_button_text: "Find Parts",
    },
  };

  // Fetch settings when the component mounts.
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = (window as any)?.shopify?.config?.shop;
        const settings = await getWidgetSettings(shopDomain, 'fitment_widget');
        
        // Merge with default config to ensure new fields exist
        const mergedConfig = {
          ...defaultConfig,
          ...settings,
          options: {
            ...defaultConfig.options,
            ...settings?.options,
          },
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
        console.error('Failed to load widget settings:', error);
        setConfig(defaultConfig);
        setToast({ active: true, message: 'Could not load settings.', isError: true });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced update helper
  const updateConfig = useCallback((path: string, value: any) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = window.setTimeout(() => {
      setConfig((prevConfig: FitmentWidgetConfig | null) => {
        if (!prevConfig) return null;
        const pathArray = path.split('.');
        const newConfig: any = JSON.parse(JSON.stringify(prevConfig));
        let current = newConfig;
        for (let i = 0; i < pathArray.length - 1; i++) {
          current = current[pathArray[i]];
        }
        current[pathArray[pathArray.length - 1]] = value;
        return newConfig as FitmentWidgetConfig;
      });
      setIsDirty(true);
    }, 120);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const shopDomain: any = (window as any)?.shopify?.config?.shop;
      const { success, error } = await saveWidgetSettings(shopDomain, 'fitment_widget', config);

      if (success) {
        setToast({ active: true, message: 'Configuration saved successfully!', isError: false });
        setIsDirty(false);
      } else {
        throw new Error(error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setToast({ active: true, message: `Save failed: ${error.message}`, isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const tabs = [
    { id: 'appearance', content: 'Appearance' },
    { id: 'options', content: 'Options' },
    { id: 'translations', content: 'Translations' },
  ];

  if (loading || !config) {
    return (
      <Frame>
        <Page title="Fitment Widget Configuration">
          <Layout>
            <Layout.Section>
              <Card>
                <SkeletonDisplayText size="small" />
                <div style={{ marginTop: '1rem' }}>
                  <SkeletonBodyText lines={10} />
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  /* -------------------- Render Helpers -------------------- */
  const renderPreview = () => {
    const isHorizontal = config.appearance.layout === 'horizontal';
    const isFlex = config.appearance.layout === 'flex';
    const showAllFields = config.options.display_all_fitment_fields;
    const firstViewCount = config.options.first_view;

    // Shared styles
    const shellStyle: React.CSSProperties = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: 'white',
      padding: '14px',
      borderRadius: '8px',
      border: `1px solid ${config.appearance.colors.border_color}`,
    };

    const baseSelectStyle: React.CSSProperties = {
      height: '34px',
      padding: '0 10px',
      border: `1px solid ${config.appearance.colors.border_color}`,
      borderRadius: '6px',
      backgroundColor: config.appearance.colors.background_color,
      color: config.appearance.colors.text_color,
      fontSize: '13px',
    };

    const buttonStyleBase: React.CSSProperties = {
      padding: isFlex ? '0 8px' : '0 12px',
      height: '34px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      whiteSpace: 'nowrap'
    };

    // Layout-specific styles
    const fieldsWrapStyle: React.CSSProperties = isHorizontal
      ? {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
        }
      : isFlex ? {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
      } :  {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          width: '100%',
        };

    // const selectContainerStyle: React.CSSProperties = isHorizontal
    //   ? 
    //   : { width: '100%' };

    const selectContainerStyle: React.CSSProperties = isHorizontal
  ? { flex: '1 1 120px', minWidth: 0 }
  : isFlex
  ? { minWidth: 0 }
  : { width: '100%' };

    const buttonsRowStyle: React.CSSProperties = isHorizontal
      ? { display: 'flex', alignItems: 'center', gap: '8px' } : isFlex ? { display: 'flex', alignItems: 'center', gap: '8px' } 
      : {
          display: 'flex',
          gap: '8px',
          marginTop: '6px',
          width: '100%',
        };

    const verticalButtonFlex = isHorizontal ? undefined : '1 1 0%'; // 50/50 split with two buttons

    // Define all possible fitment fields
    const allFitmentFields = [
      'Select Year',
      'Select Make', 
      'Select Model',
      'Select Field 4',
      'Select Field 5',
      'Select Field 6',
      'Select Field 7',
      'Select Field 8'
    ];

    // Determine which fields to show
    const fieldsToShow = showAllFields 
      ? allFitmentFields.slice(0, 3) // Only show first 3 fields when display_all_fitment_fields is true
      : allFitmentFields.slice(0, Math.max(1, Math.min(firstViewCount, allFitmentFields.length)));

    // Build the selects based on configuration
    const selects = fieldsToShow.map((placeholder) => (
      <div key={placeholder} style={selectContainerStyle}>
        <select style={{ ...baseSelectStyle, width: '100%' }} disabled>
          <option>{placeholder}</option>
        </select>
      </div>
    ));

    // Respect auto_submit + hide_submit_button
    const showSubmit =
      config.appearance.submit_button.show && !(config.options.auto_submit && config.options.hide_submit_button);

   const buttons = (
  <>
    {config.appearance.submit_button_position === "left" ? (
      <>
        {showSubmit && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor:
                config.appearance.colors.primary_button_color,
              color:
                config.appearance.colors.primary_button_text_color,
              flex: verticalButtonFlex,
              width: isHorizontal ? "auto" : undefined,
            }}
          >
            {config.appearance.show_icons && (
              <span style={{display: 'flex'}}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                  <path d="M21 21l-6 -6" />
                </svg>
              </span>
            )}
            {config.translations.submit_button_text}         
          </button>
        )}
        {config.appearance.clear_button.show && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor:
                config.appearance.colors.secondary_button_color,
              color:
                config.appearance.colors.secondary_button_text_color,
              flex: verticalButtonFlex,
              width: isHorizontal ? "auto" : undefined,
            }}
          >
            {config.appearance.show_icons && (
              <span style={{display: "flex"}}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6l-12 12" />
                  <path d="M6 6l12 12" />
                </svg>
              </span>
            )}
            {config.translations.clear_button_text}
          </button>
        )}
      </>
    ) : (
      <>
        {config.appearance.clear_button.show && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor:
                config.appearance.colors.secondary_button_color,
              color:
                config.appearance.colors.secondary_button_text_color,
              flex: verticalButtonFlex,
              width: isHorizontal ? "auto" : undefined,
            }}
          >
            {config.appearance.show_icons && (
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6l-12 12" />
                  <path d="M6 6l12 12" />
                </svg>
              </span>
            )}
            {config.translations.clear_button_text}
          </button>
        )}

        {showSubmit && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor:
                config.appearance.colors.primary_button_color,
              color:
                config.appearance.colors.primary_button_text_color,
              flex: verticalButtonFlex,
              width: isHorizontal ? "auto" : undefined,
            }}
          >
            {config.appearance.show_icons && (
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                  <path d="M21 21l-6 -6" />
                </svg>
              </span>
            )}
            {config.translations.submit_button_text}
          </button>
        )}
      </>
    )}
  </>
);


    return (
      <Card>
        <BlockStack gap="300" inlineAlign="start">
          <div style={{ padding: '12px 12px 0 12px', width: '100%' }}>
            <Text variant="headingMd" as="h3">
              Live Preview
            </Text>
            <Box paddingBlockStart="100">
              <Text variant="bodySm" as="p" tone="subdued">
                This is only a preview of settings. The data shown here is dummy. The actual widget preview on the
                storefront may differ based on real data.
              </Text>
            </Box>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f9fafb', width: '100%' }}>
            <div style={shellStyle}>
              <div style={isFlex ? {display: 'flex' , flex: 1 ,  flexWrap: "nowrap" , justifyContent: "space-evenly"} : {}}>
              <div>
              {config.appearance.show_title && (
                <h2
                  style={{
                    color: config.appearance.colors.text_color,
                    margin: '0 0 2px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    textAlign: config.appearance.title_alignment,
                  }}
                >
                  {config.appearance.title}
                </h2>
              )}
              {config.appearance.show_subtitle && (
                <p
                  style={{
                    color: config.appearance.colors.text_color,
                    margin: '0 0 8px 0',
                    fontSize: '13px',
                    opacity: 0.8,
                    textAlign: config.appearance.subtitle_alignment,
                  }}
                >
                  {config.appearance.subtitle}
                </p>
              )}
           </div> 
              <div style={fieldsWrapStyle}>
                {selects}
                <div style={buttonsRowStyle}>{buttons}</div>
              </div>
            </div>
              {/* Progressive display info message */}
              {!showAllFields && fieldsToShow.length < allFitmentFields.length && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px 12px', 
                  backgroundColor: '#f0f8ff', 
                  border: '1px solid #cce7ff', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0066cc'
                }}>
                  ℹ️ The other fields will be shown based on the selected values.
                </div>
              )}
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
        title="Fitment Widget Configuration"
        backAction={{ content: 'Back', onAction: () => navigate('/') }}
        primaryAction={{
          content: 'Save Configuration',
          onAction: handleSave,
          disabled: !isDirty || isSaving,
          loading: isSaving,
        }}
      >
        <Layout>
          <Layout.Section>{renderPreview()}</Layout.Section>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '12px' }}>
                {selectedTab === 0 && <AppearanceTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 1 && <OptionsTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 2 && <TranslationsTab config={config} updateConfig={updateConfig} />}
              </div>
            </Tabs>
          </Layout.Section>
        </Layout>
        <Box paddingBlockEnd="600" />
      </Page>
    </Frame>
  );
};

export default FitmentWidget;