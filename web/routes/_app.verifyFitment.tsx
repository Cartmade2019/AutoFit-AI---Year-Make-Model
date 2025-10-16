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
import type { VerifyFitmentWidgetConfig } from '../types/widgets';
import ColorSwatch from '../components/ColorSwatch';

// getWidgetSettings/saveWidgetSettings moved to '../lib/widgetSettings'

/* Types moved to '../types/widgets' */

const VerifyFitmentWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<VerifyFitmentWidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ active: false, message: '', isError: false });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: VerifyFitmentWidgetConfig = {
    options: {
      auto_submit: true,
      hide_submit_button: false,
      collapse_form: true,
      collapse_form_open_by_default: true,
      first_view: 3,
      display_all_fitment_fields: true,
    },
    appearance: {
      title: 'Verify Your Vehicle Fitment',
      subtitle: 'Check compatibility for this product',
      title_alignment: 'left',
      subtitle_alignment: 'left',
      colors: {
        text_color: '#303030',
        border_color: '#C9C9C9',
        background_color: '#FFFFFF',
        primary_button_color: '#000000',
        primary_button_text_color: '#FFFFFF',
        secondary_button_color: '#EFEFEF',
        secondary_button_text_color: '#505050',
      },
      layout: 'vertical',
      show_title: true,
      clear_button: { icon: 'close', show: true, label: 'Clear' },
      show_subtitle: true,
      submit_button: { icon: 'check', show: true, label: 'Verify' },
    },
    translations: {
      no_fit_message: 'No compatible vehicles found.',
      failure_message: 'Unfortunately, this product does not fit your vehicle.',
      success_message: 'This product fits your vehicle!',
      change_selection: 'Change Vehicle',
      clear_button_text: 'Clear',
      submit_button_text: 'Verify',
    },
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = shopify.config.shop;
        const settings = await getWidgetSettings(shopDomain, 'verify_fitment_widget');
        
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
  }, []);

  const updateConfig = useCallback((path: string, value: any) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = window.setTimeout(() => {
      setConfig((prevConfig) => {
        if (!prevConfig) return null;
        const pathArray = path.split('.');
        const newConfig = JSON.parse(JSON.stringify(prevConfig));
        let current = newConfig;
        for (let i = 0; i < pathArray.length - 1; i++) {
          current = current[pathArray[i]];
        }
        current[pathArray[pathArray.length - 1]] = value;
        return newConfig;
      });
      setIsDirty(true);
    }, 300);
  }, []);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const shopDomain: any = shopify.config.shop;
      const { success, error } = await saveWidgetSettings(shopDomain, 'verify_fitment_widget', config);

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
        <Page title="Verify Fitment Widget Configuration">
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

  const renderAppearanceTab = () => (
    <BlockStack gap="300">
      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Text & Alignment</Text>
          <TextField label="Title" value={config.appearance.title} onChange={(value) => updateConfig('appearance.title', value)} autoComplete="off" />
          <TextField label="Subtitle" value={config.appearance.subtitle} onChange={(value) => updateConfig('appearance.subtitle', value)} autoComplete="off" />
          <FormLayout.Group condensed>
            <Select label="Title Alignment" options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} value={config.appearance.title_alignment} onChange={(value) => updateConfig('appearance.title_alignment', value)} />
            <Select label="Subtitle Alignment" options={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} value={config.appearance.subtitle_alignment} onChange={(value) => updateConfig('appearance.subtitle_alignment', value)} />
          </FormLayout.Group>
        </FormLayout>
      </Card>

      <Card>
        <Text variant="headingMd" as="h3">Colors</Text>
        <div style={{ marginTop: '12px' }}>
          <Grid>
            {Object.entries(config.appearance.colors).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <Grid.Cell key={key} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <ColorSwatch label={label} color={value as string} onChange={(newValue) => updateConfig(`appearance.colors.${key}`, newValue)} />
                </Grid.Cell>
              );
            })}
          </Grid>
        </div>
      </Card>
    </BlockStack>
  );

  const renderOptionsTab = () => (
    <BlockStack gap="300">
      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Behavior</Text>
          <Checkbox label="Auto Submit" checked={config.options.auto_submit} onChange={(value) => updateConfig('options.auto_submit', value)} />
          {config.options.auto_submit && (
            <Checkbox label="Hide Submit Button" checked={config.options.hide_submit_button} onChange={(value) => updateConfig('options.hide_submit_button', value)} />
          )}
        </FormLayout>
      </Card>

      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Field Display Options</Text>
          <Checkbox
            label="Display All Fitment Fields"
            helpText="When enabled, all fitment fields are shown at once. When disabled, fields are shown progressively based on selection."
            checked={config.options.display_all_fitment_fields}
            onChange={(value) => updateConfig('options.display_all_fitment_fields', value)}
          />
          {!config.options.display_all_fitment_fields && (
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
              value={config.options.first_view ? config.options.first_view.toString() : '3'}
              onChange={(value) => {
                const numValue = parseInt(value, 10);
                updateConfig('options.first_view', numValue);
              }}
            />
          )}
        </FormLayout>
      </Card>

      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Display Options</Text>
          <InlineStack gap="400">
            <Checkbox label="Show Title" checked={config.appearance.show_title} onChange={(value) => updateConfig('appearance.show_title', value)} />
            <Checkbox label="Show Subtitle" checked={config.appearance.show_subtitle} onChange={(value) => updateConfig('appearance.show_subtitle', value)} />
          </InlineStack>
        </FormLayout>
      </Card>

      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Collapsible Form</Text>
          <Checkbox label="Enable Collapsible Form" checked={config.options.collapse_form} onChange={(value) => updateConfig('options.collapse_form', value)} />
          {config.options.collapse_form && (
            <Checkbox label="Open by Default" checked={config.options.collapse_form_open_by_default} onChange={(value) => updateConfig('options.collapse_form_open_by_default', value)} />
          )}
        </FormLayout>
      </Card>
    </BlockStack>
  );

  const renderTranslationsTab = () => (
    <Card>
      <FormLayout>
        <Text variant="headingMd" as="h3">Messages</Text>
        <TextField label="No Fit Message" value={config.translations.no_fit_message} onChange={(value) => updateConfig('translations.no_fit_message', value)} autoComplete="off" />
        <TextField label="Success Message" value={config.translations.success_message} onChange={(value) => updateConfig('translations.success_message', value)} autoComplete="off" />
        <TextField label="Failure Message" value={config.translations.failure_message} onChange={(value) => updateConfig('translations.failure_message', value)} autoComplete="off" />
        <TextField label="Change Selection Text" value={config.translations.change_selection} onChange={(value) => updateConfig('translations.change_selection', value)} autoComplete="off" />
        <FormLayout.Group condensed>
          <TextField label="Clear Button Text" value={config.translations.clear_button_text} onChange={(value) => updateConfig('translations.clear_button_text', value)} autoComplete="off" />
          <TextField label="Submit Button Text" value={config.translations.submit_button_text} onChange={(value) => updateConfig('translations.submit_button_text', value)} autoComplete="off" />
        </FormLayout.Group>
      </FormLayout>
    </Card>
  );

  const renderPreview = () => {
    const showAllFields = config.options.display_all_fitment_fields;
    const firstViewCount = config.options.first_view || 3;

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

    return (
      <Card>
        <BlockStack gap="200">
          <Box padding="300">
            <Text variant="headingMd" as="h3">Live Preview</Text>
          </Box>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', minHeight: '300px' }}>
            <div style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: config.appearance.colors.background_color,
              padding: '12px',
              borderRadius: '6px',
              border: `1px solid ${config.appearance.colors.border_color}`,
              maxWidth: '100%',
              margin: '0 auto'
            }}>
              <BlockStack gap="200">
                {config.appearance.show_title && (
                  <h2 style={{
                    color: config.appearance.colors.text_color,
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    textAlign: config.appearance.title_alignment
                  }}>
                    {config.appearance.title}
                  </h2>
                )}
                {config.appearance.show_subtitle && (
                  <p style={{
                    color: config.appearance.colors.text_color,
                    margin: 0,
                    fontSize: '13px',
                    opacity: 0.8,
                    textAlign: config.appearance.subtitle_alignment
                  }}>
                    {config.appearance.subtitle}
                  </p>
                )}

                {config.options.collapse_form ? (
                  <div>
                    <div style={{ border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px' }}>
                      <div style={{ padding: '8px 10px', borderBottom: config.options.collapse_form_open_by_default ? `1px solid ${config.appearance.colors.border_color}` : 'none', backgroundColor: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: config.options.collapse_form_open_by_default ? '4px 4px 0 0' : '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: config.appearance.colors.text_color }}>Vehicle Selection</span>
                        <span style={{ fontSize: '16px', color: config.appearance.colors.text_color, lineHeight: 1 }}>{config.options.collapse_form_open_by_default ? '−' : '+'}</span>
                      </div>
                      {config.options.collapse_form_open_by_default && (
                        <div style={{ padding: '10px' }}>
                          <BlockStack gap="200">
                            {fieldsToShow.map((placeholder) => (
                              <select key={placeholder} style={{ width: '100%', height: '34px', padding: '0 10px', border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px', backgroundColor: config.appearance.colors.background_color, color: config.appearance.colors.text_color, fontSize: '13px' }} disabled>
                                <option>{placeholder}</option>
                              </select>
                            ))}
                            
                            {/* Progressive display info message */}
                            {!showAllFields && fieldsToShow.length < allFitmentFields.length && (
                              <div style={{ 
                                marginTop: '6px', 
                                padding: '6px 10px', 
                                backgroundColor: '#f0f8ff', 
                                border: '1px solid #cce7ff', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#0066cc'
                              }}>
                                ℹ️ The other fields will be shown based on the selected values.
                              </div>
                            )}
                          </BlockStack>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <BlockStack gap="200">
                    {fieldsToShow.map((placeholder) => (
                      <select key={placeholder} style={{ width: '100%', height: '34px', padding: '0 10px', border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px', backgroundColor: config.appearance.colors.background_color, color: config.appearance.colors.text_color, fontSize: '13px' }} disabled>
                        <option>{placeholder}</option>
                      </select>
                    ))}
                    
                    {/* Progressive display info message */}
                    {!showAllFields && fieldsToShow.length < allFitmentFields.length && (
                      <div style={{ 
                        marginTop: '6px', 
                        padding: '6px 10px', 
                        backgroundColor: '#f0f8ff', 
                        border: '1px solid #cce7ff', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#0066cc'
                      }}>
                        ℹ️ The other fields will be shown based on the selected values.
                      </div>
                    )}
                  </BlockStack>
                )}

                <InlineStack gap="200" align="center">
                  {config.appearance.submit_button.show && !(config.options.auto_submit && config.options.hide_submit_button) && (
                    <button style={{
                      flexGrow: 1, padding: '0 12px', height: '34px', backgroundColor: config.appearance.colors.primary_button_color, color: config.appearance.colors.primary_button_text_color, border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                    }}>
                      {config.translations.submit_button_text}
                    </button>
                  )}
                  {config.appearance.clear_button.show && (
                    <button style={{
                      padding: '0 12px', height: '34px', backgroundColor: config.appearance.colors.secondary_button_color, color: config.appearance.colors.secondary_button_text_color, border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px', fontSize: '13px', cursor: 'pointer'
                    }}>
                      {config.translations.clear_button_text}
                    </button>
                  )}
                </InlineStack>
              </BlockStack>
            </div>
          </div>
          <Box padding="300">
            <Text variant="bodySm" color="subdued">
              This is only a preview of settings. The data shown here is dummy. The actual widget preview on the storefront may differ based on real data.
            </Text>
          </Box>
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
        title="Verify Fitment Widget Configuration"
        backAction={{ content: 'Back', onAction: () => navigate('/') }}
        primaryAction={{
          content: 'Save Configuration',
          onAction: handleSave,
          disabled: !isDirty || isSaving,
          loading: isSaving,
        }}
      >
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '12px' }}>
                {selectedTab === 0 && renderAppearanceTab()}
                {selectedTab === 1 && renderOptionsTab()}
                {selectedTab === 2 && renderTranslationsTab()}
              </div>
            </Tabs>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <div style={{ paddingTop: '60px' }}>
              {renderPreview()}
            </div>
          </Grid.Cell>
        </Grid>
        <Box paddingBlockEnd="400" />
      </Page>
    </Frame>
  );
};

export default VerifyFitmentWidget;