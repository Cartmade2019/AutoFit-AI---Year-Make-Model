 import {
  Card,
  BlockStack,
  Box,
  InlineStack,
  Text,
  Button,
  DropZone,
  DataTable,
  Page,
  EmptyState,
  SkeletonBodyText,
  ProgressBar,
  Banner,
  Spinner,
  LegacyCard,
  Link,
  Badge,
  TableData,
} from "@shopify/polaris";
import { CircleDownIcon, ExternalIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouteLoaderData, useNavigate } from "@remix-run/react";
import { api } from "../api";
import { supabase } from "../supabase/supabaseClient";
import type { loader as rootLoader } from "~/root";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface FitmentField {
  id: number;
  label: string;
  slug: string;
  field_type: string;
  required: boolean;
  sort_order: number;
}

interface ImportJob {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  error_log?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  job_type: string;
  store_id: number;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  rowCount: number;
}

const STORAGE_BASE_URL = "https://utryosoicwunrlnyzgns.supabase.co/storage/v1/object/public/imports/";

// Status validation utility
const isValidStatus = (status: string): status is ImportJob['status'] => {
  return ['pending', 'running', 'completed', 'failed'].includes(status);
};

// Job state management utilities
const JobStateManager = {
  // Fetch job with retry logic for read consistency
  async fetchJobWithRetry(jobId: number, maxRetries: number = 3, delayMs: number = 500): Promise<ImportJob | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          console.warn(`Attempt ${attempt + 1} failed:`, error);
          if (attempt === maxRetries - 1) throw error;
        } else if (data) {
          return data;
        }
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
      }

      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
    return null;
  },

  // Update job status with transaction safety
  async updateJobStatus(
    jobId: number, 
    status: ImportJob['status'], 
    additionalFields: Partial<ImportJob> = {}
  ): Promise<ImportJob | null> {
    try {
      // Use RPC for atomic update to ensure consistency
      const { data, error } = await supabase.rpc('update_import_job_status', {
        p_job_id: jobId,
        p_status: status,
        p_processed_rows: additionalFields.processed_rows || null,
        p_error_log: additionalFields.error_log || null,
        p_started_at: additionalFields.started_at || null,
        p_finished_at: additionalFields.finished_at || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating job status:', error);
      
      // Fallback to regular update if RPC fails
      const updateFields: any = { status, ...additionalFields };
      
      const { data, error: updateError } = await supabase
        .from('import_jobs')
        .update(updateFields)
        .eq('id', jobId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    }
  },

  // Check for existing active jobs with better filtering
  async findActiveJobs(storeId: number): Promise<ImportJob[]> {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

export default function FitmentImportFlow() {
  // State management
  const [fitmentFields, setFitmentFields] = useState<FitmentField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const subscriptionRef = useRef<any>(null);
  const jobPollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastJobStateRef = useRef<string | null>(null);
  
  // Route data
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const navigate = useNavigate();
  
  if (!rootData) {
    return <div>Loading...</div>;
  }
  
  const { subscriptionData, trialInfo } = rootData;
  const shopDomain: any = shopify.config.shop;

  // Plan limits calculation
  const getPlanLimit = useCallback(() => {
    const planName = subscriptionData.currentPlan
      .split("-")[0]
      .trim()
      .toLowerCase();
    
    const limits = {
      starter: 2000,
      growth: 5000,
      pro: 10000,
      elite: 20000,
      free_trial: 2000,
    };
    
    return limits[planName as keyof typeof limits] || 2000;
  }, [subscriptionData]);
  
  const productLimit = getPlanLimit();
  const isInTrial = trialInfo.isInTrial;

  // Toast helper
  const showToast = useCallback((message: string, isError = false) => {
    shopify.toast.show(message, { isError });
  }, []);

  // Generate file name for storage
  const generateFileName = useCallback((jobId: number, storeId: number, originalFileName: string) => {
    const date = new Date().toISOString().split('T')[0];
    const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'));
    return `fitment_import_${storeId}_${jobId}_${date}${fileExtension}`;
  }, []);

  // Get file URL for download
  const getFileUrl = useCallback((jobId: number, storeId: number, originalFileName: string) => {
    const fileName = generateFileName(jobId, storeId, originalFileName);
    return `${STORAGE_BASE_URL}${fileName}`;
  }, [generateFileName]);

  // Load import history with better error handling
  const loadImportHistory = useCallback(async () => {
    if (!storeId) return;
    
    try {
      setHistoryLoading(true);
      
      const { data: jobs, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('store_id', storeId)
        .eq('job_type', 'fitment_import')
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setImportHistory(jobs || []);
    } catch (error) {
      console.error('Error loading import history:', error);
      showToast('Failed to load import history', true);
    } finally {
      setHistoryLoading(false);
    }
  }, [storeId, showToast]);

  // Enhanced job state handler with debouncing
  const handleJobStateChange = useCallback((job: ImportJob) => {
  // Prevent duplicate state changes
  const jobStateKey = `${job.id}-${job.status}-${job.processed_rows}`;
  if (lastJobStateRef.current === jobStateKey) {
    return;
  }
  lastJobStateRef.current = jobStateKey;

  // Validate status
  if (!isValidStatus(job.status)) {
    console.warn('Invalid job status received:', job.status);
    return;
  }

  // Force UI update by creating new object reference
  const updatedJob = { ...job };

  if (job.status === 'pending' || job.status === 'running') {
    setCurrentJob(updatedJob);
    setIsImporting(true);
  } else if (job.status === 'completed' || job.status === 'failed') {
    // Clear job state immediately
    setCurrentJob(null);
    setIsImporting(false);
    
    // Stop any active polling
    if (jobPollingRef.current) {
      clearInterval(jobPollingRef.current);
      jobPollingRef.current = null;
    }
    
    // Show completion message
    if (job.status === 'completed') {
      const hasErrors = job.error_log && job.error_log.includes('[completed_with_errors requested]');
      const message = hasErrors 
        ? `Import completed with some issues. ${job.processed_rows} rows processed.`
        : `Import completed successfully! ${job.processed_rows} rows processed.`;
      showToast(message, hasErrors);
    } else {
      showToast('Import failed. Please check the error log.', true);
    }
    
    // Refresh history if it's being shown
    if (showHistory) {
      loadImportHistory();
    }
  }
}, [showToast, showHistory, loadImportHistory]);
  
  // Polling fallback for critical job updates
 // Enhanced polling with exponential backoff and completion detection
const startJobPolling = useCallback((jobId: number) => {
  if (jobPollingRef.current) {
    clearInterval(jobPollingRef.current);
  }

  let pollInterval = 2000; // Start with 2 seconds
  let consecutiveErrors = 0;
  const MAX_ERRORS = 3;

  const poll = async () => {
    try {
      const job = await JobStateManager.fetchJobWithRetry(jobId);
      
      if (!job) {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_ERRORS) {
          console.error('Max polling errors reached, stopping polling');
          if (jobPollingRef.current) {
            clearInterval(jobPollingRef.current);
            jobPollingRef.current = null;
          }
          showToast('Lost connection to import job. Please refresh the page.', true);
        }
        return;
      }
      
      consecutiveErrors = 0; // Reset on success
      
      // Always update state with latest job info
      handleJobStateChange(job);
      
      // Stop polling when job is complete
      if (job.status === 'completed' || job.status === 'failed') {
        if (jobPollingRef.current) {
          clearInterval(jobPollingRef.current);
          jobPollingRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      consecutiveErrors++;
      
      if (consecutiveErrors >= MAX_ERRORS) {
        if (jobPollingRef.current) {
          clearInterval(jobPollingRef.current);
          jobPollingRef.current = null;
        }
        showToast('Lost connection to import job. Please refresh the page.', true);
      }
    }
  };

  // Initial poll
  poll();
  
  // Set up interval
  jobPollingRef.current = setInterval(poll, pollInterval);
}, [handleJobStateChange, showToast]);

  // Load store and fitment fields
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setFieldsLoading(true);
        
        // Get store ID from shop domain
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('shop_domain', shopDomain)
          .single();
          
        if (!store) {
          throw new Error('Store not found');
        }
        setStoreId(store.id);

        // Get fitment fields
        const { data: fields, error } = await supabase
          .from('fitment_fields')
          .select('*')
          .eq('store_id', store.id)
          .order('sort_order');
          
        if (error) throw error;
        
        setFitmentFields(fields || []);
      } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Failed to load fitment fields', true);
      } finally {
        setFieldsLoading(false);
      }
    };

    loadInitialData();
  }, [shopDomain, showToast]);

  // Enhanced real-time subscription setup
  // Enhanced real-time subscription setup with better fallback
useEffect(() => {
  if (!storeId) return;

  let isSubscribed = true;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;

  const setupSubscription = async () => {
    try {
      // Check for existing active jobs
      const activeJobs = await JobStateManager.findActiveJobs(storeId);
      
      if (activeJobs.length > 0 && isSubscribed) {
        const job = activeJobs[0];
        setCurrentJob(job);
        setIsImporting(true);
        
        // Start polling immediately as backup
        startJobPolling(job.id);
      }

      // Set up real-time subscription with enhanced error handling
      subscriptionRef.current = supabase
        .channel(`import_jobs_${storeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'import_jobs',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            if (!isSubscribed) return;
            
            console.log('Real-time update received:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const job = payload.new as ImportJob;
              
              // Validate job data
              if (job && job.id && isValidStatus(job.status)) {
                handleJobStateChange(job);
                
                // Always ensure polling is active for incomplete jobs
                if (job.status === 'pending' || job.status === 'running') {
                  startJobPolling(job.id);
                }
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log('Subscription status:', status, err);
          
          // Handle subscription errors
          if (status === 'CHANNEL_ERROR' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
            
            setTimeout(() => {
              if (isSubscribed && subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                setupSubscription();
              }
            }, 2000 * reconnectAttempts);
          }
        });

    } catch (error) {
      console.error('Error setting up subscription:', error);
      // Ensure polling is running even if subscription fails
      if (currentJob && isSubscribed) {
        startJobPolling(currentJob.id);
      }
    }
  };

  setupSubscription();

  // Cleanup
  return () => {
    isSubscribed = false;
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    if (jobPollingRef.current) {
      clearInterval(jobPollingRef.current);
      jobPollingRef.current = null;
    }
  };
}, [storeId, handleJobStateChange, startJobPolling]);

  

  // File validation
  const validateFile = useCallback((file: File): string[] => {
    const errors: string[] = [];
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`);
    }
    
    if (file.size === 0) {
      errors.push('File is empty.');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('File size exceeds 10MB limit.');
    }
    
    return errors;
  }, []);

  // Header validation
  const validateHeaders = useCallback((headers: string[]): string[] => {
    const errors: string[] = [];
    const requiredHeaders = [
      ...fitmentFields.filter(f => f.required).map(f => f.label),
      'SKU'
    ];
    
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    
    for (const required of requiredHeaders) {
      const normalizedRequired = required.toLowerCase();
      if (!normalizedHeaders.includes(normalizedRequired)) {
        errors.push(`Missing required column: ${required}`);
      }
    }
    
    if (!normalizedHeaders.includes('sku')) {
      errors.push('SKU column is required and must be the last column');
    }
    
    return errors;
  }, [fitmentFields]);

  // File parsing
  const parseFile = useCallback(async (file: File): Promise<ParsedData | null> => {
    return new Promise((resolve) => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (fileExtension === '.csv') {
        Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const [headers, ...rows] = results.data as string[][];
              resolve({
                headers: headers.map(h => h.trim()),
                rows,
                rowCount: rows.length
              });
            } else {
              resolve(null);
            }
          },
          error: () => resolve(null)
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
            
            if (jsonData.length > 0) {
              const [headers, ...rows] = jsonData;
              resolve({
                headers: headers.map(h => String(h).trim()),
                rows,
                rowCount: rows.length
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }, []);

  // Handle file upload
  const handleDropZoneDrop = useCallback(
    async (_dropFiles: any, acceptedFiles: File[], rejectedFiles: any) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        showToast('Some files were rejected. Please check file type and size.', true);
        return;
      }
      
      if (!acceptedFiles || acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      
      // Validate file
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        setValidationErrors(fileErrors);
        showToast(fileErrors[0], true);
        return;
      }

      // Parse file
      try {
        const parsed = await parseFile(file);
        if (!parsed) {
          showToast('Failed to parse file. Please check file format.', true);
          return;
        }

        // Validate headers
        const headerErrors = validateHeaders(parsed.headers);
        if (headerErrors.length > 0) {
          setValidationErrors(headerErrors);
          showToast(headerErrors[0], true);
          return;
        }

        // Check row limit
        if (parsed.rowCount > productLimit) {
          const error = `Row limit exceeded (${parsed.rowCount}/${productLimit}). Please upgrade your plan.`;
          setValidationErrors([error]);
          showToast(error, true);
          return;
        }

        // Success
        setFiles([file]);
        setParsedData(parsed);
        setValidationErrors([]);
        showToast(`File uploaded successfully. ${parsed.rowCount} rows ready to import.`);
        
      } catch (error) {
        console.error('Error processing file:', error);
        showToast('Error processing file. Please try again.', true);
      }
    },
    [validateFile, parseFile, validateHeaders, productLimit, showToast]
  );

  // Enhanced import job creation with better error handling
  const handleImportJob = useCallback(async () => {
  if (!parsedData || !files[0] || !storeId) return;

  try {
    setIsImporting(true);

    // Create import job with transaction
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        store_id: storeId,
        job_type: 'fitment_import',
        status: 'pending',
        total_rows: parsedData.rowCount
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Generate filename with job info
    const fileName = generateFileName(job.id, storeId, files[0].name);
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('imports')
      .upload(fileName, files[0]);
      
    if (uploadError) {
      console.warn('File upload to storage failed:', uploadError);
    }

    // Start import process
    await api.fileImport({
      jobId: job.id,
      databaseStoreId: storeId,
      headers: parsedData.headers,
      rows: parsedData.rows,
      fileName
    });

    // Set current job and start monitoring immediately
    setCurrentJob(job);
    startJobPolling(job.id);
    
    // Add a backup check after 5 seconds
    setTimeout(async () => {
      const latestJob = await JobStateManager.fetchJobWithRetry(job.id);
      if (latestJob && (latestJob.status === 'completed' || latestJob.status === 'failed')) {
        handleJobStateChange(latestJob);
      }
    }, 5000);
    
    showToast('Import started successfully!');
    
    // Clear file data
    setFiles([]);
    setParsedData(null);
    setValidationErrors([]);
    
  } catch (error) {
    console.error('Error starting import:', error);
    showToast('Failed to start import. Please try again.', true);
    setIsImporting(false);
    setCurrentJob(null);
  }
}, [parsedData, files, storeId, showToast, generateFileName, startJobPolling, handleJobStateChange]);

  // Download sample format
  const downloadSampleFormat = useCallback(async () => {
    try {
      setDownloadingSample(true);
      
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const headers = [...fitmentFields.map(f => f.label), 'SKU'];
      const sampleRow = [
        ...fitmentFields.map(f => {
          switch (f.field_type) {
            case 'int': return '2020-2023';
            case 'string': return f.label === 'Make' ? 'Ford' : f.label === 'Model' ? 'F-150' : 'XLT';
            case 'boolean': return 'true';
            default: return 'Sample';
          }
        }),
        '12345, 67890'
      ];

      const csvContent = [headers, sampleRow]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitment_sample_${shopDomain?.split('.')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading sample:', error);
      showToast('Failed to download sample file', true);
    } finally {
      setDownloadingSample(false);
    }
  }, [fitmentFields, shopDomain, showToast]);

  // Reset upload
  const resetUpload = useCallback(() => {
    setFiles([]);
    setParsedData(null);
    setValidationErrors([]);
  }, []);

  // Toggle history view
  const toggleHistoryView = useCallback(async () => {
    if (!showHistory) {
      await loadImportHistory();
    }
    setShowHistory(!showHistory);
  }, [showHistory, loadImportHistory]);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  // Get status badge with error indication
  const getStatusBadge = useCallback((status: string, errorLog?: string) => {
    const hasErrors = errorLog && errorLog.includes('[completed_with_errors requested]');
    
    switch (status) {
      case 'completed':
        return <Badge status={hasErrors ? "warning" : "success"}>
          {hasErrors ? 'Completed with Issues' : 'Completed'}
        </Badge>;
      case 'failed':
        return <Badge status="critical">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }, []);

  // Loading state for fields
  if (fieldsLoading) {
    return (
      <Page title="Import Fitment Data" backAction={{ content: 'Back', onAction: () => navigate('/database') }}>
        <BlockStack gap="500">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <SkeletonBodyText lines={1} />
                <SkeletonBodyText lines={3} />
              </BlockStack>
            </Box>
          </Card>
          <Card>
            <Box padding="400">
              <SkeletonBodyText lines={2} />
            </Box>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  // No fitment fields state
  if (!fitmentFields.length) {
    return (
      <Page title="Import Fitment Data" backAction={{ content: 'Back', onAction: () => navigate('/database') }}>
        <Card>
          <EmptyState
            heading="No fitment fields configured"
            action={{
              content: 'Configure Fields',
              onAction: () => navigate('/database')
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p">
              You need to configure fitment fields before importing data. 
              Go to the database page to set up your fitment structure.
            </Text>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  // Prepare table data
  const expectedHeaders = [...fitmentFields.map(f => f.label), 'SKU'];
  const sampleRowData = [
    [
      ...fitmentFields.map(f => {
        switch (f.field_type) {
          case 'int': return '2020-2023';
          case 'string': return f.label === 'Make' ? 'Ford' : f.label === 'Model' ? 'F-150' : 'XLT';
          case 'boolean': return 'true';
          default: return 'Sample';
        }
      }),
      '12345, 67890'
    ]
  ];

  // Prepare history table data
  const historyRows: TableData[][] = importHistory.map((job) => [
    formatDate(job.created_at),
    getStatusBadge(job.status, job.error_log),
    job.total_rows.toLocaleString(),
    job.processed_rows.toLocaleString(),
    job.finished_at ? formatDate(job.finished_at) : '-',
    job.error_log ? (
      <Text as="span" color="critical" truncate>
        {job.error_log.replace('[completed_with_errors requested]', '').substring(0, 50)}...
      </Text>
    ) : '-',
    <Link
      url={getFileUrl(job.id, job.store_id, 'import_file.csv')}
      external
      removeUnderline
    >
      Download
    </Link>
  ]);

  // File upload component
  const fileUpload = !files.length && !currentJob && (
    <Box padding="400" background="bg-surface">
      <BlockStack gap="200" align="center">
        <Text as="span" fontWeight="bold" alignment="center">
          Drop CSV or XLSX files to upload
        </Text>
        <Text as="span" fontWeight="bold" alignment="center">
          OR
        </Text>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Button variant="secondary" disabled={isImporting}>
            Add files
          </Button>
        </div>
        <Text as="span" alignment="center" tone="subdued">
          Accepts .csv, .xlsx, .xls files only
        </Text>
        <Text as="span" alignment="center" tone="subdued">
          Maximum file size: 10MB
        </Text>
      </BlockStack>
    </Box>
  );

  // Enhanced import progress component
  const importProgress = currentJob && (
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          {currentJob.status === 'pending' && (
            <>
              <InlineStack align="space-between">
                <Text variant="headingSm">Import Queued</Text>
                <Spinner accessibilityLabel="Pending" size="small" />
              </InlineStack>
              <Text tone="subdued">
                Your import is queued and will start processing shortly...
              </Text>
            </>
          )}
          
          {currentJob.status === 'running' && (
            <>
              <InlineStack align="space-between">
                <Text variant="headingSm">Import in Progress</Text>
                <Spinner accessibilityLabel="Importing" size="small" />
              </InlineStack>
              <ProgressBar 
                progress={currentJob.total_rows > 0 ? (currentJob.processed_rows / currentJob.total_rows) * 100 : 0} 
                size="small"
              />
              <Text tone="subdued">
                {currentJob.processed_rows.toLocaleString()} of {currentJob.total_rows.toLocaleString()} rows processed
              </Text>
            </>
          )}
        </BlockStack>
      </Box>
    </Card>
  );

  return (
    <Page 
      title="Import Fitment Data" 
      backAction={{ content: 'Back', onAction: () => navigate('/database') }}
    >
      <BlockStack gap="500">
        
        {/* Plan Info Banner */}
        <Banner tone="info">
          <Text>
            Current plan allows up to {productLimit.toLocaleString()} fitment rows. 
            {isInTrial && " (Trial Plan)"}
          </Text>
        </Banner>

        {/* Import Progress */}
        {importProgress}

        {/* File Upload */}
        {!currentJob && (
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Upload Fitment Data</Text>
                  <Button 
                    variant="plain"
                    onClick={toggleHistoryView}
                    loading={historyLoading}
                  >
                    {showHistory ? 'Hide History' : 'View History'}
                  </Button>
                </InlineStack>

                {!files.length && !isImporting && (
                  <DropZone
                    onDrop={handleDropZoneDrop}
                    accept=".csv,.xlsx,.xls"
                    disabled={isImporting}
                  >
                    {fileUpload}
                  </DropZone>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Banner tone="critical">
                    <BlockStack gap="100">
                      {validationErrors.map((error, index) => (
                        <Text key={index}>{error}</Text>
                      ))}
                    </BlockStack>
                  </Banner>
                )}

                {/* File Info */}
                {files.length > 0 && parsedData && (
                  <Card background="bg-surface-secondary">
                    <Box padding="300">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="headingSm">File Details</Text>
                          <Button 
                            variant="plain" 
                            tone="critical"
                            onClick={resetUpload}
                            disabled={isImporting}
                          >
                            Remove
                          </Button>
                        </InlineStack>
                        <Text>
                          <strong>{files[0].name}</strong> - {parsedData.rowCount.toLocaleString()} rows
                        </Text>
                        <Text tone="subdued">
                          File size: {(files[0].size / 1024).toFixed(1)} KB
                        </Text>
                      </BlockStack>
                    </Box>
                  </Card>
                )}
              </BlockStack>
            </Box>
          </Card>
        )}

        {/* Import Button */}
        {parsedData && validationErrors.length === 0 && !currentJob && (
          <Card>
            <Box padding="400">
              <InlineStack align="space-between">
                <BlockStack gap="100">
                  <Text variant="headingSm">Ready to Import</Text>
                  <Text tone="subdued">
                    {parsedData.rowCount.toLocaleString()} rows will be processed
                  </Text>
                </BlockStack>
                <Button 
                  variant="primary" 
                  onClick={handleImportJob}
                  loading={isImporting}
                >
                  Start Import
                </Button>
              </InlineStack>
            </Box>
          </Card>
        )}

        {/* Import History */}
        {showHistory && (
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd">Import History</Text>
                
                {historyLoading ? (
                  <SkeletonBodyText lines={3} />
                ) : importHistory.length > 0 ? (
                  <LegacyCard>
                    <DataTable
                      columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text', 'text', 'text']}
                      headings={['Started', 'Status', 'Total Rows', 'Processed', 'Completed', 'Errors', 'File']}
                      rows={historyRows}
                      footerContent={`Showing ${importHistory.length} import${importHistory.length !== 1 ? 's' : ''}`}
                    />
                  </LegacyCard>
                ) : (
                  <EmptyState
                    heading="No import history"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <Text as="p">
                      Your completed imports will appear here.
                    </Text>
                  </EmptyState>
                )}
              </BlockStack>
            </Box>
          </Card>
        )}

        {/* Expected Format */}
        <Card>
          <Box padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">Expected File Format</Text>
                <Button 
                  onClick={downloadSampleFormat}
                  loading={downloadingSample}
                  disabled={isImporting}
                  variant="primary"
                  icon={CircleDownIcon}
                >
                  Download Sample
                </Button>
              </InlineStack>
              
              <DataTable
                columnContentTypes={expectedHeaders.map(() => "text")}
                headings={expectedHeaders}
                rows={sampleRowData}
                increasedTableDensity
              />
              
              <Box paddingBlockStart="200">
                <BlockStack gap="200">
                  <Text as="p" tone="subdued" fontWeight="medium">
                    • SKU column must be the last column
                  </Text>
                  <Text as="p" tone="subdued" fontWeight="medium">
                    • Multiple SKUs can be separated by commas
                  </Text>
                  <Text as="p" tone="subdued" fontWeight="medium">
                    • Required fields: {fitmentFields.filter(f => f.required).map(f => f.label).join(', ')}, SKU
                  </Text>
                  <Text as="p" tone="subdued" fontWeight="medium">
                    • Row limit for your plan: {productLimit.toLocaleString()}
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Box>
        </Card>
        
        <Box paddingBlockEnd="800" />
      </BlockStack>
    </Page>
  );
}