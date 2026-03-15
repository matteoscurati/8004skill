import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Shared setup for CLI script tests: mocks process.exit (throws) and silences console.error.
 * Call at the top level of test files that test CLI scripts with exitWithError.
 */
export function setupCliSpies(): void {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
}
