import {
  Page,
  Text,
  BlockStack,
  Card,
  Box,
  InlineStack,
  Icon,
  Button,
  IndexTable,
  Divider,
  Modal,
  Select,
  TextField,
  Checkbox,
  SkeletonBodyText,
  SkeletonDisplayText,
  EmptyState,
  Frame,
} from '@shopify/polaris';
import {
  EditIcon,
  DeleteIcon,
  DragHandleIcon,
  PlusCircleIcon,
} from '@shopify/polaris-icons';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useNavigate } from '@remix-run/react';
import { useAppBridge } from '@shopify/app-bridge-react';
import FitmentValuesTable from '../components/FitmentValuesTable';
import SearchEntry from '../components/SearchEntry';


import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

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

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
type SaveState = 'idle' | 'saving';

export default function DatabasePage() {
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [storeId, setStoreId] = useState<number | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [fields, setFields] = useState<UiField[]>([]);

  const [toast, setToast] = useState<{content: string; error?: boolean} | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean; field: UiField | null}>({open: false, field: null});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [buttonBusy, setButtonBusy] = useState<{[k: string]: boolean}>({});
  const [showFitmentTable, setShowFitmentTable] = useState(true);

  const [mode, setMode] = useState<'database' | 'searchEntry'>('database');
  const [editSetId, setEditSetId] = useState<number | null>(null);

  const [tableKey, setTableKey] = useState(0);

  const openAdd = () => { setEditSetId(null); setMode('searchEntry'); };
  const openEdit = (id: number) => { setEditSetId(id); setMode('searchEntry'); };
  const closeEntry = () => { setMode('database'); };
  const onSaved = () => { /* refresh list and fields if needed */ };

  const emptyForm = useRef({
    id: '',
    dbId: null as number | null,
    label: '',
    type: 'Select' as 'Select' | 'Range',
    rangeFrom: '',
    rangeTo: '',
    placeholder: '',
    required: false,
  });
  const [formState, setFormState] = useState({...emptyForm.current});

  const isEditing = Boolean(formState.id);
  const hasRangeField = useMemo(() => fields.some(f => f.type === 'Range'), [fields]);
  const isLoading = loadingState === 'initial' || loadingState === 'loading';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle toast notifications with App Bridge
  useEffect(() => {
    if (toast) {
      shopify.toast.show(toast.content, {
        isError: !!toast.error,
      });
      // Auto-clear the toast state after showing
      const timer = setTimeout(() => setToast(null), 100);
      return () => clearTimeout(timer);
    }
  }, [toast, shopify]);

  const loadFields = useCallback(async (sid: number) => {
    try {
      const { data, error } = await supabase
        .from('fitment_fields')
        .select('id,label,field_type,required,sort_order,localized_json')
        .eq('store_id', sid)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const mapped: UiField[] = (data ?? []).map((row: any, idx: number) => {
        const isRange = row.field_type === 'int' || row.field_type === 'range';
        const lj = row.localized_json ?? {};
        return {
          id: `f_${row.id}`,
          dbId: row.id,
          label: row.label,
          type: isRange ? 'Range' : 'Select',
          required: !!row.required,
          sort_order: typeof row.sort_order === 'number' ? row.sort_order : idx,
          rangeFrom: isRange ? String(lj?.range?.from ?? '') : '',
          rangeTo: isRange ? String(lj?.range?.to ?? '') : '',
          placeholder: typeof lj?.placeholder === 'string' ? lj.placeholder : '',
        };
      });

      setFields(mapped);
      return mapped;
    } catch (e: any) {
      setToast({content: `Failed to load fields: ${e?.message ?? 'unknown error'}`, error: true});
      throw e;
    }
  }, []);

  // Single initialization effect with simplified loading state
  useEffect(() => {
    let cancelled = false;
    
    const initialize = async () => {
      setLoadingState('loading');
      
      try {
        const shopDomain =
          typeof window !== 'undefined'
            ? (window as any)?.shopify?.config?.shop
            : undefined;
            
        if (!shopDomain) {
          throw new Error('Shop domain not found');
        }

        const { data, error } = await supabase
          .from('stores')
          .select('id')
          .eq('shop_domain', shopDomain)
          .single();
          
        if (error) throw error;
        if (cancelled) return;

        const sid = data?.id ?? null;
        setStoreId(sid);

        if (sid) {
          await loadFields(sid);
        } else {
          setFields([]);
        }

        if (!cancelled) {
          setLoadingState('loaded');
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadingState('error');
          setToast({content: `Failed to load store: ${e?.message ?? 'unknown error'}`, error: true});
        }
      }
    };

    initialize();
    return () => { cancelled = true; };
  }, [loadFields]);

  const slugify = (s: string) =>
       s.toLowerCase() .trim() .replace(/['"]/g, '') .replace(/[^a-z0-9]+/g, '-') .replace(/-+/g, '-') .replace(/^-|-$/g, '');
    // s.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '');
  


  const validateForm = (): string | null => {
    if (!formState.label.trim()) return 'Label is required';
    if (formState.type === 'Range') {
      if (!formState.rangeFrom.trim() || !formState.rangeTo.trim()) return 'Range requires From and To';
      const from = Number(formState.rangeFrom);
      const to = Number(formState.rangeTo);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return 'Range values must be integers';
      if (from > to) return 'From must be ≤ To';
      const alreadyHasRange = fields.some(f => f.type === 'Range' && f.id !== formState.id);
      if (alreadyHasRange) return 'Only one Range field is allowed';
    }
    return null;
  };

  const openCreateModal = () => {
    setFormState({...emptyForm.current, type: hasRangeField ? 'Select' : 'Range'});
    setIsFieldModalOpen(true);
  };

  const openEditModal = (field: UiField) => {
    setFormState({
      id: field.id,
      dbId: field.dbId,
      label: field.label,
      type: field.type,
      rangeFrom: field.type === 'Range' ? (field.rangeFrom ?? '') : '',
      rangeTo: field.type === 'Range' ? (field.rangeTo ?? '') : '',
      placeholder: field.placeholder ?? '',
      required: !!field.required,
    });
    setIsFieldModalOpen(true);
  };

  const closeFieldModal = () => setIsFieldModalOpen(false);

  const handleSaveField = async () => {
    const err = validateForm();
    if (err) { setToast({content: err, error: true}); return; }
    if (!storeId) return;

    setSaveState('saving');
    try {
      const slug = slugify(formState.label);

      const localized: any = {};
      if (formState.type === 'Range') {
        localized.range = {
          from: Number(formState.rangeFrom),
          to: Number(formState.rangeTo),
        };
      }
      if (formState.placeholder?.trim()) {
        localized.placeholder = formState.placeholder.trim();
      }

      const preservedRequired =
        isEditing
          ? (fields.find(f => f.id === formState.id)?.required ?? formState.required ?? false)
          : false;

      const basePayload: any = {
        store_id: storeId, 
        label: formState.label.trim(),
        slug,
        field_type: formState.type === 'Range' ? 'int' : 'string',
        required: preservedRequired,
        localized_json: Object.keys(localized).length ? localized : null,
      };

      if (isEditing && formState.dbId) {
        const { error } = await supabase
          .from('fitment_fields')
          .update({ ...basePayload, updated_at: new Date().toISOString() })
          .eq('id', formState.dbId)
          .eq('store_id', storeId);
        if (error) throw error;

        setFields(prev => prev.map(f => f.id === formState.id ? {
          ...f,
          label: basePayload.label,
          type: formState.type,
          required: preservedRequired,
          rangeFrom: formState.type === 'Range' ? String(localized?.range?.from ?? '') : '',
          rangeTo: formState.type === 'Range' ? String(localized?.range?.to ?? '') : '',
          placeholder: localized?.placeholder ?? '',
        } : f));
        setToast({content: 'Field updated'});
      } else {
        const nextSortOrder = fields.length;
        const { data, error } = await supabase
          .from('fitment_fields')
          .upsert([{
            ...basePayload,
            sort_order: nextSortOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }], { onConflict: 'store_id , slug' })  
          .select('id,label,field_type,required,sort_order,localized_json')
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          await loadFields(storeId);
        } else {
          const isRange = data.field_type === 'int' || data.field_type === 'range';
          const lj = data.localized_json ?? {};
          const added: UiField = {
            id: `f_${data.id}`,
            dbId: data.id,
            label: data.label,
            type: isRange ? 'Range' : 'Select',
            required: !!data.required,
            sort_order: data.sort_order ?? nextSortOrder,
            rangeFrom: isRange ? String(lj?.range?.from ?? '') : '',
            rangeTo: isRange ? String(lj?.range?.to ?? '') : '',
            placeholder: typeof lj?.placeholder === 'string' ? lj.placeholder : '',
          };
          setFields(prev => {
            const withoutDup = prev.filter(f => f.dbId !== added.dbId);
            return [...withoutDup, added].sort((a,b)=>a.sort_order-b.sort_order);
          });
        }
        setToast({content: 'Field added'});
      }

      setIsFieldModalOpen(false);
      setFormState({...emptyForm.current});
    } catch (e:any) {
      setToast({content: `Save failed: ${e?.message ?? 'unknown error'}`, error: true});
    } finally {
      setSaveState('idle');
    }
  };

  const handleRequiredToggle = async (uiId: string) => {
    const idx = fields.findIndex(f => f.id === uiId);
    if (idx < 0) return;
    const target = fields[idx];
    if (!target.dbId) return;

    const newRequired = !target.required;
    setFields(prev => {
      const next = [...prev];
      next[idx] = {...target, required: newRequired};
      return next;
    });

    const { error } = await supabase
      .from('fitment_fields')
      .update({ required: newRequired, updated_at: new Date().toISOString() })
      .eq('id', target.dbId)
      .eq('store_id', storeId as number);

   if (newRequired) {
      setToast({ content: 'Field marked as required' });
    } else {
      setToast({ content: 'Field marked as optional' });
    }

    if (error) {
      setFields(prev => {
        const next = [...prev];
        next[idx] = {...target};
        return next;
      });
      setToast({content: `Update failed: ${error.message}`, error: true});
    }
  };

  const confirmDeleteField = (field: UiField) => setConfirmDelete({open: true, field});
  const closeConfirmDelete = () => setConfirmDelete({open: false, field: null});

  const doDeleteField = async () => {
    const field = confirmDelete.field;
    if (!field || !field.dbId || !storeId) { closeConfirmDelete(); return; }
    setButtonBusy(prev => ({...prev, deleteOne: true}));
    try {
      const { error } = await supabase
        .from('fitment_fields')
        .delete()
        .eq('id', field.dbId)
        .eq('store_id', storeId);
      if (error) throw error;

      setFields(prev => prev.filter(f => f.id !== field.id).map((f,i)=>({...f, sort_order:i})));
      setToast({content: 'Field deleted'});
    } catch (e:any) {
      setToast({content: `Delete failed. Please remove all associated Fitment Values before deleting this field.`, error: true});
    } finally {
      setButtonBusy(prev => ({...prev, deleteOne: false}));
      closeConfirmDelete();
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
      ...f,
      sort_order: i,
    }));
    setFields(reordered);

    if (!storeId) return;

    try {
      const tasks = reordered
        .filter(f => f.dbId != null)
        .map(f =>
          supabase
            .from('fitment_fields')
            .update({ sort_order: f.sort_order, updated_at: new Date().toISOString() })
            .eq('id', f.dbId as number)
            .eq('store_id', storeId)
        );
      const results = await Promise.all(tasks);
      const firstErr = results.find((r: any) => r?.error);
      if (firstErr?.error) throw firstErr.error;
      setToast({content: 'Fields rearranged'});
    } catch (e:any) {
      setToast({content: `Reorder failed: ${e?.message ?? 'unknown error'}`, error: true});
      if (storeId) loadFields(storeId);
    }
  };


  //  delete fitment set values
async function deleteFitmentSetsInBatches(storeId:any) {
 const BATCH_SIZE = 1000;
  let totalDeleted = 0;

  while (true) {
    const { error, count } = await supabase
      .from('fitment_sets')
      .delete({ count: 'exact' })  // get count of deleted rows
      .eq('store_id', storeId)
      .order('id', { ascending: true }) 
      .limit(BATCH_SIZE);          // batch size

    if (error) {
      throw error;
    }

    totalDeleted += count ?? 0;

    // Stop if nothing more to delete
    if (!count || count < BATCH_SIZE) break;
  }

  return totalDeleted;
}


  // Render loading skeleton
  const renderSkeleton = () => (
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={4} />
        </BlockStack>
      </Box>
    </Card>
  );

  // Render main content
  const renderContent = () => {
    if (fields.length === 0) {
      return (
        <Card>
          <EmptyState
            heading="No fields yet"
            action={{ content: 'Add field', onAction: openCreateModal }}
            image=""
          >
            <p>Add your first field.</p>
          </EmptyState>
        </Card>
      );
    }

    return (
      <Card>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <IndexTable
              resourceName={{ singular: 'field', plural: 'fields' }}
              itemCount={fields.length}
              headings={[
                { title: 'Data column / Form field' },
                { title: 'Type', alignment: 'center' },
                { title: 'Required', alignment: 'center' },
                { title: 'Actions', alignment: 'center' },
              ]}
              selectable={false}
            >
              {fields.map((field) => (
                <SortableRow
                  key={field.id}
                  id={field.id}
                  field={field}
                  onEdit={() => openEditModal(field)}
                  onDelete={() => confirmDeleteField(field)}
                  onToggleRequired={() => handleRequiredToggle(field.id)}
                />
              ))}
            </IndexTable>
          </SortableContext>
        </DndContext>
        <Divider />
        <Box padding="300">
          <Button
            icon={PlusCircleIcon}
            onClick={openCreateModal}
            loading={saveState === 'saving'}
          >
            Add field
          </Button>
        </Box>
      </Card>
    );
  };

  if (mode === 'searchEntry' && storeId) {
    return (
      <SearchEntry
        storeId={storeId}
        fields={fields}
        editSetId={editSetId}
        onClose={closeEntry}
        onSaved={() => {
          onSaved();
          // refresh the table view upon return
        }}
      />
    );
  }

  return (
    <Frame>
      <Page
        backAction={{ content: 'Back', onAction: () => navigate('/') }}
        title="Database"
        compactTitle
        primaryAction={{
          content: 'Import Database',
          onAction: () => navigate('/fitmentImport'),
        }}
        actionGroups={[
          {
            title: 'More Actions',
            actions: [
              { content: 'Add Search Entry', onAction: openAdd },
              { content: 'Clear Database', onAction: () => setIsClearModalOpen(true) },
            ],
          },
        ]}
      >
        <BlockStack gap="300">
          <Text as="h1" variant="headingMd">Database Structure</Text>
          <Text as="p" variant="bodyMd">
            Configure column types and order. These reflect the search form and widget fields.
          </Text>
        </BlockStack>

        <div style={{ marginTop: '1rem' }}>
          {isLoading ? renderSkeleton() : renderContent()}
        </div>


     <div style={{ marginTop: '2rem' }}>
          <FitmentValuesTable
             key={tableKey}
            storeId={storeId}
            fields={fields}
            onRefresh={() => storeId && loadFields(storeId)}
            onAddSearchEntry={openAdd}
            onEditSearchEntry={(id) => openEdit(id)}
          />
        </div>
  

        <Box paddingBlockEnd="800" />

        {/* Create/Edit modal */}
        <Modal
          open={isFieldModalOpen}
          onClose={closeFieldModal}
          title={isEditing ? 'Edit data column' : 'Add data column'}
          primaryAction={{ content: isEditing ? 'Save changes' : 'Save', onAction: handleSaveField, loading: saveState === 'saving' }}
          secondaryActions={[{ content: 'Cancel', onAction: closeFieldModal }]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Select
                label="Column type"
                options={[
                  {
                    label: 'Range',
                    value: 'Range',
                    disabled: hasRangeField && formState.type !== 'Range',
                  },
                  { label: 'Select', value: 'Select' },
                ]}
                value={formState.type}
                disabled={hasRangeField && formState.type !== 'Range'}
                onChange={(value) =>
                  setFormState((prev) => ({ ...prev, type: value as 'Range' | 'Select' }))
                }
              />
              {hasRangeField && formState.type !== 'Range' && (
                <Text as="p" tone="subdued">You can't add more range fields.</Text>
              )}

              {formState.type === 'Range' ? (
                <BlockStack gap="400">
                  <InlineStack gap="200" wrap={false}>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="From"
                        value={formState.rangeFrom}
                        inputMode="numeric"
                        onChange={(value) => setFormState((p) => ({ ...p, rangeFrom: value.replace(/[^\d-]/g, '') }))}
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="To"
                        value={formState.rangeTo}
                        inputMode="numeric"
                        onChange={(value) => setFormState((p) => ({ ...p, rangeTo: value.replace(/[^\d-]/g, '') }))}
                      />
                    </Box>
                  </InlineStack>
                  <Divider />
                  <InlineStack gap="200" wrap={false}>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="Label"
                        placeholder="Enter column label"
                        value={formState.label}
                        onChange={(value) => setFormState((prev) => ({ ...prev, label: value }))}
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="Placeholder"
                        placeholder="Optional"
                        value={formState.placeholder}
                        onChange={(value) => setFormState((prev) => ({ ...prev, placeholder: value }))}
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              ) : (
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack gap="200" wrap={false}>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="Label"
                        placeholder="Enter column label"
                        value={formState.label}
                        onChange={(value) => setFormState((prev) => ({ ...prev, label: value }))}
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        autoComplete="off"
                        label="Placeholder"
                        placeholder="Optional"
                        value={formState.placeholder}
                        onChange={(value) => setFormState((prev) => ({ ...prev, placeholder: value }))}
                      />
                    </Box>
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Clear all modal */}
        <Modal
          open={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          title="Clear Database"
          primaryAction={{
            content: 'Clear All',
            destructive: true,
            onAction: async () => {
              if (!storeId) return;
              setButtonBusy(prev => ({...prev, clearAll: true}));
              try {
                // const { error } = await supabase.from('fitment_fields').delete().eq('store_id', storeId);
                // const { error } = await supabase.from('fitment_sets').delete().eq('store_id', storeId);
                const total = await deleteFitmentSetsInBatches(storeId);
                // if (error) throw error;
                  // setFields(fields);
                setTableKey(prevKey => prevKey + 1);
                setToast({ content: `Cleared ${total} fitment values.` });
              } catch (e:any) {
                setToast({content: `Clear failed: ${e?.message ?? 'unknown error'}`, error: true});
              } finally {
                setButtonBusy(prev => ({...prev, clearAll: false}));
                setIsClearModalOpen(false);
              }
            },
            loading: !!buttonBusy.clearAll,
          }}
          secondaryActions={[{ content: 'Cancel', onAction: () => setIsClearModalOpen(false) }]}
        >
          <Modal.Section>
            <Text as="p" tone="critical">
             This will remove all fitment values for this store. This action is irreversible.
            </Text>
          </Modal.Section>
        </Modal>

        {/* Confirm delete one */}
        <Modal
          open={confirmDelete.open}
          onClose={closeConfirmDelete}
          title="Delete field"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: doDeleteField,
            loading: !!buttonBusy.deleteOne,
          }}
          secondaryActions={[{ content: 'Cancel', onAction: closeConfirmDelete }]}
        >
          <Modal.Section>
            <Text as="p">Delete "{confirmDelete.field?.label}"?</Text>
          </Modal.Section>
        </Modal>

      </Page>
    </Frame>
  );
}

// -------- Sortable Row --------
function SortableRow({
  id,
  field,
  onEdit,
  onDelete,
  onToggleRequired,
}: {
  id: string;
  field: UiField;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRequired: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'var(--p-color-bg-surface-secondary)' : 'transparent',
  };

  const cellPadding: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' };

  return (
    <tr ref={setNodeRef} style={style}>
      <td style={cellPadding}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none' }} aria-label="Drag to reorder">
            <Icon source={DragHandleIcon} tone="subdued" />
          </span>
          <Text as="span">{field.label}</Text>
        </div>
      </td>
      <td style={{ ...cellPadding, textAlign: 'center' }}>
        <Text as="span" tone="subdued">{field.type}</Text>
      </td>
      <td style={{ ...cellPadding, textAlign: 'center' }}>
        <Checkbox label="" labelHidden checked={field.required} onChange={onToggleRequired} />
      </td>
      <td style={{ ...cellPadding, textAlign: 'center' }}>
        <InlineStack gap="200" align="center" blockAlign="center" wrap={false}>
          <Button icon={EditIcon} variant="plain" onClick={onEdit} />
          <Button icon={DeleteIcon} variant="plain" tone="critical" onClick={onDelete} />
        </InlineStack>
      </td>
    </tr>
  );
}