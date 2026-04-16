import { describe, it, expect } from "vitest";
import { validate } from "./validator.js";

describe("validate", () => {
  it("accepts a fully valid config", () => {
    const r = validate({
      name: "api",
      port: 8080,
      tags: ["prod", "edge"],
      featureFlags: { newUi: true, betaSearch: false },
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects a config with the wrong featureFlags shape", () => {
    const r = validate({
      name: "api",
      port: 8080,
      tags: ["prod"],
      featureFlags: { newUi: "yes" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects port 0", () => {
    const r = validate({
      name: "api",
      port: 0,
      tags: ["prod"],
      featureFlags: {},
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects duplicate tags", () => {
    const r = validate({
      name: "api",
      port: 8080,
      tags: ["prod", "prod"],
      featureFlags: {},
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
