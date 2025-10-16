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
import { getWidgetSettings, saveWidgetSettings } from '../lib/widgetSettings';
import type { TableConfig } from '../types/widgets';
import ColorSwatch from '../components/ColorSwatch';

// --- Mock Data ---
const mockTableData = [
  { year: '2023', make: 'Toyota', model: 'Camry', trim: 'LE', engine: '2.5L I4' },
  { year: '2022', make: 'Honda', model: 'Civic', trim: 'Sport', engine: '2.0L I4' },
  { year: '2023', make: 'Ford', model: 'F-150', trim: 'XLT', engine: '3.3L V6' },
];

// --- Default Configuration ---
const defaultConfig: TableConfig = {
  options: {
    sortable: false,
    pagination: false,
    searchable: false,
    show_title: true,
    default_sort: { order: 'desc' },
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

// --- Child Components for Tabs ---

/**
 * Appearance Tab Component
 * Contains all UI and logic for the 'Appearance' settings.
 */
const AppearanceTab: React.FC<{ config: TableConfig; updateConfig: (path: string, value: any) => void; }> = ({ config, updateConfig }) => {
  const [heading, setHeading] = useState(config.appearance.heading);
  const [subheading, setSubheading] = useState(config.appearance.subheading);

  // Sync local state if the main config object changes from an external source (e.g., reverting changes)
  useEffect(() => {
    setHeading(config.appearance.heading);
    setSubheading(config.appearance.subheading);
  }, [config.appearance.heading, config.appearance.subheading]);

  return (
    <BlockStack gap="400">
      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">Headings</Text>
          <TextField
            label="Table Heading"
            value={heading}
            onChange={(value) => {
              setHeading(value);
              updateConfig('appearance.heading', value);
            }}
            autoComplete="off"
          />
          <TextField
            label="Table Subheading"
            value={subheading}
            onChange={(value) => {
              setSubheading(value);
              updateConfig('appearance.subheading', value);
            }}
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

      <Card>
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
};

/**
 * Options Tab Component
 * Contains all UI and logic for the 'Options' settings.
 */
const OptionsTab: React.FC<{ config: TableConfig; updateConfig: (path: string, value: any) => void; }> = ({ config, updateConfig }) => (
  <BlockStack gap="400">
    <Card>
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

    <Card>
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

  // Fetch settings when the component mounts
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = shopify.config.shop; // Assuming 'shopify' is globally available
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
    }, 200);
  }, []);

  // Handle saving the configuration
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
  
  // --- Render Functions ---
  const renderPreview = () => {
    // This function doesn't use hooks, so it's fine to keep it inside the main component
    const displayData = config!.options.pagination
      ? mockTableData.slice(0, config!.options.items_per_page)
      : mockTableData;

    const visibleColumns = config!.options.number_of_colums || 3;
    const columns = ['year', 'make', 'model', 'trim', 'engine'].slice(0, visibleColumns);

    return (
      <Card>
        <BlockStack gap="300">
          <div style={{ padding: '12px 12px 0 12px' }}>
            <Text variant="headingMd" as="h3">Live Preview</Text>
            <Box paddingBlockStart="100">
              <Text variant="bodySm" as="p" tone="subdued">
                This is a preview using dummy data. The actual widget may differ on your storefront.
              </Text>
            </Box>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb' }}>
            <div style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: config!.appearance.background_color,
              padding: '20px',
              borderRadius: config!.appearance.border_radius,
              border: `1px solid ${config!.appearance.border_color}`
            }}>
              {/* Heading */}
              {(config!.options.show_title || config!.options.show_subtitle) && (
                <div style={{ marginBottom: '16px' }}>
                  {config!.options.show_title && (
                    <h2 style={{
                      color: config!.appearance.text_color,
                      margin: '0 0 4px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      textAlign: config!.options.title_alignment as any
                    }}>
                      {config!.appearance.heading}
                    </h2>
                  )}
                  {config!.options.show_subtitle && (
                    <p style={{
                      color: config!.appearance.text_color,
                      margin: '0',
                      fontSize: '14px',
                      opacity: 0.7,
                      textAlign: config!.options.subtitle_alignment as any
                    }}>
                      {config!.appearance.subheading}
                    </p>
                  )}
                </div>
              )}

              {/* Search Bar */}
              {config!.options.searchable && (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '8px 12px',
                      border: `1px solid ${config!.appearance.border_color}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: config!.appearance.text_color
                    }}
                    disabled
                  />
                </div>
              )}

              {/* Table */}
              <div style={{
                overflowX: 'auto',
                border: `1px solid ${config!.appearance.border_color}`,
                borderRadius: config!.appearance.border_radius
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: config!.appearance.header_background }}>
                      {columns.map((column, index) => (
                        <th key={column} style={{
                          padding: '12px',
                          textAlign: 'left',
                          color: config!.appearance.text_color,
                          fontWeight: '600',
                          borderBottom: `1px solid ${config!.appearance.border_color}`,
                          ...(index > 0 && { borderLeft: `1px solid ${config!.appearance.border_color}` }),
                          cursor: config!.options.sortable ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {column.charAt(0).toUpperCase() + column.slice(1)}
                            {config!.options.sortable && <span style={{ fontSize: '12px', opacity: 0.5 }}>↕</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{
                        backgroundColor: config!.appearance.striped_rows && rowIndex % 2 === 1
                          ? '#f8f9fa'
                          : 'transparent'
                      }}>
                        {columns.map((column, colIndex) => (
                          <td key={column} style={{
                            padding: '12px',
                            color: config!.appearance.text_color,
                            borderBottom: rowIndex < displayData.length - 1 ? `1px solid ${config!.appearance.border_color}` : 'none',
                            ...(colIndex > 0 && { borderLeft: `1px solid ${config!.appearance.border_color}` })
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
                color: config!.appearance.text_color
              }}>
                {config!.options.show_total_count && (
                  <span style={{ opacity: 0.7 }}>
                    Showing {displayData.length} of {mockTableData.length} vehicles
                  </span>
                )}
                {config!.options.pagination && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      padding: '4px 8px',
                      border: `1px solid ${config!.appearance.border_color}`,
                      borderRadius: '4px',
                      backgroundColor: config!.appearance.background_color,
                      color: config!.appearance.text_color,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }} disabled>
                      Previous
                    </button>
                    <button style={{
                      padding: '4px 8px',
                      border: `1px solid ${config!.appearance.border_color}`,
                      borderRadius: '4px',
                      backgroundColor: config!.appearance.background_color,
                      color: config!.appearance.text_color,
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


  const tabs = [
    { id: 'appearance', content: 'Appearance' },
    { id: 'options', content: 'Options' },
  ];

  if (loading || !config) {
    return (
      <Frame>
        <Page title="Fitment Table Configuration">
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
                {selectedTab === 0 && <AppearanceTab config={config} updateConfig={updateConfig} />}
                {selectedTab === 1 && <OptionsTab config={config} updateConfig={updateConfig} />}
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