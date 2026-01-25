# Contributing to Hivemind MCP Server

We welcome contributions to the Hivemind MCP Server! By contributing, you're helping to build a powerful tool for AI-assisted worldbuilding.

Please take a moment to review this document to make the contribution process as smooth as possible.

## Table of Contents

- [How to Report Bugs](#how-to-report-bugs)
- [How to Suggest Features](#how-to-suggest-features)
- [Development Setup](#development-setup)
- [Coding Style](#coding-style)
- [Pull Request Process](#pull-request-process)
- [Code of Conduct](#code-of-conduct)

## How to Report Bugs

If you find a bug, please open an issue on our [GitHub Issues page](https://github.com/your-username/hivemind-mcp/issues). When reporting a bug, please include:

1.  **A clear and descriptive title.**
2.  **Steps to reproduce the issue:** Explain how to consistently reproduce the bug.
3.  **Expected behavior:** What did you expect to happen?
4.  **Actual behavior:** What actually happened?
5.  **Environment details:**
    *   Node.js version
    *   Operating System
    *   Any relevant configuration (`config.json`)
    *   Hivemind MCP Server version (e.g., `0.1.0`)
6.  **Screenshots or logs (if applicable).**

## How to Suggest Features

We'd love to hear your ideas for new features or improvements! Please open an issue on our [GitHub Issues page](https://github.com/your-username/hivemind-mcp/issues) with the following information:

1.  **A clear and descriptive title.**
2.  **Problem:** Describe the problem you're trying to solve.
3.  **Proposed solution:** Explain how your feature suggestion would address the problem.
4.  **Alternatives considered:** Have you thought about other ways to solve this problem?
5.  **Use case:** How would this feature be used?

## Development Setup

To set up your development environment:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/hivemind-mcp.git
    cd hivemind-mcp
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the project:**
    ```bash
    npm run build
    ```
4.  **Start in development mode (with auto-rebuild):**
    ```bash
    npm run dev
    ```
    This will watch for changes in your `src` directory and automatically recompile the project.

## Coding Style

We follow standard TypeScript and Node.js coding conventions. Please ensure your code adheres to the existing style. We use ESLint for linting, which you can run with:

```bash
npm run lint
```

Please fix any linting errors before submitting a pull request.

## Pull Request Process

1.  **Fork the repository** and create your branch from `main`.
2.  **Make your changes.**
3.  **Write clear, concise commit messages** following the [Conventional Commits](https://www.conventionalcommits.org/) specification:
    - `feat:` - New feature
    - `fix:` - Bug fix
    - `docs:` - Documentation changes
    - `style:` - Code style changes (formatting, etc.)
    - `refactor:` - Code refactoring
    - `perf:` - Performance improvements
    - `test:` - Test changes
    - `build:` - Build system changes
    - `ci:` - CI configuration changes
    - `chore:` - Other changes
    
    Example: `feat: add support for custom templates` or `fix: resolve memory leak in vault watcher`
4.  **Ensure your code passes all tests and lint checks.**
    ```bash
    npm test
    npm run lint
    ```
5.  **Update documentation** if your changes introduce new features or alter existing ones.
6.  **Open a pull request** to the `main` branch of the main repository.
    *   Provide a clear description of your changes and why they are necessary.
    *   Reference any relevant issues.

## Release Process

This project uses automated semantic versioning based on commit messages:

- Commits with `fix:` trigger a **patch** version bump (0.1.0 → 0.1.1)
- Commits with `feat:` trigger a **minor** version bump (0.1.0 → 0.2.0)
- Commits with `BREAKING CHANGE:` in the footer trigger a **major** version bump (0.1.0 → 1.0.0)

When changes are merged to the `master` branch, GitHub Actions automatically:
1. Analyzes commits since the last release
2. Determines the next version number
3. Generates a changelog
4. Creates a GitHub release
5. Publishes the package to npm

**Note:** The commit message hook will validate your commits locally before they are created.

## Code of Conduct

Please note that this project does not yet have a formal Code of Conduct. We expect all contributors to behave respectfully and professionally. We may add a formal Code of Conduct in the future.

Thank you for your contributions!
