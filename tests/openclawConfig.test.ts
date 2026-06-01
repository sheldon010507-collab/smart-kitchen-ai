import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('OpenClaw example config', () => {
  it('loads the repo-local kitchen skill and allows MCP tools through bundle-mcp', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'openclaw/openclaw.example.json'), 'utf8'));

    expect(config.skills.load.extraDirs).toContain('./openclaw/skills');
    expect(config.tools.allow).toContain('bundle-mcp');
    expect(config.agents.defaults.tools.allow).toContain('bundle-mcp');
    expect(config.mcp.servers['kitchen-tools'].args).toContain('./mcp/kitchen-tools/dist/index.js');
  });
});
