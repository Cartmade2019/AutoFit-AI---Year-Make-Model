import {
  IndexTable,
  Text,
  Card,
  Button,
  InlineStack,
  Box,
  Pagination,
  useIndexResourceState,
  Modal,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { useState, useCallback } from "react";
import {supabase} from '../../supabase/supabaseClient'

export default function FitmentIndexTable({
  databaseData,
}: {
  databaseData: any[];
}) {
  const navigate = useNavigate();

  console.log(databaseData, 'data')

  // Format Year Range
function formatYearRange(yearRange: string): string {
  const match = yearRange.match(/\[(\d+),(\d+)\)/);
  if (!match) return yearRange;

  const start = match[1];
  const end = match[2];

  if (parseInt(end) - parseInt(start) === 1) {
    return start;
  }

  return `${start}-${end}`;
}

// Group by all fields except product_ids and fitment_set_id
function mergeByAttributes(data: any[]) {
  const map = new Map<string, any>();

  data.forEach(item => {
    const { product_ids, fitment_set_id, ...rest } = item;
    const key = JSON.stringify(rest);

    if (!map.has(key)) {
      map.set(key, { ...rest, product_ids: [...(product_ids || [])] });
    } else {
      const existing = map.get(key);
      existing.product_ids = [
        ...new Set([...existing.product_ids, ...(product_ids || [])]),
      ];
      map.set(key, existing);
    }
  });

  return Array.from(map.values());
}  

const formattedData = mergeByAttributes(
  databaseData.map(item => ({
    ...item,
    year: item.year ? formatYearRange(item.year) : item.year,
  }))
);

  if (!formattedData || formattedData.length === 0)
    return <Text as="span">No entries</Text>;

const columns = Object.keys(formattedData[0]).filter(
  (k) => k !== "product_ids" && k !== "fitment_set_id"
);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalItems = formattedData.length;
  const paginatedData = formattedData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalItems);

  // Checkbox Selection
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(paginatedData.map((entry, i) => entry.id ?? `row-${i}`));

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = useCallback(() => setIsModalOpen((open) => !open), []);

  // Keep selected rows data for modal
  const getSelectedRowsData = () =>
    paginatedData.filter((entry, index) =>
      selectedResources.includes(entry.id ?? `row-${index}`)
    );

  const handleDeleteSelected = () => {
    setIsModalOpen(true); // open modal instead of direct delete
  };

  const confirmDelete = async () => {
    const selectedRowsData = getSelectedRowsData();
    console.log("Deleting rows data:", selectedRowsData);

    // Here you can add Supabase/API delete call
    await Promise.all(
  selectedRowsData.map(row => deleteFitmentSetCascade(row.fitment_set_id))
);

    // Clear selection after delete
    handleSelectionChange([], false, undefined);
    setIsModalOpen(false);
  };


const deleteFitmentSetCascade = async (fitmentSetId: any) => {

  console.log('hello')
  
  const { data: tags, error: tagError } = await supabase
    .from('fitment_tags')
    .select('id')
    .eq('fitment_set_id', fitmentSetId);
  if (tagError) throw tagError;

  const tagIds = tags?.map(tag => tag.id) || [];

  if (tagIds.length > 0) {
    const { error: delTagsError } = await supabase
      .from('product_fitment_tags')
      .delete()
      .in('tag_id', tagIds);
    if (delTagsError) throw delTagsError;
  }

  const { error: delProductsError } = await supabase
    .from('product_fitments')
    .delete()
    .eq('fitment_set_id', fitmentSetId);
  if (delProductsError) throw delProductsError;

     if (tagIds.length > 0) {
    const { error: delFitmentTagsError } = await supabase
      .from('fitment_tags')
      .delete()
      .eq('fitment_set_id', fitmentSetId);
    if (delFitmentTagsError) throw delFitmentTagsError;
  }

  // 4. Delete fitment_set_values
  const { error: delValuesError } = await supabase
    .from('fitment_set_values')
    .delete()
    .eq('fitment_set_id', fitmentSetId);
  if (delValuesError) throw delValuesError;

  // 5. Delete fitment_set
  const { error: delSetError } = await supabase
    .from('fitment_sets')
    .delete()
    .eq('id', fitmentSetId);
  if (delSetError) throw delSetError;

    return true
    
  }

  
  const transformRowToFieldsData = (entry: any): any[] => {
    return Object.keys(entry)
      .filter((key) => key !== "product_ids")
      .map((key) => {
        const label = formatHeader(key);
        const type = key === "year" ? "Range" : "Select";
        const color = "gray";
        const placeholder = `Enter ${label} value`;

        let rangeFrom = "";
        let rangeTo = "";
        let value = entry[key] || "";

        if (key === "year" && value) {
          const cleanedValue = value.replace(/[^\d,.-]/g, "");
          const rangeParts = cleanedValue.split(",");
          if (rangeParts.length === 2) {
            rangeFrom = rangeParts[0];
            rangeTo = rangeParts[1];
          }
        }

        return {
          id: key,
          label,
          type,
          color,
          placeholder,
          rangeFrom,
          rangeTo,
          value,
        };
      });
  };

  const handleButtonClick = (entry: any) => {
    const transformedData = transformRowToFieldsData(entry);
    const productIds = entry.product_ids || [];

    navigate(
      `/searchentry?fields=${encodeURIComponent(
        JSON.stringify(transformedData)
      )}&productIds=${encodeURIComponent(JSON.stringify(productIds))}`
    );
  };

  return (
    <>
      <Card padding="400">
        <InlineStack align="space-between" blockAlign="center">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginBottom: "1rem",
            }}
          >
            <Text as="h3" variant="headingSm">
              Search entries & results
            </Text>
            <Text as="span">
              Add search entries according to the database structure or import
              database. Next specify search results for these entries.
            </Text>
          </div>
          <Button variant="primary">Add search entry</Button>
        </InlineStack>

        <IndexTable
          resourceName={{ singular: "entry", plural: "entries" }}
          itemCount={totalItems}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          promotedBulkActions={[
            {
              content: "Delete selected",
              onAction: handleDeleteSelected,
            },
          ]}
          headings={[
            ...columns.map((col, index) => ({
              id: String(index),
              title: (
                <span
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Dot color={"gray"} />
                  {formatHeader(col)}
                </span>
              ),
            })),
            { title: "Attachment" },
          ]}
        >
          {paginatedData.map((entry: any, index: number) => {
            const rowId = String(entry.id ?? `row-${index}`);
            return (
              <IndexTable.Row
                id={rowId}
                key={rowId}
                selected={selectedResources.includes(rowId)}
                position={index}
              >
                {columns.map((col) => (
                  <IndexTable.Cell key={`${rowId}-${col}`}>
                    <Text as="span">
                      {Array.isArray(entry[col])
                        ? entry[col].join(" - ")
                        : entry[col]}
                    </Text>
                  </IndexTable.Cell>
                ))}

                <IndexTable.Cell key={`${rowId}-attachment`}>
                  <Button
                    variant="secondary"
                    onClick={() => handleButtonClick(entry)}
                  >
                    {entry.product_ids?.length ?? 0}{" "}
                    {(entry.product_ids?.length ?? 0) === 1
                      ? "product"
                      : "products"}
                  </Button>
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>

        {/* Pagination Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            marginTop: "1rem",
          }}
        >
          <Pagination
            hasPrevious={page > 1}
            onPrevious={() => setPage((prev) => prev - 1)}
            hasNext={page * pageSize < totalItems}
            onNext={() => setPage((prev) => prev + 1)}
          />
          <Text as="span" tone="magic">
            Showing {startIdx}–{endIdx} of {totalItems} entries
          </Text>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isModalOpen}
        onClose={toggleModal}
        title="Confirm Deletion"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: toggleModal },
        ]}
      >
        <Modal.Section>
          <Text as='h1'>
            Are you sure you want to delete{" "}
            <b>{selectedResources.length}</b> selected entries? This is a irreversible action and can't be undo.
          </Text>
        </Modal.Section>
      </Modal>
    </>
  );
}

function formatHeader(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  );
}
