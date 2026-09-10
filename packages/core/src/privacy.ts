const sensitivePatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "private key", pattern: /-----BEGIN [^-]*PRIVATE KEY-----/u },
  { name: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/u },
  {
    name: "GitHub token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/u,
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,
  },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  {
    name: "credential assignment",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*[:=]\s*[^\s]+/iu,
  },
];

export class SensitiveDataError extends Error {
  readonly code = "SENSITIVE_DATA_DETECTED";
  readonly fieldPath: string;
  readonly kind: string;

  constructor(fieldPath: string, kind: string) {
    super(`Potential ${kind} detected in ${fieldPath}`);
    this.name = "SensitiveDataError";
    this.fieldPath = fieldPath;
    this.kind = kind;
  }
}

export function assertNoSensitiveSecrets(value: unknown): void {
  walkValue(value, "input");
}

function walkValue(value: unknown, fieldPath: string): void {
  if (typeof value === "string") {
    for (const sensitive of sensitivePatterns) {
      if (sensitive.pattern.test(value)) {
        throw new SensitiveDataError(fieldPath, sensitive.name);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkValue(item, `${fieldPath}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walkValue(child, `${fieldPath}.${key}`);
    }
  }
}
