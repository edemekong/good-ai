/**
 * Domain types are re-exported separately from runtime validation schemas so
 * consumers can depend on the model contract without importing Zod directly.
 */
export type {
  CreateExperienceInput,
  Experience,
  FeedbackOutcome,
} from "../schemas/experience.js";
