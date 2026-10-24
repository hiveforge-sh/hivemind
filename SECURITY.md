# Security Policy

## Supported Versions

The following versions of Hivemind MCP Server are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Hivemind, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. **Email**: Send details to the repository maintainers via GitHub private vulnerability reporting
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release cycle

### Security Considerations

Hivemind is designed to be **local-first**:

- All data stays on your machine by default
- No telemetry or data collection
- Network connections only to configured services (ComfyUI, if enabled)
- MCP protocol uses local stdio transport by default

### Best Practices

1. **Keep Hivemind updated** to the latest version
2. **Protect your vault path** - don't expose via network without authentication
3. **Review ComfyUI settings** if enabled - ensure endpoint is localhost
4. **Use environment variables** for sensitive configuration

### HTTP Bridge

The optional REST bridge (`http.enabled: true`) is hardened against other local
processes and malicious web pages:

- **An API key is always required.** If `http.apiKey` is not set, a random key is
  generated on first start and stored in `<vault>/.hivemind/http-api-key` (mode
  `0600` on POSIX systems). Clients send it in the `X-API-Key` header. It
  protects `/api/*` and `/stats`; only `/health` is public. Keys are compared in
  constant time.
- **Host header validation** blocks DNS rebinding. Only `localhost`,
  `127.0.0.1`, `[::1]`, the configured `http.host` and any names listed in
  `http.allowedHosts` are accepted; anything else gets `403`. If you bind to
  `0.0.0.0` for LAN access, add the hostname or IP clients use to
  `http.allowedHosts`.
- **`corsOrigins` must list explicit origins.** `"*"` is rejected at config
  validation and at startup. Requests from an unlisted `Origin` get `403`.

**Upgrading from versions before these checks:** a bridge that ran without
`apiKey` now requires one (the generated key, or set your own), and a config with
`"*"` in `corsOrigins` no longer starts. Clients reaching the bridge by a
hostname other than the bind host need that name in `http.allowedHosts`.

## Dependencies

We actively monitor dependencies for vulnerabilities using:
- GitHub Dependabot (automatic PRs for security updates)
- npm audit (run during CI/CD)
- CodeQL analysis (static security scanning)

### Known Issues

#### tar < 7.5.7 (GHSA-34x7-hfp2-rc4v) - Accepted Risk

**Status**: Monitoring  
**Severity**: High  
**Affected**: Development dependencies only  
**Risk Assessment**: Low - Not exploitable in our context

**Details**:
- Vulnerability requires extracting malicious tar files
- Only present in `@semantic-release/npm` → bundled `npm` → `tar`
- semantic-release is a **dev dependency** used only in CI/CD for publishing
- The tool doesn't extract user-provided tar files
- Cannot be fixed: tar is bundled inside npm, which is bundled inside @semantic-release/npm
- npm overrides don't work on bundled dependencies

**Mitigation**:
- CI/CD runs in isolated GitHub Actions environment
- No untrusted tar files are extracted during releases
- Will be automatically resolved when @semantic-release/npm updates their bundled npm dependency

**Monitoring**: Tracking upstream issue for when a patched version becomes available.

## Changelog

Security-related changes are noted in [CHANGELOG.md](CHANGELOG.md) with the `security` type.
