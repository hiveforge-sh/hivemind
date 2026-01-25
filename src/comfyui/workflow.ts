import { HivemindDatabase } from '../graph/database.js';
import { ComfyUIWorkflow, StoreWorkflowArgs } from '../types/index.js';
import { join } from 'path';
import { promises as fs } from 'fs';

export class WorkflowManager {
  private database: HivemindDatabase;
  private vaultPath: string;
  private workflowsPath: string;

  constructor(database: HivemindDatabase, vaultPath: string, workflowsPath: string = 'workflows') {
    this.database = database;
    this.vaultPath = vaultPath;
    this.workflowsPath = workflowsPath;
  }

  async storeWorkflow(args: StoreWorkflowArgs): Promise<ComfyUIWorkflow> {
    const workflow: ComfyUIWorkflow = {
      id: args.id,
      name: args.name,
      description: args.description,
      workflow: args.workflow,
      contextFields: args.contextFields,
      outputPath: args.outputPath,
      created: new Date(),
      updated: new Date(),
    };

    // Save workflow JSON to vault
    const workflowDir = join(this.vaultPath, this.workflowsPath);
    await fs.mkdir(workflowDir, { recursive: true });
    
    const workflowFile = join(workflowDir, `${args.id}.json`);
    await fs.writeFile(workflowFile, JSON.stringify(workflow, null, 2), 'utf-8');

    // Store reference in database
    this.database.db.prepare(`
      INSERT OR REPLACE INTO workflows (id, name, description, file_path, context_fields, output_path, created, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workflow.id,
      workflow.name,
      workflow.description || null,
      workflowFile,
      workflow.contextFields ? JSON.stringify(workflow.contextFields) : null,
      workflow.outputPath || null,
      workflow.created.toISOString(),
      workflow.updated.toISOString()
    );

    return workflow;
  }

  async getWorkflow(id: string): Promise<ComfyUIWorkflow | null> {
    const row = this.database.db.prepare(`
      SELECT * FROM workflows WHERE id = ?
    `).get(id) as any;

    if (!row) {
      return null;
    }

    // Load workflow JSON from file
    try {
      const content = await fs.readFile(row.file_path, 'utf-8');
      const workflowData = JSON.parse(content);
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        workflow: workflowData.workflow,
        contextFields: row.context_fields ? JSON.parse(row.context_fields) : undefined,
        outputPath: row.output_path,
        created: new Date(row.created),
        updated: new Date(row.updated),
      };
    } catch (error) {
      console.error(`Failed to load workflow ${id}:`, error);
      return null;
    }
  }

  async listWorkflows(): Promise<Array<Omit<ComfyUIWorkflow, 'workflow'>>> {
    const rows = this.database.db.prepare(`
      SELECT id, name, description, context_fields, output_path, created, updated
      FROM workflows
      ORDER BY updated DESC
    `).all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      contextFields: row.context_fields ? JSON.parse(row.context_fields) : undefined,
      outputPath: row.output_path,
      created: new Date(row.created),
      updated: new Date(row.updated),
    }));
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      return false;
    }

    // Delete workflow file
    const workflowFile = join(this.vaultPath, this.workflowsPath, `${id}.json`);
    try {
      await fs.unlink(workflowFile);
    } catch (error) {
      console.error(`Failed to delete workflow file ${workflowFile}:`, error);
    }

    // Delete from database
    this.database.db.prepare(`DELETE FROM workflows WHERE id = ?`).run(id);
    
    return true;
  }

  async scanWorkflowsDirectory(): Promise<void> {
    const workflowDir = join(this.vaultPath, this.workflowsPath);
    
    try {
      await fs.mkdir(workflowDir, { recursive: true });
      const files = await fs.readdir(workflowDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = join(workflowDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const workflowData = JSON.parse(content);
        
        // Ensure it has required fields
        if (workflowData.id && workflowData.name && workflowData.workflow) {
          await this.storeWorkflow({
            id: workflowData.id,
            name: workflowData.name,
            description: workflowData.description,
            workflow: workflowData.workflow,
            contextFields: workflowData.contextFields,
            outputPath: workflowData.outputPath,
          });
        }
      }
    } catch (error) {
      console.error('Failed to scan workflows directory:', error);
    }
  }
}
