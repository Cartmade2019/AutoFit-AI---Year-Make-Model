import {
  Card,
  DataTable,
  Checkbox,
  Icon,
  InlineStack,
  Text,
  Box,
  BlockStack,
  Link,
  Pagination,
  Spinner,
  Button,
} from '@shopify/polaris';
import {CollectionIcon, MenuVerticalIcon} from '@shopify/polaris-icons';
import {useState, useEffect} from 'react';

export default function PolarisDatabaseTable() {
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const data = [
    {
      id: '1',
      year: '2017–2024',
      make: 'asas',
      model: 'asas',
      engine: 'as',
      title: 'asas',
      products: '1 product',
    },
    {
      id: '2',
      year: '2010–2020',
      make: 'adasd',
      model: 'adasd',
      engine: 'asdasd',
      title: 'asdasd',
      products: '1 product',
    },
  ];

  const toggleCheckbox = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };



  const rows = data.map((row, index) => [
    <div> <Text as="span" alignment="center">{index + 1}</Text></div>,
    <div>
      <Checkbox label=""
      checked={selectedRows.includes(row.id)}
      onChange={() => toggleCheckbox(row.id)}
    />
    </div>,
    <div>{row.year}</div>,
    <div>{row.make}</div>,
    <div>{row.model}</div>,
    <div>{row.engine}</div>,
    <div>{row.title}</div>,
    <div>
      <InlineStack gap="100" blockAlign="center">
        <div style={{display: 'flex' , alignItems: 'center' , justifyContent: 'center' , color: '#2e72d2', cursor: 'pointer'}}>
         <Icon source={CollectionIcon}  />
        <div>{row.products}</div>
        </div>
      </InlineStack>
    </div>,
    <div>
      <Button icon={MenuVerticalIcon} size="slim" variant="tertiary" />
    </div>,
  ]);

  const headings = [
    '',
    '',
    colorHeading('Year'),
    colorHeading('Make'),
    colorHeading('Model'),
    colorHeading('Engine'),
    colorHeading('Title'),
    'Attachment',
    '',
  ];

  return (

   <>

     <div style={{marginBottom: '1rem'}}>
     
      <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Search entries & results
            </Text>
            <Button variant="primary">Add search entry</Button>
          </InlineStack>

          <Box paddingBlockStart="300">
            <Text as="p" tone="subdued">
              Add search entries according to the database structure or import database. Next specify search results for these entries.
            </Text>
          </Box>
  
     </div>
    
    <Card padding="0">

      
      <BlockStack gap="0">
        {loading ? (
          <Box padding="200" minHeight="200px">
            <Spinner accessibilityLabel="Loading data" size="large" />
          </Box>
        ) : (
          <div style={{ borderCollapse: 'collapse', width: '100%' }}>
            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'text',
                'text',
                'text',
                'text',
                'text',
                'text',
                'text',
              ]}
              headings={headings}
              rows={rows}
              hideScrollIndicator
              increasedTableDensity
            />
          </div>
        )}
        <div style={{padding: "1rem"}}>
        <Pagination
          hasPrevious={false}
          hasNext={false}
          onPrevious={() => {}}
          onNext={() => {}}
        />
        </div>
      </BlockStack>
    </Card>
     </>
  );
}

function colorHeading(label: string) {
  return (
    <InlineStack gap="100" blockAlign="center">
      <Text as="span">{label}</Text>
    </InlineStack>
  );
      
}
