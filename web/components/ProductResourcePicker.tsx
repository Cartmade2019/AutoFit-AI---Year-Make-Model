// Global shopify object type declaration
declare global {
  interface Window {
    shopify: {
      resourcePicker: (options: {
        type: string;
        multiple?: boolean;
        selectionIds?: string[];
      }) => Promise<{
        selection: Array<{
          id: string;
          title: string;
          handle: string;
          vendor?: string;
          productType?: string;
          variants?: Array<{
            id: string;
            title: string;
            sku?: string;
            price?: string;
            inventoryQuantity?: number;
            available?: boolean;
          }>;
          images?: Array<{
            originalSrc: string;
            altText?: string;
          }>;
        }>;
      }>;
    };
  }
}

export type VariantRef = {
  shopify_variant_id: number;
  sku?: string | null;
  price?: string | null;
  status?: string | null;
  variant_title?: string | null;
};

export type SelectedProduct = {
  id: string; // shopify_product_id as string
  title: string;
  image: string;
  vendor?: string;
  productType?: string;
  handle?: string;
  variants: VariantRef[];
};

export type CollectionData = {
  collectionId: string;
  collectionName: string;
  collectionImage: string;
  products: any[];
};

export interface ResourcePickerOptions {
  mode: 'product' | 'collection';
  selectedProducts?: SelectedProduct[];
  selectedCollections?: CollectionData[];
  onProductsSelected?: (products: SelectedProduct[]) => void;
  onCollectionsSelected?: (collections: CollectionData[]) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export const openResourcePicker = async ({
  mode,
  selectedProducts = [],
  selectedCollections = [],
  onProductsSelected,
  onCollectionsSelected,
  onError,
  onSuccess,
}: ResourcePickerOptions): Promise<boolean> => {
  try {
    if (!window.shopify?.resourcePicker) {
      onError?.('Shopify resource picker is not available');
      return false;
    }

    const pickerType = mode === 'product' ? 'product' : 'collection';
    
    // For products in edit mode, pass currently selected product IDs to resource picker
        // This ensures already selected products are pre-selected in the picker
const currentSelectionIds = mode === 'product' 
  ? selectedProducts.map(p => ({ id: `gid://shopify/Product/${p.id}` }))
  : selectedCollections.map(c => ({ id: `gid://shopify/Collection/${c.collectionId}` }));

    const result = await window.shopify.resourcePicker({
      type: pickerType,
      multiple: true,
      selectionIds: currentSelectionIds,
      filter: {
        variants: false, 
    }
    });

   if (!result?.selection || result.selection.length === 0) {
      if (mode === 'product' && onProductsSelected) {
        onProductsSelected([]); 
      }
      if (mode === 'collection' && onCollectionsSelected) {
        onCollectionsSelected([]); 
      }
      onSuccess?.(`No ${mode === 'product' ? 'products' : 'collections'} selected`);
      return true;
    }

    if (mode === 'product' && onProductsSelected) {
  const newProducts: SelectedProduct[] = result.selection.map(product => {
    const productId = product.id.split('/').pop() || product.id;

    console.log(product , 'what is product')

    // Convert Shopify variants to our format
    const variants: VariantRef[] = (product.variants || []).map((variant: any) => ({
      shopify_variant_id: Number(variant.id.split('/').pop()),
      sku: variant.sku || null,
      price: variant.price || null,
      status: variant.available ? 'active' : 'draft',
      variant_title: variant.title || null,
    }));

    return {
      id: productId,
      title: product.title,
      image: product.images?.[0]?.originalSrc || '',
      vendor: product.vendor || undefined,
      productType: product.productType || undefined,
      handle: product.handle || undefined,
      variants,
    };
  });

  onProductsSelected(newProducts);

  onSuccess?.(`Selected ${newProducts.length} product${newProducts.length !== 1 ? 's' : ''}`);
} else if (mode === 'collection' && onCollectionsSelected) {
      const newCollections: CollectionData[] = result.selection.map(collection => ({
        collectionId: collection.id.split('/').pop() || collection.id,
        collectionName: collection.title,
        collectionImage: collection.images?.[0]?.originalSrc || '',
        products: [], // We'll add logic for this later
      }));

      onCollectionsSelected(newCollections);
      
      // Console log collection IDs as requested
      console.log('Selected Collection IDs:', newCollections.map(c => c.collectionId));
      
      onSuccess?.(`Selected ${newCollections.length} collection${newCollections.length !== 1 ? 's' : ''}`);
    }

    return true;
  } catch (error) {
    console.log('Resource picker was cancelled or failed:', error);
    // Don't show error for user cancellation (which is normal behavior)
    return false;
  }
};