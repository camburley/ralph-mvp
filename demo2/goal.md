# Goal: fix the config validator so all tests pass

This package contains a tiny TypeScript config validator and a vitest suite.
Some tests are currently failing.

Your job:

1. Run `npm test`. Note which tests fail.
2. The failure messages are intentionally minimal — they only assert on the
   `ok` / `errors` shape. To know what behavior is expected, you must
   **read both** `src/validator.test.ts` (the spec, in test form) and
   `src/validator.ts` (the implementation), and cross-reference the rules in
   `src/types.ts`.
3. Deduce what the validator should do, then change `src/validator.ts` so all
   four tests pass. You may need several iterations.
4. Do NOT edit the tests. Do NOT edit `types.ts`. Only fix `validator.ts`.
5. When `npm test` reports all 4 tests passing, run:

       git add -A && git commit -m "fix: validator edge cases"

   and signal `done`.

Notes:
- This is harder than the first demo. Expect 5–8 loop iterations.
- Read multiple files before you edit. The fix is small, but invisible until
  you understand the full intent.
