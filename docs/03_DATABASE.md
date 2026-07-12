# Database Schema

## Tables

### batches
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| batch_no | VARCHAR(32) | MH-{YEAR}-{SEQUENCE} |
| status | VARCHAR(32) | uploading → queued → processing → completed |
| operator | VARCHAR(255) | |
| scanner_name | VARCHAR(255) | |
| total_pages | INTEGER | |
| processed_pages | INTEGER | default 0 |
| verified_pages | INTEGER | default 0 |
| failed_pages | INTEGER | default 0 |
| duplicate_pages | INTEGER | default 0 |
| review_pages | INTEGER | default 0 |
| average_confidence | FLOAT | nullable |
| average_processing_time_ms | FLOAT | nullable |
| factory_name | VARCHAR(255) | |
| plant_name | VARCHAR(255) | |
| line_name | VARCHAR(255) | |
| pdf_sha256 | VARCHAR(64) | For duplicate detection |
| file_size_bytes | BIGINT | |
| original_pdf_path | TEXT | |
| locked_by | VARCHAR(255) | nullable |
| locked_at | TIMESTAMP | nullable |
| deleted_at | TIMESTAMP | nullable (soft delete) |
| deleted_by | VARCHAR(255) | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| ocr_version | VARCHAR(64) | |
| ai_version | VARCHAR(64) | |
| image_pipeline_version | VARCHAR(64) | |
| pdf_version | VARCHAR(64) | |
| pdf_producer | VARCHAR(255) | |
| pdf_creator | VARCHAR(255) | |
| pdf_creation_date | VARCHAR(64) | |
| progress | FLOAT | default 0 |

### inspections
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| batch_id | INTEGER FK | References batches.id |
| page_number | INTEGER | |
| batch_page_index | INTEGER | |
| status | VARCHAR(32) | uploaded → processing → ocr_completed → verified |
| needs_review | BOOLEAN | default true |
| tractor_no | VARCHAR(128) | |
| tractor_model | VARCHAR(128) | |
| engine_no | VARCHAR(128) | |
| chassis_no | VARCHAR(128) | |
| inspector | VARCHAR(255) | |
| date | VARCHAR(32) | |
| shift | VARCHAR(32) | |
| line_no | VARCHAR(64) | |
| defects | JSONB | Array of {text, verified} |
| raw_text | TEXT | Full OCR output |
| confidence_scores | JSONB | Per-field scores |
| verified_by | VARCHAR(255) | |
| final_verified_by | VARCHAR(255) | |
| ocr_version | VARCHAR(64) | |
| ai_version | VARCHAR(64) | |
| image_pipeline_version | VARCHAR(64) | |
| error_detail | TEXT | nullable |
| retry_count | INTEGER | default 0 |
| last_retry_at | TIMESTAMP | nullable |
| image_path_original | TEXT | |
| image_path_enhanced | TEXT | |
| ocr_json_path | TEXT | |
| verified_json_path | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### exports
| Column | Type |
|--------|------|
| id | INTEGER PK |
| batch_id | INTEGER FK |
| file_type | VARCHAR(16) |
| file_path | TEXT |
| created_by | VARCHAR(255) |
| created_at | TIMESTAMP |

### system_events
| Column | Type |
|--------|------|
| id | INTEGER PK |
| batch_id | INTEGER FK |
| inspection_id | INTEGER FK |
| event | VARCHAR(32) |
| details | JSONB |
| processing_time_ms | FLOAT |
| created_at | TIMESTAMP |

### duplicate_logs
| Column | Type |
|--------|------|
| id | INTEGER PK |
| inspection_id | INTEGER FK |
| matched_inspection_id | INTEGER FK |
| similarity_score | FLOAT |
| match_type | VARCHAR(32) |
| action_taken | VARCHAR(32) |
| created_at | TIMESTAMP |

### defect_library
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | VARCHAR(255) | Defect name |
| category | VARCHAR(128) | Defect category |
| description | TEXT | Optional description |
| created_at | TIMESTAMP | |

### correction_log
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| inspection_id | INTEGER FK | References inspections.id |
| field_name | VARCHAR(64) | Which field was corrected |
| old_value | TEXT | Value before correction |
| new_value | TEXT | Value after correction |
| corrected_by | VARCHAR(255) | |
| created_at | TIMESTAMP | |

### learning_entries
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| inspection_id | INTEGER FK | References inspections.id |
| field_name | VARCHAR(64) | Field used for learning |
| raw_value | TEXT | Raw OCR output |
| corrected_value | TEXT | Human-corrected value |
| confidence | FLOAT | OCR confidence at time of correction |
| created_at | TIMESTAMP | |

## Indexes
- batches: (status), (created_at)
- inspections: (batch_id), (status)
- system_events: (event), (created_at)
- duplicate_logs: (inspection_id), (duplicate_of_id)
