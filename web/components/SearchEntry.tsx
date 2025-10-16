import {
  Page,
  Text,
  BlockStack,
  Card,
  Box,
  InlineStack,
  Button,
  TextField,
  Checkbox,
  Frame,
  Toast,
  Select,
  IndexTable,
  Thumbnail,
  Spinner,
  SkeletonBodyText,
  Icon,
  Modal,
} from '@shopify/polaris';
import { ProductIcon, ProductListIcon, CollectionListIcon, DeleteIcon } from '@shopify/polaris-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useNavigate } from '@remix-run/react';
import {
  openResourcePicker,
  SelectedProduct as ResourceSelectedProduct,
  CollectionData as ResourceCollectionData,
} from '../components/ProductResourcePicker';
import { ProductListing } from '../components/ProductListing';
import { api } from '../api';

/** Types */
export type UiField = {
  id: string;
  dbId: number | null;
  label: string;
  type: 'Range' | 'Select';
  required: boolean;
  sort_order: number;
  rangeFrom?: string; // inclusive lower bound as string to avoid locale issues
  rangeTo?: string;   // inclusive upper bound as string
  placeholder?: string;
  slug?: string; // optional override
};

type ValuesState = Record<number, { select?: string; from?: string; to?: string }>;

type VariantRef = {
  shopify_variant_id: number;
  sku?: string | null;
  price?: string | null;
  status?: string | null;
  variant_title?: string | null;
};

type SelectedProduct = ResourceSelectedProduct & { variants: VariantRef[] };
export type CollectionData = ResourceCollectionData;

type FitmentTag = {
  id: number;
  tag: string;
};

/** Helpers */
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureOption(
  opts: { label: string; value: string }[],
  v?: string | null
): { label: string; value: string }[] {
  if (!v) return opts;
  return opts.some((o) => o.value === v) ? opts : [{ label: v, value: v }, ...opts];
}

function valuesEqual(a: ValuesState, b: ValuesState): boolean {
  const keys = new Set<number>([...Object.keys(a), ...Object.keys(b)].map(Number));
  for (const k of keys) {
    const av = a[k] || {};
    const bv = b[k] || {};
    if ((av.select ?? '') !== (bv.select ?? '')) return false;
    if ((av.from ?? '') !== (bv.from ?? '')) return false;
    if ((av.to ?? '') !== (bv.to ?? '')) return false;
  }
  return true;
}

function buildTag(sortedFields: UiField[], values: ValuesState, universal: boolean): string[] {
  if (universal) return ['universal'];
  const parts: string[] = [];
  for (const f of sortedFields) {
    if (!f.dbId) continue;
    const v = values[f.dbId] || {};
    if (f.type === 'Range') {
      const from = v.from?.trim();
      const to = v.to?.trim();
      if (from && to) parts.push(`${from}-${to}`);
    } else {
      const s = v.select?.trim();
      if (s) parts.push(slugify(s));
    }
  }
  const tag = slugify(parts.join('-'));
  return tag ? [tag] : [];
}

function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

/** Component */
export default function SearchEntry({
  storeId,
  fields,
  editSetId = null,
  onClose,
  onSaved,
}: {
  storeId: number;
  fields: UiField[];
  editSetId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const navigate = useNavigate();

  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.sort_order - b.sort_order), [fields]);

  // Pull shop domain from Shopify config for links
  const shopDomain = useMemo<string>(() => {
    if (typeof window !== 'undefined') {
      const anyWin = window as any;
      const s = anyWin?.shopify?.config?.shop || anyWin?.Shopify?.config?.shop;
      if (typeof s === 'string' && s.trim().length > 0) return s;
    }
    return '';
  }, []);

  const [universalFit, setUniversalFit] = useState(false);
  const [values, setValues] = useState<ValuesState>({});

  const [selectedCard, setSelectedCard] = useState<'product' | 'collection'>('product');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionData[]>([]);

  // Track existing fitment tags and product IDs for edit mode
  const [existingFitmentTags, setExistingFitmentTags] = useState<string[]>([]);
  const [initialProductIds, setInitialProductIds] = useState<Set<string>>(new Set());

  const [isFetchingSelectedProducts, setIsFetchingSelectedProducts] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(!!editSetId);

  const [saving, setSaving] = useState(false);
  const [savingNext, setSavingNext] = useState(false);
  const [updatingTags, setUpdatingTags] = useState(false);
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);

  // Snapshots for dirty checking
  const [initialUniversalFit, setInitialUniversalFit] = useState(false);
  const [initialValues, setInitialValues] = useState<ValuesState>({});
  const [initialProductsKey, setInitialProductsKey] = useState<string>('[]');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<null | (() => void)>(null);

  /** Value setters */
  const setSelect = useCallback((fieldId: number, v: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], select: v } }));
  }, []);

  const onlyDigitsDash = /[^0-9-]/g; // allows negatives

  const setFrom = useCallback((fieldId: number, v: string) => {
    const cleaned = v.replace(onlyDigitsDash, '');
    setValues((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], from: cleaned } }));
  }, []);

  const setTo = useCallback((fieldId: number, v: string) => {
    const cleaned = v.replace(onlyDigitsDash, '');
    setValues((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], to: cleaned } }));
  }, []);

  /** Load for Edit mode - Only called once */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!editSetId) {
        setInitialUniversalFit(false);
        setInitialValues({});
        setInitialProductsKey('[]');
        setExistingFitmentTags([]);
        setInitialProductIds(new Set());
        setIsInitialLoading(false);
        return;
      }
      setIsInitialLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_fitment_set_details_with_products', {
          _store_id: storeId,
          _set_id: editSetId,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) throw new Error('Set not found');
        if (cancelled) return;

        const uni = !!row.universal_fit;
        setUniversalFit(uni);
        setInitialUniversalFit(uni);

        // Extract existing fitment tags - use the first one if multiple exist
        const fitmentTags = row.fitment_tags || [];
        const existingTags = fitmentTags.length > 0 ? [fitmentTags[0].tag] : [];
        setExistingFitmentTags(existingTags);

        const next: ValuesState = {};
        const byDbId = new Map(sortedFields.filter((f) => f.dbId != null).map((f) => [f.dbId!, f]));
        const bySlug = new Map(sortedFields.map((f) => [f.slug ?? slugify(f.label), f]));

        (row.field_values ?? []).forEach((v: any) => {
          const fid: number | null = v.field_id ?? null;
          let f = fid != null ? byDbId.get(fid) : undefined;
          if (!f && v.field_slug) f = bySlug.get(v.field_slug);
          if (!f && v.slug) f = bySlug.get(v.slug);
          if (!f) return;

          if (f.type === 'Range') {
            // Support both serialized interval and split fields
            let from = '';
            let to = '';
            if (typeof v.value_int === 'string') {
              const m = v.value_int.match(/\[(\-?\d+),(\-?\d+)\)/);
              if (m) {
                from = m[1];
                to = m[2];
              }
            }
            if (v.value_from != null) from = String(v.value_from);
            if (v.value_to != null) to = String(v.value_to);
            if (f.dbId != null) next[f.dbId] = { from, to };
          } else {
            if (f.dbId != null) next[f.dbId] = { select: v.value_string ?? '' };
          }
        });

        setValues(next);
        setInitialValues(next);

        // Consolidate product variants and track initial product IDs
        const byProduct: Record<string, SelectedProduct> = {};
        const productIdSet = new Set<string>();
        
        (row.products ?? []).forEach((p: any) => {
          const pid = String(p.shopify_product_id);
          productIdSet.add(pid);
          
          if (!byProduct[pid]) {
            byProduct[pid] = {
              id: pid,
              title: p.title || 'Untitled Product',
              image: p.image_url || '',
              vendor: p.vendor || undefined,
              productType: p.product_type || undefined,
              handle: p.handle || undefined,
              variants: [],
            } as SelectedProduct;
          }
          const vr: VariantRef = {
            shopify_variant_id: Number(p.shopify_variant_id),
            sku: p.sku || null,
            price: p.price || null,
            status: p.status || 'draft',
            variant_title: p.variant_title || null,
          };
          // de-dupe variants
          if (!byProduct[pid].variants.some((x) => x.shopify_variant_id === vr.shopify_variant_id)) {
            byProduct[pid].variants.push(vr);
          }
        });
        
        const prodArr = Object.values(byProduct);
        setSelectedProduct(prodArr);
        setInitialProductIds(productIdSet);
        setInitialProductsKey(
          JSON.stringify(
            prodArr
              .map((pr) => ({ id: pr.id, variants: pr.variants.map((v) => v.shopify_variant_id).sort() }))
              .sort((a, b) => a.id.localeCompare(b.id))
          )
        );
      } catch (e: any) {
        setToast({
          content: e?.message?.includes('fitment_set_id is ambiguous')
            ? 'Load failed: ambiguous column in backend. Ask backend to fully-qualify fitment_set_id.'
            : `Load failed: ${e?.message ?? 'unknown error'}`,
          error: true,
        });
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [editSetId, sortedFields, storeId]);

  /** Stable, ordered key of current selection */
  const productsKey = useMemo(
    () =>
      JSON.stringify(
        selectedProduct
          .map((pr) => ({ id: pr.id, variants: pr.variants.map((v) => v.shopify_variant_id).sort() }))
          .sort((a, b) => a.id.localeCompare(b.id))
      ),
    [selectedProduct]
  );

  // In Add mode, snapshot empty once
  useEffect(() => {
    if (!editSetId) {
      setInitialProductsKey('[]');
      setInitialProductIds(new Set());
      setExistingFitmentTags([]);
    }
  }, [editSetId]);

  /** Dirty detection */
  const isDirty = useMemo(() => {
    if (universalFit !== initialUniversalFit) return true;
    if (!valuesEqual(values, initialValues)) return true;
    if (productsKey !== initialProductsKey) return true;
    return false;
  }, [universalFit, initialUniversalFit, values, initialValues, productsKey, initialProductsKey]);

  /** Validation */
  const validate = useCallback((): string | null => {
    if (universalFit) return null;
    for (const f of sortedFields) {
      if (!f.dbId) continue;
      const v = values[f.dbId] || {};
      if (f.required) {
        if (f.type === 'Range') {
          if (!v.from?.length || !v.to?.length) return `Enter range for "${f.label}"`;
        } else {
          if (!v.select || !v.select.trim()) return `Enter value for "${f.label}"`;
        }
      }
      if (f.type === 'Range') {
        const fromNum = v.from != null && v.from !== '' ? Number(v.from) : NaN;
        const toNum = v.to != null && v.to !== '' ? Number(v.to) : NaN;
        if ((v.from && Number.isNaN(fromNum)) || (v.to && Number.isNaN(toNum))) return `"${f.label}" range must be integers`;
        if (v.from && v.to && fromNum > toNum) return `"${f.label}" From must be ≤ To`;
        // bounds check if provided
        const min = Number(f.rangeFrom ?? '');
        const max = Number(f.rangeTo ?? '');
        if (!Number.isNaN(min) && v.from && Number(v.from) < min) return `"${f.label}" From must be ≥ ${min}`;
        if (!Number.isNaN(max) && v.to && Number(v.to) > max) return `"${f.label}" To must be ≤ ${max}`;
      }
    }
    return null;
  }, [sortedFields, universalFit, values]);

  /** Build payload for RPC */
  const buildValuesForUpsert = useCallback(() => {
    const payload: { field_slug: string; type: 'int' | 'string' | 'bool'; value: string }[] = [];
    if (universalFit) return payload;
    for (const f of sortedFields) {
      if (!f.dbId) continue;
      const sl = f.slug ?? slugify(f.label);
      const v = values[f.dbId] || {};
      if (f.type === 'Range') {
        if (v.from) payload.push({ field_slug: `${sl}_from`, type: 'int', value: String(Number(v.from)) });
        if (v.to) payload.push({ field_slug: `${sl}_to`, type: 'int', value: String(Number(v.to) - 1) });
      } else {
        const s = (v.select ?? '').trim();
        if (s) payload.push({ field_slug: sl, type: 'string', value: s });
      }
    }
    return payload;
  }, [sortedFields, universalFit, values]);

  const currentVariantIds = useMemo(
    () =>
      selectedProduct.map((product) => {
        const firstVariant = product.variants[0];
        return firstVariant?.shopify_variant_id;
      }).filter((id): id is number => typeof id === 'number'),
    [selectedProduct]
  );

  /** Get tags to use for product updates */
  const getTagsForProductUpdate = useCallback((): string[] => {
    if (editSetId && existingFitmentTags.length > 0) {
      // Edit mode: use existing fitment tags
      return existingFitmentTags;
    } else {
      // New entry mode: build new tags
      return buildTag(sortedFields, values, universalFit);
    }
  }, [editSetId, existingFitmentTags, sortedFields, values, universalFit]);

  /** Track product changes for efficient tag updates */
  const getProductChanges = useCallback(() => {
    const currentProductIds = new Set(selectedProduct.map(p => p.id));
    
    // Products to add tags to (new products)
    const productsToAdd = Array.from(currentProductIds).filter(id => !initialProductIds.has(id));
    
    // Products to remove tags from (removed products)
    const productsToRemove = Array.from(initialProductIds).filter(id => !currentProductIds.has(id));
    
    return { productsToAdd, productsToRemove };
  }, [selectedProduct, initialProductIds]);

  /** Bulk update product tags - optimized */
  const updateProductTags = useCallback(async () => {
    const { productsToAdd, productsToRemove } = getProductChanges();
    const tagsToUse = getTagsForProductUpdate();
    
    if (productsToAdd.length === 0 && productsToRemove.length === 0) {
      return true; // No tag updates needed
    }

    try {
      setUpdatingTags(true);
      
      // Add tags to new products
      if (productsToAdd.length > 0 && tagsToUse.length > 0) {
        await api.bulkUpdateProductTags({ 
          productIds: productsToAdd, 
          tags: tagsToUse 
        });
      }
      
      // Remove tags from removed products
      if (productsToRemove.length > 0 && tagsToUse.length > 0) {
        await api.bulkRemoveProductTags({ 
          productIds: productsToRemove, 
          tags: tagsToUse 
        });
      }
      
      return true;
    } catch (error: any) {
      setToast({ content: `Failed to update product tags: ${error?.message ?? 'Unknown error'}`, error: true });
      return false;
    } finally {
      setUpdatingTags(false);
    }
  }, [getProductChanges, getTagsForProductUpdate]);

  /** Reset to clean state for "Save and Add Next" */
  const resetToCleanState = useCallback(() => {
    setUniversalFit(false);
    setValues({});
    setSelectedProduct([]);
    setSelectedCollection([]);
    setSelectedCard('product');
    
    // Reset snapshots to clean state
    setInitialUniversalFit(false);
    setInitialValues({});
    setInitialProductsKey('[]');
    setInitialProductIds(new Set());
    setExistingFitmentTags([]);
  }, []);

  /** Save */
  const doSave = useCallback(
    async (resetAfter: boolean) => {
      if (saving || savingNext || updatingTags || isInitialLoading) return false; // guard
      if (!isDirty) {
        if (resetAfter) {
          resetToCleanState();
        }
        setToast({ content: 'No changes' });
        return true;
      }

      const errMsg = validate();
      if (errMsg) {
        setToast({ content: errMsg, error: true });
        return false;
      }

      try {
        setSaving(!resetAfter);
        setSavingNext(resetAfter);

        const p_values = buildValuesForUpsert();
        const p_tags = getTagsForProductUpdate();

        const { error } = await supabase.rpc('upsert_fitment_bundle_by_variant_ids', {
          p_store_id: storeId,
          p_fitment_set_id: editSetId ?? null,
          p_universal_fit: universalFit,
          p_values,
          p_tags: Array.isArray(p_tags) ? p_tags : [p_tags],
          p_variant_ids: currentVariantIds,
        });

        if (error) {
          const emsg = error?.message?.includes('fitment_set_id is ambiguous')
            ? 'Save failed due to ambiguous column in backend function. Ask backend to qualify fitment_set_id.'
            : `Save failed: ${error.message}`;
          throw new Error(emsg);
        }

        // Only update tags if we have products and changes
        const tagOk = selectedProduct.length > 0 ? await updateProductTags() : true;
        if (!tagOk) {
          setToast({ content: 'Fitment data saved, but failed to update product tags', error: true });
          return false;
        }

        const successMessage = selectedProduct.length > 0 ? 'Saved fitment data and updated product tags' : 'Saved fitment data';
        setToast({ content: successMessage });
        onSaved();

        if (resetAfter) {
          // For "Save & add next", reset to clean state
          resetToCleanState();
        } else {
          // For regular save, update snapshots with current state
          setInitialUniversalFit(universalFit);
          setInitialValues(values);
          setInitialProductsKey(productsKey);
          setInitialProductIds(new Set(selectedProduct.map(p => p.id)));
          onClose();
        }
        return true;
      } catch (e: any) {
        setToast({ content: e?.message ?? 'Save failed', error: true });
        return false;
      } finally {
        setSaving(false);
        setSavingNext(false);
      }
    },
    [
      saving, savingNext, updatingTags, isInitialLoading, isDirty, validate, 
      buildValuesForUpsert, getTagsForProductUpdate, storeId, editSetId, 
      universalFit, currentVariantIds, selectedProduct, updateProductTags, 
      onSaved, resetToCleanState, values, productsKey, onClose
    ]
  );

  /** Close handling with improved dirty detection */
  const requestClose = useCallback(
    (action?: () => void) => {
      // Only show confirm dialog if there are actual changes
      if (isDirty) {
        pendingNavRef.current = action ?? onClose;
        setShowLeaveConfirm(true);
      } else {
        (action ?? onClose)();
      }
    },
    [isDirty, onClose]
  );

  const confirmLeave = useCallback(
    async (save: boolean) => {
      const go = pendingNavRef.current ?? onClose;
      setShowLeaveConfirm(false);
      if (save) {
        const ok = await doSave(false);
        if (ok) go();
      } else {
        go();
      }
      pendingNavRef.current = null;
    },
    [doSave, onClose]
  );

  /** Options */
  const generateYearOptions = useCallback((startYear: number, endYear: number) => {
    const s = Number.isFinite(startYear) ? startYear : 1900;
    const e = Number.isFinite(endYear) ? endYear : new Date().getFullYear();
    const min = Math.min(s, e);
    const max = Math.max(s, e);
    const options: string[] = [];
    for (let i = min; i <= max; i++) options.push(String(i));
    return options;
  }, []);

  /** Card selection */
  const disableActions = saving || savingNext || updatingTags || isInitialLoading;

  const handleCardSelect = useCallback(
    (cardType: 'product' | 'collection') => {
      if (disableActions) return;
      setSelectedCard(cardType);
    },
    [disableActions]
  );

  const mergeProducts = (existing: SelectedProduct[], incoming: SelectedProduct[]): SelectedProduct[] => {
    const byId = new Map<string, SelectedProduct>(existing.map((p) => [p.id, { ...p, variants: [...p.variants] }]));
    for (const p of incoming) {
      const prev = byId.get(p.id);
      if (!prev) {
        byId.set(p.id, { ...p, variants: [...p.variants] });
        continue;
      }
      const seen = new Set(prev.variants.map((v) => v.shopify_variant_id));
      p.variants.forEach((v) => {
        if (!seen.has(v.shopify_variant_id)) prev.variants.push(v);
      });
    }
    return [...byId.values()];
  };

  const mergeCollections = (existing: CollectionData[], incoming: CollectionData[]): CollectionData[] => {
    const seen = new Set(existing.map((c) => c.collectionId));
    const merged = [...existing];
    incoming.forEach((c) => {
      if (!seen.has(c.collectionId)) merged.push(c);
    });
    return merged;
  };

  const handleModalClick = useCallback(
    async (cardType: 'product' | 'collection') => {
      if (disableActions) return;
      setIsFetchingSelectedProducts(true);
      try {
        await openResourcePicker({
          mode: cardType,
          selectedProducts: selectedProduct,
          selectedCollections: selectedCollection,
          onProductsSelected: (products) => {
            // setSelectedProduct((prev) => mergeProducts(prev, products as SelectedProduct[]));
              setSelectedProduct(products);
          },
          onCollectionsSelected: (collections) => {
            setSelectedCollection((prev) => mergeCollections(prev, collections));
            // eslint-disable-next-line no-console
            console.log('Selected Collection IDs:', collections.map((c) => c.collectionId));
          },
          onError: (error) => setToast({ content: error, error: true }),
          onSuccess: (message) => setToast({ content: message }),
        });
      } catch (error) {
        setToast({ content: 'Failed to open resource picker. Please try again.', error: true });
      } finally {
        setIsFetchingSelectedProducts(false);
      }
    },
    [disableActions, selectedCollection, selectedProduct]
  );

  /** Remove */
  const removeVariant = useCallback((productId: string, variantId: number) => {
    setSelectedProduct((prev) =>
      prev
        .map((p) => (p.id === productId ? { ...p, variants: p.variants.filter((v) => v.shopify_variant_id !== variantId) } : p))
        .filter((p) => p.variants.length > 0)
    );
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setSelectedProduct((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const primaryDisabled = !isDirty || disableActions;
  const saveAndNextDisabled = primaryDisabled;

  return (
    <Frame>
      <Page
        title={editSetId ? 'Edit search entry' : 'Add search entry'}
        backAction={{ content: 'Back', onAction: () => requestClose(onClose) }}
        primaryAction={{
          content: saving || updatingTags ? (updatingTags ? 'Updating tags...' : 'Saving...') : 'Save',
          onAction: () => doSave(false),
          loading: saving || updatingTags,
          disabled: primaryDisabled,
        }}
        secondaryActions={[
          {
            content: savingNext || updatingTags ? (updatingTags ? 'Updating tags...' : 'Saving...') : 'Save & add next',
            onAction: async () => {
              await doSave(true);
            },
            loading: savingNext || updatingTags,
            disabled: saveAndNextDisabled,
          },
          {
            content: 'Cancel',
            onAction: () => requestClose(onClose),
            disabled: disableActions,
          },
        ]}
      >
        {isInitialLoading || (updatingTags && !saving && !savingNext) ? (
          <Card padding="400" roundedAbove="sm">
            {updatingTags ? (
              <BlockStack gap="300">
                <InlineStack align="center" blockAlign="center" gap="200">
                  <Spinner accessibilityLabel="Updating product tags" size="small" />
                  <Text as="span" tone="subdued">
                    Updating product tags...
                  </Text>
                </InlineStack>
              </BlockStack>
            ) : (
              <SkeletonBodyText lines={6} />
            )}
          </Card>
        ) : (
          <>
            <Card padding="400" roundedAbove="sm">
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">
                  Search form preview
                </Text>
                <Text as="span" tone="subdued">
                  Add search entries according to the database structure or import database.
                </Text>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(sortedFields.length, 1)}, minmax(0, 1fr))`,
                    gap: 8,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {sortedFields.map((field) => {
                    if (field.type === 'Range') {
                      const start = Number(field.rangeFrom);
                      const end = Number(field.rangeTo);
                      const baseOpts = [{ label: '', value: '' }].concat(
                        generateYearOptions(start, end).map((y) => ({ label: y, value: y }))
                      );
                      const vFrom = (field.dbId && values[field.dbId]?.from) || '';
                      const vTo = (field.dbId && values[field.dbId]?.to) || '';
                      return (
                        <div style={{ gridColumn: 'span 2', minWidth: 0 }} key={field.id}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                              gap: 12,
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            <Box width="100%" minWidth="0">
                              <Select
                                label={`${field.label} From`}
                                options={ensureOption(baseOpts, vFrom)}
                                value={vFrom}
                                onChange={(val) => field.dbId && setFrom(field.dbId, val)}
                                disabled={disableActions || universalFit}
                              />
                            </Box>
                            <Box width="100%" minWidth="0">
                              <Select
                                label={`${field.label} To`}
                                options={ensureOption(baseOpts, vTo)}
                                value={vTo}
                                onChange={(val) => field.dbId && setTo(field.dbId, val)}
                                disabled={disableActions || universalFit}
                              />
                            </Box>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Box key={field.id}>
                        <TextField
                          autoComplete="off"
                          label={field.label}
                          value={(field.dbId && values[field.dbId]?.select) || ''}
                          onChange={(val) => field.dbId && setSelect(field.dbId, val)}
                          disabled={disableActions || universalFit}
                          placeholder={field.placeholder}
                        />
                      </Box>
                    );
                  })}
                </div>
              </BlockStack>
            </Card>

            {/* Hidden Universal toggle kept for future enablement */}
            <Box hidden paddingBlockStart="400">
              <Card padding="400" roundedAbove="sm">
                <BlockStack gap="400">
                  <Checkbox
                    label="Universal fit (ignore all fields)"
                    checked={universalFit}
                    onChange={(v) => setUniversalFit(v)}
                    disabled={disableActions}
                  />
                </BlockStack>
              </Card>
            </Box>

            <Box paddingBlockStart="400">
              <Card padding="400" roundedAbove="sm">
                <BlockStack gap="400">
                  <InlineStack wrap={false} gap="400">
                    <Box width="100%">
                      <div
                        role="button"
                        aria-pressed={selectedCard === 'product'}
                        onClick={() => handleCardSelect('product')}
                        style={{
                          cursor: disableActions ? 'not-allowed' : 'pointer',
                          border: selectedCard === 'product' ? '2px solid #000' : '1px solid #e5e5e5',
                          borderRadius: 16,
                          opacity: disableActions ? 0.6 : 1,
                        }}
                      >
                        <Card padding="400">
                          <BlockStack align="center" gap="200">
                            <Icon source={ProductListIcon} />
                            <Text as="span" alignment="center" fontWeight="medium">
                              Product
                            </Text>
                          </BlockStack>
                        </Card>
                      </div>
                    </Box>
                    {/* Collection card */}
                    <Box hidden width="100%">
                      <div
                        role="button"
                        aria-pressed={selectedCard === 'collection'}
                        onClick={() => handleCardSelect('collection')}
                        style={{
                          cursor: disableActions ? 'not-allowed' : 'pointer',
                          border: selectedCard === 'collection' ? '2px solid #000' : '1px solid #e5e5e5',
                          borderRadius: 16,
                          opacity: disableActions ? 0.6 : 1,
                        }}
                      >
                        <Card padding="400">
                          <BlockStack align="center" gap="200">
                            <Icon source={CollectionListIcon} />
                            <Text as="span" alignment="center" fontWeight="medium">
                              Collection
                            </Text>
                          </BlockStack>
                        </Card>
                      </div>
                    </Box>
                  </InlineStack>

                  {selectedCard === 'product' && isFetchingSelectedProducts && (
                    <Card padding="400">
                      <InlineStack align="center" blockAlign="center" gap="200">
                        <Spinner accessibilityLabel="Loading products" size="small" />
                        <Text as="span" tone="subdued">
                          {selectedProduct.length === 0 ? 'Opening product picker...' : 'Updating product selection...'}
                        </Text>
                      </InlineStack>
                    </Card>
                  )}
                 <InlineStack align="space-between" blockAlign="center" gap="400">

                    <Text as="span" tone="subdued">
                  {selectedCard === 'product' && selectedProduct.length === 0 && !isFetchingSelectedProducts && (
                      'No products selected.'
                  )}
                      
                  {selectedCard === 'collection' && selectedCollection.length === 0 && (
                      'No collections selected.'
                  )}
                    </Text>

                 

                  <InlineStack align="end" gap="300">
                    <Button
                      variant="primary"
                      onClick={() => handleModalClick(selectedCard)}
                      disabled={disableActions || isFetchingSelectedProducts}
                      loading={isFetchingSelectedProducts}
                      icon={selectedCard === 'product' ? ProductIcon : CollectionListIcon}
                    >
                      {selectedCard === 'product' ? 'Add Products' : 'Add Collections'}
                    </Button>
                  </InlineStack>

                      </InlineStack>
                        

                  {selectedProduct.length > 0 && (
                    <ProductListing
                      selectedProducts={selectedProduct}
                      shopDomain={shopDomain}
                      onRemoveProduct={removeProduct}
                      disabled={disableActions}
                    />
                  )}

                  {selectedCard === 'collection' && selectedCollection.length > 0 && (
                    <IndexTable
                      itemCount={selectedCollection.length}
                      resourceName={{ singular: 'collection', plural: 'collections' }}
                      selectable={false}
                      headings={[{ title: '' }, { title: 'Collection' }, { title: '' }]}
                    >
                      {selectedCollection.map((collection, index) => (
                        <IndexTable.Row id={collection.collectionId} key={collection.collectionId} selected={false} position={index}>
                          <IndexTable.Cell>
                            <Thumbnail source={collection.collectionImage || ''} alt={collection.collectionName} size="small" />
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text as="span" variant="bodyMd">
                              {collection.collectionName}
                            </Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Button
                              icon={DeleteIcon}
                              onClick={() =>
                                setSelectedCollection((prev) => prev.filter((c) => c.collectionId !== collection.collectionId))
                              }
                              accessibilityLabel="Remove collection"
                              disabled={disableActions}
                            />
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      ))}
                    </IndexTable>
                  )}
                </BlockStack>
              </Card>
            </Box>
          </>
        )}
        <Box paddingBlockEnd="800" />
      </Page>

      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="You have unsaved changes"
        primaryAction={{
          content: 'Save and continue',
          loading: saving || savingNext || updatingTags,
          onAction: async () => {
            await confirmLeave(true);
          },
        }}
        secondaryActions={[
          {
            content: 'Discard changes',
            destructive: true,
            onAction: () => confirmLeave(false),
          },
          {
            content: 'Cancel',
            onAction: () => setShowLeaveConfirm(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">Save your changes or discard them before leaving.</Text>
        </Modal.Section>
      </Modal>

      {toast && <Toast content={toast.content} error={!!toast.error} onDismiss={() => setToast(null)} duration={3000} />}
    </Frame>
  );
}