import { Card, BlockStack, Box, InlineStack } from '@shopify/polaris';

export const SetupSkeleton = () => (
  <Card padding="300">
    <BlockStack gap="200">
      {/* Header */}
      <div
        style={{
          height: '20vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#008060',
                animation: `bounce 1s ${i * 0.2}s infinite ease-in-out`
              }}
            />
          ))}
        </div>
        <p style={{ fontWeight: 500, fontSize: '16px', color: '#333' }}>Loading Setup Status</p>

        <style>
          {`
            @keyframes bounce {
              0%, 80%, 100% {
                transform: scale(0);
              }
              40% {
                transform: scale(1);
              }
            }
          `}
        </style>
      </div>
    </BlockStack>
  </Card>
);
