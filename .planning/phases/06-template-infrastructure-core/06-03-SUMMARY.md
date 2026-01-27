---
phase: 06-template-infrastructure-core
plan: 03
subsystem: templates
tags: [zod, schema-generation, validation, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: Template type definitions (EntityTypeConfig, FieldConfig)
provides:
  - Dynamic Zod schema generation from EntityTypeConfig
  - SchemaFactory class with performance caching
  - Support for all field types (string, number, boolean, enum, array, date, record)
  - Type-safe schema inference with InferEntityType helper
affects: [06-04, 07-migration, 08-dynamic-mcp]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dynamic schema generation from config
    - Factory pattern with caching for performance
    - Extending base schemas with custom fields

key-files:
  created:
    - src/templates/schema-factory.ts
    - tests/templates/schema-factory.test.ts
  modified:
    - src/templates/index.ts

key-decisions:
  - "Use buildFieldSchema() to map FieldConfig to Zod schemas per field type"
  - "Fields are optional by default unless explicitly marked required"
  - "Enum fields require enumValues array, throw error if missing"
  - "Array fields default to string items if arrayItemType not specified"
  - "Generated schemas extend BaseFrontmatterSchema and enforce type literals"

patterns-established:
  - "Schema factory caches schemas by entity type name for performance"
  - "buildPrimitiveSchema() handles primitive types for reuse in arrays"
  - "createEntitySchema() generates complete schemas with custom fields"

# Metrics
duration: 8min
completed: 2026-01-26
---

# Phase 6 Plan 3: Schema Factory Summary

**Dynamic Zod schema generation from template configs with full field type support and performance caching**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-26T00:52:14Z
- **Completed:** 2026-01-26T01:00:42Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Dynamic Zod schema generation transforming EntityTypeConfig into runtime validators
- All field types supported: string, number, boolean, enum, array, date, record
- SchemaFactory class with caching reduces redundant schema generation
- 18 comprehensive tests covering all field types, validation rules, and caching

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: Create schema factory and add exports** - `26d2c63` (feat)
2. **Task 3: Write schema factory tests** - `57ef385` (test)

## Files Created/Modified
- `src/templates/schema-factory.ts` - Dynamic Zod schema generation from EntityTypeConfig
- `tests/templates/schema-factory.test.ts` - Comprehensive tests for all field types and caching
- `src/templates/index.ts` - Export schema factory functions and types

## Decisions Made

**1. Fields optional by default**
- Unless explicitly marked `required: true`, all custom fields are optional
- Matches common Zod pattern and provides flexibility for partial data

**2. Enum validation requires enumValues**
- Throw error if enum field doesn't specify enumValues array
- Prevents runtime errors from misconfigured enum fields

**3. Array item type defaults to string**
- If arrayItemType not specified, arrays default to string items
- Sensible default for most use cases (tags, lists, etc.)

**4. Type literal enforcement**
- Generated schemas enforce `type: z.literal(config.name)`
- Ensures entities can't masquerade as different types

**5. Schema caching by entity type name**
- SchemaFactory uses Map keyed by entity type name
- Avoids regenerating schemas for repeated entity type usage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Test file location**
- Tests initially placed in `src/templates/__tests__/` but vitest.config.ts expects `tests/**/*.test.ts`
- Moved tests to `tests/templates/schema-factory.test.ts` to match project conventions

**Import path conflicts**
- Plan 06-02 ran in parallel and already created schema-factory.test.ts with wrong import paths
- Fixed imports to use correct relative paths from tests directory
- Fixed field name collision in default values test (status -> activity)

## Next Phase Readiness

Schema factory ready for use in:
- **06-04:** Template config loading and validation
- **Phase 7:** Migration to use generated schemas for entity validation
- **Phase 8:** Dynamic MCP tool generation with schema-based validation

Factory provides the core runtime validation capability needed to transform user-defined EntityTypeConfig into working Zod schemas that extend BaseFrontmatterSchema.

---
*Phase: 06-template-infrastructure-core*
*Completed: 2026-01-26*
