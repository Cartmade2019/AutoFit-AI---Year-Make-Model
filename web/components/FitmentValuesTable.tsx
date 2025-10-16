import {
  Page,
  Text,
  BlockStack,
  Card,
  Box,
  InlineStack,
  Button,
  IndexTable,
  Modal,
  Toast,
  EmptyState,
  SkeletonBodyText,
  SkeletonDisplayText,
  Popover,
  ActionList,
  Badge,
  useIndexResourceState,
  LegacyCard,
} from '@shopify/polaris';
import {
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
  MenuVerticalIcon,
  PlusCircleIcon,
} from '@shopify/polaris-icons';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useNavigate } from '@remix-run/react';

type UiField = {
  id: string;
  dbId: number | null;
  label: string;
  type: 'Range' | 'Select';
  required: boolean;
  sort_order: number;
  rangeFrom?: string;
  rangeTo?: string;
  placeholder?: string;
};

type FitmentField = {
  id: number;
  label: string;
  slug: string;
  type: string;
  required: boolean;
  sort: number;
};

type FieldValue = {
  field_id: number;
  value_string: string | null;
  value_int: string | null;
  value_bool: boolean | null;
};

type FitmentSet = {
  fitment_set_id: number;
  universal_fit: boolean;
  fields: FitmentField[];
  field_values: FieldValue[];
  product_count: number;
  next_cursor: number | null;
  has_more: boolean;
};

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';

interface FitmentValuesTableProps {
  storeId: number | null;
  fields: UiField[];
  onRefresh?: () => void;
  onAddSearchEntry: () => void;
  onEditSearchEntry: (setId: number) => void;
}

export default function FitmentValuesTable({ storeId, fields, onRefresh, onAddSearchEntry, onEditSearchEntry, }: FitmentValuesTableProps) {
  const navigate = useNavigate();

  // data + pagination
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [fitmentSets, setFitmentSets] = useState<FitmentSet[]>([]);
  const [pageHasMore, setPageHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isPaging, setIsPaging] = useState(false);

  // cursor stack for prev/next
  const [cursorStack, setCursorStack] = useState<(number | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  // UI state
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);
  const [popoverActive, setPopoverActive] = useState<{ [key: string]: boolean }>({});
  const [buttonLoading, setButtonLoading] = useState<{ [key: string]: boolean }>({});
  const [isClearModal, setIsClearModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; sets: number[] }>({
    open: false,
    sets: [],
  });

  const resourceName = useMemo(() => ({ singular: 'fitment set', plural: 'fitment sets' }), []);
  const fieldsJSON = useMemo(() => encodeURIComponent(JSON.stringify(fields)), [fields]);
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.sort_order - b.sort_order), [fields]);

  const headings = useMemo(() => {
    const cols = sortedFields.map((f) => ({ title: f.label }));
    return [...cols, { title: 'Products', alignment: 'end' as const }, { title: 'Actions', alignment: 'center' as const }];
  }, [sortedFields]);

  // selection
  const items = useMemo(() => fitmentSets.map((s) => ({ id: s.fitment_set_id.toString() })), [fitmentSets]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(items);

  // refs for stable clear
  const selectedResourcesRef = useRef(selectedResources);
  useEffect(() => {
    selectedResourcesRef.current = selectedResources;
  }, [selectedResources]);

  const handleSelectionChangeRef = useRef(handleSelectionChange);
  useEffect(() => {
    handleSelectionChangeRef.current = handleSelectionChange;
  }, [handleSelectionChange]);

  // stable clearSelection
  const clearSelection = useCallback(() => {
    handleSelectionChangeRef.current('all', false, []);
  }, []);


  // map for quick field lookup
  const setIdToFieldValueMap = useMemo(() => {
    const map: Record<number, Record<number, FieldValue>> = {};
    for (const s of fitmentSets) {
      const inner: Record<number, FieldValue> = {};
      for (const fv of s.field_values) inner[fv.field_id] = fv;
      map[s.fitment_set_id] = inner;
    }
    return map;
  }, [fitmentSets]);

  const formatFieldValue = (fv?: FieldValue, universal?: boolean) => {
    if (universal) return '-';
    if (!fv) return '-';
    if (fv.value_string) return fv.value_string;
    if (fv.value_int) {
      const m = fv.value_int.match(/\[(\d+),(\d+)\)/);
      return m ? `${m[1]}-${m[2]}` : fv.value_int;
    }
    if (fv.value_bool !== null) return fv.value_bool ? 'Yes' : 'No';
    return '-';
  };

  // fetch a page — stable on storeId only
  const fetchPage = useCallback(
    async (_after_id: number | null, markPaging = false) => {
      if (!storeId) return;
      try {
        if (markPaging) setIsPaging(true);
        else setLoadingState('loading');

        const { data, error } = await supabase.rpc('get_fitment_sets_page', {
          _store_id: storeId,
          _after_id,
          _limit: 50,
        });
        if (error) throw error;

        const page: FitmentSet[] = data || [];

        console.log(data, 'what is data')

        // clear selection before updating state
        clearSelection();

        setFitmentSets(page);

        if (page.length > 0) {
          const tail = page[page.length - 1];
          setNextCursor(tail?.next_cursor ?? null);
          setPageHasMore(Boolean(tail?.has_more));
        } else {
          setNextCursor(null);
          setPageHasMore(false);
        }

        setLoadingState('loaded');
      } catch (e: any) {
        setToast({ content: `Failed to load fitment sets: ${e?.message || 'unknown error'}`, error: true });
        setLoadingState('error');
      } finally {
        setIsPaging(false);
      }
    },
    [storeId]
  );

  // initial load
  useEffect(() => {
    if (!storeId) {
      setLoadingState('loaded');
      setFitmentSets([]);
      setPageHasMore(false);
      setNextCursor(null);
      setCursorStack([null]);
      setCursorIndex(0);
      clearSelection();
      return;
    }
    setCursorStack([null]);
    setCursorIndex(0);
    fetchPage(null);
    // deliberately omit fetchPage from deps to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // pagination
  const onNext = useCallback(() => {
    if (!pageHasMore || nextCursor === null) return;
    const newStack = cursorStack.slice(0, cursorIndex + 1);
    newStack.push(nextCursor);
    setCursorStack(newStack);
    setCursorIndex((i) => i + 1);
    fetchPage(nextCursor, true);
  }, [pageHasMore, nextCursor, cursorStack, cursorIndex, fetchPage]);

  const onPrevious = useCallback(() => {
    if (cursorIndex === 0) return;
    const prevAfterId = cursorStack[cursorIndex - 1];
    setCursorIndex((i) => i - 1);
    fetchPage(prevAfterId, true);
  }, [cursorIndex, cursorStack, fetchPage]);

  // bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedResources.length === 0) return;
    const ids = selectedResources.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
    setConfirmDelete({ open: true, sets: ids });
  }, [selectedResources]);

  const performBulkDelete = useCallback(async () => {
    if (!storeId || confirmDelete.sets.length === 0) return;
    setButtonLoading((p) => ({ ...p, bulkDelete: true }));
    try {
      const { error } = await supabase
        .from('fitment_sets')
        .delete()
        .eq('store_id', storeId)
        .in('id', confirmDelete.sets);
      if (error) throw error;

      clearSelection();
      await fetchPage(cursorStack[cursorIndex], true);

      setToast({ content: `${confirmDelete.sets.length} fitment set(s) deleted` });
      onRefresh?.();
    } catch (e: any) {
      setToast({ content: `Bulk delete failed: ${e?.message || 'unknown error'}`, error: true });
    } finally {
      setButtonLoading((p) => ({ ...p, bulkDelete: false }));
      setConfirmDelete({ open: false, sets: [] });
    }
  }, [storeId, confirmDelete.sets, fetchPage, cursorStack, cursorIndex, onRefresh]);

  // row actions
    const handleEdit = useCallback(
    (setId: number) => {
      onEditSearchEntry(setId);
      clearSelection();
    },
    [onEditSearchEntry]
  );

  const handleDuplicate = useCallback(
    async (setId: number) => {
      if (!storeId) return;
      setButtonLoading((p) => ({ ...p, [`duplicate_${setId}`]: true }));
      try {
        const { error } = await supabase.rpc('duplicate_fitment_set', { _store_id: storeId, _set_id: setId });
        if (error) throw error;

        clearSelection();
        await fetchPage(cursorStack[cursorIndex], true);

        setToast({ content: 'Fitment set duplicated successfully' });
        onRefresh?.();
      } catch (e: any) {
        setToast({ content: `Duplicate failed: ${e?.message || 'unknown error'}`, error: true });
      } finally {
        setButtonLoading((p) => ({ ...p, [`duplicate_${setId}`]: false }));
      }
    },
    [storeId, fetchPage, cursorStack, cursorIndex, onRefresh]
  );

  const handleDelete = useCallback(
    async (setId: number) => {
      if (!storeId) return;
      setButtonLoading((p) => ({ ...p, [`delete_${setId}`]: true }));
      try {
        const { error } = await supabase.from('fitment_sets').delete().eq('store_id', storeId).eq('id', setId);
        if (error) throw error;

        clearSelection();
        await fetchPage(cursorStack[cursorIndex], true);

        setToast({ content: 'Fitment set deleted' });
        onRefresh?.();
      } catch (e: any) {
        setToast({ content: `Delete failed: ${e?.message || 'unknown error'}`, error: true });
      } finally {
        setButtonLoading((p) => ({ ...p, [`delete_${setId}`]: false }));
      }
    },
    [storeId, fetchPage, cursorStack, cursorIndex, onRefresh]
  );

  const handleClearAll = useCallback(async () => {
    if (!storeId) return;
    setButtonLoading((p) => ({ ...p, clearAll: true }));
    try {
      const { error } = await supabase.from('fitment_sets').delete().eq('store_id', storeId);
      if (error) throw error;

      setFitmentSets([]);
      clearSelection();

      setToast({ content: 'All fitment values cleared' });
      onRefresh?.();
    } catch (e: any) {
      setToast({ content: `Clear failed: ${e?.message || 'unknown error'}`, error: true });
    } finally {
      setButtonLoading((p) => ({ ...p, clearAll: false }));
      setIsClearModal(false);
      setCursorStack([null]);
      setCursorIndex(0);
      fetchPage(null, true);
    }
  }, [storeId, onRefresh, fetchPage]);

  // popover open/close
  const togglePopover = useCallback((rowId: string) => {
    setPopoverActive((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);
  const closePopover = useCallback((rowId: string) => {
    setPopoverActive((prev) => ({ ...prev, [rowId]: false }));
  }, []);

  // close popovers when selections change
  useEffect(() => {
    setPopoverActive({});
  }, [selectedResources]);

  // skeleton
  const renderSkeleton = () => (
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={6} />
        </BlockStack>
      </Box>
    </Card>
  );

  // empty
 const renderEmptyState = () => (
    <Card>
      <EmptyState
        heading="No fitment values yet"
        action={{content: 'Add Search Entry', onAction: onAddSearchEntry}}
        secondaryAction={{content: 'Import Database', onAction: () => navigate('/fitmentImport')}}
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>Add your first fitment values to start matching products with customer searches.</p>
      </EmptyState>
    </Card>
  );

  // table
  const renderTable = () => (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Search entries & results
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Add search entries according to the database structure or import database.
            <br />
            Next specify search results for these entries.
          </Text>
        </BlockStack>
        <InlineStack gap="200">
          {fitmentSets.length > 0 && (
            <Button onClick={() => setIsClearModal(true)} tone="critical" icon={DeleteIcon} variant="tertiary">
              Clear All
            </Button>
          )}
          <Button variant="primary" icon={PlusCircleIcon} onClick={onAddSearchEntry}>
            Add search entry
          </Button>
        </InlineStack>
      </InlineStack>

      <LegacyCard>
        <IndexTable
          resourceName={resourceName}
          itemCount={fitmentSets.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          promotedBulkActions={[
            { content: 'Delete selected', onAction: handleBulkDelete, disabled: selectedResources.length === 0 },
          ]}
          onSelectionChange={handleSelectionChange}
          headings={headings}
          pagination={{
            hasNext: pageHasMore,
            hasPrevious: cursorIndex > 0,
            onNext: onNext,
            onPrevious: onPrevious,
          }}
        >
          {fitmentSets.map((set, index) => {
            const valueMap = setIdToFieldValueMap[set.fitment_set_id] || {};
            const rowId = set.fitment_set_id.toString();

            return (
              <IndexTable.Row id={rowId} key={rowId} selected={selectedResources.includes(rowId)} position={index}>
                {sortedFields.map((field) => (
                  <IndexTable.Cell key={field.dbId ?? field.id}>
                    {set.universal_fit ? (
                      <Badge tone="success">Universal Fit</Badge>
                    ) : (
                      <Text as="span">{formatFieldValue(valueMap[field.dbId!], set.universal_fit)}</Text>
                    )}
                  </IndexTable.Cell>
                ))}

                <IndexTable.Cell>
                  <Text as="span" alignment="end" numeric>
                    {set.product_count}
                  </Text>
                </IndexTable.Cell>

                <IndexTable.Cell>
                  <InlineStack align="center" gap="200">
                    <Popover
                      active={popoverActive[rowId] || false}
                      activator={
                        <Button
                          icon={MenuVerticalIcon}
                          variant="plain"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePopover(rowId);
                          }}
                          ariaLabel={`Actions for fitment set ${set.fitment_set_id}`}
                        />
                      }
                      onClose={() => closePopover(rowId)}
                    >
                      <ActionList
                        items={[
                          {
                            content: 'Edit',
                            icon: EditIcon,
                            onAction: () => {
                              closePopover(rowId);
                              handleEdit(set.fitment_set_id);
                            },
                          },
                          {
                            content: 'Duplicate',
                            icon: DuplicateIcon,
                            onAction: () => {
                              clearSelection();
                              closePopover(rowId);

                              handleDuplicate(set.fitment_set_id);
                            },
                          },
                          {
                            content: 'Delete',
                            icon: DeleteIcon,
                            destructive: true,
                            onAction: () => {
                              closePopover(rowId);
                              handleDelete(set.fitment_set_id);
                            },
                          },
                        ]}
                      />
                    </Popover>
                  </InlineStack>
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
      </LegacyCard>
    </BlockStack>
  );

  const isLoading = loadingState === 'initial' || loadingState === 'loading';
  const isEmpty = loadingState === 'loaded' && fitmentSets.length === 0;

  return (
    <>
      {isLoading && renderSkeleton()}
      {isEmpty && renderEmptyState()}
      {!isLoading && !isEmpty && renderTable()}

      {/* Clear all modal */}
      <Modal
        open={isClearModal}
        onClose={() => setIsClearModal(false)}
        title="Clear Database"
        primaryAction={{ content: 'Clear All', destructive: true, onAction: handleClearAll, loading: buttonLoading.clearAll }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setIsClearModal(false) }]}
      >
        <Modal.Section>
          <Text as="p" tone="critical">
            This will remove all fitment values for this store. This action is irreversible.
          </Text>
        </Modal.Section>
      </Modal>

      {/* Confirm bulk delete modal */}
      <Modal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, sets: [] })}
        title="Delete Fitment Sets"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: performBulkDelete,
          loading: buttonLoading.bulkDelete,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmDelete({ open: false, sets: [] }) }]}
      >
        <Modal.Section>
          <Text as="p">Delete {confirmDelete.sets.length} fitment set(s)? This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>

      {toast && <Toast content={toast.content} error={!!toast.error} onDismiss={() => setToast(null)} duration={3000} />}
    </>
  );
}
