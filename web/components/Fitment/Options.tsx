import { FormLayout, Checkbox, Text, RadioButton, Box } from '@shopify/polaris';
import { useState, useCallback, Dispatch, SetStateAction } from 'react';

export function Options({
  autoSubmitOptions,
  setAutoSubmitOptions,
  hideSubmitOptions,
  setHideSubmitOptions,
  collapseForm,
  setCollapseForm,
  searchWithinCollection,
  setSearchWithinCollection,
  applyFiltersAcrossCollections,
  setApplyFiltersAcrossCollections,
  formMode,
  setFormMode
}: {
  autoSubmitOptions: boolean;
  setAutoSubmitOptions: Dispatch<SetStateAction<boolean>>;
  hideSubmitOptions: boolean;
  setHideSubmitOptions: Dispatch<SetStateAction<boolean>>;
  collapseForm: boolean;
  setCollapseForm: Dispatch<SetStateAction<boolean>>;
  searchWithinCollection: boolean;
  setSearchWithinCollection: Dispatch<SetStateAction<boolean>>;
  applyFiltersAcrossCollections: boolean;
  setApplyFiltersAcrossCollections: Dispatch<SetStateAction<boolean>>;
  formMode: string;
  setFormMode: Dispatch<SetStateAction<string>>;
}) {
  const handleRadioChange = useCallback((newValue: string) => setFormMode(newValue), []);

  return (
    <>
      <Box padding="400">
        <FormLayout>
          <Checkbox
            label="Auto-submit form when final value is selected"
            checked={autoSubmitOptions}
            onChange={setAutoSubmitOptions}
          />

          <div style={{ paddingLeft: '2rem' }}>
            <Checkbox
              label="Hide submit button"
              checked={hideSubmitOptions}
              onChange={setHideSubmitOptions}
              disabled={!autoSubmitOptions}
            />
          </div>

          <Checkbox
            label="Collapse form in vertical layout and on mobile devices"
            checked={collapseForm}
            onChange={setCollapseForm}
          />

          <Checkbox
            label="Search within current collection only, when on Collection page"
            checked={searchWithinCollection}
            onChange={setSearchWithinCollection}
          />

          <Checkbox
            label="Apply form filters while browsing over different collections"
            checked={applyFiltersAcrossCollections}
            onChange={setApplyFiltersAcrossCollections}
          />

          <Text as="h6" variant="headingSm" fontWeight="semibold">
            Display mode
          </Text>

          <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <RadioButton
              label="Search form and fitment widget"
              checked={formMode === 'search_and_fitment'}
              id="search_and_fitment"
              name="form_mode"
              onChange={() => handleRadioChange('search_and_fitment')}
            />

            <RadioButton
              label="Fitment widget only"
              checked={formMode === 'fitment_only'}
              id="fitment_only"
              name="form_mode"
              onChange={() => handleRadioChange('fitment_only')}
            />
          </div>
        </FormLayout>
      </Box>
    </>
  );
}
