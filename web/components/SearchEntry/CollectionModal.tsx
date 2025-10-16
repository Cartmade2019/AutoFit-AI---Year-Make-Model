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

interface ProductsInCollection {
  productName: string;
  slu: string[];
}

interface CollectionData {
  collectionId: string;
  collectionName: string;
  collectionImage: string;
  products: ProductsInCollection[];
  [key: string]: unknown;
}

export default function CollectionModal({
  open,
  onClose,
  selectedCollection,
  setSelectedCollection
}: {
  open: boolean;
  onClose: () => void;
  selectedCollection: any;
  setSelectedCollection: any;
}) {
  const [collections, setCollections] = useState<CollectionData[] | []>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(collections, {
    selectedResources: selectedCollection.map((c: CollectionData) => String(c.collectionId))
  });

  const filteredCollections = collections.filter((collection: CollectionData) =>
    collection.collectionName.toLowerCase().includes(searchValue.toLowerCase())
  );

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);

      const response = await fetch('https://cm-ymm--development.gadget.app/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      setCollections(data.data);

      setLoading(false);
    };
    if (open) fetchCollection();
  }, [open]);

  const toggleModal = useCallback(() => setActive((prev) => !prev), []);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Add Collections"
        primaryAction={{
          content: 'Add',
          onAction: () => {
            const selected = collections.filter((c) => selectedResources.includes(String(c.collectionId)));
            setSelectedCollection(selected);
            onClose();
          }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
      >
        <Box padding="400">
          <TextField label="Search Collections" value={searchValue} onChange={setSearchValue} autoComplete="off" />
        </Box>

        <div style={{ minHeight: '300px' }}>
          {loading ? (
            <Box padding="400">Loading .......</Box>
          ) : (
            <IndexTable
              resourceName={{ singular: 'collection', plural: 'collections' }}
              itemCount={filteredCollections.length}
              selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[{ title: '' }, { title: 'Collection' }]}
            >
              {filteredCollections.map((collection: CollectionData, index: number) => (
                <IndexTable.Row
                  id={collection.collectionId}
                  key={collection.collectionId}
                  selected={selectedResources.includes(collection.collectionId)}
                  position={index}
                >
                  <IndexTable.Cell>
                    <Thumbnail source={collection.collectionImage} alt={collection.collectionName} size="small" />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <div
                      style={{
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      <Text as="span">{collection.collectionName}</Text>
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
