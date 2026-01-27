# Phase 8 Research: Dynamic MCP Tools

## Requirements

- **TOOL-01**: System auto-generates `query_X` tool for each entity type in active template
- **TOOL-02**: System auto-generates `list_X` tool for each entity type in active template
- **TOOL-03**: Generated tools have template-specific descriptions
- **TOOL-04**: Generated tools integrate with existing search_vault filters
- **TOOL-05**: Generated tools return type-aware formatted responses

## Current Architecture

### Tool Definition Pattern (server.ts)

Tools are defined in `ListToolsRequestSchema` handler:
```typescript
{
  name: 'query_character',
  description: 'Retrieve detailed information about a character...',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Character ID or name' },
      includeContent: { type: 'boolean', ... },
      contentLimit: { type: 'number', ... }
    },
    required: ['id']
  }
}
```

### Tool Dispatch Pattern (server.ts)

Switch statement in `CallToolRequestSchema` handler:
```typescript
switch (name) {
  case 'query_character': {
    const parsed = QueryCharacterArgsSchema.parse(args);
    return await this.handleQueryCharacter(parsed);
  }
  // ...
}
```

### Key Observations

1. **All query tools share the same interface**: `id`, `includeContent`, `contentLimit`
2. **Handler logic is nearly identical** for query_character and query_location
3. **Template registry already provides entity types** via `getEntityTypes()`
4. **Schema factory already generates Zod schemas** for validation

## Implementation Strategy

### 1. Tool Generator Module

Create `src/mcp/tool-generator.ts`:
- `generateQueryTool(entityType: EntityTypeConfig)` - generates tool definition
- `generateListTool(entityType: EntityTypeConfig)` - generates list tool definition
- `createQueryHandler(entityType: EntityTypeConfig)` - creates handler function
- `createListHandler(entityType: EntityTypeConfig)` - creates list handler function

### 2. Dynamic Tool Registration

In `ListToolsRequestSchema`:
```typescript
const activeTemplate = templateRegistry.getActive();
const dynamicTools = activeTemplate.entityTypes.flatMap(entityType => [
  generateQueryTool(entityType),
  generateListTool(entityType),
]);
return { tools: [...staticTools, ...dynamicTools] };
```

### 3. Dynamic Dispatch

Replace switch with pattern matching:
```typescript
// Check for query_<entityType>
if (name.startsWith('query_')) {
  const typeName = name.substring(6); // Remove 'query_'
  const entityType = templateRegistry.getEntityType(typeName);
  if (entityType) {
    return await this.handleGenericQuery(typeName, args);
  }
}
```

### 4. Deprecation Strategy

Keep existing hardcoded tools (query_character, query_location) as deprecated wrappers
that delegate to the generic system. This maintains backwards compatibility.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/mcp/tool-generator.ts` | Create | Tool generation functions |
| `src/mcp/index.ts` | Create | Module exports |
| `src/server.ts` | Modify | Dynamic tool registration |
| `tests/mcp/tool-generator.test.ts` | Create | Unit tests |

## Success Metrics

1. Template with 7 entity types generates 14 tools (query + list for each)
2. Generated tools appear in `tools/list` MCP response
3. Generated tools execute correctly via `tools/call`
4. Switching templates changes available tools
5. All existing tests continue to pass
