#!/usr/bin/env node
/**
 * Syncs the Obsidian plugin version with the main package version
 * Used during semantic-release to keep versions in sync
 */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('Error: Version argument required');
  process.exit(1);
}

// Update obsidian-plugin/manifest.json
const manifestPath = path.join(__dirname, '..', 'obsidian-plugin', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated obsidian-plugin/manifest.json to version ${version}`);

// Update root manifest.json
const rootManifestPath = path.join(__dirname, '..', 'manifest.json');
const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
rootManifest.version = version;
fs.writeFileSync(rootManifestPath, JSON.stringify(rootManifest, null, 2) + '\n');
console.log(`Updated root manifest.json to version ${version}`);

// Update versions.json
const versionsPath = path.join(__dirname, '..', 'obsidian-plugin', 'versions.json');
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
versions[version] = manifest.minAppVersion;
fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n');
console.log(`Updated versions.json with ${version}: ${manifest.minAppVersion}`);

console.log('✅ Plugin version synced successfully');
