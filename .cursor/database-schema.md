# Database Schema Documentation

Generated from Supabase MCP - All tables in `public` schema

## Overview

- **Total Tables**: 7
- **Schema**: `public`
- **RLS Enabled**: All tables have Row Level Security enabled

---

## Tables

### 1. `schema_snapshots`

**Description**: Point-in-time snapshots of project schemas

**RLS**: ✅ Enabled  
**Rows**: 1  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | `gen_random_uuid()` | updatable |
| `project_id` | uuid | uuid | ❌ | - | updatable |
| `tables_data` | jsonb | jsonb | ❌ | `'[]'::jsonb` | updatable |
| `relationships_data` | jsonb | jsonb | ❌ | `'[]'::jsonb` | updatable |
| `indexes_data` | jsonb | jsonb | ❌ | `'[]'::jsonb` | updatable |
| `snapshot_version` | integer | int4 | ✅ | `1` | nullable, updatable |
| `created_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |
| `columns_data` | jsonb | jsonb | ✅ | - | nullable, updatable |

#### Foreign Key Constraints

- `schema_snapshots_project_id_fkey`: `project_id` → `connected_projects.id`
- Referenced by: `optimization_suggestions.snapshot_id`

---

### 2. `code_patterns`

**Description**: Code usage patterns detected from repository analysis

**RLS**: ✅ Enabled  
**Rows**: 0  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | `gen_random_uuid()` | updatable |
| `project_id` | uuid | uuid | ❌ | - | updatable |
| `table_name` | text | text | ❌ | - | updatable |
| `column_name` | text | text | ✅ | - | updatable |
| `pattern_type` | text | text | ❌ | - | updatable |
| `file_path` | text | text | ❌ | - | updatable |
| `line_number` | integer | int4 | ✅ | - | updatable |
| `code_snippet` | text | text | ❌ | - | updatable |
| `frequency` | integer | int4 | ✅ | `1` | nullable, updatable |
| `created_at` | timestamp with time zone | timestamptz | ✅ | `now()` | nullable, updatable |
| `updated_at` | timestamp with time zone | timestamptz | ✅ | `now()` | nullable, updatable |

**Check Constraints**:
- `pattern_type`: Must be one of: `'query'`, `'join'`, `'filter'`, `'sort'`

#### Foreign Key Constraints

- `code_patterns_project_id_fkey`: `project_id` → `connected_projects.id`

---

### 3. `optimization_suggestions`

**Description**: AI-generated schema optimization recommendations

**RLS**: ✅ Enabled  
**Rows**: 9  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | `gen_random_uuid()` | updatable |
| `project_id` | uuid | uuid | ❌ | - | updatable |
| `snapshot_id` | uuid | uuid | ✅ | - | updatable |
| `table_name` | text | text | ❌ | - | updatable |
| `column_name` | text | text | ✅ | - | updatable |
| `suggestion_type` | text | text | ❌ | - | updatable |
| `title` | text | text | ❌ | - | updatable |
| `description` | text | text | ❌ | - | updatable |
| `severity` | text | text | ❌ | `'medium'` | updatable |
| `impact_score` | integer | int4 | ✅ | - | updatable |
| `sql_snippet` | text | text | ✅ | - | updatable |
| `status` | text | text | ✅ | `'pending'` | nullable, updatable |
| `dismissed_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `applied_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `created_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |
| `updated_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |

**Check Constraints**:
- `suggestion_type`: Must be one of: `'missing_index'`, `'unused_column'`, `'slow_query'`, `'rls_policy'`, `'composite_index'`, `'data_type_optimization'`, `'foreign_key'`, `'other'`
- `severity`: Must be one of: `'low'`, `'medium'`, `'high'`, `'critical'`
- `status`: Must be one of: `'pending'`, `'applied'`, `'dismissed'`, `'archived'`
- `impact_score`: Must be between 0 and 100 (inclusive)

#### Foreign Key Constraints

- `optimization_suggestions_project_id_fkey`: `project_id` → `connected_projects.id`
- `optimization_suggestions_snapshot_id_fkey`: `snapshot_id` → `schema_snapshots.id`

---

### 4. `analysis_jobs`

**Description**: Background job tracking for schema analysis

**RLS**: ✅ Enabled  
**Rows**: 1  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | `gen_random_uuid()` | updatable |
| `project_id` | uuid | uuid | ❌ | - | updatable |
| `job_type` | text | text | ❌ | - | updatable |
| `status` | text | text | ❌ | `'pending'` | updatable |
| `result_data` | jsonb | jsonb | ✅ | - | nullable, updatable |
| `error_message` | text | text | ✅ | - | nullable, updatable |
| `suggestions_count` | integer | int4 | ✅ | `0` | nullable, updatable |
| `started_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `completed_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `created_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |

**Check Constraints**:
- `job_type`: Must be one of: `'schema_sync'`, `'ai_advice'`, `'full_analysis'`
- `status`: Must be one of: `'pending'`, `'running'`, `'completed'`, `'failed'`

#### Foreign Key Constraints

- `analysis_jobs_project_id_fkey`: `project_id` → `connected_projects.id`

---

### 5. `connected_projects`

**Description**: User-connected Supabase projects for schema analysis

**RLS**: ✅ Enabled  
**Rows**: 1  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | `gen_random_uuid()` | updatable |
| `user_id` | uuid | uuid | ❌ | - | updatable |
| `project_name` | text | text | ❌ | - | updatable |
| `supabase_url` | text | text | ❌ | - | updatable |
| `supabase_anon_key` | text | text | ✅ | - | updatable |
| `is_active` | boolean | bool | ❌ | `true` | updatable |
| `last_synced_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `connection_error` | text | text | ✅ | - | updatable |
| `created_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |
| `updated_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |
| `github_repo_url` | text | text | ✅ | - | updatable |
| `github_default_branch` | text | text | ✅ | `'main'` | updatable |
| `github_integration_id` | text | text | ✅ | - | updatable |
| `github_last_synced_at` | timestamp with time zone | timestamptz | ✅ | - | updatable |
| `github_enabled` | boolean | bool | ✅ | `false` | updatable |

#### Foreign Key Constraints

- `connected_projects_user_id_fkey`: `user_id` → `user_profiles.id`
- Referenced by:
  - `schema_snapshots.project_id`
  - `optimization_suggestions.project_id`
  - `analysis_jobs.project_id`
  - `code_patterns.project_id`

---

### 6. `user_profiles`

**Description**: Extended user profile data linked to auth.users

**RLS**: ✅ Enabled  
**Rows**: 3  
**Primary Keys**: `id`

#### Columns

| Column Name | Data Type | Format | Nullable | Default Value | Options |
|------------|-----------|--------|----------|---------------|---------|
| `id` | uuid | uuid | ❌ | - | updatable |
| `email` | text | text | ✅ | - | updatable |
| `full_name` | text | text | ✅ | - | updatable |
| `avatar_url` | text | text | ✅ | - | updatable |
| `created_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |
| `updated_at` | timestamp with time zone | timestamptz | ❌ | `now()` | updatable |

#### Foreign Key Constraints

- `user_profiles_id_fkey`: `id` → `auth.users.id`
- Referenced by: `connected_projects.user_id`

---

## Relationship Diagram

```
auth.users
    ↓ (1:1)
user_profiles
    ↓ (1:many)
connected_projects
    ├──→ (1:many) schema_snapshots
    ├──→ (1:many) optimization_suggestions
    ├──→ (1:many) analysis_jobs
    └──→ (1:many) code_patterns

schema_snapshots
    ↓ (1:many)
optimization_suggestions
```

---

## Notes

- All tables have Row Level Security (RLS) enabled
- All primary keys use UUID type with `gen_random_uuid()` default (except `user_profiles.id` which references `auth.users.id`)
- Timestamp columns use `timestamp with time zone` (timestamptz) for timezone-aware storage
- Several tables include JSONB columns for flexible data storage:
  - `schema_snapshots`: `tables_data`, `relationships_data`, `indexes_data`, `columns_data`
  - `analysis_jobs`: `result_data`
- Check constraints enforce data integrity for enum-like fields (status, severity, job_type, etc.)

---

*Last updated: Generated via Supabase MCP*

