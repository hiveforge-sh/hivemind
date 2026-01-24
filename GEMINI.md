# Hivemind MCP Server

## Project Overview

This project is a Hivemind MCP (Model Context Protocol) server. It's designed to bridge the gap between AI tools (like large language models) and a user's world-building notes stored in an Obsidian vault. The server provides a consistent, canonical context from the user's fictional world, ensuring that AI-generated content remains consistent with established lore.

The server is built with Node.js and TypeScript. It uses a HybridRAG (Retrieval-Augmented Generation) system that combines vector, graph, and keyword search for accurate context retrieval. The server works with standard Markdown files, YAML frontmatter, and wikilinks, making it compatible with Obsidian's native format.

## Building and Running

### Prerequisites

*   Node.js (version 20 or higher)
*   An Obsidian vault with world-building content

### Installation

To install the project dependencies, run the following command from the project's root directory:

```bash
npm install
```

### Building

To build the project, run the following command:

```bash
npm run build
```

This will compile the TypeScript source code in the `src` directory and output the JavaScript files to the `dist` directory.

### Running

To run the server, use the following command:

```bash
npm start
```

This will start the MCP server in stdio mode. For development, you can use `npm run dev` to automatically rebuild the project when files change.

### Testing

To run the project's tests, use the following command:

```bash
npm test
```

### Linting

To lint the project's source code, use the following command:

```bash
npm run lint
```

## Development Conventions

The project follows standard TypeScript and Node.js conventions. The source code is located in the `src` directory, and the compiled output is in the `dist` directory. The project uses ESLint for linting and Jest for testing.

The server uses the `@modelcontextprotocol/sdk` to implement the MCP server. The server's main logic is in `src/server.ts`, which handles requests for listing tools, calling tools, listing resources, and reading resources. The server also uses a `VaultWatcher` to monitor changes in the Obsidian vault and re-index the data.

The project is organized into the following main components:

*   **`src/graph`**: Contains the logic for building and querying the knowledge graph.
*   **`src/parser`**: Contains the logic for parsing Markdown files.
*   **`src/search`**: Contains the logic for the HybridRAG search engine.
*   **`src/vault`**: Contains the logic for reading and watching the Obsidian vault.
