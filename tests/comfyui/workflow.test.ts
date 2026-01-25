import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowManager } from '../../src/comfyui/workflow.js';
import { HivemindDatabase } from '../../src/graph/database.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { promises as fs } from 'fs';

describe('WorkflowManager', () => {
  let tempDir: string;
  let vaultPath: string;
  let database: HivemindDatabase;
  let manager: WorkflowManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-workflow-'));
    vaultPath = join(tempDir, 'vault');
    mkdirSync(vaultPath);

    const dbPath = join(vaultPath, '.hivemind', 'hivemind.db');
    database = new HivemindDatabase({ path: dbPath });
    manager = new WorkflowManager(database, vaultPath);
  });

  afterEach(() => {
    if (database) {
      database.close();
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('storeWorkflow', () => {
    it('should store a workflow with all fields', async () => {
      const workflow = await manager.storeWorkflow({
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        workflow: { nodes: [], connections: [] },
        contextFields: ['appearance', 'personality'],
        outputPath: 'outputs/test',
      });

      expect(workflow).toMatchObject({
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        workflow: { nodes: [], connections: [] },
        contextFields: ['appearance', 'personality'],
        outputPath: 'outputs/test',
      });
      expect(workflow.created).toBeInstanceOf(Date);
      expect(workflow.updated).toBeInstanceOf(Date);
    });

    it('should store workflow without optional fields', async () => {
      const workflow = await manager.storeWorkflow({
        id: 'minimal-workflow',
        name: 'Minimal Workflow',
        workflow: { test: true },
      });

      expect(workflow).toMatchObject({
        id: 'minimal-workflow',
        name: 'Minimal Workflow',
        workflow: { test: true },
      });
      expect(workflow.description).toBeUndefined();
      expect(workflow.contextFields).toBeUndefined();
      expect(workflow.outputPath).toBeUndefined();
    });

    it('should save workflow JSON to file', async () => {
      await manager.storeWorkflow({
        id: 'file-test',
        name: 'File Test',
        workflow: { test: 'data' },
      });

      const workflowFile = join(vaultPath, 'workflows', 'file-test.json');
      const content = await fs.readFile(workflowFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.id).toBe('file-test');
      expect(parsed.name).toBe('File Test');
      expect(parsed.workflow).toEqual({ test: 'data' });
    });

    it('should update existing workflow', async () => {
      // Store initial version
      await manager.storeWorkflow({
        id: 'update-test',
        name: 'Original Name',
        workflow: { version: 1 },
      });

      // Update
      const updated = await manager.storeWorkflow({
        id: 'update-test',
        name: 'Updated Name',
        workflow: { version: 2 },
        description: 'Added description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.workflow).toEqual({ version: 2 });
      expect(updated.description).toBe('Added description');
    });
  });

  describe('getWorkflow', () => {
    it('should retrieve stored workflow', async () => {
      await manager.storeWorkflow({
        id: 'retrieve-test',
        name: 'Retrieve Test',
        workflow: { data: 'test' },
        contextFields: ['field1', 'field2'],
      });

      const retrieved = await manager.getWorkflow('retrieve-test');

      expect(retrieved).toMatchObject({
        id: 'retrieve-test',
        name: 'Retrieve Test',
        workflow: { data: 'test' },
        contextFields: ['field1', 'field2'],
      });
    });

    it('should return null for non-existent workflow', async () => {
      const result = await manager.getWorkflow('does-not-exist');
      expect(result).toBeNull();
    });

    it('should return null if workflow file is missing', async () => {
      // Store workflow
      await manager.storeWorkflow({
        id: 'missing-file',
        name: 'Missing File',
        workflow: { test: true },
      });

      // Delete the file but leave DB entry
      const workflowFile = join(vaultPath, 'workflows', 'missing-file.json');
      await fs.unlink(workflowFile);

      const result = await manager.getWorkflow('missing-file');
      expect(result).toBeNull();
    });
  });

  describe('listWorkflows', () => {
    it('should list all workflows', async () => {
      await manager.storeWorkflow({
        id: 'workflow-1',
        name: 'Workflow 1',
        workflow: {},
      });

      await manager.storeWorkflow({
        id: 'workflow-2',
        name: 'Workflow 2',
        workflow: {},
      });

      const list = await manager.listWorkflows();

      expect(list).toHaveLength(2);
      expect(list.map(w => w.id)).toContain('workflow-1');
      expect(list.map(w => w.id)).toContain('workflow-2');
    });

    it('should not include workflow JSON in list', async () => {
      await manager.storeWorkflow({
        id: 'list-test',
        name: 'List Test',
        workflow: { large: 'data' },
      });

      const list = await manager.listWorkflows();
      const workflow = list[0];

      expect(workflow).not.toHaveProperty('workflow');
      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('name');
    });

    it('should return empty array when no workflows exist', async () => {
      const list = await manager.listWorkflows();
      expect(list).toEqual([]);
    });

    it('should order by updated date descending', async () => {
      await manager.storeWorkflow({
        id: 'old-workflow',
        name: 'Old',
        workflow: {},
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.storeWorkflow({
        id: 'new-workflow',
        name: 'New',
        workflow: {},
      });

      const list = await manager.listWorkflows();

      expect(list[0].id).toBe('new-workflow');
      expect(list[1].id).toBe('old-workflow');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow and file', async () => {
      await manager.storeWorkflow({
        id: 'delete-test',
        name: 'Delete Test',
        workflow: {},
      });

      const result = await manager.deleteWorkflow('delete-test');
      expect(result).toBe(true);

      // Verify workflow is deleted
      const retrieved = await manager.getWorkflow('delete-test');
      expect(retrieved).toBeNull();

      // Verify file is deleted
      const workflowFile = join(vaultPath, 'workflows', 'delete-test.json');
      await expect(fs.access(workflowFile)).rejects.toThrow();
    });

    it('should return false for non-existent workflow', async () => {
      const result = await manager.deleteWorkflow('does-not-exist');
      expect(result).toBe(false);
    });

    it('should handle missing file gracefully', async () => {
      await manager.storeWorkflow({
        id: 'delete-missing',
        name: 'Delete Missing',
        workflow: {},
      });

      // Delete file manually
      const workflowFile = join(vaultPath, 'workflows', 'delete-missing.json');
      await fs.unlink(workflowFile);

      // getWorkflow will return null (file missing), so deleteWorkflow returns false
      const result = await manager.deleteWorkflow('delete-missing');
      expect(result).toBe(false);
    });
  });

  describe('scanWorkflowsDirectory', () => {
    it('should scan and import existing workflow files', async () => {
      const workflowDir = join(vaultPath, 'workflows');
      await fs.mkdir(workflowDir, { recursive: true });

      // Create workflow files manually
      await fs.writeFile(
        join(workflowDir, 'scan-test-1.json'),
        JSON.stringify({
          id: 'scan-test-1',
          name: 'Scan Test 1',
          workflow: { test: 1 },
        }),
        'utf-8'
      );

      await fs.writeFile(
        join(workflowDir, 'scan-test-2.json'),
        JSON.stringify({
          id: 'scan-test-2',
          name: 'Scan Test 2',
          workflow: { test: 2 },
          description: 'With description',
        }),
        'utf-8'
      );

      await manager.scanWorkflowsDirectory();

      // Verify workflows were imported
      const workflow1 = await manager.getWorkflow('scan-test-1');
      expect(workflow1?.name).toBe('Scan Test 1');

      const workflow2 = await manager.getWorkflow('scan-test-2');
      expect(workflow2?.name).toBe('Scan Test 2');
      expect(workflow2?.description).toBe('With description');
    });

    it('should skip non-JSON files', async () => {
      const workflowDir = join(vaultPath, 'workflows');
      await fs.mkdir(workflowDir, { recursive: true });

      await fs.writeFile(join(workflowDir, 'readme.txt'), 'Not a workflow', 'utf-8');

      await manager.scanWorkflowsDirectory();

      const list = await manager.listWorkflows();
      expect(list).toHaveLength(0);
    });

    it('should skip invalid workflow files', async () => {
      const workflowDir = join(vaultPath, 'workflows');
      await fs.mkdir(workflowDir, { recursive: true });

      // Missing required fields
      await fs.writeFile(
        join(workflowDir, 'invalid.json'),
        JSON.stringify({ name: 'Only Name' }),
        'utf-8'
      );

      await manager.scanWorkflowsDirectory();

      const list = await manager.listWorkflows();
      expect(list).toHaveLength(0);
    });

    it('should create workflows directory if missing', async () => {
      await manager.scanWorkflowsDirectory();

      const workflowDir = join(vaultPath, 'workflows');
      const stat = await fs.stat(workflowDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('custom workflows path', () => {
    it('should use custom workflows path', async () => {
      const customManager = new WorkflowManager(database, vaultPath, 'custom-workflows');

      await customManager.storeWorkflow({
        id: 'custom-path',
        name: 'Custom Path',
        workflow: {},
      });

      const workflowFile = join(vaultPath, 'custom-workflows', 'custom-path.json');
      const exists = await fs.access(workflowFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
