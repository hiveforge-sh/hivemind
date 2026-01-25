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
