import { TextField, Text, RadioButton } from '@shopify/polaris';
import { useState, useCallback, Dispatch, SetStateAction } from 'react';

export function AIOptions({
  aiAssistantEnabled,
  setAIAssistantEnabled,
  customPromptEnabled,
  setCustomPromptEnabled,
  customPromptText,
  setCustomPromptText
}: {
  aiAssistantEnabled: string;
  setAIAssistantEnabled: Dispatch<SetStateAction<'enable' | 'disable'>>;
  customPromptEnabled: string;
  setCustomPromptEnabled: Dispatch<SetStateAction<'enable' | 'disable'>>;
  customPromptText: string;
  setCustomPromptText: Dispatch<SetStateAction<string>>;
}) {
  const handlePromptChange = useCallback((value: string) => setCustomPromptText(value), []);

  const handleAIAssistantDisable = () => {
    setAIAssistantEnabled('disable');
    setCustomPromptEnabled('disable');
    setCustomPromptText('');
  };

  console.log(aiAssistantEnabled, customPromptEnabled, customPromptText, 'data');

  return (
    <>
      <div style={{ padding: '1rem' }}>
        {/* AI Assistant Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <Text as="h6" variant="headingSm">
            AI Assistant
          </Text>
          <div style={{ display: 'flex', gap: '18px' }}>
            <RadioButton
              label="Enable"
              checked={aiAssistantEnabled === 'enable'}
              id="ai-enable"
              name="ai-assistant"
              onChange={() => setAIAssistantEnabled('enable')}
            />
            <RadioButton
              label="Disable"
              checked={aiAssistantEnabled === 'disable'}
              id="ai-disable"
              name="ai-assistant"
              onChange={handleAIAssistantDisable}
            />
          </div>
        </div>

        {/* Show only when AI Assistant is enabled */}
        {aiAssistantEnabled === 'enable' && (
          <>
            {/* Custom Prompt Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <Text as="h6" variant="headingSm">
                Custom prompt
              </Text>
              <div style={{ display: 'flex', gap: '18px' }}>
                <RadioButton
                  label="Enable"
                  checked={customPromptEnabled === 'enable'}
                  id="prompt-enable"
                  name="custom-prompt"
                  onChange={() => setCustomPromptEnabled('enable')}
                />
                <RadioButton
                  label="Disable"
                  checked={customPromptEnabled === 'disable'}
                  id="prompt-disable"
                  name="custom-prompt"
                  onChange={() => setCustomPromptEnabled('disable')}
                />
              </div>
            </div>

            {/* Custom Prompt TextField */}
            {customPromptEnabled === 'enable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <TextField
                  label=""
                  autoComplete=""
                  value={customPromptText}
                  onChange={handlePromptChange}
                  multiline={4} // Makes it visibly multiline
                />
                <Text as="p" variant="bodySm">
                  This message will be shown in the chat bubble
                </Text>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
