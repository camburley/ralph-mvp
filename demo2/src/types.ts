// Config shape used by validate(). Keep this file as the single source of
// truth for the data model. The validator and the tests both depend on it.
//
// Rules (intent — enforced by validate()):
//   - name:          non-empty string
//   - port:          integer in the inclusive range [1, 65535]
//   - tags:          array of strings, no duplicates
//   - featureFlags:  string-keyed map of booleans
//
// NOTE: TypeScript types alone cannot express "port >= 1" or "tags unique".
// Those invariants live in validator.ts at runtime.

export type Config = {
  name: string;
  port: number;
  tags: string[];
  featureFlags: Record<string, boolean>;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};
