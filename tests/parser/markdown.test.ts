import { describe, it, expect, beforeEach } from '@jest/globals';
import { MarkdownParser } from '../../src/parser/markdown.js';
import { mockNoteWithWikilinks } from '../fixtures.js';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parseContent', () => {
    it('should parse valid markdown with frontmatter', () => {
      const content = `---
id: test-char
type: character
status: draft
tags: []
---
# Content starts here`;
      
      const result = parser.parseContent(content, 'test.md');

      expect(result.id).toBe('test-char');
      expect(result.frontmatter.type).toBe('character');
      expect(result.content).toContain('# Content starts here');
    });

    it('should extract filename from path', () => {
      const content = `---
id: test
type: character
status: draft
tags: []
---
# Content`;

      const result = parser.parseContent(content, 'Characters/Alice.md');
      expect(result.fileName).toBe('Alice.md');
    });

    it('should handle Windows-style paths', () => {
      const content = `---
id: test
type: character
status: draft
tags: []
---
# Content`;

      const result = parser.parseContent(content, 'C:\\Vault\\Characters\\Alice.md');
      expect(result.fileName).toBe('Alice.md');
    });

    it('should throw error for missing frontmatter', () => {
      const content = '# Just a heading\n\nSome content.';

      expect(() => {
        parser.parseContent(content, 'test.md');
      }).toThrow('Missing frontmatter');
    });

    it('should throw error for missing required fields', () => {
      const content = '---\nname: Alice\n---\n# Content';

      expect(() => {
        parser.parseContent(content, 'test.md');
      }).toThrow('Missing required frontmatter fields');
    });

    it('should throw error for missing id field', () => {
      const content = '---\ntype: character\nstatus: draft\n---\n# Content';

      expect(() => {
        parser.parseContent(content, 'test.md');
      }).toThrow('id');
    });

    it('should throw error for missing type field', () => {
      const content = '---\nid: test\nstatus: draft\n---\n# Content';

      expect(() => {
        parser.parseContent(content, 'test.md');
      }).toThrow('type');
    });

    it('should throw error for missing status field', () => {
      const content = '---\nid: test\ntype: character\n---\n# Content';

      expect(() => {
        parser.parseContent(content, 'test.md');
      }).toThrow('status');
    });
  });

  describe('extractWikilinks', () => {
    it('should extract simple wikilinks', () => {
      const content = 'Visit [[Location]] and meet [[Character]].';
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toEqual(['Location', 'Character']);
    });

    it('should extract wikilinks with aliases', () => {
      const content = mockNoteWithWikilinks;
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toContain('Location A');
      expect(result.links).toContain('Character B');
      expect(result.links).toContain('Location C');
    });

    it('should handle multiple occurrences of same link', () => {
      const content = '[[Alice]] meets [[Bob]]. [[Alice]] is brave.';
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toEqual(['Alice', 'Bob']);
    });

    it('should handle empty wikilinks', () => {
      const content = 'Empty link: [[]]';
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toEqual([]);
    });

    it('should handle wikilinks with spaces', () => {
      const content = '[[  Location with Spaces  ]]';
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toContain('Location with Spaces');
    });

    it('should extract no links from content without wikilinks', () => {
      const content = 'Just plain text with no links.';
      const result = parser.parseContent(
        `---\nid: test\ntype: character\nstatus: draft\ntags: []\n---\n${content}`,
        'test.md'
      );

      expect(result.links).toEqual([]);
    });
  });

  describe('extractHeadings', () => {
    it('should extract headings with correct levels', () => {
      const content = `---
id: test
type: character
status: draft
tags: []
---
# Level 1
## Level 2
### Level 3`;

      const result = parser.parseContent(content, 'test.md');

      expect(result.headings).toHaveLength(3);
      expect(result.headings?.[0]).toMatchObject({
        level: 1,
        text: 'Level 1',
      });
      expect(result.headings?.[1]).toMatchObject({
        level: 2,
        text: 'Level 2',
      });
      expect(result.headings?.[2]).toMatchObject({
        level: 3,
        text: 'Level 3',
      });
    });

    it('should handle content without headings', () => {
      const content = `---
id: test
type: character
status: draft
tags: []
---
Just plain content without headings.`;

      const result = parser.parseContent(content, 'test.md');

      expect(result.headings).toEqual([]);
    });
  });
});
