import { FormLayout, Text, Checkbox, Box } from '@shopify/polaris';
import { useState, Dispatch, SetStateAction } from 'react';

export function Options({
  autoSubmit,
  setAutoSubmit,
  collapseForm,
  setCollapseForm
}: {
  autoSubmit: boolean;
  setAutoSubmit: Dispatch<SetStateAction<boolean>>;
  collapseForm: boolean;
  setCollapseForm: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <Box padding="400">
        <FormLayout>
          <Text as="h6" variant="headingSm" fontWeight="semibold">
            Configure Form Behaviour
          </Text>

          <Checkbox
            label="Auto-submit form when final value is selected"
            checked={autoSubmit}
            onChange={setAutoSubmit}
          />

          <Checkbox label="Collapse Form" checked={collapseForm} onChange={setCollapseForm} />
        </FormLayout>
      </Box>
    </>
  );
}
