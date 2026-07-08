const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Batch {
  id: number;
  batch_no: string;
  operator: string;
  scanner_name: string;
  total_pages: number;
  status: BatchStatus | null;
  progress: number;
  original_pdf_path: string;
  ocr_version: string;
  ai_version: string;
  image_pipeline_version: string;
  factory_name: string;
  plant_name: string;
  line_name: string;
  processed_pages: number;
  verified_pages: number;
  failed_pages: number;
  duplicate_pages: number;
  review_pages: number;
  average_confidence: number | null;
  average_processing_time_ms: number | null;
  pdf_sha256: string;
  file_size_bytes: number;
  pdf_version: string;
  pdf_producer: string;
  pdf_creator: string;
  pdf_creation_date: string | null;
  locked_by: string | null;
  locked_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type BatchStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "waiting_review"
  | "completed"
  | "completed_with_errors"
  | "cancelled";

export interface Inspection {
  id: number;
  batch_id: number;
  page_number: number;
  batch_page_index: number;
  status: InspectionStatus | null;
  needs_review: boolean;
  error_detail: string | null;
  retry_count: number;
  last_retry_at: string | null;
  tractor_no: string;
  tractor_model: string;
  engine_no: string;
  chassis_no: string;
  inspector: string;
  date: string | null;
  shift: string;
  line_no: string;
  verified_by: string;
  final_verified_by: string;
  defects: DefectItem[];
  raw_text: string;
  confidence_scores: Record<string, number>;
  ocr_version: string;
  ai_version: string;
  image_pipeline_version: string;
  image_path_original: string;
  image_path_enhanced: string;
  ocr_json_path: string;
  verified_json_path: string;
  created_at: string | null;
  updated_at: string | null;
}

export type InspectionStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "ocr_completed"
  | "needs_review"
  | "verified"
  | "failed"
  | "exported";

export interface DefectItem {
  text: string;
  verified: boolean;
}

export interface PaginatedBatches {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  batches: Batch[];
}

export interface BatchSummary {
  batch_no: string;
  status: string | null;
  total_pages: number;
  processed: number;
  verified: number;
  failed: number;
  duplicates: number;
  review: number;
  average_confidence: number | null;
  average_processing_time_ms: number | null;
}

export interface BatchStorage {
  batch_no: string;
  original_pdf_size: number;
  pages_count: number;
  pages_size: number;
  total_size: number;
}

export interface UploadResponse {
  batch_id: number;
  batch_no: string;
  total_pages: number;
  file_size_bytes: number;
  pdf_sha256: string;
  status: string;
  original_pdf: string;
}

export interface ExportRecord {
  id: number;
  batch_id: number;
  file_type: string;
  file_path: string;
  created_by: string;
  created_at: string | null;
}

export interface ExportListResponse {
  batch_id: number;
  batch_no: string;
  exports: ExportRecord[];
}

export interface ExportCreateResponse {
  id: number;
  batch_id: number;
  batch_no: string;
  file_type: string;
  created_at: string | null;
}

export interface SpeechToTextResponse {
  text: string;
}

export interface DashboardData {
  summary: {
    total_batches: number;
    archived_batches: number;
    batches_today: number;
    batches_this_week: number;
    total_pages: number;
    processed_pages: number;
    verified_pages: number;
    failed_pages: number;
    review_pages: number;
    pages_processed_today: number;
    processing_rate_per_hour: number;
    average_confidence: number | null;
    batches_needing_review: number;
  };
  recent_batches: Array<{
    id: number;
    batch_no: string;
    status: string;
    total_pages: number;
    processed_pages: number;
    factory_name: string;
    created_at: string;
  }>;
  status_distribution: Array<{ status: string; count: number }>;
  factory_distribution: Array<{ factory: string; batch_count: number; total_pages: number }>;
}

export interface AnalyticsTrends {
  period_days: number;
  since: string;
  batches_per_day: Array<{ date: string; count: number }>;
  pages_per_day: Array<{ date: string; count: number }>;
  ocr_completions_per_day: Array<{
    date: string;
    count: number;
    avg_processing_time_ms: number | null;
  }>;
}

export interface FactoryStats {
  factories: Array<{
    factory: string;
    plant: string;
    batch_count: number;
    batch_pct: number;
    total_pages: number;
    page_pct: number;
    processed_pages: number;
    verified_pages: number;
    failed_pages: number;
    avg_confidence: number | null;
  }>;
  total_batches: number;
  total_pages: number;
}

export interface PerformanceData {
  ocr_processing: {
    total_completed: number;
    avg_time_ms: number | null;
    min_time_ms: number | null;
    max_time_ms: number | null;
  };
  recent_processing_times: Array<{
    timestamp: string;
    processing_time_ms: number;
  }>;
  confidence: {
    batches_with_confidence: number;
    overall_average: number | null;
  };
  reliability: {
    total_inspections: number;
    failed_inspections: number;
    failure_rate_pct: number;
    retried_inspections: number;
    retry_rate_pct: number;
    duplicates_found: number;
  };
}

export interface StatusDistribution {
  batch_statuses: Array<{ status: string; count: number }>;
  inspection_statuses: Array<{ status: string; count: number }>;
  top_defects: Array<{ defect: string; count: number }>;
  shift_distribution: Array<{ shift: string; count: number }>;
}

// ─── API Fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...(options?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    if (res.headers.get("content-type")?.includes("application/json")) {
      return res.json();
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadPdf(file: File): Promise<UploadResponse | null> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<UploadResponse>("/upload", { method: "POST", body: fd });
}

// ─── Batches CRUD ────────────────────────────────────────────────────────────

export async function createBatch(
  data: Partial<{
    operator: string;
    scanner_name: string;
    total_pages: number;
    plant_name: string;
    line_name: string;
    factory_name: string;
  }>
): Promise<Batch | null> {
  return apiFetch<Batch>("/batches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listBatches(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  factory?: string;
  year?: number;
  search?: string;
}): Promise<PaginatedBatches | null> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.factory) qs.set("factory", params.factory);
  if (params?.year) qs.set("year", String(params.year));
  if (params?.search) qs.set("search", params.search);
  const q = qs.toString();
  return apiFetch<PaginatedBatches>(`/batches${q ? `?${q}` : ""}`);
}

export async function getBatch(id: number): Promise<Batch | null> {
  return apiFetch<Batch>(`/batches/${id}`);
}

export async function getBatchSummary(
  id: number
): Promise<BatchSummary | null> {
  return apiFetch<BatchSummary>(`/batches/${id}/summary`);
}

export async function updateBatch(
  id: number,
  data: Partial<{
    operator: string;
    scanner_name: string;
    total_pages: number;
    status: string;
    progress: number;
    plant_name: string;
    line_name: string;
    factory_name: string;
    processed_pages: number;
    verified_pages: number;
    failed_pages: number;
    duplicate_pages: number;
    review_pages: number;
    average_confidence: number;
    average_processing_time_ms: number;
  }>
): Promise<Batch | null> {
  return apiFetch<Batch>(`/batches/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function archiveBatch(
  id: number
): Promise<{ message: string; batch_no: string } | null> {
  return apiFetch<{ message: string; batch_no: string }>(
    `/batches/${id}/archive`,
    { method: "POST" }
  );
}

export async function restoreBatch(
  id: number
): Promise<{ message: string; batch_no: string } | null> {
  return apiFetch<{ message: string; batch_no: string }>(
    `/batches/${id}/restore`,
    { method: "POST" }
  );
}

export async function lockBatch(
  id: number,
  locked_by: string
): Promise<{ message: string; batch_no: string } | null> {
  return apiFetch<{ message: string; batch_no: string }>(
    `/batches/${id}/lock`,
    { method: "POST", body: JSON.stringify({ locked_by }) }
  );
}

export async function unlockBatch(
  id: number,
  locked_by?: string
): Promise<{ message: string; batch_no: string } | null> {
  return apiFetch<{ message: string; batch_no: string }>(
    `/batches/${id}/unlock`,
    {
      method: "POST",
      body: locked_by ? JSON.stringify({ locked_by }) : undefined,
    }
  );
}

export async function getBatchSize(id: number): Promise<BatchStorage | null> {
  return apiFetch<BatchStorage>(`/batches/${id}/size`);
}

// ─── Entries (Inspections) ───────────────────────────────────────────────────

export async function listEntries(): Promise<Inspection[] | null> {
  return apiFetch<Inspection[]>("/entries");
}

export async function getEntry(id: number): Promise<Inspection | null> {
  return apiFetch<Inspection>(`/entries/${id}`);
}

export async function updateEntry(
  id: number,
  data: Partial<{
    tractor_no: string;
    engine_no: string;
    chassis_no: string;
    inspector: string;
    defects: DefectItem[];
    status: string;
    date: string;
    shift: string;
    line_no: string;
    verified_by: string;
    final_verified_by: string;
  }>
): Promise<Inspection | null> {
  return apiFetch<Inspection>(`/entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEntry(
  id: number
): Promise<{ message: string } | null> {
  return apiFetch<{ message: string }>(`/entries/${id}`, {
    method: "DELETE",
  });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function createExport(
  batchId: number,
  format: "xlsx" | "pdf"
): Promise<ExportCreateResponse | null> {
  return apiFetch<ExportCreateResponse>(`/batches/${batchId}/exports`, {
    method: "POST",
    body: JSON.stringify({ format }),
  });
}

export async function listExports(
  batchId: number
): Promise<ExportListResponse | null> {
  return apiFetch<ExportListResponse>(`/batches/${batchId}/exports`);
}

export function getExportDownloadUrl(exportId: number): string {
  return `${API_BASE}/exports/${exportId}/download`;
}

export function getLegacyExportUrl(): string {
  return `${API_BASE}/export`;
}

// ─── Speech to Text ──────────────────────────────────────────────────────────

export async function speechToText(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const result = await apiFetch<SpeechToTextResponse>("/speech-to-text", {
    method: "POST",
    body: fd,
  });
  return result?.text ?? null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData | null> {
  return apiFetch<DashboardData>("/analytics/dashboard");
}

export async function getTrends(
  days?: number
): Promise<AnalyticsTrends | null> {
  const qs = days ? `?days=${days}` : "";
  return apiFetch<AnalyticsTrends>(`/analytics/trends${qs}`);
}

export async function getFactories(): Promise<FactoryStats | null> {
  return apiFetch<FactoryStats>("/analytics/factories");
}

export async function getPerformance(): Promise<PerformanceData | null> {
  return apiFetch<PerformanceData>("/analytics/performance");
}

export async function getStatus(): Promise<StatusDistribution | null> {
  return apiFetch<StatusDistribution>("/analytics/status");
}
