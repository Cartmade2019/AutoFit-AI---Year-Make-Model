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
  Select,
  Box,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris';
import { getStoreSettings, updateStoreSettings } from '../lib/storeSettings';
import i18n from "../i18n/config";
import { supabase } from "../supabase/supabaseClient";
import SetupCard from '../components/SetupCard'

interface GlobalStoreSettings {
  ui: {
    custom_js: string;
    custom_css: string;
  };
  behavior: {
    enable_analytics: boolean;
  };
  notifications: {
    enable_email_notifications?: boolean;
  };
}

const GlobalSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [settings, setSettings] = useState<GlobalStoreSettings | null>(null);
  const [toast, setToast] = useState<{ active: boolean; message: string; isError: boolean }>({ 
    active: false, 
    message: '', 
    isError: false 
  });
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const debounceTimeout = useRef<number | null>(null);

  const [language, setLanguage] = useState("en");

  const defaultSettings: GlobalStoreSettings = {
    ui: {
      custom_js: "",
      custom_css: "",
    },
    behavior: {
      enable_analytics: true,
    },
    notifications: {
      enable_email_notifications: false,
    },
  };

    const options = [
    { label: "English", value: "en" },
    { label: "Dutch", value: "du" },
  ];

    const handleChangeLanguage = async (value: string) => {
    try{
    const shopDomain = shopify.config.shop

    const {data: storeData , error: storeError} = await supabase.from("stores").update({
      language: value
    }).eq("shop_domain", shopDomain)
      
    setLanguage(value);
    document.cookie = `language=${value}; path=/; max-age=31536000`;
    i18n.changeLanguage(value);
    } catch (error){
      console.error("Failed to update language", error)
    } 
  }

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const shopDomain: any = shopify.config.shop;
        const loadedSettings = await getStoreSettings(shopDomain);
        setSettings(loadedSettings || defaultSettings);
      } catch (error) {
        console.error('Failed to load store settings:', error);
        setSettings(defaultSettings);
        setToast({ active: true, message: 'Could not load settings.', isError: true });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = useCallback((path: string, value: any) => {
    setSettings((prevSettings) => {
      if (!prevSettings) return null;
      const pathArray = path.split('.');
      const newSettings = JSON.parse(JSON.stringify(prevSettings));
      let current = newSettings;
      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }
      current[pathArray[pathArray.length - 1]] = value;
      return newSettings;
    });
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setIsSaving(true);
    
    // Clear any pending debounce timeout before saving
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    
    try {
      const shopDomain: any = shopify.config.shop;
      await updateStoreSettings(shopDomain, settings);
      setToast({ active: true, message: 'Global settings saved successfully!', isError: false });
      setIsDirty(false);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setToast({ active: true, message: `Save failed: ${error.message}`, isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const tabs = [
    { id: 'ui', content: 'UI & Customization' },
    { id: 'setup', content: 'Setup Guide' },
    // { id: 'language', content: 'Language Settings' },
  ];

  if (loading || !settings) {
    return (
      <Frame>
        <Page title="Global Store Settings">
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

  const renderBehaviorTab = () => (
    <BlockStack gap="400">
      <Card>
        <FormLayout>
          <Text variant="headingMd" as="h3">General Behavior</Text>
          <Checkbox
            label="Enable Analytics"
            checked={settings.behavior.enable_analytics}
            onChange={(value) => updateSetting('behavior.enable_analytics', value)}
            helpText="Track user interactions and widget usage for insights and improvements"
          />
        </FormLayout>
      </Card>
    </BlockStack>
  );

  const renderUITab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Custom Code</Text>
          <TextField
            label="Custom CSS"
            multiline={8}
            value={settings.ui.custom_css}
            onChange={(value) => updateSetting('ui.custom_css', value)}
            helpText="Custom CSS to apply to all widgets and components"
            placeholder="/* Your custom CSS here */
.my-custom-widget {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}"
          />
          {/* <TextField
            label="Custom JavaScript"
            multiline={8}
            value={settings.ui.custom_js}
            onChange={(value) => updateSetting('ui.custom_js', value)}
            helpText="Custom JavaScript to load with widgets (executed after widget initialization)"
            placeholder="// Your custom JavaScript here
console.log('Custom JS loaded');

// Example: Add custom event listeners
document.addEventListener('widgetLoaded', function(event) {
  console.log('Widget loaded:', event.detail);
});"
          /> */}
        </FormLayout>
      </Card>
    </BlockStack>
  );

  const renderNotificationsTab = () => (
    <BlockStack gap="400">
      <Card sectioned>
        <FormLayout>
          <Text variant="headingMd" as="h3">Email Notifications</Text>
          <Checkbox
            label="Enable Email Notifications"
            checked={settings.notifications.enable_email_notifications || false}
            onChange={(value) => updateSetting('notifications.enable_email_notifications', value)}
            helpText="Receive email notifications for important events, errors, and system updates"
          />
        </FormLayout>
      </Card>
    </BlockStack>
  );

  const renderLanguageSettings = () => (
     <BlockStack gap="400">
    <Card>
            <Text as="h3" variant="headingSm" fontWeight="medium">
              Language Settings
            </Text>
            <Box paddingBlockStart="400">
              <Select
                label="Select Your Preferred Language"
                options={options}
                onChange={handleChangeLanguage}
                value={language}
              />
            </Box>
          </Card>
       </BlockStack>
  )

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
        title="Global Store Settings"
        backAction={{ content: 'Back', onAction: () => navigate('/') }}
        primaryAction={{
          content: 'Save Settings',
          onAction: handleSave,
          disabled: !isDirty || isSaving,
          loading: isSaving,
        }}
      >
        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: '1rem' }}>
                {selectedTab === 0 && renderUITab()}
                {selectedTab === 1 && <SetupCard page={"settings"}/>}
                {/* {selectedTab === 1 && renderBehaviorTab()} */}
                {/* {selectedTab === 1 && renderNotificationsTab()} */}
                
              </div>
            </Tabs>
          </Layout.Section>
        </Layout>
        <Box paddingBlockEnd="400" />
      </Page>
    </Frame>
  );
};

export default GlobalSettings;