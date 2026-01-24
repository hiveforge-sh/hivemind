import matter from 'gray-matter';
import { remark } from 'remark';
import type { Root, Heading as MdHeading, Text } from 'mdast';
import type { VaultNote, Heading, BaseFrontmatter } from '../types/index.js';
import { BaseFrontmatterSchema } from '../types/index.js';
import { promises as fs } from 'fs';

export class MarkdownParser {
  /**
   * Parse a markdown file and extract frontmatter, content, and links
   */
  async parseFile(filePath: string): Promise<VaultNote> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(fileContent, filePath);
  }

  /**
   * Parse markdown content string
   */
  parseContent(content: string, filePath: string): VaultNote {
    // Parse frontmatter with gray-matter
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Validate and parse frontmatter
    const parsedFrontmatter = this.parseFrontmatter(frontmatter);

    // Parse markdown AST
    const ast = remark().parse(markdownContent);

    // Extract headings
    const headings = this.extractHeadings(ast);

    // Extract wikilinks
    const links = this.extractWikilinks(markdownContent);

    // Get file stats
    const fileName = filePath.split(/[/\\]/).pop() || '';

    const note: VaultNote = {
      id: parsedFrontmatter.id,
      filePath,
      fileName,
      frontmatter: parsedFrontmatter,
      content: markdownContent,
      links,
      headings,
      stats: {
        size: content.length,
        created: new Date(), // Will be updated by reader
        modified: new Date(),
      },
    };

    return note;
  }

  /**
   * Parse and validate frontmatter
   */
  private parseFrontmatter(raw: any): BaseFrontmatter {
    try {
      // Validate with Zod schema
      return BaseFrontmatterSchema.parse(raw);
    } catch (error) {
      console.error('Frontmatter validation error:', error);
      
      // Return minimal valid frontmatter
      return {
        id: raw.id || 'unknown',
        type: raw.type || 'lore',
        status: raw.status || 'draft',
        tags: raw.tags || [],
        aliases: raw.aliases || [],
      };
    }
  }

  /**
   * Extract headings from markdown AST
   */
  private extractHeadings(ast: Root): Heading[] {
    const headings: Heading[] = [];
    let position = 0;

    const visit = (node: any, pos: number) => {
      if (node.type === 'heading') {
        const mdHeading = node as MdHeading;
        const text = this.extractTextFromNode(mdHeading);
        
        headings.push({
          level: mdHeading.depth,
          text,
          position: pos,
        });
      }

      // Recurse into children
      if (node.children) {
        for (const child of node.children) {
          visit(child, pos++);
        }
      }
    };

    for (const child of ast.children) {
      visit(child, position++);
    }

    return headings;
  }

  /**
   * Extract text content from a node
   */
  private extractTextFromNode(node: any): string {
    if (node.type === 'text') {
      return (node as Text).value;
    }

    if (node.children) {
      return node.children.map((child: any) => this.extractTextFromNode(child)).join('');
    }

    return '';
  }

  /**
   * Extract wikilinks from markdown content
   * Matches [[Link]] and [[Link|Alias]] patterns
   */
  private extractWikilinks(content: string): string[] {
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = wikilinkRegex.exec(content)) !== null) {
      const linkTarget = match[1].trim();
      if (linkTarget && !links.includes(linkTarget)) {
        links.push(linkTarget);
      }
    }

    return links;
  }
}
