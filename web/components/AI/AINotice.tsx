import { Banner, Text, Button, BlockStack, Box } from '@shopify/polaris';
import { useState } from 'react';

export function AiAssistantNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <Banner
      title="Check if the Chat with AI Assistant is activated in your theme settings under App Embeds."
      tone="info"
      hideIcon={false}
      onDismiss={() => setVisible(false)}
    >
      <BlockStack gap="400">
        <Text as="p">
          1. Go to your theme editor
          <br />
          2. Click on “App embeds” in the sidebar
          <br />
          3. Look for “Textyess Chat with AI Assistant” in the list
          <br />
          4. Make sure the toggle switch next to it is turned on
        </Text>

        <Box>
          <Button variant="secondary">Open Theme Section </Button>
        </Box>
      </BlockStack>
    </Banner>
  );
}
