import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

describe('console scanning entrypoints', () => {
  it('does not expose inventory or fridge photo scanning from the web console', () => {
    const inventoryView = readFileSync(join(repoRoot, 'features/inventory/InventoryView.tsx'), 'utf8');
    const storeDashboard = readFileSync(join(repoRoot, 'features/dashboard/StoreDashboard.tsx'), 'utf8');
    const stage1Ingest = readFileSync(join(repoRoot, 'components/setup/Stage1Ingest.tsx'), 'utf8');
    const appShell = readFileSync(join(repoRoot, 'App.tsx'), 'utf8');

    expect(existsSync(join(repoRoot, 'components/Scanner.tsx'))).toBe(false);
    expect(existsSync(join(repoRoot, 'components/setup/PhotoScanSection.tsx'))).toBe(false);
    expect(existsSync(join(repoRoot, 'features/inventory-scan'))).toBe(false);
    expect(appShell).not.toContain("from './components/Scanner'");
    expect(appShell).not.toContain('isScannerOpen');
    expect(appShell).not.toContain('openScanner');
    expect(inventoryView).not.toContain("onOpenScanner('receipt')");
    expect(inventoryView).not.toContain("onOpenScanner('fridge')");
    expect(storeDashboard).not.toContain("onOpenScanner('receipt')");
    expect(storeDashboard).not.toContain("onOpenScanner('fridge')");
    expect(stage1Ingest).not.toContain('PhotoScanSection');
    expect(stage1Ingest).not.toContain("setImportPath('photo')");
  });
});
