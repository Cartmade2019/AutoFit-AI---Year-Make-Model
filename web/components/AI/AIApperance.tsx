import {
  BlockStack,
  TextField,
  InlineStack,
  Button,
  Box,
  Text,
  FormLayout,
  Divider
} from '@shopify/polaris';
import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { XIcon } from '@shopify/polaris-icons';

export function AIAppearance({
  assistantName,
  setAssistantName,
  welcomeMsg,
  setWelcomeMsg,
  selectedInterfaceColor,
  setSelectedInterfaceColor,
  selectedTextColor,
  setSelectedTextColor,
  questions,
  setQuestions,
  newQuestion,
  setNewQuestion
}: {
  assistantName: string;
  setAssistantName: Dispatch<SetStateAction<string>>;
  welcomeMsg: string;
  setWelcomeMsg: Dispatch<SetStateAction<string>>;
  selectedInterfaceColor: string;
  setSelectedInterfaceColor: Dispatch<SetStateAction<string>>;
  selectedTextColor: string;
  setSelectedTextColor: Dispatch<SetStateAction<string>>;
  questions: string[];
  setQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  newQuestion: string;
  setNewQuestion: Dispatch<SetStateAction<string>>;
}) {
  const interfaceColors = ['#0070f3', '#36cfc9', '#4ade80', '#fb923c', '#f472b6'];
  const textColors = ['#111827', '#374151', '#9ca3af'];

  const handleAdd = () => {
    if (newQuestion.trim() !== '') {
      setQuestions([...questions, newQuestion.trim()] as any);
      setNewQuestion('');
    }
  };

  const handleRemove = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated as any);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <BlockStack gap="400">
        <TextField label="Assistant name" value={assistantName} onChange={setAssistantName} autoComplete="off" />

        <TextField
          label="Welcome message"
          autoComplete=""
          value={welcomeMsg}
          onChange={setWelcomeMsg}
          multiline={3}
        />

        <Divider />

        <FormLayout>
          <Text variant="headingSm" as="h6">
            Assistant Questions
          </Text>

          {questions?.map((q, idx) => (
            <Box key={idx} position="relative">
              <TextField
                label="Assistant Question"
                value={q}
                onChange={() => {}}
                autoComplete="off"
                labelHidden
                connectedRight={<Button icon={XIcon} onClick={() => handleRemove(idx)} />}
              />
            </Box>
          ))}

          <BlockStack gap="500">
            <TextField
              label=""
              value={newQuestion}
              onChange={setNewQuestion}
              placeholder="Type new question"
              labelHidden
              autoComplete=""
            />
            <Button variant="primary" onClick={handleAdd}>
              Add Question
            </Button>
          </BlockStack>

          <Divider />

          <Text variant="headingSm" as="h6">
            Chat interface colour
          </Text>
          <InlineStack>
            {interfaceColors?.map((color, i) => (
              <Box key={i} borderRadius="full" padding="100">
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedInterfaceColor === color ? '3px solid #000' : '2px solid white',
                    boxShadow: '0 0 0 1px #ccc',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedInterfaceColor(color);
                    console.log('Selected interface color:', color);
                  }}
                />
              </Box>
            ))}
          </InlineStack>

          <Text variant="headingSm" as="h6">
            Text Colour
          </Text>
          <InlineStack>
            {textColors?.map((color, i) => (
              <Box key={i} borderRadius="full" padding="100">
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedTextColor === color ? '3px solid #000' : '2px solid white',
                    boxShadow: '0 0 0 1px #ccc',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedTextColor(color);
                    console.log('Selected text color:', color);
                  }}
                />
              </Box>
            ))}
          </InlineStack>
        </FormLayout>
      </BlockStack>
    </div>
  );
}
