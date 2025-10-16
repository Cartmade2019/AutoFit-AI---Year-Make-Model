import {
  Modal,
  IndexTable,
  useIndexResourceState,
  TextField,
  Thumbnail,
  Button,
  Box,
  Text,
  InlineStack,
  Spinner
} from '@shopify/polaris';
import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { supabase } from '../../supabase/supabaseClient';

type SelectedProduct = {
  id: string;
  title: string;
  image: string;
  skus: string[];
};

type Product = {
  id: string;
  title: string;
  image: string;
};

export default function ProductModalTrigger({
  open,
  onClose,
  setSelectedProduct,
  selectedProduct
}: {
  open: boolean;
  onClose: () => void;
  setSelectedProduct: React.Dispatch<React.SetStateAction<[] | SelectedProduct[]>>;
  selectedProduct: SelectedProduct[];
}) {
  const [products, setProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  console.log('hello')

  
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(products, {
    selectedResources: selectedProduct.map((p) => String(p.id))
  });

  const toggleModal = useCallback(() => setActive((prev) => !prev), []);

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchValue.toLowerCase())
  );

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      try {
        const response = await fetch('https://cm-ymm--development.gadget.app/product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        console.log(data, 'products');
        setProducts(data.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) fetchProducts();
  }, [open]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Add Products"
        primaryAction={{
          content: 'Add',
          onAction: () => {
            const selected = products.filter((p) => selectedResources.includes(String(p.id)));
            setSelectedProduct(selected);
            onClose();
          }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
      >
        <Box padding="400">
          <TextField label="Search products" value={searchValue} onChange={setSearchValue} autoComplete="off" />
        </Box>

        <div style={{ minHeight: '300px' }}>
          {loading ? (
            <Box padding="400">Loading ....</Box>
          ) : (
            <IndexTable
              resourceName={{ singular: 'product', plural: 'products' }}
              itemCount={filteredProducts.length}
              selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[{ title: '' }, { title: 'Product' }]}
            >
              {filteredProducts.map((product, index) => (
                <IndexTable.Row
                  id={product.id}
                  key={product.id}
                  selected={selectedResources.includes(product.id)}
                  position={index}
                >
                  <IndexTable.Cell>
                    <Thumbnail source={product.image} alt={product.title} size="small" />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div
                      style={{
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      <Text as="span">{product.title}</Text>
                    </div>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </div>
      </Modal>
    </>
  );
}
