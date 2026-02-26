/**
 * Quote Versioning Unit Tests
 * Tests for version increment, draft creation, ordering, and read-only enforcement.
 */

import { describe, it, expect } from 'vitest';

// --- Replicated version logic from send route ---

interface QuoteDraftRow {
  id: string;
  version: number;
  sent_at: string | null;
  total: number | null;
  acceptance_status: string | null;
}

function getNextVersion(currentVersion: number): number {
  return (currentVersion || 1) + 1;
}

function createVersionSnapshot(
  current: QuoteDraftRow
): Omit<QuoteDraftRow, 'id'> & { sent_at: null; acceptance_status: null } {
  return {
    version: getNextVersion(current.version),
    total: current.total,
    sent_at: null,
    acceptance_status: null,
  };
}

interface VersionSummary {
  version: number;
  status: 'draft' | 'sent';
  sentAt?: string;
  total: number | null;
  acceptanceStatus?: string;
}

function mapToVersionSummary(row: QuoteDraftRow): VersionSummary {
  return {
    version: row.version,
    status: row.sent_at ? 'sent' : 'draft',
    sentAt: row.sent_at || undefined,
    total: row.total,
    acceptanceStatus: row.acceptance_status || undefined,
  };
}

function sortVersionsDesc(versions: VersionSummary[]): VersionSummary[] {
  return [...versions].sort((a, b) => b.version - a.version);
}

function isReadOnly(selectedVersion: number, latestVersion: number): boolean {
  return selectedVersion !== latestVersion;
}

function getLatestVersion(versions: VersionSummary[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.version));
}

// --- Tests ---

describe('Version Increment', () => {
  it('increments version by 1', () => {
    expect(getNextVersion(1)).toBe(2);
    expect(getNextVersion(5)).toBe(6);
  });

  it('handles zero/undefined as version 1', () => {
    expect(getNextVersion(0)).toBe(2); // (0 || 1) + 1 = 2
  });
});

describe('Version Snapshot Creation', () => {
  it('creates a new draft with incremented version', () => {
    const current: QuoteDraftRow = {
      id: 'abc-123',
      version: 1,
      sent_at: '2026-02-27T12:00:00Z',
      total: 15000,
      acceptance_status: 'pending',
    };

    const snapshot = createVersionSnapshot(current);

    expect(snapshot.version).toBe(2);
    expect(snapshot.total).toBe(15000);
    expect(snapshot.sent_at).toBeNull();
    expect(snapshot.acceptance_status).toBeNull();
  });

  it('clears acceptance status on new draft', () => {
    const current: QuoteDraftRow = {
      id: 'abc-456',
      version: 3,
      sent_at: '2026-02-27T12:00:00Z',
      total: 25000,
      acceptance_status: 'accepted',
    };

    const snapshot = createVersionSnapshot(current);
    expect(snapshot.acceptance_status).toBeNull();
    expect(snapshot.sent_at).toBeNull();
  });

  it('preserves total from the sent version', () => {
    const current: QuoteDraftRow = {
      id: 'abc-789',
      version: 2,
      sent_at: '2026-02-27T12:00:00Z',
      total: 42000,
      acceptance_status: null,
    };

    const snapshot = createVersionSnapshot(current);
    expect(snapshot.total).toBe(42000);
  });
});

describe('Version Summary Mapping', () => {
  it('maps sent row correctly', () => {
    const row: QuoteDraftRow = {
      id: 'row-1',
      version: 1,
      sent_at: '2026-02-27T12:00:00Z',
      total: 10000,
      acceptance_status: 'pending',
    };

    const summary = mapToVersionSummary(row);
    expect(summary.status).toBe('sent');
    expect(summary.sentAt).toBe('2026-02-27T12:00:00Z');
    expect(summary.acceptanceStatus).toBe('pending');
  });

  it('maps draft row correctly', () => {
    const row: QuoteDraftRow = {
      id: 'row-2',
      version: 2,
      sent_at: null,
      total: null,
      acceptance_status: null,
    };

    const summary = mapToVersionSummary(row);
    expect(summary.status).toBe('draft');
    expect(summary.sentAt).toBeUndefined();
    expect(summary.acceptanceStatus).toBeUndefined();
  });
});

describe('Version List Ordering', () => {
  it('sorts versions in descending order', () => {
    const versions: VersionSummary[] = [
      { version: 1, status: 'sent', total: 10000 },
      { version: 3, status: 'draft', total: null },
      { version: 2, status: 'sent', total: 12000 },
    ];

    const sorted = sortVersionsDesc(versions);
    expect(sorted.map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it('handles single version', () => {
    const versions: VersionSummary[] = [
      { version: 1, status: 'draft', total: null },
    ];

    const sorted = sortVersionsDesc(versions);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]!.version).toBe(1);
  });
});

describe('Read-Only Enforcement', () => {
  it('is not read-only when viewing latest version', () => {
    expect(isReadOnly(3, 3)).toBe(false);
  });

  it('is read-only when viewing older version', () => {
    expect(isReadOnly(1, 3)).toBe(true);
    expect(isReadOnly(2, 3)).toBe(true);
  });
});

describe('Latest Version Detection', () => {
  it('returns highest version number', () => {
    const versions: VersionSummary[] = [
      { version: 3, status: 'draft', total: null },
      { version: 1, status: 'sent', total: 10000 },
      { version: 2, status: 'sent', total: 12000 },
    ];

    expect(getLatestVersion(versions)).toBe(3);
  });

  it('returns 1 for empty version list', () => {
    expect(getLatestVersion([])).toBe(1);
  });

  it('handles single version', () => {
    const versions: VersionSummary[] = [
      { version: 1, status: 'draft', total: null },
    ];
    expect(getLatestVersion(versions)).toBe(1);
  });
});

describe('Version Data Integrity', () => {
  it('draft after send preserves financial data', () => {
    const sentVersion: QuoteDraftRow = {
      id: 'sent-1',
      version: 1,
      sent_at: '2026-02-27T12:00:00Z',
      total: 33450,
      acceptance_status: 'pending',
    };

    const newDraft = createVersionSnapshot(sentVersion);

    // Financial data preserved
    expect(newDraft.total).toBe(sentVersion.total);

    // Send/acceptance data cleared
    expect(newDraft.sent_at).toBeNull();
    expect(newDraft.acceptance_status).toBeNull();

    // Version incremented
    expect(newDraft.version).toBe(2);
  });
});
