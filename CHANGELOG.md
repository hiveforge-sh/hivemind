# [2.7.0](https://github.com/hiveforge-sh/hivemind/compare/v2.6.1...v2.7.0) (2026-01-27)


### Bug Fixes

* **12-04:** show auto-detection for any confidence level ([a6a1380](https://github.com/hiveforge-sh/hivemind/commit/a6a1380917ef8dce77b3e9c702120b469471c442))
* **16-04:** address issues found during human verification ([8434c5b](https://github.com/hiveforge-sh/hivemind/commit/8434c5b9c956bf94542d8d7aa302d44475dc805d))


### Features

* **12-01:** create shared CLI utilities ([e015d55](https://github.com/hiveforge-sh/hivemind/commit/e015d55b74d9a8c1c41df5dcc1ec9f16a795bbed))
* **12-01:** create validators module ([a541a48](https://github.com/hiveforge-sh/hivemind/commit/a541a48d81140414fe035f59dab7bfc2f9df8726))
* **12-02:** create detection wrapper with confirmation ([2787ed2](https://github.com/hiveforge-sh/hivemind/commit/2787ed2ced757c05b0aac0db51102be5674ce47b))
* **12-02:** create prompts module with template selection ([f5361ac](https://github.com/hiveforge-sh/hivemind/commit/f5361ac6322ac4a96f8ba207bdd3fcc428d26166))
* **12-02:** create wizard orchestrator ([504a9fa](https://github.com/hiveforge-sh/hivemind/commit/504a9fa110f91719172c41c49382f52f0e87f1c0))
* **12-03:** create init index with non-interactive mode ([5bf2595](https://github.com/hiveforge-sh/hivemind/commit/5bf259501e9de67e6bb35ee43ccc968e05936cfa))
* **12-03:** create output module for config generation ([72dc5b1](https://github.com/hiveforge-sh/hivemind/commit/72dc5b146b3e6e25c558b76955a275b61142787c))
* **12-03:** update CLI to use new init command ([3c1fcec](https://github.com/hiveforge-sh/hivemind/commit/3c1fcec047a74b632807545d763f63b7264eaabd))
* **12-04:** add option to open Claude Desktop config folder ([406d91d](https://github.com/hiveforge-sh/hivemind/commit/406d91d0d55e1e522036ed7662d10c8ed4941b8a))
* **13-02:** update Obsidian plugin to use shared FolderMapper ([f9b1480](https://github.com/hiveforge-sh/hivemind/commit/f9b14805e26c59bcdceebf02d9b404446e7852db))
* **13-03:** add createFromTemplate helper and wire Obsidian plugin ([7b32d78](https://github.com/hiveforge-sh/hivemind/commit/7b32d78236157adefcb590b5fceb111d51625d14))
* **13-03:** add folder mappings to all builtin templates ([7115f8f](https://github.com/hiveforge-sh/hivemind/commit/7115f8f81a6bb2fa7be1aa216e3b248551b5f558))
* **13-03:** add folderMappings field to TemplateDefinition with Zod schema ([efbd1fe](https://github.com/hiveforge-sh/hivemind/commit/efbd1fe7e4f386f0fde2d8d0d451f65699224dff))
* **13-04:** add getFolderMappings() accessor to TemplateRegistry ([56d5b8a](https://github.com/hiveforge-sh/hivemind/commit/56d5b8a43b4df0424028ac99834586c0044d4c71))
* **13-04:** update CLI fix command to use async FolderMapper with template config ([1eb7470](https://github.com/hiveforge-sh/hivemind/commit/1eb74701e7a94a447ff7213cd73b9a7c2d50d1e6))
* **13-04:** wire Obsidian plugin to use template folderMappings ([8f5acd8](https://github.com/hiveforge-sh/hivemind/commit/8f5acd8310b89951b49c78f75cc038411578b524))
* **14-01:** create frontmatter validator module ([2aaaff4](https://github.com/hiveforge-sh/hivemind/commit/2aaaff45602781a58a377b58f6acc2d66d46ca99))
* **14-01:** create validation scanner module ([e3e4ec8](https://github.com/hiveforge-sh/hivemind/commit/e3e4ec89becf5f9ece9c9090576206415d42379e))
* **14-01:** create validation types module ([b2b6b75](https://github.com/hiveforge-sh/hivemind/commit/b2b6b7590f26b395ed8353b8bbf9f085a27d5906))
* **14-02:** create CLI validate command entry point ([4220e46](https://github.com/hiveforge-sh/hivemind/commit/4220e469a7ee08f5704b757899012e1622ef59f9))
* **14-02:** create output formatter module ([985fc26](https://github.com/hiveforge-sh/hivemind/commit/985fc268e986ddf1299a651811229bebaa74e551))
* **14-02:** wire validate command into CLI ([2ed98a2](https://github.com/hiveforge-sh/hivemind/commit/2ed98a2bb49f33b1911cb0d7bf05223bc85207a6))
* **15-01:** create FileFixer class for frontmatter generation ([395223e](https://github.com/hiveforge-sh/hivemind/commit/395223eafd9ef900b747b4fb5f538210774bec4b))
* **15-01:** create fix types module ([d95f743](https://github.com/hiveforge-sh/hivemind/commit/d95f7436ec05943450ce18375a9fb4ea9ebb3f5b))
* **15-01:** create ID generator with collision detection ([9f5e7cd](https://github.com/hiveforge-sh/hivemind/commit/9f5e7cd5acc595e47a3fba6cc635f54e297d7344))
* **15-02:** create atomic file writer ([95b4b87](https://github.com/hiveforge-sh/hivemind/commit/95b4b8796816e60d28433c95a1fe4c23bdae626f))
* **15-02:** create output formatter module ([3131c73](https://github.com/hiveforge-sh/hivemind/commit/3131c73169048bc56d196aa3f6369c310cbafc44))
* **15-03:** create fix command CLI entry point ([d906e27](https://github.com/hiveforge-sh/hivemind/commit/d906e27dfd8dc95da09635b6aadac9b1c71c089b))
* **15-03:** wire fix command into main CLI ([e83295d](https://github.com/hiveforge-sh/hivemind/commit/e83295de2b4acb8ca7637a3e61f6b6bdefdaf9d5))
* **15-04:** add ambiguous file tracking to FileFixer ([26e6b3b](https://github.com/hiveforge-sh/hivemind/commit/26e6b3ba84c8b74ce9b92f0260673a78cd5b3ddf))
* **15-04:** implement interactive type prompting for ambiguous folders ([83fc6be](https://github.com/hiveforge-sh/hivemind/commit/83fc6be5807522ffcbe843acfc4681ce8b368a8c))
* **16-01:** add context menu for add-frontmatter on files and folders ([fd4d1aa](https://github.com/hiveforge-sh/hivemind/commit/fd4d1aa398ad8da370da154d1ad2084399c362e8))
* **16-01:** implement add-frontmatter command with preview modal ([36a0b9a](https://github.com/hiveforge-sh/hivemind/commit/36a0b9a4c3d2f4477c2de5bfdf6d9594e6a24a02))
* **16-02:** add fix frontmatter commands with FixFieldsModal ([492d95b](https://github.com/hiveforge-sh/hivemind/commit/492d95b31d51bf1ac507fabed77a17c726869305))
* **16-02:** add validate frontmatter command with ValidationResultModal ([274d4db](https://github.com/hiveforge-sh/hivemind/commit/274d4db95ef1e7168b3c12cf86505a4268b79f77))
* **16-03:** create ValidationSidebarView for vault-wide validation ([368edc1](https://github.com/hiveforge-sh/hivemind/commit/368edc15ec665ec49853c74cf1c41b24504a489a))
* **16-03:** enhance settings tab with frontmatter options ([0af7bc8](https://github.com/hiveforge-sh/hivemind/commit/0af7bc8afb0a957effe5aea8bd740e9c8119fbac))

## [2.6.1](https://github.com/hiveforge-sh/hivemind/compare/v2.6.0...v2.6.1) (2026-01-26)


### Bug Fixes

* **tests:** use compiled CLI to prevent timeouts on Windows CI ([ec0007f](https://github.com/hiveforge-sh/hivemind/commit/ec0007fcaef40bd98ef2fb330f83c909b178fef0))

# [2.6.0](https://github.com/hiveforge-sh/hivemind/compare/v2.5.0...v2.6.0) (2026-01-26)


### Bug Fixes

* **search:** handle empty query in FTS5 search ([b6e6126](https://github.com/hiveforge-sh/hivemind/commit/b6e6126979bd71854bd35566735786fa74eb6c7b))


### Features

* **11-01:** add template initialization to server startup ([fafb0eb](https://github.com/hiveforge-sh/hivemind/commit/fafb0ebef310a8991d3c313a7d45d9a6e64df3d6))

# [2.5.0](https://github.com/hiveforge-sh/hivemind/compare/v2.4.0...v2.5.0) (2026-01-26)


### Features

* add developer experience improvements and community templates ([0653145](https://github.com/hiveforge-sh/hivemind/commit/065314506f1fd13ffc8747cdaf83fdaafe75fe07))

# [2.4.0](https://github.com/hiveforge-sh/hivemind/compare/v2.3.0...v2.4.0) (2026-01-26)


### Features

* complete v2.0 template system with relationships and built-in templates ([b1619c6](https://github.com/hiveforge-sh/hivemind/commit/b1619c6168230f35e8e339f29bb03e4f0608758b))

# [2.3.0](https://github.com/hiveforge-sh/hivemind/compare/v2.2.0...v2.3.0) (2026-01-26)


### Bug Fixes

* **cli:** correct package name in CLI help messages ([f8cf572](https://github.com/hiveforge-sh/hivemind/commit/f8cf572ffc989932c4d2e7e57d33be53c34f31c6))
* resolve npm audit vulnerability and Zod 4 type errors ([977bac7](https://github.com/hiveforge-sh/hivemind/commit/977bac714098b430ef6c45f9f200aa88ca139392))
* **tests:** handle macOS symlinks in path comparisons ([cd6c191](https://github.com/hiveforge-sh/hivemind/commit/cd6c1914fc49301d2b73aa496eddd44c4db1abbb))


### Features

* add frontmatter authoring tools, custom types, and folder mapping ([723471e](https://github.com/hiveforge-sh/hivemind/commit/723471ed5d90504b76b25f957b2f22a735657b8b))
* **mcp:** add dynamic tool generation from template entity types ([3123aba](https://github.com/hiveforge-sh/hivemind/commit/3123abaf067230335c5f0d1224706d8ffd927aba))

# [2.2.0](https://github.com/hiveforge-io/hivemind/compare/v2.1.1...v2.2.0) (2026-01-26)


### Features

* **06-01:** create template configuration interfaces ([0eab470](https://github.com/hiveforge-io/hivemind/commit/0eab47057c141400f57b5ab6ca742ab9b003a569))

## [2.1.1](https://github.com/hiveforge-io/hivemind/compare/v2.1.0...v2.1.1) (2026-01-26)


### Bug Fixes

* update code for zod v4 compatibility ([24d320c](https://github.com/hiveforge-io/hivemind/commit/24d320c06f0729ced2b9b78f87f43f0daf1507b8))

# [2.1.0](https://github.com/hiveforge-io/hivemind/compare/v2.0.0...v2.1.0) (2026-01-25)


### Features

* complete Milestone 1.0 with canon workflow, asset tools, and cross-platform support ([b6d1841](https://github.com/hiveforge-io/hivemind/commit/b6d1841df33cfef60820a49f5192992305166e15))

# [2.0.0](https://github.com/hiveforge-io/hivemind/compare/v1.14.0...v2.0.0) (2026-01-25)


### Features

* migrate from Jest to Vitest for better ESM support ([4a28eca](https://github.com/hiveforge-io/hivemind/commit/4a28eca04521e0f85679429d383624ca4b7fd0df))
* set up Jest testing infrastructure with initial tests ([599e24e](https://github.com/hiveforge-io/hivemind/commit/599e24e0839023fb67eb4dbf0ab1deca5cc6274b))


### Reverts

* restore git plugin in semantic-release config ([5e9e24f](https://github.com/hiveforge-io/hivemind/commit/5e9e24f173041bc06b288d92ec3efbf8455ab6e4))


### BREAKING CHANGES

* Switched test runner from Jest to Vitest

- Remove Jest, ts-jest, @jest/globals, @types/jest
- Install Vitest with UI and coverage support
- Create vitest.config.ts with coverage thresholds
- Update all test files to import from 'vitest'
- Update test scripts in package.json
- Fix MarkdownParser test (status has default value)

Benefits:
- Native ESM support (no more remark import errors!)
- Faster test execution
- Better TypeScript integration
- UI dashboard available with npm run test:ui

Test Results:
- ✅ 18/18 tests passing
- ✅ MarkdownParser: 92% coverage
- ✅ ComfyUIClient: 40% coverage
- ✅ Overall: 8.4% coverage (baseline established)

Coverage thresholds set to 8% as starting point.
Will increase gradually as more tests are added.

# [1.14.0](https://github.com/hiveforge-io/hivemind/compare/v1.13.0...v1.14.0) (2026-01-25)


### Features

* add explicit privacy notices and network consent UI ([648c46c](https://github.com/hiveforge-io/hivemind/commit/648c46c7fa681f7051fd3f61e02f0e99835deab2))

# [1.13.0](https://github.com/hiveforge-io/hivemind/compare/v1.12.0...v1.13.0) (2026-01-25)


### Features

* add Obsidian plugin files to GitHub releases ([2324d73](https://github.com/hiveforge-io/hivemind/commit/2324d73d3d1b797ab7566e0f771c2fc5bfaf880f))

# [1.12.0](https://github.com/hiveforge-io/hivemind/compare/v1.11.0...v1.12.0) (2026-01-25)


### Features

* fix prompt injection and add missing frontmatter feature ([44ccbea](https://github.com/hiveforge-io/hivemind/commit/44ccbead8bd0a218fc7fddd71818f855ea5f0db3))

# [1.11.0](https://github.com/hiveforge-io/hivemind/compare/v1.10.0...v1.11.0) (2026-01-25)


### Features

* update server and plugin with latest changes ([1e50c0e](https://github.com/hiveforge-io/hivemind/commit/1e50c0e9cf86ce5b496e45c403da0d301cf02d31))

# [1.10.0](https://github.com/hiveforge-io/hivemind/compare/v1.9.0...v1.10.0) (2026-01-25)


### Features

* add Obsidian plugin for ComfyUI integration ([28e440c](https://github.com/hiveforge-io/hivemind/commit/28e440c7e5efcfbc74a2480c02f2040b6eb97588))

# [1.9.0](https://github.com/hiveforge-io/hivemind/compare/v1.8.0...v1.9.0) (2026-01-25)


### Features

* add ComfyUI integration with workflow management and image generation ([4647402](https://github.com/hiveforge-io/hivemind/commit/46474027a3883b5f8bae708da4d07c95aa94f7d4))

# [1.8.0](https://github.com/hiveforge-io/hivemind/compare/v1.7.0...v1.8.0) (2026-01-25)


### Features

* display vault stats automatically on server startup ([02f456f](https://github.com/hiveforge-io/hivemind/commit/02f456fb645056e62c6af60e721db6c0a560a318))

# [1.7.0](https://github.com/hiveforge-io/hivemind/compare/v1.6.0...v1.7.0) (2026-01-25)


### Features

* add vault statistics tool and skipped files logging ([e6b9359](https://github.com/hiveforge-io/hivemind/commit/e6b935908544d5bdae3596588bf1263f3832b421))

# [1.6.0](https://github.com/hiveforge-io/hivemind/compare/v1.5.1...v1.6.0) (2026-01-25)


### Features

* add animated progress bar and clean up console output ([b66427e](https://github.com/hiveforge-io/hivemind/commit/b66427ea86cb5b59db4edc813f6dcdffb9d28f42))

## [1.5.1](https://github.com/hiveforge-io/hivemind/compare/v1.5.0...v1.5.1) (2026-01-25)


### Bug Fixes

* update watcher glob pattern to include root directory files ([a43abfa](https://github.com/hiveforge-io/hivemind/commit/a43abfa47727d8a3a767c7e01dee0059145e094b))

# [1.5.0](https://github.com/hiveforge-io/hivemind/compare/v1.4.0...v1.5.0) (2026-01-25)


### Features

* enhance file watcher with atomic write support and verbose logging ([7e3326b](https://github.com/hiveforge-io/hivemind/commit/7e3326b9a141083f2108a8841e76c102daefa865))

# [1.4.0](https://github.com/hiveforge-io/hivemind/compare/v1.3.0...v1.4.0) (2026-01-25)


### Features

* add verbose logging to file watcher for debugging ([84894e1](https://github.com/hiveforge-io/hivemind/commit/84894e17fac0f97613112f81980092fd02396565))

# [1.3.0](https://github.com/hiveforge-io/hivemind/compare/v1.2.0...v1.3.0) (2026-01-25)


### Features

* track and report ignored files with missing frontmatter ([3ec0e80](https://github.com/hiveforge-io/hivemind/commit/3ec0e801b27fabeac32b38fc077af4a2f640f9f7))

# [1.2.0](https://github.com/hiveforge-io/hivemind/compare/v1.1.1...v1.2.0) (2026-01-25)


### Features

* add ASCII logo banner to server startup ([d8f4861](https://github.com/hiveforge-io/hivemind/commit/d8f4861102e3f586803bb45816bb4e64918df309))

## [1.1.1](https://github.com/hiveforge-io/hivemind/compare/v1.1.0...v1.1.1) (2026-01-25)


### Bug Fixes

* handle --vault flag in CLI entry point ([92392c2](https://github.com/hiveforge-io/hivemind/commit/92392c2e1d53101dc8b75a271fde402262f50e04))

# [1.1.0](https://github.com/hiveforge-io/hivemind/compare/v1.0.0...v1.1.0) (2026-01-25)


### Features

* add CLI vault flag, stale index detection, and rebuild_index tool ([6cf8fa0](https://github.com/hiveforge-io/hivemind/commit/6cf8fa0b455c032adfec8d2d4c0245256a064bcd))

# 1.0.0 (2026-01-25)


### Bug Fixes

* allow test script to pass with no tests ([a0442cd](https://github.com/hiveforge-io/hivemind/commit/a0442cd678f9e73fa637d5a3cee02aac5315c6f1))


### Features

* **02-01:** add Zod schemas for Event, Faction, Lore, Asset ([f62e9d5](https://github.com/hiveforge-io/hivemind/commit/f62e9d581340416f1d428de9bdb6f8b4b405e528))
* **02-01:** create vault templates for all entity types ([511947c](https://github.com/hiveforge-io/hivemind/commit/511947c6152f59905bc7a917421dc557f5f947e4))
* **02-01:** enhance Location schema with hierarchy support ([bd4c36a](https://github.com/hiveforge-io/hivemind/commit/bd4c36a5ebe8cfe32270602cc8f6d03a7ae12ef3))
* add content control parameters to MCP tools ([aa127fe](https://github.com/hiveforge-io/hivemind/commit/aa127feb42b9998df2df74723de30817dc91a888))
* add PowerShell vault migration script ([8e95162](https://github.com/hiveforge-io/hivemind/commit/8e95162db3d9f6cc53df67a1d069a97a1ccef275))

# 1.0.0 (2026-01-25)


### Bug Fixes

* allow test script to pass with no tests ([a0442cd](https://github.com/hiveforge-io/hivemind/commit/a0442cd678f9e73fa637d5a3cee02aac5315c6f1))


### Features

* **02-01:** add Zod schemas for Event, Faction, Lore, Asset ([f62e9d5](https://github.com/hiveforge-io/hivemind/commit/f62e9d581340416f1d428de9bdb6f8b4b405e528))
* **02-01:** create vault templates for all entity types ([511947c](https://github.com/hiveforge-io/hivemind/commit/511947c6152f59905bc7a917421dc557f5f947e4))
* **02-01:** enhance Location schema with hierarchy support ([bd4c36a](https://github.com/hiveforge-io/hivemind/commit/bd4c36a5ebe8cfe32270602cc8f6d03a7ae12ef3))
* add content control parameters to MCP tools ([aa127fe](https://github.com/hiveforge-io/hivemind/commit/aa127feb42b9998df2df74723de30817dc91a888))
* add PowerShell vault migration script ([8e95162](https://github.com/hiveforge-io/hivemind/commit/8e95162db3d9f6cc53df67a1d069a97a1ccef275))
