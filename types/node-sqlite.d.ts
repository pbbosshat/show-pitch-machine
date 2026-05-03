// Type declarations for node:sqlite (Node 22.5+ built-in, experimental).
// @types/node v20 doesn't include these; we declare them manually so TypeScript
// doesn't error while the runtime works perfectly on Node 24.

declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): StatementResultingChanges;
    // Named parameter variant used with { $param: value } SQL syntax
    iterate(...params: unknown[]): IterableIterator<Record<string, unknown>>;
    setReadBigInt(enabled: boolean): void;
    setAllowBareNamedParameters(enabled: boolean): void;
    columns(): Array<{ name: string; column: string | null; table: string | null; database: string | null; type: string | null }>;
    readonly sourceSQL: string;
    readonly expandedSQL: string;
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
    allowExtension?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    function(name: string, options: { deterministic?: boolean; directOnly?: boolean; useBigIntArguments?: boolean; varargs?: boolean }, fn: (...args: unknown[]) => unknown): void;
    function(name: string, fn: (...args: unknown[]) => unknown): void;
    aggregate(name: string, options: {
      start?: unknown;
      step: (acc: unknown, ...values: unknown[]) => unknown;
      inverse?: (acc: unknown, ...values: unknown[]) => unknown;
      result?: (acc: unknown) => unknown;
      deterministic?: boolean;
      directOnly?: boolean;
      useBigIntArguments?: boolean;
      varargs?: boolean;
    }): void;
    createSession(options?: { table?: string; db?: string }): Session;
    applyChangeset(changeset: Uint8Array, options?: {
      filter?: (tableName: string) => boolean;
      onConflict?: number;
    }): boolean;
    readonly open: boolean;
    readonly inTransaction: boolean;
  }

  export interface Session {
    changeset(): Uint8Array;
    patchset(): Uint8Array;
    close(): void;
  }

  export const SQLITE_CHANGESET_OMIT: number;
  export const SQLITE_CHANGESET_REPLACE: number;
  export const SQLITE_CHANGESET_ABORT: number;
}
