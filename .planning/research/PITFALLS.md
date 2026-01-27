# Domain Pitfalls

**Domain:** Developer Experience - CLI wizards, frontmatter tools, Obsidian integration
**Researched:** 2026-01-26
**Confidence:** HIGH (existing codebase context + established patterns)

## Executive Summary

Adding setup wizards, frontmatter tools, and Obsidian commands to an existing MCP server combines three high-risk areas: interactive CLI UX, file modification safety, and plugin API edge cases. Each has distinct failure modes that become more dangerous when modifying an existing system with active users.

Critical finding: Most DX failures stem from treating user files as "our data" rather than "their content we're privileged to modify." Destructive operations without confirmation, silent failures, and platform-specific path issues cause users to lose trust in tools that touch their knowledge base.

---

## Critical Pitfalls

Mistakes that cause data loss, user abandonment, or fundamental trust destruction.

### Pitfall 1: Wizard Asks Too Many Questions (Onboarding Fatigue)

**What goes wrong:** Setup wizard presents 15 prompts: vault path, template selection, vector search toggle, debounce timing, transport mode, MCP client selection, indexing strategy, batch size... User abandons at question 8. Those who complete it spend 20 minutes on setup, never actually start using the product.

**Why it happens:**
- Developer tries to expose every config option upfront
- Fear of "what if user needs this setting later"
- Copying enterprise tools that have complex setup
- No clear sense of which options are truly essential
- Confusing "power user flexibility" with "new user onboarding"

**Consequences:**
- 90% abandonment rate during onboarding (industry research shows this happens)
- Users who finish feel exhausted before first real task
- Negative first impression poisons word-of-mouth
- Support burden: "I got stuck at step 6"
- Users think product is "too complicated for them"

**Warning signs:**
- Setup takes >5 minutes to complete
- Users ask "what does this option mean" in wizard
- Wizard has more than 4-5 questions
- No progress indicator showing how many steps remain
- Testing shows users abandon before completion

**Prevention:**
1. **Budget questions ruthlessly** - Max 4-5 prompts for initial setup
2. **Sensible defaults for everything** - Only ask what has no reasonable default
3. **Progressive disclosure** - Basic setup first, "advanced options" later
4. **Show progress** - "Step 2 of 3" keeps end in sight
5. **Test time-to-first-value** - Target: productive in <2 minutes

**Current CLI analysis:**
The existing `init()` in cli.ts asks 4 questions which is appropriate:
- Vault path (required, no default)
- Template selection (has default)
- Vector search toggle (has default)
- MCP client setup (optional follow-up)

**Phase mapping:**
- Phase: Setup Wizard (Phase 12)
- Research flag: LOW - patterns well-established
- Testing requirement: User testing with non-technical users, measure completion rate

**Sources:**
- [Creating Setup Wizards - LogRocket](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [90% App Abandonment During Onboarding](https://thisisglance.com/blog/why-90-of-users-abandon-apps-during-onboarding-process)
- [User Onboarding Mistakes - Appcues](https://www.appcues.com/blog/your-retention-problem-starts-with-these-7-user-onboarding-mistakes)

---

### Pitfall 2: Destructive Operations Without Confirmation

**What goes wrong:** User runs `hivemind fix --all` expecting preview. Tool silently modifies 847 files, adding frontmatter to every markdown file including personal notes, templates, and README.md. User's git status shows 847 modified files. Ctrl+Z doesn't work. Hours of manual cleanup.

**Why it happens:**
- Developer assumes "fix" implies user consent
- "Batch operations" mentality from database tooling
- No dry-run mode implemented
- Underestimating user's vault diversity
- Testing only on clean/expected vaults

**Consequences:**
- Permanent data corruption if no backup
- User loses trust in tool completely
- Negative reviews: "destroyed my vault"
- Support escalations require manual file recovery
- Users never use `fix` command again, even when needed

**Warning signs:**
- Command modifies files without `--force` or confirmation
- No `--dry-run` option for batch operations
- Operations succeed silently (no "Modified 847 files" message)
- Testing only covers happy path with expected files
- No backup/undo mechanism

**Prevention:**
1. **Dry-run by default** - Show what would change, require `--apply` to execute
2. **Confirm before batch** - "This will modify 847 files. Continue? (y/N)"
3. **Scope limiting** - Default to current file, require `--all` for vault-wide
4. **Backup before modify** - Create `.hivemind/backups/` before bulk changes
5. **Detailed output** - Show every file that will be/was modified
6. **Undo support** - Store original content to enable rollback

**Current CLI analysis:**
The existing `fix()` in cli.ts correctly:
- Prompts per-file with "Use 'X'? (Y/n/skip)"
- Shows file path before action
- Allows skipping individual files

But lacks:
- Dry-run preview mode
- Batch confirmation before starting
- Backup mechanism

**Phase mapping:**
- Phase: Frontmatter Fix CLI (Phase 13)
- Research flag: LOW - standard CLI safety patterns
- Testing requirement: Run against real-world vaults with unexpected content

**Sources:**
- [CLI Error Handling Patterns](https://medium.com/@czhoudev/error-handling-in-cli-tools-a-practical-pattern-thats-worked-for-me-6c658a9141a9)
- [Command Line Interface Guidelines](https://clig.dev/)

---

### Pitfall 3: Silent Failures Erode Trust

**What goes wrong:** User runs `hivemind validate`. Tool says "Validation complete." User assumes vault is valid. Actually, 23 files had parsing errors but tool swallowed exceptions. User's AI queries return wrong results. Hours debugging before discovering validation never actually worked.

**Why it happens:**
- try/catch swallows errors without logging
- "Don't crash on user" misinterpreted as "hide all errors"
- Success message printed regardless of actual outcome
- No distinction between "ran without errors" and "found no problems"
- Testing with valid files only

**Consequences:**
- Users trust invalid data
- Debugging nightmare: "it said it was fine"
- Core value proposition undermined
- Users doubt all tool output
- Silent data corruption propagates to AI outputs

**Warning signs:**
- Commands print success without checking results
- Empty catch blocks in parsing code
- No error counts in output
- "Processed N files" without "M had errors"
- Exit code 0 even when issues found

**Prevention:**
1. **Explicit outcome reporting** - "Valid: 42 | Warnings: 3 | Errors: 8"
2. **Error detail output** - List each error with file path and line number
3. **Appropriate exit codes** - 0=success, 1=errors found, 2=tool crashed
4. **No silent swallowing** - Log errors even if continuing
5. **Verbose mode** - `-v` for detailed processing info
6. **Summary section** - Clear end summary, not buried in output

**Current CLI analysis:**
The existing `validate()` correctly shows detailed output per check.

But `parseSkippedFilesLog()` silently skips malformed lines:
```typescript
const match = line.match(/^\s+[...]/);
if (match) { /* use it */ }
// else: silently skip - no warning
```

**Phase mapping:**
- Phase: Validate CLI (Phase 13)
- Research flag: LOW - well-documented error handling patterns
- Testing requirement: Test with corrupted/malformed vault files

**Sources:**
- [Errors Should Never Pass Silently](https://pybit.es/articles/python-errors-should-not-pass-silently/)
- [Good Error Messages - Cypress](https://www.cypress.io/blog/2017/07/26/good-error-messages)
- [User-Friendly CLIs - KiteMetric](https://kitemetric.com/blogs/make-your-cli-shine-a-guide-to-user-friendly-command-line-interfaces)

---

## Moderate Pitfalls

Mistakes that cause delays, user frustration, or degraded experience.

### Pitfall 4: Windows vs Unix Path Handling

**What goes wrong:** Tool works perfectly on Mac/Linux. Windows user runs it: `Error: ENOENT: no such file or directory, 'C:\Users/vault/Characters/hero.md'`. Mixed path separators, case sensitivity assumptions, and hardcoded `/` break on Windows.

**Why it happens:**
- Developer uses Mac/Linux exclusively
- String concatenation instead of `path.join()`
- Hardcoded `/` separators in templates/configs
- Case-insensitive file systems handled differently
- WSL path translation not considered

**Consequences:**
- Windows users can't use product (significant market)
- Support burden: "works on my machine"
- Path bugs are hard to reproduce without Windows
- Config files created on one OS break on another
- CI passes (Linux) but production fails (Windows)

**Warning signs:**
- `x + "/" + y` instead of `path.join(x, y)`
- Hardcoded `/` in path strings
- File matching without case normalization
- No Windows in CI test matrix
- `path.normalize()` not called on user-provided paths

**Prevention:**
1. **Always use path module** - `path.join()`, `path.resolve()`, `path.normalize()`
2. **Normalize user input** - `path.normalize(userPath)` before using
3. **CI on all platforms** - Windows, macOS, Linux in test matrix
4. **Case-insensitive matching** - For file lookups, normalize case
5. **Avoid shell scripts** - Use Node.js for cross-platform operations
6. **Test path edge cases** - Spaces, Unicode, deep nesting, symlinks

**Current CLI analysis:**
The existing CLI correctly uses:
- `resolve()` for vault paths
- `join()` for file paths
- `path` module throughout

Potential issues:
- `getMcpConfigPath()` hardcodes platform paths correctly but complex
- File paths in configs stored as-is (could cause cross-platform issues)

**Phase mapping:**
- Phase: All CLI phases
- Research flag: LOW - well-documented patterns
- Testing requirement: Windows CI testing, manual Windows testing

**Sources:**
- [Writing Cross-Platform Node.js](https://shapeshed.com/writing-cross-platform-node/)
- [Cross-Platform Node Guide](https://github.com/ehmicky/cross-platform-node-guide)
- [Node.js Path Module](https://nodejs.org/api/path.html)

---

### Pitfall 5: Obsidian MetadataCache Race Conditions

**What goes wrong:** Plugin calls `processFrontMatter()` to add type field. Then immediately reads `metadataCache.getFileCache()` to verify. Cache shows old data. Plugin thinks write failed, retries, corrupts file with duplicate frontmatter.

**Why it happens:**
- Obsidian's cache updates asynchronously
- No callback/promise for cache refresh
- Plugin reads immediately after write
- Testing in fast environments hides timing issues
- Documentation doesn't emphasize async nature

**Consequences:**
- Intermittent "sometimes works" bugs
- Double-frontmatter corruption
- User's file has `---` `---` `---` blocks
- Difficult to reproduce in development
- Users report "random" failures

**Warning signs:**
- Reading cache immediately after `processFrontMatter()`
- No delay/event waiting after file modifications
- Intermittent test failures
- "Works locally, fails in production" reports
- File content doesn't match cache

**Prevention:**
1. **Wait for cache event** - Listen for `metadataCache.on('changed')` after modify
2. **Don't read immediately** - Add timeout or event listener before reading
3. **Read file directly** - For critical checks, read file content not cache
4. **Debounce operations** - Don't rapid-fire file modifications
5. **Test with delays** - Add artificial delays in tests to expose races

**Current plugin analysis:**
The existing `insertMissingFrontmatter()` correctly:
- Writes via `vault.modify()` directly
- Doesn't immediately re-read cache

But `checkMissingFrontmatter()` reads cache which could be stale after external edits.

**Phase mapping:**
- Phase: Obsidian Commands (Phase 14)
- Research flag: MEDIUM - Known issue, solutions documented but tricky
- Testing requirement: Test rapid sequential operations, simulate slow devices

**Sources:**
- [Force Metacache Refresh](https://forum.obsidian.md/t/force-metacache-refresh-or-update-meta-for-specific-file/82415)
- [processFrontMatter Issues](https://forum.obsidian.md/t/issue-with-app-filemanager-processfrontmatter/79559)
- [MetadataCache Documentation](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache)

---

### Pitfall 6: Frontmatter Parsing Edge Cases

**What goes wrong:** User's frontmatter has:
```yaml
---
name: "Character: The Mysterious One"
tags: [fantasy, dark-souls-inspired]
---
```
Parser chokes on colon in value, brackets in tags. Or YAML is valid but gray-matter returns undefined. Or file starts with `--- ---` (empty frontmatter). Each edge case silently fails or corrupts data.

**Why it happens:**
- YAML has many valid syntaxes for same data
- Testing with clean/simple frontmatter only
- gray-matter has known edge cases
- User content is unpredictable
- Empty/malformed frontmatter not handled

**Consequences:**
- "Some files work, others don't" user reports
- Valid YAML rejected, breaking user's existing workflow
- Silent data loss during parsing
- Character names with colons truncated
- Arrays flattened to strings

**Warning signs:**
- Regex-based frontmatter parsing
- No tests for complex YAML values
- Strings with special chars not quoted on output
- Empty frontmatter (`---\n---`) not handled
- Tests only use simple key: value pairs

**Prevention:**
1. **Use battle-tested parser** - gray-matter handles edge cases better than regex
2. **Test complex YAML** - Colons in values, nested objects, arrays, multiline
3. **Handle empty frontmatter** - `--- ---` should work, not crash
4. **Quote strings on output** - Always quote strings that might have special chars
5. **Validate after parse** - Check that parsed structure matches expected schema
6. **Round-trip testing** - Parse then serialize, verify content unchanged

**Current CLI analysis:**
The existing `objectToYaml()` correctly quotes strings with colons:
```typescript
if (value.includes(':') || value.includes('#') || value.startsWith('[')) {
  lines.push(`${indentStr}${key}: "${value}"`);
}
```

But doesn't handle:
- Strings with quotes inside
- Multiline strings
- Empty frontmatter blocks

**Phase mapping:**
- Phase: Frontmatter Fix CLI (Phase 13)
- Research flag: LOW - gray-matter well-documented
- Testing requirement: Test with real-world vaults containing complex frontmatter

**Sources:**
- [gray-matter Edge Cases](https://github.com/jonschlinkert/gray-matter)
- [YAML Frontmatter Gotchas](https://vitepress.dev/guide/frontmatter)
- [Front Matter Troubleshooting](https://frontmatter.codes/docs/troubleshooting)

---

### Pitfall 7: TTY Detection for Interactive Prompts

**What goes wrong:** User runs `hivemind init` in a CI pipeline or piped through another command. Inquirer/readline throws error: "Prompts require TTY environment." User sees cryptic stack trace instead of helpful message. Or worse: command hangs forever waiting for input that can't arrive.

**Why it happens:**
- Interactive prompts need real terminal (TTY)
- Not all execution contexts have TTY
- stdin piped from file/command has no TTY
- Developer only tests in interactive terminal
- No fallback for non-interactive mode

**Consequences:**
- CI/CD pipelines fail with obscure errors
- Users can't script/automate setup
- Hanging processes waste resources
- Support questions about "weird errors"
- Users think tool is broken

**Warning signs:**
- Using readline/inquirer without TTY check
- No `--non-interactive` or `--yes` flag
- Commands hang when piped
- No error message before interactive prompt
- CI tests skip interactive commands entirely

**Prevention:**
1. **Check TTY before prompting** - `process.stdin.isTTY`
2. **Provide non-interactive mode** - `--yes` or `--config file.json` flags
3. **Graceful error** - "This command requires interactive terminal. Use --config for automation."
4. **Timeout prompts** - Don't hang forever, fail after 30s with message
5. **Document automation** - Show how to use in CI pipelines

**Current CLI analysis:**
The existing CLI uses `readline.createInterface()` without TTY checking.
Would fail in non-interactive environments.

**Phase mapping:**
- Phase: Setup Wizard (Phase 12)
- Research flag: LOW - standard CLI pattern
- Testing requirement: Test in piped/CI contexts

**Sources:**
- [Inquirer TTY Requirements](https://www.npmjs.com/package/inquirer)
- [@inquirer/prompts TTY Handling](https://www.npmjs.com/package/@inquirer/prompts)
- [Node.js Interactive CLI](https://opensource.com/article/18/7/node-js-interactive-cli)

---

## Minor Pitfalls

Mistakes that cause annoyance or require workarounds but don't break core functionality.

### Pitfall 8: Unhelpful Error Messages

**What goes wrong:** User runs command, sees: `Error: ENOENT`. No file path, no context, no suggestion. User has no idea what failed or how to fix it. Support ticket: "it just says ENOENT."

**Why it happens:**
- Catching errors without enhancing message
- Throwing raw Node.js errors to user
- No error categorization/translation
- Developer assumes error is self-explanatory
- No "what to do next" guidance

**Consequences:**
- Users can't self-serve troubleshoot
- Support burden increases
- Users feel product is low-quality
- Same question asked repeatedly
- Users abandon rather than debug

**Prevention:**
1. **Wrap system errors** - Add context: "Could not read vault at /path: ENOENT"
2. **Include fix suggestions** - "File not found. Check that path exists and is accessible."
3. **Categorize errors** - Config error vs runtime error vs user error
4. **Error codes** - HIVEMIND-001 for searchable troubleshooting
5. **Link to docs** - "See https://docs.hivemind.dev/errors/config-not-found"

**Current CLI analysis:**
The existing CLI has good error messages in some places:
```typescript
console.error('config.json not found. Run "npx @hiveforge/hivemind-mcp init" first.');
```

But raw errors in others:
```typescript
throw err; // Just rethrows without enhancement
```

**Phase mapping:**
- Phase: All CLI phases
- Research flag: LOW - best practice
- Testing requirement: Review all error paths, user-test error scenarios

---

### Pitfall 9: Folder-to-Type Mapping Conflicts

**What goes wrong:** User has folder "people/" expecting character type. But also has "people-references/" for research about real people. Prefix matching maps both to character. User's reference notes get character frontmatter. Or worse: user's custom folder structure doesn't match any pattern, tool suggests nothing helpful.

**Why it happens:**
- Prefix matching too greedy
- One-size-fits-all folder patterns
- No user customization of mappings
- Assuming all users organize same way
- Edge cases in folder naming

**Consequences:**
- Wrong type suggested, user frustrated
- User has to override every suggestion
- User's organization pattern not supported
- Diminished value of auto-inference feature
- Users disable feature, lose convenience

**Warning signs:**
- Prefix matching without exact match priority
- No user-override of folder mappings
- Same folder could match multiple types
- No "unknown" fallback path
- Testing only with standard folder names

**Prevention:**
1. **Exact match priority** - Try exact match before prefix
2. **Configurable mappings** - Let users define their folder patterns
3. **Confidence scoring** - "characters/" high confidence, "char-stuff/" lower
4. **Multiple suggestions** - "Looks like character. Or did you mean reference?"
5. **Learn from corrections** - User overrides teach future suggestions

**Current CLI/plugin analysis:**
The existing folder mapping uses prefix matching which could be too greedy:
```typescript
for (const [pattern, entityType] of FOLDER_TYPE_MAPPINGS) {
  if (part.startsWith(pattern)) {
    return entityType;
  }
}
```

Does exact match first (correct), but prefix matching could still over-match.

**Phase mapping:**
- Phase: Frontmatter Fix CLI (Phase 13)
- Research flag: LOW - straightforward improvement
- Testing requirement: Test with non-standard folder structures

---

### Pitfall 10: Command Palette Discoverability

**What goes wrong:** User installs Obsidian plugin but doesn't know commands exist. Commands have generic names like "Check frontmatter" - not clear what they do. User never finds the features, thinks plugin "doesn't do anything."

**Why it happens:**
- Commands registered but not surfaced
- Names optimized for developer, not user
- No onboarding to explain features
- Ribbon icon present but unclear
- Settings don't explain available commands

**Consequences:**
- Features built but never used
- Users rate plugin poorly ("no features")
- Support: "how do I X?" when command exists
- User confusion about plugin purpose
- Low engagement despite capability

**Prevention:**
1. **Descriptive command names** - "Add Hivemind Frontmatter" not "Check frontmatter"
2. **Ribbon menu** - Clickable icon with dropdown of main actions
3. **Welcome notice** - First run: "Try Ctrl+P > Hivemind to get started"
4. **Settings documentation** - Explain each feature in settings tab
5. **Context menu** - Right-click file > Hivemind options

**Current plugin analysis:**
Existing commands have reasonable names:
- "Generate image from current note"
- "Check and insert missing frontmatter"
- "Connect to MCP server"

Could improve:
- Prefix with "Hivemind:" for grouping in palette
- Add ribbon dropdown menu
- Welcome message on first install

**Phase mapping:**
- Phase: Obsidian Commands (Phase 14)
- Research flag: LOW - UX improvement
- Testing requirement: User testing for discoverability

**Sources:**
- [Plugin Guidelines - Obsidian](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Build a Plugin - Obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

---

## Integration Pitfalls (Existing System)

Pitfalls specific to adding features to an existing, working system.

### Pitfall 11: Breaking Existing Workflows

**What goes wrong:** New `validate` command changes return format. Existing user scripts that parse output break. Or new template field requirements invalidate previously-valid vaults. User's working setup stops working after update.

**Why it happens:**
- Adding features without considering existing users
- Changing public interfaces (exit codes, output format)
- Making previously-optional fields required
- Not considering that users have scripts/automation
- "Improvements" that break backwards compatibility

**Consequences:**
- Existing users forced to update workflows
- Trust erosion: "update broke my setup"
- Users pin to old versions, miss security fixes
- Support burden for migration help
- Reputation damage in community

**Prevention:**
1. **Output format stability** - Document and maintain output format
2. **Exit code stability** - Don't change meaning of exit codes
3. **Additive changes** - New features optional, not required
4. **Deprecation warnings** - Warn before removing/changing behavior
5. **Migration guides** - Document how to update workflows
6. **Changelog clarity** - Explicitly note breaking changes

**Current system analysis:**
The existing CLI has stable interfaces but no explicit stability guarantees documented.
V2.0 maintained backwards compatibility correctly.

**Phase mapping:**
- Phase: All CLI phases
- Research flag: LOW - standard versioning practice
- Testing requirement: Test that existing workflows still work

---

### Pitfall 12: Template Schema vs Frontmatter Tool Mismatch

**What goes wrong:** Template system defines character with fields: `name`, `age`, `type`. Frontmatter fix tool has hardcoded different fields: `title`, `name`, `importance`. User's fix-added frontmatter doesn't match their configured template. Validation fails on files the fix tool just "fixed."

**Why it happens:**
- CLI tools developed separately from template system
- Hardcoded field lists instead of reading from registry
- No integration testing between systems
- Documentation assumes unified system but implementation diverged

**Consequences:**
- User's "fixed" files fail validation
- Confusion: "I just ran fix, why is it invalid?"
- Duplicate effort: run fix, then manually fix the fix
- Undermines trust in tooling
- Users avoid fix tool, do manual edits

**Current system analysis:**
The Obsidian plugin has `FRONTMATTER_TEMPLATES` hardcoded with fields that may not match the template registry.

The CLI's `fix` command uses `templateRegistry.getActive()` which is correct, but this is only available at runtime, not from the static template definitions.

**Prevention:**
1. **Single source of truth** - Tools read from template registry, not hardcoded
2. **Integration tests** - Fix -> Validate pipeline test
3. **Schema validation** - Validate generated frontmatter against template schema
4. **Runtime checks** - Warn if tool's schema doesn't match active template

**Phase mapping:**
- Phase: Frontmatter Fix CLI + Obsidian Commands (Phases 13-14)
- Research flag: MEDIUM - requires careful integration
- Testing requirement: End-to-end test: init -> fix -> validate -> query

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation | Priority |
|-------|---------------|------------|----------|
| Setup Wizard (12) | Too many questions (1) | Budget to 4-5 questions max, test completion rate | HIGH |
| Setup Wizard (12) | TTY detection (7) | Check `process.stdin.isTTY`, provide `--config` flag | MEDIUM |
| Setup Wizard (12) | Unhelpful errors (8) | Wrap errors with context and suggestions | MEDIUM |
| Validate CLI (13) | Silent failures (3) | Explicit outcome reporting, appropriate exit codes | HIGH |
| Validate CLI (13) | Schema mismatch (12) | Read from template registry, not hardcoded | HIGH |
| Fix CLI (13) | Destructive without confirm (2) | Dry-run by default, require `--apply` | CRITICAL |
| Fix CLI (13) | YAML edge cases (6) | Use gray-matter, test complex frontmatter | MEDIUM |
| Fix CLI (13) | Folder mapping conflicts (9) | Exact match first, configurable mappings | LOW |
| Obsidian Commands (14) | MetadataCache races (5) | Wait for cache event, don't read immediately | HIGH |
| Obsidian Commands (14) | Schema mismatch (12) | Use template registry, not hardcoded templates | HIGH |
| Obsidian Commands (14) | Discoverability (10) | Prefix commands, add ribbon menu, welcome notice | LOW |
| All Phases | Windows paths (4) | Use path module exclusively, CI on all platforms | MEDIUM |
| All Phases | Breaking workflows (11) | Output stability, deprecation warnings, migration docs | MEDIUM |

---

## Detection Early Warning System

### Onboarding Fatigue Detection
- [ ] **Completion rate metric**: Track `init` starts vs completions
- [ ] **Time-to-first-value**: Measure from `init` start to first successful query
- [ ] **Question skip rate**: How often users accept defaults without reading
- [ ] **Abandon point**: Which question causes most drop-offs

### Destructive Operation Detection
- [ ] **Git status check**: Warn if user has uncommitted changes before batch ops
- [ ] **Backup verification**: Test that backup actually works before relying on it
- [ ] **Undo testing**: Verify rollback restores exact original content
- [ ] **Real vault testing**: Test fix command on vaults with 100+ diverse files

### Silent Failure Detection
- [ ] **Error rate tracking**: Log errors even when caught, track rate over time
- [ ] **Outcome verification**: After any file op, verify expected change happened
- [ ] **Parse failure alerts**: Track frontmatter parse failures per vault
- [ ] **Exit code auditing**: Ensure non-zero exit when anything fails

### Platform Compatibility Detection
- [ ] **CI matrix**: Run tests on Windows, macOS, Linux in CI
- [ ] **Path normalization**: Log all user-provided paths to verify handling
- [ ] **Manual Windows testing**: Developer tests on actual Windows machine
- [ ] **Docker testing**: Test in containerized environments (no TTY)

### Integration Health Detection
- [ ] **End-to-end tests**: init -> fix -> validate -> query pipeline
- [ ] **Schema drift check**: Compare hardcoded templates to registry at startup
- [ ] **Version compatibility**: Test new CLI against old vaults
- [ ] **Obsidian API checks**: Verify plugin works with latest Obsidian release

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Wizard UX | HIGH | Well-documented patterns, industry research on abandonment rates |
| Destructive operations | HIGH | Standard CLI safety patterns, existing tools demonstrate best practices |
| Error handling | HIGH | Established patterns, good sources |
| Windows paths | HIGH | Node.js path module well-documented, CI practices established |
| Obsidian API | MEDIUM | Known issues documented, but API still evolving |
| YAML parsing | HIGH | gray-matter battle-tested, edge cases documented |
| Integration risks | MEDIUM | Specific to this codebase, requires careful analysis |

---

## Sources

### CLI UX and Onboarding
- [Creating Setup Wizards and When You Shouldn't - LogRocket](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)
- [Why 90% of Users Abandon Apps During Onboarding](https://thisisglance.com/blog/why-90-of-users-abandon-apps-during-onboarding-process)
- [User Onboarding Mistakes - Appcues](https://www.appcues.com/blog/your-retention-problem-starts-with-these-7-user-onboarding-mistakes)
- [Bad User Onboarding Experience - Userpilot](https://userpilot.com/blog/bad-user-onboarding-experience/)
- [Command Line Interface Guidelines](https://clig.dev/)
- [User-Friendly CLIs - KiteMetric](https://kitemetric.com/blogs/make-your-cli-shine-a-guide-to-user-friendly-command-line-interfaces)

### Error Handling
- [Error Handling in CLI Tools - Medium](https://medium.com/@czhoudev/error-handling-in-cli-tools-a-practical-pattern-thats-worked-for-me-6c658a9141a9)
- [Errors Should Never Pass Silently - Pybites](https://pybit.es/articles/python-errors-should-not-pass-silently/)
- [Good Error Messages - Cypress](https://www.cypress.io/blog/2017/07/26/good-error-messages)

### Cross-Platform Node.js
- [Writing Cross-Platform Node.js - George Ornbo](https://shapeshed.com/writing-cross-platform-node/)
- [Cross-Platform Node Guide - GitHub](https://github.com/ehmicky/cross-platform-node-guide)
- [Tips for Writing Portable Node.js Code](https://gist.github.com/domenic/2790533)
- [Node.js Path Module Documentation](https://nodejs.org/api/path.html)

### Obsidian Plugin Development
- [MetadataCache Documentation](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache)
- [processFrontMatter Documentation](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter)
- [Force Metacache Refresh - Forum](https://forum.obsidian.md/t/force-metacache-refresh-or-update-meta-for-specific-file/82415)
- [processFrontMatter Issues - Forum](https://forum.obsidian.md/t/issue-with-app-filemanager-processfrontmatter/79559)
- [Plugin Guidelines - Obsidian](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

### YAML and Frontmatter
- [gray-matter - GitHub](https://github.com/jonschlinkert/gray-matter)
- [Frontmatter Guide - VitePress](https://vitepress.dev/guide/frontmatter)
- [Front Matter Troubleshooting](https://frontmatter.codes/docs/troubleshooting)

### Interactive CLI Tools
- [Inquirer.js - npm](https://www.npmjs.com/package/inquirer)
- [@inquirer/prompts - npm](https://www.npmjs.com/package/@inquirer/prompts)
- [Interactive CLI with Node.js - Opensource.com](https://opensource.com/article/18/7/node-js-interactive-cli)
- [DigitalOcean Inquirer.js Tutorial](https://www.digitalocean.com/community/tutorials/nodejs-interactive-command-line-prompts)
