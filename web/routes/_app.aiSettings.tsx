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
import { getWidgetSettings, saveWidgetSettings } from '../lib/widgetSettings';
import type { ChatBubbleWidgetConfig } from '../types/widget';
import ColorSwatch from '../components/ColorSwatch';

// Types are imported from '../types/widgets'

const ChatBubbleWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config, setConfig] = useState<ChatBubbleWidgetConfig | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ active: false, message: '', isError: false });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const defaultConfig: ChatBubbleWidgetConfig = {
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
    <BlockStack gap="400">
      <Card>
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

      <Card>
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

      <Card>
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
      <Card>
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

      <Card>
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
            <Text as='span' variant="bodySm" tone="subdued">No quick questions added yet.</Text>
          ) : (
            <BlockStack gap="200">
              {config.options.quick_questions.map((question, index) => (
                <InlineStack key={index} gap="200" align="center">
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      label=""
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
          <Text as="span" variant="bodySm" tone="subdued">
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
          <Text as='span' variant="bodySm" tone="subdued">
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