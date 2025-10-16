import React, { useState, useEffect } from 'react';
import { Text } from '@shopify/polaris';

/**
 * ColorSwatch component with macOS/Safari fix:
 * - Keeps a local state for <input type="color"> so it updates reliably.
 * - Normalizes: input uses lowercase; we pass uppercase back to parent.
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

export default ColorSwatch;
