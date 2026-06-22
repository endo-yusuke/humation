declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(
    name: string,
    fn: () => void | Promise<void>
  ): void;

  export const expect: {
    <T>(value: T, message?: string): {
      not: {
        toContain(expected: string): void;
      };
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
      toHaveLength(expected: number): void;
      toContain(expected: string): void;
      toMatch(expected: RegExp | string): void;
      toThrow(expected?: string): void;
      toBeGreaterThan(expected: number): void;
      toBeUndefined(): void;
    };
  };
}
