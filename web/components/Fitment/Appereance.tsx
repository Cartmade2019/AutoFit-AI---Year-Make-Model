import {
  Checkbox,
  FormLayout,
  InlineStack,
  TextField,
  Box,
  Text,
  Select,
  Button,
  RadioButton,
  BlockStack,
  Divider
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useState, Dispatch, SetStateAction } from 'react';
import ColorSwatch from './ColorSwatch';
import { CustomSelectBar } from './CustomSelectBar';

export interface Colors {
  text: string;
  border: string;
  // background: string;
  dropdown_border: string;
  clear_button_text: string;
  submit_button_text: string;
  dropdown_background: string;
  selected_background: string;
  clear_button_background: string;
  submit_button_background: string;
}

export function Appereance({
  setShowHeading,
  showHeading,
  setFormHeading,
  setFormSubHeading,
  formHeading,
  formSubHeading,
  setTheme,
  setAction,
  theme,
  action,
  layout,
  setLayout,
  customCss,
  setCustomCss,
  colors,
  setColors
}: {
  setShowHeading: any;
  showHeading: boolean;
  setFormHeading: Dispatch<SetStateAction<string | null>>;
  setFormSubHeading: Dispatch<SetStateAction<string | null>>;
  formHeading: string | null;
  formSubHeading: string | null;
  setTheme: (newTheme: 'light' | 'dark') => void;
  setAction: Dispatch<SetStateAction<'clear' | 'icon'>>;
  theme: string;
  action: string;
  layout: 'horizontal' | 'vertical';
  setLayout: Dispatch<SetStateAction<'horizontal' | 'vertical'>>;
  customCss: string;
  setCustomCss: Dispatch<SetStateAction<string>>;
  colors: Colors;
  setColors: (newColors: Colors) => void;
}) {
  const [selected, setSelected] = useState('2024');

  const options = [{ label: '2024', value: '2024' }];

  const handleCheckboxChange = (checked: boolean) => setShowHeading(checked);

  const handleChange = (key: string, value: string) => {
    setColors((prev: Colors) => ({ ...prev, [key]: value }) as Colors);
  };

  return (
    <>
      <Box padding="400">
        <Checkbox label="Show form heading" checked={showHeading} onChange={handleCheckboxChange} />

        <div style={{ marginTop: '1rem' }}>
          <FormLayout>
            <FormLayout.Group>
              <div style={{ flex: 1 }}>
                <Text as="p" fontWeight="bold">
                  Form Heading
                </Text>
                <TextField
                  label="Form Heading"
                  labelHidden
                  placeholder="Find Parts For Your Vehicle"
                  value={formHeading ?? ''}
                  onChange={(newValue) => setFormHeading(newValue)}
                  autoComplete="off"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="p" fontWeight="bold">
                  Form Sub Heading
                </Text>
                <TextField
                  label="Form Sub Heading"
                  labelHidden
                  value={formSubHeading ?? ''}
                  placeholder="Select your Year, Make, and Model"
                  onChange={(newValue) => setFormSubHeading(newValue)}
                  autoComplete="off"
                />
              </div>
            </FormLayout.Group>
          </FormLayout>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Divider />
        </div>

        <div style={{ marginTop: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Text as="p" fontWeight="bold">
              Input Color Scheme
            </Text>
          </div>

          <div style={{ justifyContent: 'space-between', display: 'flex', gap: '20px' }}>
            {/* Light themed select */}
            <div
              onClick={() => setTheme('light')}
              style={{
                border: theme === 'light' ? '1px solid #000' : '1px solid #ccc',
                padding: '8px',
                borderRadius: '8px',
                flex: '1 1 0',
                maxWidth: '195px',
                minHeight: '95px',
                cursor: 'pointer'
              }}
            >
              <CustomSelectBar label="Year" options={[]} value={'2024'} theme="light" />
              <div style={{ textAlign: 'center', marginTop: '4px' }}>Light</div>
            </div>

            {/* Dark themed select */}
            <div
              onClick={() => setTheme('dark')}
              style={{
                border: theme === 'dark' ? '1px solid #000' : '1px solid #ccc',
                padding: '8px',
                borderRadius: '8px',
                flex: '1 1 0',
                maxWidth: '195px',
                minHeight: '95px',
                cursor: 'pointer'
              }}
            >
              <CustomSelectBar label="Year" options={[]} value={'2024'} theme="dark" />
              <div style={{ textAlign: 'center', marginTop: '4px' }}>Dark</div>
            </div>

            <div
              style={{
                width: '1px',
                height: '100px',
                backgroundColor: '#ccc',
                margin: '0 1rem'
              }}
            ></div>

            {/* Clear filter button */}
            <div
              onClick={() => setAction('clear')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '1 1 0',
                padding: '12px',
                borderRadius: '8px',
                border: action === 'clear' ? '1px solid #000' : '1px solid #ccc',
                maxWidth: '195px',
                minHeight: '95px',
                cursor: 'pointer'
              }}
            >
              <Button fullWidth variant="secondary">
                Clear filter
              </Button>
              <div style={{ marginTop: '4px' }}>Button</div>
            </div>

            {/* Icon button */}
            <div
              onClick={() => setAction('icon')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: '1 1 0',
                padding: '12px',
                borderRadius: '8px',
                border: action === 'icon' ? '1px solid #000' : '1px solid #ccc',
                maxWidth: '195px',
                minHeight: '95px',
                cursor: 'pointer'
              }}
            >
              <Button icon={RefreshIcon} variant="tertiary" />
              <div style={{ marginTop: '4px' }}>Icon</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Divider />
        </div>

        <div style={{ marginTop: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Text as="p" fontWeight="bold">
              Colors
            </Text>
          </div>
          <InlineStack gap="400" wrap>
            {/* Row 1 */}
            <ColorSwatch label="Text color" color={colors.text} onChange={(v: string) => handleChange('text', v)} />
            <ColorSwatch label="Button Border color" color={colors.border} onChange={(v: string) => handleChange('border', v)} />
            {/* <ColorSwatch
              label="Background color"
              color={colors.background}
              onChange={(v) => handleChange('background', v)}
            /> */}
            <ColorSwatch
              label="Dropdown Border color"
              color={colors.dropdown_border}
              onChange={(v: string) => handleChange('dropdown_border', v)}
            />
            <ColorSwatch
              label="Clear Button Text"
              color={colors.clear_button_text}
              onChange={(v: string) => handleChange('clear_button_text', v)}
            />

            {/* Row 2 */}
            <ColorSwatch
              label="Submit Button Text"
              color={colors.submit_button_text}
              onChange={(v: string) => handleChange('submit_button_text', v)}
            />
            <ColorSwatch
              label="Dropdown Background"
              color={colors.dropdown_background}
              onChange={(v: string) => handleChange('dropdown_background', v)}
            />
            <ColorSwatch
              label="Selected Background color"
              color={colors.selected_background}
              onChange={(v: string) => handleChange('selected_background', v)}
            />
            <ColorSwatch
              label="Clear Button Background"
              color={colors.clear_button_background}
              onChange={(v: string) => handleChange('clear_button_background', v)}
            />
            <ColorSwatch
              label="Submit Button Background"
              color={colors.submit_button_background}
              onChange={(v: string) => handleChange('submit_button_background', v)}
            />
          </InlineStack>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Divider />
        </div>

        <div style={{ marginTop: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Text as="p" fontWeight="bold">
              Layout
            </Text>
          </div>
          <InlineStack gap="400" wrap={false}>
            <RadioButton
              label="Horizontal"
              checked={layout === 'horizontal'}
              id="horizontal"
              name="layout"
              onChange={() => setLayout('horizontal')}
            />
            <RadioButton
              label="Vertical"
              checked={layout === 'vertical'}
              id="vertical"
              name="layout"
              onChange={() => setLayout('vertical')}
            />
          </InlineStack>
        </div>
      </Box>
    </>
  );
}
