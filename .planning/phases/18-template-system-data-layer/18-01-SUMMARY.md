---
phase: 18-template-system-data-layer
plan: 01
subsystem: template-system
tags: [typescript, type-safety, zod, refactor]
requires:
  - 17-01 # Foundation types (BaseFrontmatterSchema)
provides:
  - type-safe-schema-factory # Zero-any Zod schema generation
  - type-safe-template-loader # Type-safe config loading with unknown types
affects:
  - 18-02+ # Future template system plans build on this type safety
tech-stack:
  added: []
  patterns:
    - z.ZodRawShape generics for type-safe Zod operations
    - unknown types with type guards for JSON.parse results
decisions:
  - id: TMPL-TYPE-01
    title: Use z.ZodRawShape for all Zod schema generics
    rationale: Provides type safety without using any types in schema operations
  - id: TMPL-TYPE-02
    title: Use unknown with type guards for JSON parsing
    rationale: Safer than any, forces explicit type validation before property access
key-files:
  created: []
  modified:
    - src/templates/schema-factory.ts
    - src/templates/loader.ts
metrics:
  duration: 4min 16sec
  completed: 2026-01-27
---

# Phase 18 Plan 01: Type Safety - Template Schema Factory Summary

**One-liner:** Eliminated all `any` types from template schema factory and loader using z.ZodRawShape generics and unknown with type guards.

## Objective

Replace all `any` types in template system files (schema-factory.ts, loader.ts) with strict Zod generics and proper unknown typing to satisfy requirements TMPL-01 and TMPL-02.

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Replace all `any` types in schema-factory.ts | 131813b | src/templates/schema-factory.ts |
| 2 | Replace `any` type in loader.ts | e644946 | src/templates/loader.ts |

### Task 1: Replace all `any` types in schema-factory.ts

**Changes made:**
- Replaced `z.any()` with `z.unknown()` for dynamic field values (3 occurrences on lines 28, 79, 84)
- Replaced `z.ZodObject<any>` with `z.ZodObject<z.ZodRawShape>` for all schema type signatures (7 occurrences):
  - `createEntitySchema` return type (line 111)
  - `schemaCache` Map type (line 135)
  - `getSchema` return type (line 146)
  - `generateSchemas` return type and local variable (lines 166-167)
  - `InferEntityType` generic constraint (line 209)
- Removed unnecessary `as any` cast from `z.literal(config.name)` (line 121)

**Total:** 10 `any` occurrences eliminated → 0 remaining

**Commit:** 131813b

### Task 2: Replace `any` type in loader.ts

**Changes made:**
- Changed `let configContent: any` to `let configContent: unknown` (line 80)
- Added type guard after JSON.parse to validate result is an object:
  ```typescript
  if (typeof configContent !== 'object' || configContent === null) {
    throw new Error(`Config file at ${configFilePath} must contain a JSON object`);
  }
  ```
- Cast to `Record<string, unknown>` before accessing properties
- Used explicit type assertion for `templateConfig` shape: `{ activeTemplate?: string; templates?: TemplateDefinition[] }`

**Result:** Type-safe config loading with proper validation before property access

**Commit:** e644946

## Verification

All verification criteria passed:

1. ✅ **TypeScript compilation:** `npx tsc --noEmit` passes with no new errors
2. ✅ **No any types:** `grep -rn ": any\|<any>\|as any\|z\.any"` returns zero matches in target files
3. ✅ **Existing tests:** All 599 tests pass (32 test files)

## Decisions Made

### TMPL-TYPE-01: Use z.ZodRawShape for Zod schema generics

**Context:** Need to replace `z.ZodObject<any>` with a type-safe alternative.

**Decision:** Use `z.ZodObject<z.ZodRawShape>` for all schema return types and storage.

**Rationale:**
- `z.ZodRawShape` is Zod's proper generic constraint for schema shapes
- Provides full type safety without sacrificing flexibility
- Maintains compatibility with Zod's type inference system
- No runtime overhead - purely compile-time typing

**Impact:** All schema factory methods now have strict return types that work with TypeScript's type system.

### TMPL-TYPE-02: Use unknown with type guards for JSON parsing

**Context:** `JSON.parse()` returns `any`, but we want type safety.

**Decision:** Declare parsed JSON as `unknown`, add type guard to validate it's an object, then use explicit type assertions for expected shape.

**Rationale:**
- `unknown` is safer than `any` - forces explicit type checking
- Type guard prevents runtime errors from non-object JSON
- Explicit type assertion documents expected shape
- Validation happens before property access

**Impact:** Config loading is now type-safe with runtime validation. Invalid JSON structures fail fast with clear error messages.

## Technical Details

### Zod Generic Type Pattern

**Before:**
```typescript
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<any> {
  // ...
}
```

**After:**
```typescript
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<z.ZodRawShape> {
  // ...
}
```

**Benefits:**
- Type-safe schema operations
- Proper inference for `z.infer<T>`
- No loss of functionality
- Better IDE support

### Unknown Type Guard Pattern

**Before:**
```typescript
let configContent: any;
configContent = JSON.parse(fileContent);
const templateConfig = configContent.template || { ... };
```

**After:**
```typescript
let configContent: unknown;
configContent = JSON.parse(fileContent);

if (typeof configContent !== 'object' || configContent === null) {
  throw new Error(`Config file at ${configFilePath} must contain a JSON object`);
}

const configObj = configContent as Record<string, unknown>;
const templateConfig = (configObj.template || { ... }) as {
  activeTemplate?: string;
  templates?: TemplateDefinition[]
};
```

**Benefits:**
- Prevents property access on non-objects
- Clear error message for invalid JSON
- Type assertions document expected shape
- Safer than any while still flexible

## Deviations from Plan

None - plan executed exactly as written.

## Impact Analysis

### Files Modified
- `src/templates/schema-factory.ts` - 10 any types eliminated
- `src/templates/loader.ts` - 1 any type eliminated + type guard added

### Dependencies
- **Upstream:** Phase 17 Foundation Types (BaseFrontmatterSchema)
- **Downstream:** All future template system plans benefit from this type safety

### Breaking Changes
None - all changes are internal type improvements.

## Next Phase Readiness

### Blockers
None.

### Concerns
None.

### Recommendations
1. Continue type safety improvements in remaining template system files
2. Apply same patterns (z.ZodRawShape, unknown with type guards) throughout codebase
3. Consider adding ESLint rule to prevent `any` types in new code

## Metrics

- **Duration:** 4 minutes 16 seconds
- **Files modified:** 2
- **Lines changed:** ~25 (10 in schema-factory.ts, 15 in loader.ts)
- **Type errors eliminated:** 0 new errors introduced
- **Tests passed:** 599/599 (100%)
- **Any types eliminated:** 11 total (10 + 1)

## Success Criteria Met

- ✅ TMPL-01: schema-factory.ts has zero `any` types
- ✅ TMPL-02: loader.ts has zero `any` types
- ✅ No new TypeScript compilation errors
- ✅ All existing tests pass (599/599)

---

**Status:** ✅ Complete
**Completed:** 2026-01-27
**Commits:** 131813b, e644946
