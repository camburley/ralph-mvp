import type { Config, ValidationResult } from "./types.js";

// validate: returns { ok, errors[] }.
// ok === true   <=> errors.length === 0
// ok === false  <=> errors describe each failed rule
//
// See types.ts for the intended rules.
export function validate(cfg: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof cfg !== "object" || cfg === null) {
    return { ok: false, errors: ["config must be an object"] };
  }
  const c = cfg as Partial<Config>;

  // name
  if (typeof c.name !== "string" || c.name.length === 0) {
    errors.push("name must be a non-empty string");
  }

  // port
  if (typeof c.port !== "number" || !Number.isInteger(c.port)) {
    errors.push("port must be an integer");
  } else if (c.port < 1 || c.port > 65535) {
    errors.push("port must be within range");
  }

  // tags
  if (!Array.isArray(c.tags)) {
    errors.push("tags must be an array of strings");
  } else {
    for (const t of c.tags) {
      if (typeof t !== "string") {
        errors.push("tags must be an array of strings");
        break;
      }
    }
    const seen = new Set<string>();
    for (const t of c.tags) {
      if (seen.has(t)) {
        errors.push("tags must be unique");
        break;
      }
      seen.add(t);
    }
  }

  // featureFlags
  if (
    typeof c.featureFlags !== "object" ||
    c.featureFlags === null ||
    Array.isArray(c.featureFlags)
  ) {
    errors.push("featureFlags must be an object of booleans");
  } else {
    for (const v of Object.values(c.featureFlags)) {
      if (typeof v !== "boolean") {
        errors.push("featureFlags must be an object of booleans");
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
