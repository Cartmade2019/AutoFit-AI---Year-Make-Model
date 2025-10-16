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
import { supabase } from '../supabase/supabaseClient';

/**
 * Fetches widget settings from Supabase.
 * @param {string} shopDomain - The domain of the Shopify store.
 * @param {string} widgetType - The type of the widget to fetch settings for.
 * @returns {Promise<object|null>} The settings JSON object or null if not found or an error occurs.
 */
export async function getWidgetSettings(shopDomain: string, widgetType: string) {
  // First, get the store ID from the shop domain.
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return null;
  }

  const storeId = storeData.id;

  // Now, fetch the widget settings using the store ID.
  const { data, error } = await supabase
    .from('widget_settings')
    .select('settings_json')
    .eq('widget_type', widgetType)
    .eq('store_id', storeId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching widget settings:', error);
    }
    return null;
  }

  return data?.settings_json ?? null;
}

/**
 * Saves (upserts) widget settings to Supabase.
 * @param {string} shopDomain - The domain of the Shopify store.
 * @param {string} widgetType - The type of the widget.
 * @param {object} settingsJson - The settings object to save.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function saveWidgetSettings(
  shopDomain: string,
  widgetType: string,
  settingsJson: object,
) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID for saving:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .upsert(
      {
        store_id: storeId,
        widget_type: widgetType,
        settings_json: settingsJson,
      },
      { onConflict: 'store_id, widget_type' },
    );

  if (error) {
    console.error('Error saving widget settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/* -------------------- ColorSwatch Component -------------------- */
/**
 * macOS/Safari fix:
 * - Keep a local state for <input type="color"> so it updates reliably.
 * - Normalize: input uses lowercase; we pass uppercase back to parent.
 */
const ColorSwatch = ({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (value: string) => void;
}) => {
  const [localColor, setLocalColor] = useState<string>(color || '#000000');

  useEffect(() => {
    if (typeof color === 'string' && color.length > 0) {
      setLocalColor(color);
    }
  }, [color]);

  const handleColorChange = (value: string) => {
    setLocalColor(value);
    onChange(value.toUpperCase());
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: localColor,
            border: '1px solid #E1E1E1',
          }}
        />
        <input
          type="color"
          value={(localColor || '#000000').toLowerCase()}
          onChange={(e) => handleColorChange(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '36px',
            height: '36px',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      <div>
        <Text variant="bodyMd" as="p" fontWeight="medium">
          {label}
        </Text>
        <p style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', margin: 0 }}>
          {(localColor || '#000000').toUpperCase()}
        </p>
      </div>
    </div>
  );
};

/* -------------------- Type Definitions -------------------- */
interface WidgetColors {
  text_color: string;
  border_color: string;
  background_color: string;
  primary_button_color: string;
  primary_button_text_color: string;
  secondary_button_color: string;
  secondary_button_text_color: string;
}

interface ButtonConfig {
  icon: string;
  show: boolean;
  label: string;
}

interface WidgetTranslations {
  no_fit_message: string;
  clear_button_text: string;
  submit_button_text: string;
}

interface WidgetAppearance {
  title: string;
  subtitle: string;
  title_alignment: 'left' | 'center' | 'right';
  subtitle_alignment: 'left' | 'center' | 'right';
  colors: WidgetColors;
  layout: 'horizontal' | 'vertical';
  show_icons: boolean;
  show_title: boolean;
  clear_button: ButtonConfig;
  show_subtitle: boolean;
  submit_button: ButtonConfig;
}

interface WidgetOptions {
  auto_submit: boolean;
  hide_submit_button: boolean;
  remember_selection: boolean;
  apply_across_collections: boolean;
  search_current_collection: boolean;
}

interface WidgetConfig {
  options: WidgetOptions;
  appearance: WidgetAppearance;
  translations: WidgetTranslations;
}

/* -------------------- Main Component -------------------- */
const FitmentWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({
    active: false,
    message: '',
    isError: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: WidgetConfig = {
    options: {
      auto_submit: false,
      hide_submit_button: false,
      remember_selection: true,
      apply_across_collections: true,
      search_current_collection: true,
    },
    appearance: {
      title: 'Find Parts For Your Vehicle',
      subtitle: 'Select your Year, Make and Model',
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
      layout: 'horizontal',
      show_icons: true,
      show_title: true,
      clear_button: { icon: 'clear', show: true, label: 'Clear' },
      show_subtitle: true,
      submit_button: { icon: 'search', show: true, label: 'Search' },
    },
    translations: {
      no_fit_message: 'No fitment data available.',
      clear_button_text: 'Clear',
      submit_button_text: 'Find Parts',
    },
  };

  // Fetch settings when the component mounts.
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = (window as any)?.shopify?.config?.shop;
        const settings = await getWidgetSettings(shopDomain, 'fitment_widget');
        setConfig(settings || defaultConfig);
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
      setConfig((prevConfig) => {
        if (!prevConfig) return null;
        const pathArray = path.split('.');
        const newConfig: any = JSON.parse(JSON.stringify(prevConfig));
        let current = newConfig;
        for (let i = 0; i < pathArray.length - 1; i++) {
          current = current[pathArray[i]];
        }
        current[pathArray[pathArray.length - 1]] = value;
        return newConfig as WidgetConfig;
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
              <Card sectioned>
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
  const renderAppearanceTab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">
            Text & Layout
          </Text>
          <TextField
            label="Title"
            value={config.appearance.title}
            onChange={(value) => updateConfig('appearance.title', value)}
            autoComplete="off"
          />
          <TextField
            label="Subtitle"
            value={config.appearance.subtitle}
            onChange={(value) => updateConfig('appearance.subtitle', value)}
            autoComplete="off"
          />
          <FormLayout.Group condensed>
            <Select
              label="Layout"
              options={[
                { label: 'Horizontal', value: 'horizontal' },
                { label: 'Vertical', value: 'vertical' },
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
              value={config.appearance.title_alignment}
              onChange={(value) => updateConfig('appearance.title_alignment', value)}
            />
            <Select
              label="Subtitle Alignment"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
              ]}
              value={config.appearance.subtitle_alignment}
              onChange={(value) => updateConfig('appearance.subtitle_alignment', value)}
            />
          </FormLayout.Group>
        </FormLayout>
      </Card>

      <Card sectioned>
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
                    color={value}
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

  const renderOptionsTab = () => (
    <Card sectioned>
      <FormLayout>
        <Text variant="headingMd" as="h3">
          Behavior
        </Text>
        <Checkbox
          label="Auto Submit"
          checked={config.options.auto_submit}
          onChange={(value) => updateConfig('options.auto_submit', value)}
        />
        {config.options.auto_submit && (
          <Checkbox
            label="Hide Submit Button"
            checked={config.options.hide_submit_button}
            onChange={(value) => updateConfig('options.hide_submit_button', value)}
          />
        )}
        <Checkbox
          label="Remember Selection"
          checked={config.options.remember_selection}
          onChange={(value) => updateConfig('options.remember_selection', value)}
        />
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
          label="Apply Across Collections"
          checked={config.options.apply_across_collections}
          onChange={(value) => updateConfig('options.apply_across_collections', value)}
        />
        <Checkbox
          label="Search Current Collection"
          checked={config.options.search_current_collection}
          onChange={(value) => updateConfig('options.search_current_collection', value)}
        />
      </FormLayout>
    </Card>
  );

  const renderTranslationsTab = () => (
    <Card sectioned>
      <FormLayout>
        <TextField
          label="No Fit Message"
          value={config.translations.no_fit_message}
          onChange={(value) => updateConfig('translations.no_fit_message', value)}
          autoComplete="off"
        />
        <FormLayout.Group condensed>
          <TextField
            label="Clear Button Text"
            value={config.translations.clear_button_text}
            onChange={(value) => updateConfig('translations.clear_button_text', value)}
            autoComplete="off"
          />
          <TextField
            label="Submit Button Text"
            value={config.translations.submit_button_text}
            onChange={(value) => updateConfig('translations.submit_button_text', value)}
            autoComplete="off"
          />
        </FormLayout.Group>
      </FormLayout>
    </Card>
  );

  const renderPreview = () => {
    const isHorizontal = config.appearance.layout === 'horizontal';

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
      padding: '0 12px',
      height: '34px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    };

    // Layout-specific styles
    const fieldsWrapStyle: React.CSSProperties = isHorizontal
      ? {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          width: '100%',
        };

    const selectContainerStyle: React.CSSProperties = isHorizontal
      ? { flex: '1 1 120px', minWidth: 0 }
      : { width: '100%' };

    // Buttons row:
    // - Horizontal: compact, intrinsic widths
    // - Vertical: single row, each button takes 50% (flex-basis 0 with grow)
    const buttonsRowStyle: React.CSSProperties = isHorizontal
      ? { display: 'flex', alignItems: 'center', gap: '8px' }
      : {
          display: 'flex',
          gap: '8px',
          marginTop: '6px',
          width: '100%',
        };

    const verticalButtonFlex = isHorizontal ? undefined : '1 1 0%'; // 50/50 split with two buttons

    // Build the 3 selects
    const selects = ['Select Year', 'Select Make', 'Select Model'].map((placeholder) => (
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
        {config.appearance.clear_button.show && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor: config.appearance.colors.secondary_button_color,
              color: config.appearance.colors.secondary_button_text_color,
              flex: verticalButtonFlex, // makes it 50% in vertical
              width: isHorizontal ? 'auto' : undefined,
            }}
          >
            {config.appearance.show_icons && <span>×</span>}
            {config.translations.clear_button_text}
          </button>
        )}
        {showSubmit && (
          <button
            style={{
              ...buttonStyleBase,
              backgroundColor: config.appearance.colors.primary_button_color,
              color: config.appearance.colors.primary_button_text_color,
              flex: verticalButtonFlex, // makes it 50% in vertical
              width: isHorizontal ? 'auto' : undefined,
            }}
          >
            {config.appearance.show_icons && <span>🔍</span>}
            {config.translations.submit_button_text}
          </button>
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

              {/* Fields + Buttons with proper layout */}
              <div style={fieldsWrapStyle}>
                {selects}
                <div style={buttonsRowStyle}>{buttons}</div>
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
                {selectedTab === 0 && renderAppearanceTab()}
                {selectedTab === 1 && renderOptionsTab()}
                {selectedTab === 2 && renderTranslationsTab()}
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
  RangeSlider,
} from '@shopify/polaris';
import { supabase } from '../supabase/supabaseClient';

/**
 * Fetches widget settings from Supabase.
 * @param {string} shopDomain - The domain of the Shopify store.
 * @param {string} widgetType - The type of the widget to fetch settings for.
 * @returns {Promise<object|null>} The settings JSON object or null if not found or an error occurs.
 */
export async function getWidgetSettings(shopDomain: string, widgetType: string) {
  // First, get the store ID from the shop domain.
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return null;
  }

  const storeId = storeData.id;

  // Now, fetch the widget settings using the store ID.
  const { data, error } = await supabase
    .from('widget_settings')
    .select('settings_json')
    .eq('widget_type', widgetType)
    .eq('store_id', storeId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching widget settings:', error);
    }
    return null;
  }

  return data?.settings_json ?? null;
}

/**
 * Saves (upserts) widget settings to Supabase.
 * @param {string} shopDomain - The domain of the Shopify store.
 * @param {string} widgetType - The type of the widget.
 * @param {object} settingsJson - The settings object to save.
 * @returns {Promise<{success: boolean, error: string|null}>} An object indicating success or failure.
 */
export async function saveWidgetSettings(shopDomain: string, widgetType: string, settingsJson: object) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID for saving:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .upsert({
      store_id: storeId,
      widget_type: widgetType,
      settings_json: settingsJson,
    }, { onConflict: 'store_id, widget_type' });

  if (error) {
    console.error('Error saving widget settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// --- ColorSwatch Component ---
const ColorSwatch = ({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void; }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, border: '1px solid #E1E1E1' }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ position: 'absolute', top: 0, left: 0, width: '36px', height: '36px', opacity: 0, cursor: 'pointer' }}
        />
      </div>
      <div>
        <Text variant="bodyMd" as="p" fontWeight="medium">{label}</Text>
        <p style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', margin: 0 }}>{color?.toUpperCase()}</p>
      </div>
    </div>
  );
};

// --- Type Definitions ---
interface TableOptions {
  sortable: boolean;
  pagination: boolean;
  searchable: boolean;
  show_title: boolean;
  default_sort: {
    order: 'asc' | 'desc';
  };
  show_subtitle: boolean;
  items_per_page: number;
  show_all_column: boolean;
  expand_on_mobile: boolean;
  number_of_colums: number;
  show_total_count: boolean;
  title_alignment: 'left' | 'center' | 'right';
  subtitle_alignment: 'left' | 'center' | 'right';
}

interface TableAppearance {
  heading: string;
  subheading: string;
  text_color: string;
  border_color: string;
  striped_rows: boolean;
  border_radius: string;
  background_color: string;
  header_background: string;
}

interface TableConfig {
  options: TableOptions;
  appearance: TableAppearance;
}

// --- Mock Data ---
const mockTableData = [
  { year: '2023', make: 'Toyota', model: 'Camry', trim: 'LE', engine: '2.5L I4' },
  { year: '2022', make: 'Honda', model: 'Civic', trim: 'Sport', engine: '2.0L I4' },
  { year: '2023', make: 'Ford', model: 'F-150', trim: 'XLT', engine: '3.3L V6' },
  { year: '2021', make: 'BMW', model: '3 Series', trim: '330i', engine: '2.0L I4 Turbo' },
  { year: '2022', make: 'Audi', model: 'A4', trim: 'Premium', engine: '2.0L I4 Turbo' },
];

// --- Main Component ---
const FitmentTable: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<TableConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ active: false, message: '', isError: false });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  // Default configuration
  const defaultConfig: TableConfig = {
    options: {
      sortable: false,
      pagination: false,
      searchable: false,
      show_title: true,
      default_sort: {
        order: 'desc'
      },
      show_subtitle: true,
      items_per_page: 10,
      show_all_column: true,
      expand_on_mobile: true,
      number_of_colums: 3,
      show_total_count: true,
      title_alignment: 'center',
      subtitle_alignment: 'center'
    },
    appearance: {
      heading: 'Vehicle Fitments',
      subheading: 'This part fits the following vehicles',
      text_color: '#111827',
      border_color: '#e5e7eb',
      striped_rows: true,
      border_radius: '6px',
      background_color: '#ffffff',
      header_background: '#f3f4f6'
    }
  };

  // Fetch settings when the component mounts
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = shopify.config.shop;
        const settings = await getWidgetSettings(shopDomain, "fitment_table");
        setConfig(settings || defaultConfig);
      } catch (error) {
        console.error("Failed to load widget settings:", error);
        setConfig(defaultConfig);
        setToast({ active: true, message: 'Could not load settings.', isError: true });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Debounced function to update the configuration state
  const updateConfig = useCallback((path: string, value: any) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = window.setTimeout(() => {
      setConfig(prevConfig => {
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
    }, 200); // Faster debounce for smoother UX
  }, []);

  // Handle saving the configuration to Supabase
  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const shopDomain: any = shopify.config.shop;
      const { success, error } = await saveWidgetSettings(shopDomain, "fitment_table", config);

      if (success) {
        setToast({ active: true, message: 'Configuration saved successfully!', isError: false });
        setIsDirty(false);
      } else {
        throw new Error(error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      setToast({ active: true, message: `Save failed: ${error.message}`, isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const tabs = [
    { id: 'appearance', content: 'Appearance' },
    { id: 'options', content: 'Options' },
  ];

  // --- Render Functions ---

  if (loading || !config) {
    return (
      <Frame>
        <Page title="Fitment Table Configuration">
          <Layout>
            <Layout.Section>
              <Card sectioned>
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

  const renderPreview = () => {
    const displayData = config.options.pagination 
      ? mockTableData.slice(0, config.options.items_per_page)
      : mockTableData;
    
    const visibleColumns = config.options.number_of_colums || 3;
    const columns = ['year', 'make', 'model', 'trim', 'engine'].slice(0, visibleColumns);

    return (
      <Card>
        <BlockStack gap="300">
          <div style={{ padding: '12px 12px 0 12px' }}>
            <Text variant="headingMd" as="h3">Live Preview</Text>
            <Box paddingBlockStart="100">
              <Text variant="bodySm" as="p" tone="subdued">
                This is only a preview of settings. The data shown here is dummy. The actual widget preview on the storefront may differ based on real data.
              </Text>
            </Box>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb' }}>
            <div style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: config.appearance.background_color,
              padding: '20px',
              borderRadius: config.appearance.border_radius,
              border: `1px solid ${config.appearance.border_color}`
            }}>
              {/* Heading */}
              {(config.options.show_title || config.options.show_subtitle) && (
                <div style={{ marginBottom: '16px' }}>
                  {config.options.show_title && (
                    <h2 style={{ 
                      color: config.appearance.text_color, 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      fontWeight: '600',
                      textAlign: config.options.title_alignment
                    }}>
                      {config.appearance.heading}
                    </h2>
                  )}
                  {config.options.show_subtitle && (
                    <p style={{ 
                      color: config.appearance.text_color, 
                      margin: '0', 
                      fontSize: '14px', 
                      opacity: 0.7,
                      textAlign: config.options.subtitle_alignment
                    }}>
                      {config.appearance.subheading}
                    </p>
                  )}
                </div>
              )}

              {/* Search Bar */}
              {config.options.searchable && (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search vehicles..."
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '8px 12px',
                      border: `1px solid ${config.appearance.border_color}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: config.appearance.text_color
                    }}
                    disabled
                  />
                </div>
              )}

              {/* Table */}
              <div style={{ 
                overflowX: 'auto',
                border: `1px solid ${config.appearance.border_color}`,
                borderRadius: config.appearance.border_radius
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: config.appearance.header_background }}>
                      {columns.map((column, index) => (
                        <th key={column} style={{ 
                          padding: '12px',
                          textAlign: 'left',
                          color: config.appearance.text_color,
                          fontWeight: '600',
                          borderBottom: `1px solid ${config.appearance.border_color}`,
                          ...(index > 0 && { borderLeft: `1px solid ${config.appearance.border_color}` }),
                          cursor: config.options.sortable ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {column.charAt(0).toUpperCase() + column.slice(1)}
                            {config.options.sortable && <span style={{ fontSize: '12px', opacity: 0.5 }}>↕</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ 
                        backgroundColor: config.appearance.striped_rows && rowIndex % 2 === 1 
                          ? '#f8f9fa' 
                          : 'transparent'
                      }}>
                        {columns.map((column, colIndex) => (
                          <td key={column} style={{ 
                            padding: '12px',
                            color: config.appearance.text_color,
                            borderBottom: rowIndex < displayData.length - 1 ? `1px solid ${config.appearance.border_color}` : 'none',
                            ...(colIndex > 0 && { borderLeft: `1px solid ${config.appearance.border_color}` })
                          }}>
                            {(row as any)[column] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '16px',
                fontSize: '14px',
                color: config.appearance.text_color
              }}>
                {config.options.show_total_count && (
                  <span style={{ opacity: 0.7 }}>
                    Showing {displayData.length} of {mockTableData.length} vehicles
                  </span>
                )}
                {config.options.pagination && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ 
                      padding: '4px 8px', 
                      border: `1px solid ${config.appearance.border_color}`,
                      borderRadius: '4px',
                      backgroundColor: config.appearance.background_color,
                      color: config.appearance.text_color,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }} disabled>
                      Previous
                    </button>
                    <button style={{ 
                      padding: '4px 8px', 
                      border: `1px solid ${config.appearance.border_color}`,
                      borderRadius: '4px',
                      backgroundColor: config.appearance.background_color,
                      color: config.appearance.text_color,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }} disabled>
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    );
  };

  const renderAppearanceTab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Headings</Text>
          <TextField 
            label="Table Heading" 
            value={config.appearance.heading} 
            onChange={(value) => updateConfig('appearance.heading', value)} 
            autoComplete="off" 
          />
          <TextField 
            label="Table Subheading" 
            value={config.appearance.subheading} 
            onChange={(value) => updateConfig('appearance.subheading', value)} 
            autoComplete="off" 
          />
          <FormLayout.Group condensed>
            <Select
              label="Title Alignment"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
              ]}
              value={config.options.title_alignment}
              onChange={(value) => updateConfig('options.title_alignment', value)}
            />
            <Select
              label="Subtitle Alignment"
              options={[
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
              ]}
              value={config.options.subtitle_alignment}
              onChange={(value) => updateConfig('options.subtitle_alignment', value)}
            />
          </FormLayout.Group>
        </FormLayout>
      </Card>

      <Card sectioned>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Colors & Styling</Text>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch 
                label="Text Color" 
                color={config.appearance.text_color} 
                onChange={(newValue) => updateConfig('appearance.text_color', newValue)} 
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch 
                label="Border Color" 
                color={config.appearance.border_color} 
                onChange={(newValue) => updateConfig('appearance.border_color', newValue)} 
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch 
                label="Background Color" 
                color={config.appearance.background_color} 
                onChange={(newValue) => updateConfig('appearance.background_color', newValue)} 
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch 
                label="Header Background" 
                color={config.appearance.header_background} 
                onChange={(newValue) => updateConfig('appearance.header_background', newValue)} 
              />
            </Grid.Cell>
          </Grid>
          
          <FormLayout.Group>
            <Select
              label="Border Radius"
              options={[
                { label: '0px (Square)', value: '0px' },
                { label: '4px (Slightly Rounded)', value: '4px' },
                { label: '6px (Rounded)', value: '6px' },
                { label: '8px (More Rounded)', value: '8px' },
                { label: '12px (Very Rounded)', value: '12px' },
              ]}
              value={config.appearance.border_radius}
              onChange={(value) => updateConfig('appearance.border_radius', value)}
            />
            <div style={{ paddingTop: '20px' }}>
              <Checkbox
                label="Striped Rows"
                checked={config.appearance.striped_rows}
                onChange={(value) => updateConfig('appearance.striped_rows', value)}
              />
            </div>
          </FormLayout.Group>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderOptionsTab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Table Features</Text>
          <InlineStack gap="400">
            <Checkbox 
              label="Enable Sorting" 
              checked={config.options.sortable} 
              onChange={(value) => updateConfig('options.sortable', value)} 
            />
            <Checkbox 
              label="Enable Pagination" 
              checked={config.options.pagination} 
              onChange={(value) => updateConfig('options.pagination', value)} 
            />
            <Checkbox 
              label="Enable Search" 
              checked={config.options.searchable} 
              onChange={(value) => updateConfig('options.searchable', value)} 
            />
          </InlineStack>
          
          {config.options.sortable && (
            <Select
              label="Default Sort Order"
              options={[
                { label: 'Ascending (A-Z, 1-9)', value: 'asc' },
                { label: 'Descending (Z-A, 9-1)', value: 'desc' },
              ]}
              value={config.options.default_sort.order}
              onChange={(value) => updateConfig('options.default_sort.order', value)}
            />
          )}

          {config.options.pagination && (
            <div>
              <Text variant="bodyMd" as="p" fontWeight="medium">Items Per Page: {config.options.items_per_page}</Text>
              <Box paddingBlockStart="200">
                <RangeSlider
                  label=""
                  value={config.options.items_per_page}
                  min={5}
                  max={50}
                  step={5}
                  onChange={(value) => updateConfig('options.items_per_page', value)}
                />
              </Box>
            </div>
          )}
        </FormLayout>
      </Card>

      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Display Options</Text>
          <InlineStack gap="400">
            <Checkbox 
              label="Show Title" 
              checked={config.options.show_title} 
              onChange={(value) => updateConfig('options.show_title', value)} 
            />
            <Checkbox 
              label="Show Subtitle" 
              checked={config.options.show_subtitle} 
              onChange={(value) => updateConfig('options.show_subtitle', value)} 
            />
            <Checkbox 
              label="Show Total Count" 
              checked={config.options.show_total_count} 
              onChange={(value) => updateConfig('options.show_total_count', value)} 
            />
          </InlineStack>
          <InlineStack gap="400">
            <Checkbox 
              label="Show All Columns" 
              checked={config.options.show_all_column} 
              onChange={(value) => updateConfig('options.show_all_column', value)} 
            />
            <Checkbox 
              label="Expand on Mobile" 
              checked={config.options.expand_on_mobile} 
              onChange={(value) => updateConfig('options.expand_on_mobile', value)} 
            />
          </InlineStack>

          {!config.options.show_all_column && (
            <div>
              <Text variant="bodyMd" as="p" fontWeight="medium">Number of Columns: {config.options.number_of_colums}</Text>
              <Box paddingBlockStart="200">
                <RangeSlider
                  label=""
                  value={config.options.number_of_colums}
                  min={1}
                  max={5}
                  step={1}
                  onChange={(value) => updateConfig('options.number_of_colums', value)}
                />
              </Box>
            </div>
          )}
        </FormLayout>
      </Card>
    </BlockStack>
  );

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
        title="Fitment Table Configuration"
        backAction={{ content: 'Back', onAction: () => navigate('/') }}
        primaryAction={{
          content: 'Save Configuration',
          onAction: handleSave,
          disabled: !isDirty || isSaving,
          loading: isSaving,
        }}
      >
        <Layout>
          <Layout.Section>
            {renderPreview()}
          </Layout.Section>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '12px' }}>
                {selectedTab === 0 && renderAppearanceTab()}
                {selectedTab === 1 && renderOptionsTab()}
              </div>
            </Tabs>
          </Layout.Section>
        </Layout>
        <Box paddingBlockEnd="600" />
      </Page>
    </Frame>
  );
};
export default FitmentTable;

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
import { supabase } from '../supabase/supabaseClient';

export async function getWidgetSettings(shopDomain: string, widgetType: string) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return null;
  }

  const storeId = storeData.id;

  const { data, error } = await supabase
    .from('widget_settings')
    .select('settings_json')
    .eq('widget_type', widgetType)
    .eq('store_id', storeId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching widget settings:', error);
    }
    return null;
  }

  return data?.settings_json ?? null;
}

export async function saveWidgetSettings(shopDomain: string, widgetType: string, settingsJson: object) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID for saving:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .upsert(
      {
        store_id: storeId,
        widget_type: widgetType,
        settings_json: settingsJson,
      },
      { onConflict: 'store_id, widget_type' }
    );

  if (error) {
    console.error('Error saving widget settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

const ColorSwatch = ({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color, border: '1px solid #E1E1E1' }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ position: 'absolute', top: 0, left: 0, width: '32px', height: '32px', opacity: 0, cursor: 'pointer' }}
        />
      </div>
      <div>
        <Text variant="bodyMd" as="p" fontWeight="medium">{label}</Text>
        <p style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', margin: 0 }}>{color?.toUpperCase()}</p>
      </div>
    </div>
  );
};

interface WidgetColors {
  text_color: string;
  border_color: string;
  background_color: string;
  primary_button_color: string;
  primary_button_text_color: string;
  secondary_button_color: string;
  secondary_button_text_color: string;
}

interface ButtonConfig {
  icon: string;
  show: boolean;
  label: string;
}

interface WidgetTranslations {
  no_fit_message: string;
  failure_message: string;
  success_message: string;
  change_selection: string;
  clear_button_text: string;
  submit_button_text: string;
}

interface WidgetAppearance {
  title: string;
  subtitle: string;
  title_alignment: 'left' | 'center' | 'right';
  subtitle_alignment: 'left' | 'center' | 'right';
  colors: WidgetColors;
  layout: string;
  show_title: boolean;
  clear_button: ButtonConfig;
  show_subtitle: boolean;
  submit_button: ButtonConfig;
}

interface WidgetOptions {
  auto_submit: boolean;
  hide_submit_button: boolean;
  collapse_form: boolean;
  collapse_form_open_by_default: boolean;
}

interface WidgetConfig {
  options: WidgetOptions;
  appearance: WidgetAppearance;
  translations: WidgetTranslations;
}

const VerifyFitmentWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ active: false, message: '', isError: false });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: WidgetConfig = {
    options: {
      auto_submit: true,
      hide_submit_button: false,
      collapse_form: true,
      collapse_form_open_by_default: true,
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
        setConfig(settings || defaultConfig);
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
              <Card sectioned>
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
      <Card sectioned>
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

      <Card sectioned>
        <Text variant="headingMd" as="h3">Colors</Text>
        <div style={{ marginTop: '12px' }}>
          <Grid>
            {Object.entries(config.appearance.colors).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <Grid.Cell key={key} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <ColorSwatch label={label} color={value} onChange={(newValue) => updateConfig(`appearance.colors.${key}`, newValue)} />
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
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Behavior</Text>
          <Checkbox label="Auto Submit" checked={config.options.auto_submit} onChange={(value) => updateConfig('options.auto_submit', value)} />
          {config.options.auto_submit && (
            <Checkbox label="Hide Submit Button" checked={config.options.hide_submit_button} onChange={(value) => updateConfig('options.hide_submit_button', value)} />
          )}
        </FormLayout>
      </Card>

      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Display Options</Text>
          <InlineStack gap="400">
            <Checkbox label="Show Title" checked={config.appearance.show_title} onChange={(value) => updateConfig('appearance.show_title', value)} />
            <Checkbox label="Show Subtitle" checked={config.appearance.show_subtitle} onChange={(value) => updateConfig('appearance.show_subtitle', value)} />
          </InlineStack>
        </FormLayout>
      </Card>

      <Card sectioned>
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
    <Card sectioned>
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

  const renderPreview = () => (
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
                          {['Select Year', 'Select Make', 'Select Model'].map((placeholder) => (
                            <select key={placeholder} style={{ width: '100%', height: '34px', padding: '0 10px', border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px', backgroundColor: config.appearance.colors.background_color, color: config.appearance.colors.text_color, fontSize: '13px' }} disabled>
                              <option>{placeholder}</option>
                            </select>
                          ))}
                        </BlockStack>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <BlockStack gap="200">
                  {['Select Year', 'Select Make', 'Select Model'].map((placeholder) => (
                    <select key={placeholder} style={{ width: '100%', height: '34px', padding: '0 10px', border: `1px solid ${config.appearance.colors.border_color}`, borderRadius: '4px', backgroundColor: config.appearance.colors.background_color, color: config.appearance.colors.text_color, fontSize: '13px' }} disabled>
                      <option>{placeholder}</option>
                    </select>
                  ))}
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Tabs,
  TextField,
  Frame,
  Toast,
  FormLayout,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Grid,
  SkeletonBodyText,
  SkeletonDisplayText,
  Button,
  Select,
  Icon,
} from '@shopify/polaris';
import { MinusIcon, PlusIcon, XIcon, RefreshIcon, ViewIcon } from '@shopify/polaris-icons';
import { supabase } from '../supabase/supabaseClient';

export async function getWidgetSettings(shopDomain: string, widgetType: string) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID:', storeError?.message || 'Store not found.');
    return null;
  }

  const storeId = storeData.id;

  const { data, error } = await supabase
    .from('widget_settings')
    .select('settings_json')
    .eq('widget_type', widgetType)
    .eq('store_id', storeId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching widget settings:', error);
    }
    return null;
  }

  return data?.settings_json ?? null;
}

export async function saveWidgetSettings(shopDomain: string, widgetType: string, settingsJson: object) {
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shopDomain)
    .single();

  if (storeError || !storeData) {
    console.error('Error fetching store ID for saving:', storeError?.message || 'Store not found.');
    return { success: false, error: 'Could not find the associated store.' };
  }

  const storeId = storeData.id;

  const { error } = await supabase
    .from('widget_settings')
    .upsert(
      {
        store_id: storeId,
        widget_type: widgetType,
        settings_json: settingsJson,
      },
      { onConflict: 'store_id, widget_type' }
    );

  if (error) {
    console.error('Error saving widget settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

const ColorSwatch = ({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color, border: '1px solid #E1E1E1' }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange((e.target.value || '').toUpperCase())}
          style={{ position: 'absolute', top: 0, left: 0, width: '32px', height: '32px', opacity: 0, cursor: 'pointer' }}
        />
      </div>
      <div>
        <Text variant="bodyMd" as="p" fontWeight="medium">{label}</Text>
        <p style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', margin: 0 }}>{color?.toUpperCase()}</p>
      </div>
    </div>
  );
};

interface SendButton {
  color: string;
  label: string;
}

interface WidgetOptions {
  quick_questions: string[];
  user_icon_url?: string;
  chat_bubble_icon_url: string;
}

interface WidgetAppearance {
  bubble_heading: string;
  bubble_heading_text_color: string;
  bubble_heading_background_color: string;
  heading: string;
  subheading: string;
  message_input_placeholder: string;
  text_color: string;
  border_radius: string;
  background_color: string;
  input_background_color: string;
  chat_bubble_background_color: string;
  send_button: SendButton;
}

interface WidgetConfig {
  options: WidgetOptions;
  appearance: WidgetAppearance;
}

const ChatBubbleWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ active: false, message: '', isError: false });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: WidgetConfig = {
    options: {
      quick_questions: [
        "Return Policy?",
        "Can I return a wrong part?",
        "How do I order?",
      ],
      chat_bubble_icon_url: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
    },
    appearance: {
      bubble_heading: "Parts Assistant",
      bubble_heading_text_color: "#FFFFFF",
      bubble_heading_background_color: "#374151",
      heading: "Need Help With Fitment?",
      subheading: "Ask me anything about parts, compatibility, & more.",
      message_input_placeholder: "Type your question about car parts...",
      text_color: "#FFFFFF",
      border_radius: "12px",
      background_color: "#1F2937",
      input_background_color: "#374151",
      chat_bubble_background_color: "#111827",
      send_button: {
        color: "#10B981",
        label: "Send"
      }
    }
  };


  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = typeof shopify !== 'undefined' ? shopify.config.shop : 'mock.myshopify.com';
        const settings = await getWidgetSettings(shopDomain, 'chat_bubble');

        if (settings?.options?.quick_questions?.length > 4) {
          settings.options.quick_questions = settings.options.quick_questions.slice(0, 4);
        }
        if (settings?.options?.bot_icon_url) {
          delete settings.options.bot_icon_url;
        }

        setConfig(settings || defaultConfig);
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
    }, 100);
  }, []);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const shopDomain: any = typeof shopify !== 'undefined' ? shopify.config.shop : 'mock.myshopify.com';
      const capped = {
        ...config,
        options: {
          ...config.options,
          quick_questions: (config.options.quick_questions || []).slice(0, 4),
        },
      };

      const { success, error } = await saveWidgetSettings(shopDomain, 'chat_bubble', capped);

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

  const addQuickQuestion = useCallback(() => {
    if (!config || (config.options.quick_questions?.length || 0) >= 4) return;
    const newQuestions = [...config.options.quick_questions, ''];
    updateConfig('options.quick_questions', newQuestions);
  }, [config, updateConfig]);

  const removeQuickQuestion = useCallback((index: number) => {
    if (!config) return;
    const newQuestions = config.options.quick_questions.filter((_, i) => i !== index);
    updateConfig('options.quick_questions', newQuestions);
  }, [config, updateConfig]);

  const updateQuickQuestion = useCallback((index: number, value: string) => {
    if (!config) return;
    const newQuestions = [...config.options.quick_questions];
    newQuestions[index] = value;
    updateConfig('options.quick_questions', newQuestions);
  }, [config, updateConfig]);

  const borderRadiusOptions = [
    { label: '0px (Square)', value: '0px' },
    { label: '4px (Slightly Rounded)', value: '4px' },
    { label: '8px (Rounded)', value: '8px' },
    { label: '12px (Very Rounded)', value: '12px' },
    { label: '16px (Pill Shape)', value: '16px' },
  ];

  const tabs = [
    { id: 'appearance', content: 'Appearance' },
    { id: 'options', content: 'Options' },
  ];

  if (loading || !config) {
    return (
      <Frame>
        <Page title="Chat Bubble Widget Configuration">
          <Layout>
            <Layout.Section>
              <Card sectioned>
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
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Text Content</Text>
          <TextField
            label="Bubble Heading"
            value={config.appearance.bubble_heading}
            onChange={(value) => updateConfig('appearance.bubble_heading', value)}
            autoComplete="off"
          />
          <TextField
            label="Heading"
            value={config.appearance.heading}
            onChange={(value) => updateConfig('appearance.heading', value)}
            autoComplete="off"
          />
          <TextField
            label="Subheading"
            value={config.appearance.subheading}
            onChange={(value) => updateConfig('appearance.subheading', value)}
            autoComplete="off"
          />
          <TextField
            label="Message Input Placeholder"
            value={config.appearance.message_input_placeholder}
            onChange={(value) => updateConfig('appearance.message_input_placeholder', value)}
            autoComplete="off"
          />
          <TextField
            label="Send Button Label"
            value={config.appearance.send_button.label}
            onChange={(value) => updateConfig('appearance.send_button.label', value)}
            autoComplete="off"
          />
        </FormLayout>
      </Card>

      <Card sectioned>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Colors</Text>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Bubble Heading Text"
                color={config.appearance.bubble_heading_text_color}
                onChange={(value) => updateConfig('appearance.bubble_heading_text_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Bubble Heading BG"
                color={config.appearance.bubble_heading_background_color}
                onChange={(value) => updateConfig('appearance.bubble_heading_background_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Main Text Color"
                color={config.appearance.text_color}
                onChange={(value) => updateConfig('appearance.text_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Main Background"
                color={config.appearance.background_color}
                onChange={(value) => updateConfig('appearance.background_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Input Background"
                color={config.appearance.input_background_color}
                onChange={(value) => updateConfig('appearance.input_background_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Chat Bubble BG"
                color={config.appearance.chat_bubble_background_color}
                onChange={(value) => updateConfig('appearance.chat_bubble_background_color', value)}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <ColorSwatch
                label="Send Button Color"
                color={config.appearance.send_button.color}
                onChange={(value) => updateConfig('appearance.send_button.color', value)}
              />
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Styling</Text>
          <Select
            label="Border Radius"
            options={borderRadiusOptions}
            value={config.appearance.border_radius}
            onChange={(value) => updateConfig('appearance.border_radius', value)}
          />
        </FormLayout>
      </Card>
    </BlockStack>
  );

  const renderOptionsTab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Icons</Text>
          <TextField
            label="Chat Bubble Icon URL"
            value={config.options.chat_bubble_icon_url}
            onChange={(value) => updateConfig('options.chat_bubble_icon_url', value)}
            autoComplete="off"
            helpText="Icon displayed on the chat bubble button."
          />
        </FormLayout>
      </Card>

      <Card sectioned>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Quick Questions</Text>
            <Button
              size="slim"
              icon={PlusIcon}
              onClick={addQuickQuestion}
              disabled={config.options.quick_questions.length >= 4}
            >
              Add Question
            </Button>
          </InlineStack>
          {config.options.quick_questions.length === 0 ? (
            <Text variant="bodySm" color="subdued">No quick questions added yet.</Text>
          ) : (
            <BlockStack gap="200">
              {config.options.quick_questions.map((question, index) => (
                <InlineStack key={index} gap="200" align="center">
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      value={question}
                      onChange={(value) => updateQuickQuestion(index, value)}
                      placeholder={`Quick question ${index + 1}`}
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    size="slim"
                    icon={MinusIcon}
                    onClick={() => removeQuickQuestion(index)}
                    accessibilityLabel={`Remove question ${index + 1}`}
                  />
                </InlineStack>
              ))}
            </BlockStack>
          )}
          <Text variant="bodySm" color="subdued">
            Add up to <b>4</b> quick questions that users can click to start conversations.
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderPreview = () => (
    <Card>
      <BlockStack gap="200">
        <Box padding="300">
          <Text variant="headingMd" as="h3">Live Preview</Text>
        </Box>
        <div style={{
          padding: '20px',
          backgroundColor: '#f1f2f4',
          height: '620px',
          position: 'relative',
          borderRadius: 'var(--p-border-radius-300)',
          border: '1px solid var(--p-color-border)',
          fontFamily: 'sans-serif',
          overflow: 'hidden'
        }}>
          {/* Chat Window */}
          <div style={{
            position: 'absolute',
            bottom: '90px',
            right: '20px',
            width: '375px',
            height: '500px',
            backgroundColor: config.appearance.background_color,
            borderRadius: config.appearance.border_radius,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: config.appearance.text_color,
            transition: 'all 0.2s ease-in-out',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: config.appearance.bubble_heading_background_color,
              color: config.appearance.bubble_heading_text_color,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '16px' }}>{config.appearance.bubble_heading}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: config.appearance.bubble_heading_text_color, opacity: 0.8 }}>
                  <Icon source={RefreshIcon} accessibilityLabel="Clear cache" />
                  <Icon source={ViewIcon} accessibilityLabel="Expand view" />
                  <Icon source={XIcon} accessibilityLabel="Close" />
              </div>
            </div>

            {/* Content Area (centered) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: config.appearance.text_color }}>
                  {config.appearance.heading}
                </h2>
                <p style={{ margin: 0, opacity: 0.7, fontSize: '14px', color: config.appearance.text_color }}>
                  {config.appearance.subheading}
                </p>
              </div>

              {/* Quick Questions */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                width: '100%',
                marginTop: '8px'
              }}>
                {config.options.quick_questions.slice(0, 4).map((q, i) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    border: `1px solid ${config.appearance.text_color}2A`,
                    borderRadius: '20px',
                    fontSize: '13px',
                    lineHeight: 1.3,
                    color: config.appearance.text_color,
                    backgroundColor: `transparent`,
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}>
                    {q || `Quick Question ${i + 1}`}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div style={{
                width: '100%',
                maxWidth: '520px',
                paddingTop: '14px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: config.appearance.input_background_color,
                  border: `1px solid ${config.appearance.text_color}2A`,
                  borderRadius: '8px',
                  padding: '4px 4px 4px 12px',
                  margin: '0 auto'
                }}>
                  <div style={{ flex: 1, fontSize: '14px', opacity: 0.5, color: config.appearance.text_color, textAlign: 'left' }}>
                    {config.appearance.message_input_placeholder}
                  </div>
                  <button style={{
                    backgroundColor: config.appearance.send_button.color,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'default'
                  }}>
                    {config.appearance.send_button.label}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Bubble Button */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: config.appearance.chat_bubble_background_color,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'default'
          }}>
            <img
              key={config.options.chat_bubble_icon_url}
              src={config.options.chat_bubble_icon_url}
              alt="Chat"
              style={{ width: '32px', height: '32px' }}
            />
          </div>

        </div>
        <Box padding="300">
          <Text variant="bodySm" color="subdued">
            This is a live preview showing how the chat widget will appear on your storefront. All settings update in real-time.
          </Text>
        </Box>
      </BlockStack>
    </Card>
  );

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
        title="Chat Bubble Widget Configuration"
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
              <div style={{ marginTop: '16px' }}>
                {selectedTab === 0 && renderAppearanceTab()}
                {selectedTab === 1 && renderOptionsTab()}
              </div>
            </Tabs>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <div style={{ paddingTop: '60px', position: 'sticky', top: '20px' }}>
              {renderPreview()}
            </div>
          </Grid.Cell>
        </Grid>
        <Box paddingBlockEnd="400" />
      </Page>
    </Frame>
  );
};

export default ChatBubbleWidget;