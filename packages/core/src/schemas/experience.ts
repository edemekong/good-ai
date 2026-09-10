import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

export const TaskSchema = z
  .object({
    title: NonEmptyString.max(200),
    category: NonEmptyString.max(100),
    intent: NonEmptyString.max(200),
    tags: z.array(NonEmptyString.max(50)).default([]),
  })
  .strict();

export const ToolReferenceSchema = z
  .object({
    name: NonEmptyString.max(100),
    purpose: NonEmptyString.max(300),
  })
  .strict();

export const RecipeSchema = z
  .object({
    approach: NonEmptyString.max(2_000),
    instructions: z.array(NonEmptyString.max(500)).default([]),
    constraints: z.array(NonEmptyString.max(500)).default([]),
    context: z.array(NonEmptyString.max(1_000)).default([]),
    tools: z.array(ToolReferenceSchema).default([]),
  })
  .strict();

export const EnvironmentSchema = z
  .object({
    client: NonEmptyString.max(100),
    model: NonEmptyString.max(200).default("unknown"),
  })
  .strict();

export const SuccessSignalTypeSchema = z.enum([
  "explicit_positive_feedback",
  "user_confirmed_solution",
  "accepted_artifact",
  "no_core_correction",
  "manual_save_request",
]);

export const SuccessSignalSchema = z
  .object({
    type: SuccessSignalTypeSchema,
    summary: NonEmptyString.max(500),
  })
  .strict();

export const SuccessInputSchema = z
  .object({
    confidence: z.number().min(0).max(1),
    signals: z.array(SuccessSignalSchema).min(1),
  })
  .strict();

export const ReproductionSchema = z
  .object({
    attempts: z.number().int().nonnegative(),
    successes: z.number().int().nonnegative(),
    failures: z.number().int().nonnegative(),
  })
  .strict();

export const SourceSchema = z
  .object({
    rawConversationStored: z.literal(false),
  })
  .strict();

export const CreateExperienceInputSchema = z
  .object({
    task: TaskSchema,
    recipe: RecipeSchema,
    environment: EnvironmentSchema,
    success: SuccessInputSchema,
  })
  .strict();

export const ExperienceSchema = z
  .object({
    id: z.string().regex(/^exp_[A-Za-z0-9-]+$/),
    schemaVersion: z.literal(1),
    task: TaskSchema,
    recipe: RecipeSchema,
    environment: EnvironmentSchema,
    success: SuccessInputSchema.extend({
      reproduction: ReproductionSchema,
    }),
    source: SourceSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type CreateExperienceInput = z.input<typeof CreateExperienceInputSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type FeedbackOutcome = "success" | "failure" | "partial";
