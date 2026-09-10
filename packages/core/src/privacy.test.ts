import { describe, expect, it } from "vitest";
import { SensitiveDataError, assertNoSensitiveSecrets } from "./privacy.js";

describe("privacy checks", () => {
  it("rejects common credential and private-key patterns", () => {
    for (const value of [
      "api_key=super-secret-value",
      "ghp_123456789012345678901234567890",
      "-----BEGIN PRIVATE KEY-----",
    ]) {
      expect(() =>
        assertNoSensitiveSecrets({ recipe: { context: [value] } }),
      ).toThrow(SensitiveDataError);
    }
  });

  it("allows ordinary instructions that mention privacy without credentials", () => {
    expect(() =>
      assertNoSensitiveSecrets({
        recipe: {
          instructions: ["Do not expose secrets or private information."],
        },
      }),
    ).not.toThrow();
  });
});
