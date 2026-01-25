# npm Publishing Checklist

## Pre-publish Steps

- [x] Package.json configured with all metadata
- [x] LICENSE file created (MIT)
- [x] .npmignore created to exclude dev files
- [x] README.md updated with installation instructions
- [x] CLI tool added (npx hivemind-mcp)
- [x] Build tested (npm run build)
- [x] Package tested (npm pack --dry-run)

## Publishing Steps

### First Time Setup

1. **Login to npm**:
   ```bash
   npm login
   # Enter your npm credentials
   ```

2. **Verify package name is available**:
   ```bash
   npm search hivemind-mcp
   # If taken, consider: @hiveforge/hivemind or hivemind-mcp-server
   ```

### Publish

```bash
# Publish to npm registry
npm publish

# Or if using scoped package (recommended):
# npm publish --access public
```

### Post-publish

1. **Verify on npm**: https://www.npmjs.com/package/hivemind-mcp

2. **Test installation**:
   ```bash
   npx hivemind-mcp@latest init
   ```

3. **Tag release on GitHub**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

## Version Updates

For future releases:

```bash
# Patch (0.1.0 -> 0.1.1)
npm version patch

# Minor (0.1.0 -> 0.2.0)
npm version minor

# Major (0.1.0 -> 1.0.0)
npm version major

# Then publish
npm publish
```

## Notes

- Package size: ~34 KB (gzipped)
- Node requirement: >=20.0.0
- Dependencies: 7 production, 8 dev
- Includes: dist/, README.md, LICENSE
- Excludes: src/, tests/, docs/, config files
