# AI Prompt Engineering Documentation

## Overview
This document explains the advanced prompt engineering techniques used in SlopCollector's AI-powered database optimization engine.

## Architecture

### 1. **Zod Schema Validation** ✅
We use Zod for 100% type-safe, validated JSON responses from OpenAI.

```typescript
// Strict schema with enums, length constraints, and descriptions
export const AdviceItemSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  category: z.enum([
    'missing_index', 'composite_index', 'unused_index',
    'slow_query', 'unused_column', 'rls_policy', 
    'foreign_key', 'data_type', 'normalization'
  ]),
  table: z.string(),
  column: z.string().optional(),
  headline: z.string().min(10).max(100),
  description: z.string().min(20).max(500),
  remediation: z.string().optional(),
  estimatedImpact: z.enum(['high', 'medium', 'low']).optional(),
  affectedQueries: z.array(z.string()).optional(),
});
```

**Benefits:**
- Runtime validation of AI responses
- TypeScript type inference
- Automatic error handling with fallbacks
- Prevents malformed data from reaching the UI

### 2. **Expert System Prompt** 🎯

The system prompt establishes:
- **Persona**: "Elite PostgreSQL performance consultant"
- **Expertise areas**: Indexes, RLS, normalization, query optimization
- **Exact JSON structure** with field-by-field explanations
- **Severity & category guidelines** with clear definitions
- **Prioritization framework**: Critical → Performance → Security → Best Practices

### 3. **Detailed Examples** 📚

The prompt includes 3 concrete examples showing:

**Example 1 - Missing FK Index (Error):**
```json
{
  "severity": "error",
  "category": "missing_index",
  "table": "posts",
  "column": "user_id",
  "headline": "Add index on posts.user_id foreign key",
  "description": "Foreign key posts.user_id lacks an index. Queries like 'SELECT * FROM posts WHERE user_id = ?' will perform full table scans. With 128K rows, this causes ~500ms query times that will worsen as data grows.",
  "remediation": "CREATE INDEX idx_posts_user_id ON posts(user_id);",
  "estimatedImpact": "high",
  "affectedQueries": ["SELECT * FROM posts WHERE user_id = ?"]
}
```

**Example 2 - Composite Index (Warning):**
Shows pattern for optimizing multiple-column queries

**Example 3 - Missing RLS (Error):**
Demonstrates security recommendations with multi-line SQL

### 4. **Focus Areas Hierarchy**

1. **Missing Indexes** (Priority 1)
   - FK columns without indexes
   - Timestamp columns in large tables
   - Status/enum columns
   - WHERE clause columns

2. **Performance Bottlenecks** (Priority 2)
   - N+1 query patterns
   - Full table scans
   - Inefficient JOINs

3. **Security** (Priority 3)
   - Missing RLS policies
   - FK constraints

4. **Best Practices** (Priority 4)
   - Unused columns
   - Composite index opportunities

### 5. **Quality Controls**

The prompt explicitly instructs the AI to:
- ✅ Use specific table/column names (no generics)
- ✅ Provide actual executable SQL
- ✅ Quantify performance impact
- ✅ Focus on top 5-10 critical issues only
- ✅ Skip micro-optimizations on small tables (<1000 rows)

### 6. **Validation & Error Handling**

```typescript
// Validate against schema
const validationResult = GeneratedAdviceSchema.safeParse(rawParsed);

if (!validationResult.success) {
  console.error('Zod validation failed:', validationResult.error);
  
  // Graceful fallback
  return {
    summary: fallback?.summary || 'Schema analysis completed',
    advisories: Array.isArray(fallback?.advisories) 
      ? fallback.advisories.filter(item => item?.table && item?.headline)
      : [],
  };
}

return validationResult.data; // Fully typed!
```

**Benefits:**
- Never crashes on malformed AI responses
- Logs validation errors for debugging
- Salvages partial valid data
- Returns empty array as last resort

## Configuration

### Model Selection
```typescript
const DEFAULT_MODEL = 'gpt-4o'; // Fast, cost-effective, reliable
```

**Why gpt-4o:**
- Best price/performance for structured output
- 128k context window (handles large schemas)
- Strong JSON formatting capabilities
- Fast response times (~2-3 seconds)

### Temperature
```typescript
const temperature = 0.3; // Balanced creativity/consistency
```

**Why 0.3:**
- Low enough for reliable JSON structure
- High enough for creative optimization suggestions
- Prevents repetitive or boring advice

### Token Limits
```typescript
max_tokens: 2000 // Detailed recommendations
```

**Why 2000:**
- Enough for 5-10 detailed suggestions
- Each suggestion ~150-250 tokens
- Leaves room for summary and stats

## Output Format

### TypeScript Types (Auto-Generated from Zod)
```typescript
export type GeneratedAdviceItem = {
  severity: 'error' | 'warning' | 'info';
  category: 'missing_index' | 'composite_index' | /* ... */;
  table: string;
  column?: string;
  headline: string; // 10-100 chars
  description: string; // 20-500 chars
  remediation?: string; // SQL
  estimatedImpact?: 'high' | 'medium' | 'low';
  affectedQueries?: string[];
}

export type GeneratedAdvice = {
  summary: string; // 20-300 chars
  advisories: GeneratedAdviceItem[]; // 0-50 items
  stats?: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
}
```

### Database Storage
The validated output is stored in `optimization_suggestions` table:

```sql
INSERT INTO optimization_suggestions (
  project_id,
  table_name,
  column_name,
  severity, -- 'error' | 'warning' | 'info'
  suggestion_type, -- category
  title, -- headline
  description,
  sql_snippet, -- remediation
  status
) VALUES ...
```

## Best Practices

### ✅ DO
- Use Zod for all AI response validation
- Provide concrete examples in prompts
- Define exact JSON structure
- Set clear prioritization rules
- Include character limits for fields
- Handle validation failures gracefully

### ❌ DON'T
- Trust AI responses without validation
- Use vague prompts ("analyze this schema")
- Allow unbounded text fields
- Skip error handling
- Use `as` type assertions
- Ignore Zod validation errors

## Performance Metrics

**Expected Performance:**
- Response time: 2-5 seconds
- Cost per request: ~$0.001-0.003 (gpt-4o)
- Success rate: >95% with Zod validation
- Valid suggestions: >90% actionable

**Monitoring:**
```typescript
console.log('Generated ${suggestions.length} AI-powered suggestions');
console.error('Zod validation failed:', validationResult.error);
```

## Future Improvements

1. **Few-Shot Learning**
   - Add user feedback loop
   - Store high-quality examples
   - Fine-tune on Supabase-specific patterns

2. **Schema Context**
   - Include table sizes
   - Add query patterns from logs
   - Reference RLS policies

3. **Multi-Step Reasoning**
   - Chain-of-thought prompting
   - Break down complex optimizations
   - Explain trade-offs

4. **Custom Rules Engine**
   - Combine AI with deterministic rules
   - Catch obvious issues instantly
   - Use AI for nuanced recommendations

## References

- [OpenAI Structured Output](https://platform.openai.com/docs/guides/structured-outputs)
- [Zod Documentation](https://zod.dev/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

