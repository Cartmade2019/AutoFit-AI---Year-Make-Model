import {
  Box,
  BlockStack,
  Icon,
  Link,
  Text,
} from '@shopify/polaris';

export default function CardSection({
  icon,
  title,
  description,
  link,
  isExternal,
}: {
  icon: any;
  title: string;
  description: string;
  link: string;
  isExternal: boolean;
}) {
  return (
    <div style={{ cursor: 'pointer' }}>
      <Box background="bg-surface-secondary" padding="300" borderRadius="300">
        <BlockStack gap="100">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Box paddingInline="0">
              <Icon source={icon} tone="subdued" />
            </Box>

            <Link
              url={link}
              external={isExternal}
              removeUnderline
            >
              <Text as="span" tone="text-interactive" fontWeight="medium">
                {title}
              </Text>
            </Link>
          </div>

          <Text as="p" tone="subdued">
            {description}
          </Text>
        </BlockStack>
      </Box>
    </div>
  );
}
