import React, {useMemo, useState, useCallback} from 'react';
import {
  LegacyCard,
  IndexTable,
  useIndexResourceState,
  useBreakpoints,
  Text,
  Button,
  Tooltip,
  InlineStack,
  Box,
  Link,
  Thumbnail,
} from '@shopify/polaris';
import {DeleteIcon, ImageIcon} from '@shopify/polaris-icons';

export type SelectedProduct = {
  id: string;
  title: string;
  image: string | null;
  productType?: string; // unused
  handle?: string;      // unused
  variants?: unknown[]; // unused
};

export interface ProductListingProps {
  selectedProducts: SelectedProduct[];
  shopDomain: string;
  onRemoveProduct: (productId: string) => void;
  disabled?: boolean;
  pageSize?: number;
}

const getShopifyAdminUrl = (shopDomain: string, productId: string) => {
  if (!shopDomain) return null;
  const clean = shopDomain.replace('.myshopify.com', '');
  return `https://admin.shopify.com/store/${clean}/products/${productId}`;
};

const ProductListing: React.FC<ProductListingProps> = ({
  selectedProducts,
  shopDomain,
  onRemoveProduct,
  disabled = false,
  pageSize = 10,
}) => {
  if (!selectedProducts?.length) return null;

  const {smDown} = useBreakpoints();
  const [page, setPage] = useState(0);

  // pagination
  const totalPages = Math.max(1, Math.ceil(selectedProducts.length / pageSize));
  const pageStart = page * pageSize;
  const pageItems = useMemo(
    () => selectedProducts.slice(pageStart, pageStart + pageSize),
    [selectedProducts, pageStart, pageSize],
  );

  // IMPORTANT: pass the FULL list to selection state so "Select all" works across pages
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(selectedProducts as unknown as {[k: string]: unknown}[]);

  const onBulkRemove = useCallback(() => {
    selectedResources.forEach((id) => onRemoveProduct(String(id)));
    clearSelection();
  }, [selectedResources, onRemoveProduct, clearSelection]);

  const handleProductRemove = useCallback(
    (productId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      onRemoveProduct(productId);
    },
    [onRemoveProduct],
  );

  const headings = useMemo(
    () => [
      {title: 'Product', alignment: 'start' as const},
      {title: 'Actions', alignment: 'end' as const},
    ],
    [],
  );

  const adminUrls = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of pageItems) m.set(p.id, getShopifyAdminUrl(shopDomain, p.id));
    return m;
  }, [pageItems, shopDomain]);

  const buildRowClick =
    (productId: string) =>
    (event?: React.MouseEvent<HTMLTableRowElement>) => {
      if (!event) return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest('button, a, [role="button"], input, [data-prevent-row-select]')) return;
      const isSelected = selectedResources.includes(productId);
      handleSelectionChange('single', !isSelected, productId);
    };

  let position = pageStart;
  const rowMarkup = pageItems.map((product) => {
    const productUrl = adminUrls.get(product.id) || undefined;

    return (
      <IndexTable.Row
        key={product.id}
        id={product.id}
        position={position++}
        selected={selectedResources.includes(product.id)}
        rowType="data"
        onClick={buildRowClick(product.id)}
      >
        {/* PRODUCT: image + full title (no truncation) */}
        <IndexTable.Cell>
          <InlineStack gap="200" align="start" blockAlign="center">
            <Thumbnail
              source={product.image ? product.image : ImageIcon}
              alt={product.title}
              size={smDown ? 'small' : 'medium'}
            />
            <Box>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {productUrl ? (
                  <Link url={productUrl} external data-prevent-row-select
                     onClick={(event) => event.stopPropagation()}
                    >
                    {product.title}
                  </Link>
                ) : (
                  product.title
                )}
              </Text>
            </Box>
          </InlineStack>
        </IndexTable.Cell>

        {/* ACTIONS */}
        <IndexTable.Cell>
          <InlineStack align="end">
            <Tooltip content={`Remove ${product.title}`}>
              <Button
                icon={DeleteIcon}
                onClick={(event) => handleProductRemove(product.id, event)}
                accessibilityLabel={`Remove ${product.title}`}
                disabled={disabled}
                tone="critical"
                data-prevent-row-select
              />
            </Tooltip>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const promotedBulkActions = [
    {
      icon: DeleteIcon,
      destructive: true,
      content: 'Remove selected',
      onAction: onBulkRemove,
      disabled: disabled || selectedResources.length === 0,
    },
  ];

  const hasNext = page < totalPages - 1;
  const hasPrevious = page > 0;

  return (
    <Box paddingBlockEnd="400">
      <LegacyCard>
        <IndexTable
          condensed={smDown}
          resourceName={{singular: 'product', plural: 'products'}}
          itemCount={selectedProducts.length}
          headings={headings}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          promotedBulkActions={promotedBulkActions}
          style={{minWidth: 560}}
          pagination={{
            hasNext,
            hasPrevious,
            onNext: () => setPage((p) => Math.min(p + 1, totalPages - 1)),
            onPrevious: () => setPage((p) => Math.max(p - 1, 0)),
          }}
        >
          {rowMarkup}
        </IndexTable>
      </LegacyCard>
    </Box>
  );
};

export {ProductListing};
export default ProductListing;
