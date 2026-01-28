# Domain Pitfalls

**Domain:** Timeline Queries, Graph Visualization, Obsidian Community Plugin Submission
**Researched:** 2026-01-27
**Confidence:** MEDIUM-HIGH (WebSearch findings verified with multiple sources, official docs partially inaccessible)

## Executive Summary

Adding timeline queries, graph visualization, and submitting an Obsidian community plugin to an existing MCP server + Obsidian plugin system introduces three distinct risk categories:

1. **Timeline query pitfalls** - Date parsing timezone handling, SQLite date indexing performance, frontmatter date format inconsistencies
2. **Graph visualization pitfalls** - Performance degradation with large vaults, Canvas vs WebGL rendering choices, bundle size explosion from graph libraries
3. **Community plugin submission pitfalls** - Review rejection for manifest mismatches, bundled dependency size concerns, child_process security review, license compliance violations

Critical finding: The integration of new features into an existing system amplifies risks. Timeline queries depend on consistent date formats across templates (which may vary). Graph visualization must handle the existing knowledge graph without breaking current MCP tools. Plugin submission exposes all accumulated tech debt to review scrutiny.

Most failures stem from:
- **Date timezone assumptions** that break cross-user/cross-timezone scenarios
- **Graph performance assumptions** based on small test vaults (100 nodes) that collapse at scale (10,000 nodes)
- **Plugin review assumptions** about what's "obviously fine" that conflict with actual review requirements

---

## Critical Pitfalls

Mistakes that cause data corruption, review rejection, or fundamental system failure.

### Pitfall 1: Date Timezone Ambiguity Corrupts Timeline Queries

**What goes wrong:** User in Los Angeles creates character with `birthdate: 2024-06-15`. User in Tokyo queries "characters born in June 2024". Character doesn't appear in results. Cause: Date stored as midnight UTC, which is June 14 in Los Angeles and June 15 in Tokyo. Same frontmatter, different query results based on user timezone.

Or worse: User creates event with `date: 2024-06-15T14:00`. System assumes local time, stores as local midnight UTC. Query tool interprets as UTC. Event appears 14 hours earlier than user intended. Timeline visualizations show incorrect chronology.

**Why it happens:**
- YAML date-only values default to midnight UTC when parsed
- Date strings without timezone information are ambiguous
- JavaScript Date object interprets strings differently based on format
- SQLite stores text strings, no timezone normalization
- Different parsers (gray-matter, native, Obsidian) handle dates inconsistently
- Testing with single timezone masks cross-timezone bugs

**Consequences:**
- Timeline queries return inconsistent results for different users
- Date range filters miss events at timezone boundaries
- "Show me this week" means different date ranges for different users
- Users lose trust in timeline accuracy
- Support burden: "Why isn't X showing up in timeline?"
- Data corruption: user "fixes" date, breaks it for other timezone users

**Warning signs:**
- Date fields in frontmatter don't specify timezone
- Query code uses `new Date(string)` without explicit timezone handling
- SQLite queries use string comparison on dates without normalization
- Testing only with dates in developer's local timezone
- No explicit timezone field in entity templates
- Date parsing differs between CLI, plugin, and MCP server

**Prevention:**
1. **Store dates in ISO8601 UTC format** - Always `YYYY-MM-DDTHH:MM:SSZ` in frontmatter
2. **Explicit timezone handling** - For date-only fields, document that they mean "date in user's local timezone"
3. **Normalize on query** - Convert all dates to UTC before SQLite comparison
4. **Validation enforcement** - Validate command rejects dates without proper format
5. **Template date schema** - Define date vs datetime distinction in template config
6. **Cross-timezone testing** - Test queries with dates across timezone boundaries (UTC-12 to UTC+12)
7. **Documentation clarity** - Explain to users what timezone their dates are interpreted in

**Implementation strategy:**
```typescript
// Template schema
{
  "fields": {
    "created_date": {
      "type": "date",  // Date-only, no timezone (user's local "June 15")
      "format": "YYYY-MM-DD"
    },
    "event_datetime": {
      "type": "datetime",  // Full timestamp with timezone
      "format": "YYYY-MM-DDTHH:MM:SSZ"
    }
  }
}

// Query handling
function queryDateRange(startDate: string, endDate: string) {
  // Convert to UTC for SQLite comparison
  const startUTC = new Date(startDate + 'T00:00:00Z').toISOString();
  const endUTC = new Date(endDate + 'T23:59:59Z').toISOString();
  return db.query(`WHERE datetime >= ? AND datetime <= ?`, [startUTC, endUTC]);
}
```

**Current system analysis:**
- Existing templates define date fields but don't specify format requirements
- Frontmatter validation accepts any string for date fields
- No timezone normalization in current codebase
- SQLite stores frontmatter fields as-parsed from YAML

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: HIGH - Complex, requires careful design
- Testing requirement: Cross-timezone testing with specific date boundary cases
- Validation requirement: Date format validation in `hivemind validate`

**Sources:**
- [Common mistakes in date/time formatting and parsing - Jon Skeet](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/)
- [Dataview Query Frontmatter Date - Obsidian Forum](https://forum.obsidian.md/t/dataview-query-frontmatter-date/53319)
- [YAML Timestamps - Coddy Reference](https://ref.coddy.tech/yaml/yaml-timestamps)
- [SQLite Date And Time Functions](https://sqlite.org/lang_datefunc.html)

---

### Pitfall 2: SQLite Date Query Performance Without Proper Indexing

**What goes wrong:** Timeline query "show all events in 2024" scans 50,000 entities. Each entity's frontmatter JSON is parsed, date field extracted, compared. Query takes 8 seconds. User's Obsidian UI freezes. User thinks plugin crashed. Actually: No index on date fields, full table scan with JSON extraction per row.

**Why it happens:**
- Date fields stored in JSON blob in entities table
- SQLite can't index JSON fields without explicit JSON column extraction
- Frontmatter structure varies by entity type, no consistent date column
- Developer tests with 100 entities (instant), production has 10,000+ (slow)
- No EXPLAIN QUERY PLAN analysis during development
- Using `LIKE` for date range queries instead of proper comparison

**Consequences:**
- Timeline queries unusable on large vaults (>5,000 notes)
- Obsidian plugin UI becomes unresponsive during queries
- Users blame plugin for "freezing Obsidian"
- MCP server queries timeout
- Plugin review may test with large sample vault, observe performance issues

**Warning signs:**
- Query execution time grows linearly with vault size
- No indexes on date columns
- Using JSON extraction in WHERE clause without index
- Query plan shows SCAN TABLE instead of SEARCH TABLE USING INDEX
- Testing only with small vaults (<500 entities)
- Dates stored in JSON instead of dedicated columns

**Prevention:**
1. **Dedicated date columns** - Extract date fields to indexed columns during vault scan
2. **Create indexes** - `CREATE INDEX idx_entity_date ON entities(date_field)`
3. **Store ISO8601 format** - Text-sortable format works with B-tree indexes
4. **Use BETWEEN not LIKE** - Proper date comparison operators
5. **Query plan analysis** - Run `EXPLAIN QUERY PLAN` on all timeline queries
6. **Performance testing** - Test with 10,000+ entity vault
7. **Consider materialized view** - Pre-compute timeline data for common queries

**Implementation strategy:**
```sql
-- Add date columns to entities table
ALTER TABLE entities ADD COLUMN date_created TEXT;
ALTER TABLE entities ADD COLUMN date_modified TEXT;
CREATE INDEX idx_entity_date_created ON entities(date_created);
CREATE INDEX idx_entity_date_modified ON entities(date_modified);

-- Efficient date range query
SELECT * FROM entities
WHERE date_created BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY date_created DESC;

-- NOT this (slow, no index):
SELECT * FROM entities
WHERE json_extract(frontmatter, '$.created') LIKE '2024%';
```

**Current system analysis:**
- Entities table stores full frontmatter as JSON
- No dedicated date columns
- No indexes on date fields
- vault-to-db scan parses frontmatter but doesn't extract dates

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: MEDIUM - Known SQLite patterns, but integration with existing schema needs care
- Testing requirement: Performance test with 10,000+ entity vault
- Migration requirement: Add date columns, backfill from existing frontmatter

**Sources:**
- [SQLite Date Query Performance - High Performance SQLite](https://highperformancesqlite.com/watch/dates)
- [SQLite User Forum: Date Storage Best Practices](https://www.sqlite.org/forum/info/5203f28a039a028754fda31591bbfb3c9ca9a949277cb45d789a2f78aecbd52f?t=h)
- [SQLite Best Practice: Storing Dates](https://sqlite-users.sqlite.narkive.com/af9RSJwH/sqlite-best-practice-storing-dates)

---

### Pitfall 3: Graph Visualization Bundle Size Explosion

**What goes wrong:** Developer adds `vis-network` (popular graph library) for graph visualization. Builds plugin. main.js is now 2.8MB. Plugin review rejects: "Excessive bundle size".

Or: Developer uses `d3-force` with Canvas rendering. Plugin loads, displays graph. User opens vault with 5,000 notes. Graph tries to render all nodes. Browser tab crashes with out-of-memory error.

**Why it happens:**
- Graph visualization libraries are large (vis-network: 1.2MB, D3 full: 500KB, force-graph: 300KB)
- Bundler includes entire library instead of tree-shaking unused features
- Multiple rendering engines bundled (Canvas + SVG + WebGL) when only one needed
- No lazy loading for graph view (loads even when not used)
- Testing with small vaults (100 nodes) doesn't expose memory issues
- No bundle size analysis in CI

**Consequences:**
- Plugin rejected during community review for bundle size
- Users on slower connections wait minutes for plugin to load
- Graph view crashes on large vaults
- Plugin consumes excessive memory, slows down entire Obsidian
- Users disable plugin to improve performance
- Negative reviews: "bloated", "crashes my Obsidian"

**Warning signs:**
- main.js over 1MB after build
- Bundle size increases significantly with graph library addition
- No webpack bundle analyzer / rollup-plugin-visualizer in build
- Importing entire library: `import * as d3 from 'd3'`
- No code splitting for graph view (always loaded)
- Testing only with <500 node vaults

**Prevention:**
1. **Choose lightweight libraries** - Consider force-graph (300KB) over vis-network (1.2MB)
2. **Tree-shake aggressively** - Import only needed modules: `import { forceSimulation } from 'd3-force'`
3. **Use WebGL for large graphs** - Canvas performs poorly >1,000 nodes, WebGL handles 10,000+
4. **Lazy load graph view** - Only load library when user opens graph panel
5. **Bundle size budget** - CI fails if bundle exceeds threshold (e.g., 800KB)
6. **Progressive rendering** - Render visible nodes first, defer off-screen nodes
7. **Virtual rendering** - Don't render nodes outside viewport

**Implementation strategy:**
```typescript
// GOOD: Lazy load graph library
async function openGraphView() {
  const { ForceGraph } = await import('force-graph');
  const graph = ForceGraph()(container);
  // ... render
}

// GOOD: Import only needed D3 modules
import { forceSimulation, forceLink, forceManyBody } from 'd3-force';

// BAD: Import entire library
import * as d3 from 'd3';  // Bundles 500KB

// GOOD: WebGL for large graphs (via pixi.js or three.js)
const renderer = graph.nodeCanvasObject((node, ctx, globalScale) => {
  // Custom WebGL rendering for 10,000+ nodes
});
```

**Comparison: Canvas vs WebGL Graph Libraries**

| Library | Rendering | Bundle Size | Max Nodes (60fps) | Notes |
|---------|-----------|-------------|-------------------|-------|
| vis-network | Canvas | 1.2MB | ~1,000 | Full-featured, heavy |
| D3 + Canvas | Canvas | ~100KB | ~2,000 | Manual implementation |
| force-graph | Canvas/WebGL | 300KB | 5,000 (Canvas), 50,000 (WebGL) | Lightweight, flexible |
| 3d-force-graph | WebGL/Three.js | 800KB | 100,000+ | 3D, heavyweight |
| cytoscape.js | Canvas | 600KB | ~5,000 | Specialized for biology |

**Recommendation:** Use force-graph with WebGL rendering for Hivemind. Handles large vaults, reasonable bundle size, easy integration.

**Current system analysis:**
- No graph visualization library currently bundled
- Current main.js size: ~150KB (good baseline)
- Rollup build configured for tree-shaking
- No lazy loading infrastructure in plugin

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: HIGH - Critical for user experience and review acceptance
- Testing requirement: Test with 5,000+ node vault, measure bundle size
- Bundle monitoring: Add rollup-plugin-visualizer to build

**Sources:**
- [Graph visualization performance pitfalls - Cambridge Intelligence](https://cambridge-intelligence.com/visualize-large-networks/)
- [Force-Directed Graph - WebGL & Canvas with PIXI.js](https://observablehq.com/@dianaow/force-directed-graph-webgl-canvas-with-pixi-js)
- [Comparison of JavaScript Graph Libraries - Cylynx](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)
- [Obsidian Plugin Bundling - Forum](https://forum.obsidian.md/t/import-other-npm-libraries-in-plugin/56102)

---

### Pitfall 4: Obsidian Plugin Review Manifest Version Mismatch

**What goes wrong:** Developer builds v1.2.0, creates GitHub release with tag `v1.2.0`. manifest.json has `"version": "1.2.0"`. Pull request to obsidian-releases rejected: "Git tag must exactly match manifest version. Found tag 'v1.2.0' but manifest has '1.2.0'. Remove the 'v' prefix."

Or: Developer updates manifest.json to 1.3.0, commits, tags as 1.3.0. But forgets to update package.json which still says 1.2.9. Build process uses package.json version for some metadata. Plugin works but has inconsistent version info. Review catches discrepancy, rejects.

**Why it happens:**
- Git tag convention uses `v` prefix (v1.2.0), manifest doesn't
- Version number exists in multiple files (manifest.json, package.json, versions.json)
- Manual version updates, easy to miss one file
- No automated version consistency check
- Release process not documented clearly
- Testing in BRAT (beta plugin installer) which is more lenient than official review

**Consequences:**
- Pull request rejected, must fix and re-submit
- Delay in plugin availability
- Users waiting for features
- Embarrassment in public PR
- Negative first impression with review team
- Wasted time on avoidable mistakes

**Warning signs:**
- Git tags have `v` prefix but manifest doesn't
- Version numbers differ between manifest.json and package.json
- No automated version bumping (manual edits)
- No CI check for version consistency
- Release process done manually without checklist
- Testing only with BRAT, not simulating official review validation

**Prevention:**
1. **Consistent version format** - Git tag `1.2.0` (no `v` prefix) matches manifest exactly
2. **Single source of truth** - Script reads version from package.json, writes to manifest.json
3. **Automated version bumping** - Use `npm version patch/minor/major` to update all files
4. **CI validation** - Check that all version fields match before release
5. **Release checklist** - Document exact steps, include version verification
6. **Pre-submit validation** - Run obsidianmd/obsidian-releases validation locally before PR

**Implementation strategy:**
```bash
# Version bump script (update-version.sh)
#!/bin/bash
VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./update-version.sh 1.2.0"
  exit 1
fi

# Update package.json
npm version $VERSION --no-git-tag-version

# Update manifest.json (reads version from package.json)
node -e "
  const pkg = require('./package.json');
  const manifest = require('./manifest.json');
  manifest.version = pkg.version;
  require('fs').writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2));
"

# Commit and tag (NO v prefix)
git add package.json manifest.json
git commit -m "chore(release): ${VERSION}"
git tag ${VERSION}
git push && git push --tags
```

**CI validation:**
```yaml
# .github/workflows/version-check.yml
name: Version Consistency Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check version consistency
        run: |
          MANIFEST_VER=$(jq -r .version manifest.json)
          PACKAGE_VER=$(jq -r .version package.json)
          if [ "$MANIFEST_VER" != "$PACKAGE_VER" ]; then
            echo "Version mismatch: manifest=$MANIFEST_VER package=$PACKAGE_VER"
            exit 1
          fi
```

**Current system analysis:**
- Package exists at @hiveforge/hivemind-mcp (version 3.1.0)
- Obsidian plugin not yet submitted to community
- Current release tags use `v3.1` format (with `v` prefix)
- No automated version consistency checks

**Phase mapping:**
- Phase: Community Plugin Submission (v4.0)
- Research flag: LOW - Well-documented requirement, straightforward fix
- Testing requirement: Run submission validation locally before PR
- Process requirement: Document release process, automate version bumping

**Sources:**
- [Obsidian Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Community plugin: wrong version when installing - Forum](https://forum.obsidian.md/t/community-plugin-wrong-version-when-installing-and-updating/28339)
- [Using GitHub actions to release plugins - Forum](https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877)

---

### Pitfall 5: GPL/AGPL Dependency Snuck In By Graph Library

**What goes wrong:** Developer adds graph visualization library. Library depends on another library which depends on a GPL-licensed utility. Transitive dependency tree includes GPL code. CI license compliance gate (added in v3.1) fails: "AGPL-3.0 license detected in dependency tree". Build blocked. Must remove graph library or find alternative.

Or worse: Developer doesn't have license CI gate. Ships plugin with GPL dependency. User or community member discovers GPL violation. Public embarrassment. Must release patch immediately. Plugin temporarily removed from community list pending fix.

**Why it happens:**
- Graph libraries have deep dependency trees
- Not all developers check license of transitive dependencies
- Some useful utilities are GPL (by design, to promote GPL adoption)
- npm doesn't warn about license conflicts by default
- Developer focuses on functionality, overlooks licensing
- Testing doesn't catch license issues

**Consequences:**
- CI build fails, blocks development
- Must find alternative library or reimplement
- Time wasted integrating library that can't be used
- If shipped: Legal risk, forced emergency patch
- Community trust damage
- Plugin removed from store until fixed

**Warning signs:**
- No license checking in CI pipeline
- Adding large libraries without license audit
- Dependencies with GPL/AGPL/SSPL licenses in tree
- No license-checker or similar tool configured
- Using niche/specialized libraries (more likely GPL)

**Prevention:**
1. **License CI gate** - Already implemented in v3.1, maintain it
2. **Pre-addition audit** - Check dependency licenses before adding: `npx license-checker --summary`
3. **Allowed license list** - Explicitly list acceptable licenses (MIT, Apache-2.0, BSD, ISC)
4. **Transitive dependency check** - Check entire tree, not just direct deps
5. **Choose popular libraries** - Popular libraries more likely MIT/BSD
6. **Vendor alternative** - If small GPL utility needed, reimplement or find MIT alternative

**Known safe graph libraries:**
- force-graph: MIT
- cytoscape.js: MIT
- vis-network: MIT and Apache-2.0 (dual-licensed)
- D3: ISC (permissive)
- three.js: MIT

**Known problematic libraries:**
- (Check each library's dependency tree individually)

**License check command:**
```bash
# Check current dependencies
npx license-checker --summary --production --failOn "GPL;AGPL;LGPL"

# Check before adding new library
npm install --no-save force-graph
npx license-checker --summary --production --failOn "GPL;AGPL;LGPL"
```

**Current system analysis:**
- License compliance CI gate already implemented in v3.1
- CI fails build on GPL/AGPL detection
- Current dependencies are clean (no GPL)
- Good foundation, maintain discipline when adding graph library

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: LOW - Already implemented, just maintain discipline
- Testing requirement: Run license check after adding graph library
- CI requirement: Ensure CI still enforces license compliance

**Sources:**
- [Checking Node.js Dependencies Licenses - Medium](https://medium.com/codewind/checking-node-js-sub-dependencies-licenses-for-usage-and-redistribution-58fe70a77847)
- [license-checker npm package](https://www.npmjs.com/package/license-checker)
- [GPL License Implications - GitHub Gist](https://gist.github.com/kemitchell/ad3bdc6ca8888599502e)

---

### Pitfall 6: child_process Import Fails Obsidian Plugin Review

**What goes wrong:** Plugin uses `child_process` to spawn MCP server as subprocess. Works perfectly in development. Submit to community plugin review. Reviewer comments: "child_process usage requires security review and explicit justification. Plugins should not spawn subprocesses. Denied pending explanation."

Developer explains use case. Reviewer: "MCP server should be run separately by user, not spawned by plugin. This is a security boundary violation. Recommend connecting to already-running server via network instead."

**Why it happens:**
- Plugins have full Node.js API access (no sandboxing)
- child_process enables arbitrary code execution
- Review team is conservative about security-sensitive APIs
- Plugin guideline: "Avoid child_process unless absolutely necessary"
- Developer prioritizes convenience (auto-start server) over security model
- Not aware of review team's security stance

**Consequences:**
- Plugin review blocked pending justification
- May require architectural redesign (connect to server instead of spawn)
- Delays plugin approval
- Potential rejection if justification insufficient
- Wasted implementation time on auto-spawn feature

**Current system status:**
According to PROJECT.md:
- "Tech debt: resolve Obsidian plugin child_process import" is listed in Active requirements for v4.0
- Plugin already has child_process import
- Passed some review compliance checks in v3.1 (CSS classes, sentence case, requestUrl, vault API)
- child_process import explicitly flagged as needing review team exception

**Warning signs:**
- Using `child_process.spawn()` or `.exec()` in plugin
- Plugin auto-starts external processes
- No documentation of why child_process is necessary
- No alternative architecture considered

**Prevention:**
1. **Avoid if possible** - Prefer connecting to already-running MCP server
2. **Document necessity** - Explain why child_process is required for functionality
3. **Explicit opt-in** - User must enable "Auto-start MCP server" in settings, with security warning
4. **Restrict commands** - Only spawn specific known executables, no arbitrary commands
5. **Communicate early** - Discuss with review team before submission if child_process needed
6. **Alternative architecture** - Consider having users run server separately, plugin connects via stdio/network

**Implementation strategy (if keeping child_process):**
```typescript
// Settings: Explicit opt-in with warning
class HivemindSettingTab extends PluginSettingTab {
  display() {
    new Setting(containerEl)
      .setName('Auto-start MCP server')
      .setDesc('WARNING: This spawns a subprocess. Enable only if you trust Hivemind source code.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoStartServer)
        .onChange(async (value) => {
          this.plugin.settings.autoStartServer = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

// Only spawn if explicitly enabled
if (this.settings.autoStartServer) {
  this.mcpProcess = spawn('node', ['path/to/mcp-server.js'], {
    stdio: 'pipe',
    cwd: vaultPath
  });
}
```

**Alternative architecture (preferred by review team):**
```typescript
// Plugin connects to already-running server
// User runs: npx @hiveforge/hivemind-mcp start
// Plugin connects via fetch/requestUrl
const response = await requestUrl({
  url: 'http://localhost:3000/mcp',
  method: 'POST',
  body: JSON.stringify(mcpRequest)
});
```

**Phase mapping:**
- Phase: Community Plugin Submission (v4.0)
- Research flag: MEDIUM - Requires review team communication
- Decision required: Keep child_process (need exception) or remove (architectural change)
- Documentation required: Justify necessity in submission PR

**Sources:**
- [Obsidian Plugin Security](https://help.obsidian.md/plugin-security)
- [child_process Security Concerns - Obsidian Forum](https://forum.obsidian.md/t/when-i-use-child-process-in-nodejs-i-get-the-following-error-and-i-dont-know-why/56211)
- [Arbitrary Code Execution via child_process - CVE-2021-42057](https://github.com/blacksmithgu/obsidian-dataview/issues/615)

---

## Moderate Pitfalls

Mistakes that cause delays, user frustration, or degraded experience.

### Pitfall 7: Date Range Query Edge Cases (Inclusive vs Exclusive)

**What goes wrong:** User queries "events from June 1 to June 30". Query returns events on June 1 but not June 30. User's "end of month" event is missing. Or: Query uses `>=` and `<=` but date fields are timestamps. June 30 with time 23:59:59 is included, but July 1 at 00:00:01 is excluded. User expects "June" to include all of June 30, not cut off at midnight.

**Why it happens:**
- Confusion between inclusive and exclusive ranges
- Date-only queries compared against datetime values
- End date treated as "start of end day" not "end of end day"
- Different programming contexts use different conventions (SQL, JavaScript, Python differ)
- Testing with mid-range dates doesn't expose boundary bugs

**Consequences:**
- Timeline views missing events at range boundaries
- User confusion: "I know that event is in June"
- Inconsistent behavior: sometimes includes boundary, sometimes doesn't
- Support burden explaining boundary semantics

**Prevention:**
1. **Document range semantics** - "from X to Y" means X inclusive, Y inclusive
2. **Normalize to full-day ranges** - End date extends to 23:59:59.999 of that day
3. **Test boundary cases** - Explicitly test events on start date, end date, and day before/after
4. **Consistent comparison operators** - Always `>= start AND <= end` for inclusive
5. **User-facing clarity** - UI shows "June 1-30 (inclusive)" not just "June 1-30"

**Implementation:**
```typescript
// GOOD: Inclusive date range for date-only values
function buildDateRangeQuery(startDate: string, endDate: string) {
  // User provides "2024-06-01" and "2024-06-30"
  // Query includes all events on June 30
  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59Z`;
  return `datetime >= '${startISO}' AND datetime <= '${endISO}'`;
}

// BAD: Exclusive end date
function buildDateRangeQueryBad(startDate: string, endDate: string) {
  // This excludes events on June 30
  return `datetime >= '${startDate}T00:00:00Z' AND datetime < '${endDate}T00:00:00Z'`;
}
```

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: LOW - Standard pattern, well-documented
- Testing requirement: Explicit boundary case tests

**Sources:**
- [Common Date/Time Mistakes - Jon Skeet](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/)

---

### Pitfall 8: Graph View Performance Degradation Without Virtualization

**What goes wrong:** Graph view works great with 500 nodes. User opens vault with 3,000 notes. All 3,000 nodes rendered. Frame rate drops to 5 FPS. Panning is laggy. Zooming takes seconds to update. User closes graph view, never uses it again. Review: "Graph view unusable on my vault."

**Why it happens:**
- Rendering all nodes even when off-screen
- No culling of invisible nodes
- Force simulation calculates forces for all nodes every frame
- No level-of-detail reduction for distant nodes
- Testing only with small sample vaults
- Assuming users have small, focused vaults (reality: many have 10,000+ notes)

**Consequences:**
- Feature unusable for users with large vaults (majority of power users)
- Negative reviews about performance
- Users don't experience value of graph visualization
- Plugin gets reputation as "resource hog"

**Prevention:**
1. **Viewport culling** - Only render nodes visible in viewport
2. **Level-of-detail** - Render distant nodes as simple dots, close nodes with detail
3. **Lazy force simulation** - Stop simulation after graph stabilizes, only restart on interaction
4. **Progressive rendering** - Render visible nodes first, defer off-screen
5. **Node limit option** - Let user configure max nodes to display (default: 1000)
6. **Filter controls** - Let user filter graph to specific types/folders

**Implementation strategy:**
```typescript
// Progressive rendering approach
class GraphView {
  renderGraph(nodes: Node[], edges: Edge[]) {
    // Filter to viewport
    const visibleNodes = nodes.filter(n => isInViewport(n, this.camera));

    // Render in priority order
    const prioritized = [
      ...visibleNodes.filter(n => n.isSelected),  // Selected first
      ...visibleNodes.filter(n => n.depth <= 2),   // Close neighbors
      ...visibleNodes.slice(0, 1000)               // Limit total
    ];

    // Use WebGL for large graphs
    if (nodes.length > 1000) {
      this.renderer = new WebGLRenderer();
    } else {
      this.renderer = new CanvasRenderer();
    }

    this.renderer.render(prioritized);
  }
}
```

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: MEDIUM - Known patterns, but integration requires care
- Testing requirement: Test with 1,000, 5,000, and 10,000 node vaults

**Sources:**
- [Graph Visualization at Scale - Cambridge Intelligence](https://cambridge-intelligence.com/visualize-large-networks/)
- [Big Graph Data Visualization - 5 Steps](https://cambridge-intelligence.com/big-graph-data-visualization/)
- [Obsidian Graph View Performance - Forum](https://forum.obsidian.md/t/obsidian-with-very-large-vaults-performance-results/30635)

---

### Pitfall 9: Obsidian requestUrl vs fetch for External Services

**What goes wrong:** Developer implements MCP tool that fetches data from external API. Uses standard `fetch()` in MCP server code (works fine). Plugin also needs to call external API for graph data enrichment. Uses `fetch()`. Doesn't work in Obsidian - CORS error. Developer confused: "fetch works in server, why not in plugin?"

**Why it happens:**
- Obsidian plugins run in Electron environment with CORS restrictions
- Standard `fetch()` respects CORS, blocked by many APIs
- Obsidian provides `requestUrl()` that bypasses CORS
- Developer not aware of Obsidian-specific APIs
- MCP server (Node.js) has no CORS restrictions, fetch works fine there
- Testing in Node.js environment doesn't expose Obsidian-specific issues

**Consequences:**
- Plugin features that work in MCP server fail in plugin
- External API calls fail silently or with cryptic CORS errors
- Developer debugging time wasted on CORS issues
- Users can't use external enrichment features
- Inconsistent behavior between MCP server and plugin

**Prevention:**
1. **Use requestUrl in plugin** - Import from Obsidian API: `import { requestUrl } from 'obsidian'`
2. **CORS-free by design** - Avoid external API calls in plugin if possible
3. **Proxy through MCP server** - Plugin calls MCP tool, server fetches from external API
4. **Document Obsidian-specific APIs** - Note differences between plugin and server environment
5. **Test in actual Obsidian** - Don't just test in Node.js

**Implementation:**
```typescript
// GOOD: Obsidian plugin
import { requestUrl } from 'obsidian';

async function fetchExternalData(url: string) {
  const response = await requestUrl({
    url,
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' }
  });
  return response.json;
}

// BAD: Standard fetch (CORS blocked in Obsidian)
async function fetchExternalDataBad(url: string) {
  const response = await fetch(url);  // CORS error in Obsidian
  return response.json();
}
```

**Current system analysis:**
- MCP server already uses native fetch (replaced axios in v3.1)
- Plugin may need external API calls for graph visualization
- v3.1 compliance included "requestUrl" - suggests already using it correctly

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: LOW - Known requirement, already addressed in v3.1
- Testing requirement: Test external API calls in actual Obsidian environment

**Sources:**
- [Make HTTP requests from plugins - Obsidian Forum](https://forum.obsidian.md/t/make-http-requests-from-plugins/15461)
- [CORS problem with library - Obsidian Forum](https://forum.obsidian.md/t/cors-problem-with-library/26703)
- [requestUrl API - Obsidian Forum](https://forum.obsidian.md/t/https-request-avoiding-cors-with-authentication-and-custom-self-signed-certificate/90725)

---

### Pitfall 10: Timeline Visualization Overcrowded With Entities

**What goes wrong:** User creates timeline view for all entities. Timeline shows 1,500 events stacked vertically. Scrolling through timeline is unusable - too many overlapping labels. User can't find specific events. Or: Timeline renders all 1,500 events at once, freezing UI for 10 seconds while rendering.

**Why it happens:**
- No filtering or grouping controls
- All entities with dates shown by default
- Timeline assumes manageable number of events (<100)
- No aggregation for dense time periods
- Testing with minimal sample data

**Consequences:**
- Timeline feature unusable for productive vaults
- Users frustrated by information overload
- Performance issues from rendering thousands of timeline items
- Feature abandoned by users

**Prevention:**
1. **Smart defaults** - Show only entities modified in last 30 days by default
2. **Filter controls** - Type filter, folder filter, date range filter
3. **Aggregation** - Group events by day/week/month for dense periods
4. **Search integration** - Let user search timeline
5. **Lazy loading** - Render only visible portion of timeline
6. **Zoom levels** - Year view (aggregated) -> Month view (grouped) -> Day view (individual)

**Implementation:**
```typescript
// Timeline view with filters
class TimelineView {
  private filters = {
    types: ['character', 'location'],  // Selected types
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    searchQuery: ''
  };

  renderTimeline() {
    // Fetch only filtered entities
    const entities = this.queryEntitiesWithFilters(this.filters);

    // Aggregate if too many
    if (entities.length > 200) {
      return this.renderAggregatedTimeline(entities);
    }

    return this.renderDetailedTimeline(entities);
  }

  renderAggregatedTimeline(entities: Entity[]) {
    // Group by month
    const byMonth = groupBy(entities, e => e.date.slice(0, 7));
    // Render: "January 2024 (45 events)"
  }
}
```

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: LOW - Standard UI patterns
- Testing requirement: Test with 1,000+ dated entities

---

### Pitfall 11: Graph Relationship Data Mismatch Between MCP and Plugin

**What goes wrong:** MCP server's knowledge graph uses relationship schema from template registry. Plugin's graph visualization has hardcoded relationship types for worldbuilding template. User with research template can query relationships via MCP but graph visualization doesn't display them (types don't match). User confused why MCP tool shows connections but graph view doesn't.

**Why it happens:**
- Plugin has duplicated relationship definitions (tech debt already identified)
- MCP server reads from template registry
- Plugin graph view uses hardcoded types
- No integration testing between MCP and plugin graph views
- Templates evolved but plugin wasn't updated

**Current system context:**
According to PROJECT.md:
- "Tech debt: deduplicate FRONTMATTER_TEMPLATES from plugin" is listed in Active requirements for v4.0
- Plugin has hardcoded templates, server uses registry

**Consequences:**
- Graph view incomplete/incorrect for non-worldbuilding templates
- User confusion about mismatched data
- Support burden: "Why doesn't graph show X relationship?"
- Undermines value of multi-template system

**Prevention:**
1. **Single source of truth** - Plugin reads relationship types from template registry
2. **Runtime template detection** - Plugin detects active template, uses its relationship schema
3. **Integration tests** - Test that plugin graph matches MCP server graph data
4. **Template registry client** - Shared library for reading template definitions
5. **Address tech debt** - Remove FRONTMATTER_TEMPLATES duplication as planned

**Implementation strategy:**
```typescript
// GOOD: Read from template registry
import { templateRegistry } from '@hiveforge/hivemind-mcp/templates';

class GraphView {
  async renderGraph() {
    const activeTemplate = await templateRegistry.getActive();
    const relationshipTypes = activeTemplate.relationships.types;

    // Use actual template's relationship types
    this.edges = this.buildEdges(this.nodes, relationshipTypes);
  }
}

// BAD: Hardcoded relationship types
const HARDCODED_RELATIONSHIPS = {
  worldbuilding: ['allies_with', 'enemy_of', 'member_of'],
  // Incomplete, breaks for other templates
};
```

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: MEDIUM - Requires careful integration, already identified as tech debt
- Testing requirement: Test graph view with all three built-in templates
- Tech debt resolution: Remove FRONTMATTER_TEMPLATES duplication

---

## Minor Pitfalls

Mistakes that cause annoyance or require workarounds but don't break core functionality.

### Pitfall 12: Timeline Export Format Not Interoperable

**What goes wrong:** User creates beautiful timeline in Obsidian. Wants to export for presentation or blog post. No export feature. Or: Export produces JSON that no other tool can import. User manually screenshots timeline or gives up.

**Prevention:**
1. **Standard export formats** - Support CSV, JSON, iCal for timeline data
2. **Visual export** - SVG or PNG export of timeline visualization
3. **Embed code** - Generate HTML snippet for embedding in websites
4. **Markdown export** - Timeline as markdown list/table

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: LOW - Nice-to-have feature
- Priority: LOW - Not required for initial launch

---

### Pitfall 13: Graph View Missing Obsidian Core Graph Features

**What goes wrong:** User familiar with Obsidian's built-in graph view expects similar features in Hivemind graph. Obsidian graph has: color by folder, filter by tags, search highlighting, show attachments, etc. Hivemind graph has basic force-directed layout only. User disappointed by limited features compared to core graph.

**Prevention:**
1. **Feature parity** - Match commonly-used Obsidian graph features
2. **Differentiation** - Highlight what makes Hivemind graph unique (relationship types, template awareness)
3. **Settings UI** - Expose graph customization options
4. **Documentation** - Explain what Hivemind graph does differently/better

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: LOW - UX polish
- Priority: MEDIUM - Important for user satisfaction

---

### Pitfall 14: MCP Graph Traversal Tools Return Too Much Data

**What goes wrong:** User asks AI: "Show me all connections to this character." MCP tool `graph_traverse` returns 500 nodes and 1,200 edges as JSON. Claude context window overwhelmed with node/edge data. Response is truncated or unhelpful. Or: User's query times out because graph traversal is too deep.

**Prevention:**
1. **Depth limiting** - Default to depth=2, max depth=4
2. **Node filtering** - Only return nodes matching query context
3. **Summary mode** - Return node counts and relationship types, not full data
4. **Pagination** - Break large results into chunks
5. **Focused queries** - Separate tools: `get_neighbors`, `get_related_by_type`, not generic `graph_traverse`

**Phase mapping:**
- Phase: Graph Visualization Implementation (v4.0)
- Research flag: LOW - Standard API design
- Testing requirement: Test with large graph queries

---

## Integration Pitfalls (Existing System)

Pitfalls specific to adding features to an existing, working system.

### Pitfall 15: Timeline and Graph Features Duplicate Existing MCP Tools

**What goes wrong:** Timeline MCP tool `query_timeline` overlaps with existing `query_X` tools that already have date fields. Graph MCP tool `get_relationships` duplicates existing relationship queries. AI doesn't know which tool to use. Tool descriptions are ambiguous. Users get inconsistent results depending on which tool AI chose.

**Current system:**
- MCP server has auto-generated tools per entity type: `query_character`, `query_location`, etc.
- These tools already accept arbitrary field queries
- If date fields exist, they can already be queried

**Prevention:**
1. **Tool composition** - Timeline tool uses existing `query_X` tools internally
2. **Specialized vs general** - Timeline tool is convenience wrapper, documents when to use it vs general query
3. **Tool deprecation** - If replacing existing tools, use proper deprecation workflow
4. **Clear tool descriptions** - Explain unique value proposition of timeline tool
5. **Integration testing** - Test that new tools work harmoniously with existing tools

**Implementation:**
```typescript
// GOOD: Timeline tool composes existing tools
{
  name: "query_timeline",
  description: "Query entities by date range. Convenience wrapper around query_X tools filtered by date fields. Use this when you need chronological view of multiple entity types. Use query_character/query_location directly when filtering by non-date fields.",
  inputSchema: {
    type: "object",
    properties: {
      start_date: { type: "string" },
      end_date: { type: "string" },
      entity_types: { type: "array", items: { type: "string" } }
    }
  }
}

async function queryTimeline(args: TimelineArgs) {
  const results = [];
  for (const entityType of args.entity_types) {
    const toolName = `query_${entityType}`;
    const entities = await callTool(toolName, {
      filters: {
        date: { gte: args.start_date, lte: args.end_date }
      }
    });
    results.push(...entities);
  }
  return sortByDate(results);
}
```

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: MEDIUM - Requires careful MCP tool design
- Testing requirement: Test AI tool selection with timeline queries

---

### Pitfall 16: Backward Compatibility Break for Existing Vaults

**What goes wrong:** Timeline feature expects all entities to have standardized date fields (`created`, `modified`). Existing user vaults use custom date field names (`date`, `timestamp`, `when`, `created_at`). Timeline view shows nothing. User's vault "doesn't work" with new timeline feature.

**Current system:**
- Template system allows custom field definitions
- Different templates may use different field names
- User vaults exist with v1.0-v3.1 conventions

**Prevention:**
1. **Field name flexibility** - Support multiple date field names
2. **Configuration** - Let user map their date fields to timeline system
3. **Migration tool** - Offer to standardize field names across vault
4. **Backward compatibility** - Detect and adapt to legacy field names
5. **Documentation** - Clear upgrade guide for adding timeline features

**Implementation:**
```typescript
// Date field detection strategy
const DATE_FIELD_CANDIDATES = [
  'created', 'created_at', 'date', 'timestamp', 'when',
  'modified', 'modified_at', 'updated', 'updated_at'
];

function detectDateField(entity: Entity): string | null {
  for (const field of DATE_FIELD_CANDIDATES) {
    if (entity.frontmatter[field] && isValidDate(entity.frontmatter[field])) {
      return entity.frontmatter[field];
    }
  }
  return null;
}
```

**Phase mapping:**
- Phase: Timeline Query Implementation (v4.0)
- Research flag: MEDIUM - Requires understanding existing vault patterns
- Testing requirement: Test with actual user vaults from v1.0, v2.0, v3.0

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation | Priority |
|-------|---------------|------------|----------|
| Timeline Query (v4.0) | Date timezone ambiguity (1) | ISO8601 UTC storage, explicit timezone handling | CRITICAL |
| Timeline Query (v4.0) | SQLite date index performance (2) | Dedicated date columns, proper indexes | CRITICAL |
| Timeline Query (v4.0) | Date range edge cases (7) | Inclusive range semantics, boundary testing | MEDIUM |
| Timeline Query (v4.0) | Backward compat field names (16) | Flexible field detection, migration tool | MEDIUM |
| Timeline Query (v4.0) | Timeline overcrowding (10) | Smart defaults, filter controls, aggregation | MEDIUM |
| Timeline Query (v4.0) | Tool duplication (15) | Compose existing tools, clear descriptions | MEDIUM |
| Graph Viz (v4.0) | Bundle size explosion (3) | Lightweight library, lazy loading, tree-shaking | CRITICAL |
| Graph Viz (v4.0) | Performance without virtualization (8) | Viewport culling, WebGL for large graphs | HIGH |
| Graph Viz (v4.0) | Template relationship mismatch (11) | Remove FRONTMATTER_TEMPLATES duplication | HIGH |
| Graph Viz (v4.0) | CORS with requestUrl (9) | Use requestUrl API consistently | MEDIUM |
| Graph Viz (v4.0) | License compliance (5) | Pre-audit dependencies, maintain CI gate | HIGH |
| Plugin Submission (v4.0) | Manifest version mismatch (4) | Automated version bumping, CI validation | HIGH |
| Plugin Submission (v4.0) | child_process review (6) | Document necessity or remove, get exception | HIGH |
| All v4.0 Phases | Breaking existing workflows | Output stability, deprecation warnings | MEDIUM |

---

## Detection Early Warning System

### Date/Timezone Issue Detection
- [ ] **Cross-timezone test suite**: Test queries with dates spanning UTC-12 to UTC+12
- [ ] **Boundary case tests**: Events on date range boundaries (start date, end date, ±1 day)
- [ ] **Format validation**: Check all date fields match expected ISO8601 format
- [ ] **Query result verification**: Compare query results across different timezone contexts

### Performance Issue Detection
- [ ] **Large vault testing**: Test with 1,000, 5,000, 10,000 entity vaults
- [ ] **Bundle size monitoring**: CI fails if bundle exceeds threshold (e.g., 800KB)
- [ ] **Query plan analysis**: Run EXPLAIN QUERY PLAN on all timeline queries
- [ ] **Frame rate measurement**: Graph view maintains 30+ FPS with 5,000 nodes

### Plugin Review Readiness
- [ ] **Version consistency check**: CI validates manifest.json, package.json, git tag match
- [ ] **License audit**: Run license-checker before every dependency addition
- [ ] **Obsidian API compliance**: Use requestUrl not fetch, vault API not fs
- [ ] **child_process justification**: Document why necessary or remove

### Integration Health
- [ ] **Template consistency**: Verify plugin and server use same template definitions
- [ ] **Tool composition**: Test timeline tools work with existing query tools
- [ ] **Backward compatibility**: Test with vaults from v1.0, v2.0, v3.0
- [ ] **End-to-end flow**: init -> add dates -> timeline query -> graph view

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Date/timezone handling | MEDIUM | Well-documented patterns, but cross-timezone testing critical |
| SQLite date performance | HIGH | Established SQLite practices, clear optimization paths |
| Graph visualization | HIGH | Multiple source comparisons, clear library recommendations |
| Bundle size management | HIGH | Known tools and patterns for monitoring and optimization |
| Obsidian plugin review | MEDIUM | Official docs partially inaccessible, relying on community forum evidence |
| License compliance | HIGH | Already implemented in v3.1, maintain discipline |
| child_process exception | MEDIUM | Requires review team communication, outcome uncertain |
| Backward compatibility | HIGH | Strong understanding of existing system from PROJECT.md |

---

## Research Gaps

Areas where confidence is lower, requiring additional investigation during implementation:

1. **Obsidian plugin review specific requirements** - Official docs didn't load fully in WebSearch. Need to fetch official guidelines directly or communicate with review team early.

2. **child_process exception precedent** - Unknown how many other plugins successfully use child_process with review approval. Need to research existing approved plugins or contact review team.

3. **Graph library bundle size actual measurements** - Recommendations based on published specs. Need to bundle each candidate library and measure actual impact on main.js size.

4. **SQLite date column migration strategy** - Adding date columns to existing production databases requires careful migration. Test with various vault sizes and existing data patterns.

---

## Sources

### Timeline Queries and Date Handling
- [Common mistakes in date/time formatting and parsing - Jon Skeet](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/)
- [Dataview Query Frontmatter Date - Obsidian Forum](https://forum.obsidian.md/t/dataview-query-frontmatter-date/53319)
- [YAML Timestamps - Coddy Reference](https://ref.coddy.tech/yaml/yaml-timestamps)
- [SQLite Date And Time Functions](https://sqlite.org/lang_datefunc.html)
- [SQLite Date Query Performance - High Performance SQLite](https://highperformancesqlite.com/watch/dates)
- [SQLite User Forum: Date Storage Best Practices](https://www.sqlite.org/forum/info/5203f28a039a028754fda31591bbfb3c9ca9a949277cb45d789a2f78aecbd52f?t=h)

### Graph Visualization Performance
- [Graph visualization at scale - Cambridge Intelligence](https://cambridge-intelligence.com/visualize-large-networks/)
- [Big Graph Data Visualization - 5 Steps](https://cambridge-intelligence.com/big-graph-data-visualization/)
- [Force-Directed Graph - WebGL & Canvas with PIXI.js](https://observablehq.com/@dianaow/force-directed-graph-webgl-canvas-with-pixi-js)
- [Comparison of JavaScript Graph Libraries - Cylynx](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)
- [Scale Up D3 Graph Visualization with PIXI.js](https://graphaware.com/blog/scale-up-your-d3-graph-visualisation-webgl-canvas-with-pixi-js/)
- [Obsidian Graph View Performance - Forum](https://forum.obsidian.md/t/obsidian-with-very-large-vaults-performance-results/30635)

### Obsidian Plugin Development
- [Obsidian Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Obsidian Plugin Security](https://help.obsidian.md/plugin-security)
- [Make HTTP requests from plugins - Obsidian Forum](https://forum.obsidian.md/t/make-http-requests-from-plugins/15461)
- [requestUrl CORS bypass - Obsidian Forum](https://forum.obsidian.md/t/https-request-avoiding-cors-with-authentication-and-custom-self-signed-certificate/90725)
- [Community plugin wrong version - Forum](https://forum.obsidian.md/t/community-plugin-wrong-version-when-installing-and-updating/28339)
- [Using GitHub actions to release plugins - Forum](https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877)

### License Compliance
- [Checking Node.js Dependencies Licenses - Medium](https://medium.com/codewind/checking-node-js-sub-dependencies-licenses-for-usage-and-redistribution-58fe70a77847)
- [license-checker npm package](https://www.npmjs.com/package/license-checker)
- [GPL License Implications - GitHub Gist](https://gist.github.com/kemitchell/ad3bdc6ca8888599502e)

### Bundle Size and Dependencies
- [Obsidian Plugin Bundling - Forum](https://forum.obsidian.md/t/import-other-npm-libraries-in-plugin/56102)
- [5 Best JS Chart Libraries for Data Visualization in 2026 - Qrvey](https://qrvey.com/blog/js-chart-library/)
- [Canvas vs WebGL Performance - Observable](https://observablehq.com/@dianaow/force-directed-graph-webgl-canvas-with-pixi-js)

### Security
- [child_process Security Concerns - Obsidian Forum](https://forum.obsidian.md/t/when-i-use-child-process-in-nodejs-i-get-the-following-error-and-i-dont-know-why/56211)
- [Arbitrary Code Execution via child_process - CVE-2021-42057](https://github.com/blacksmithgu/obsidian-dataview/issues/615)
