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

## Dependencies

We actively monitor dependencies for vulnerabilities using:
- GitHub Dependabot (automatic PRs for security updates)
- npm audit (run during CI/CD)
- CodeQL analysis (static security scanning)

## Changelog

Security-related changes are noted in [CHANGELOG.md](CHANGELOG.md) with the `security` type.
