import { buildPrompt, buildRepairPrompt, type EditorContext } from "./prompt.ts";
import { findProjectErrors } from "./project.ts";
import { parseModelResponse, type ModelResponse } from "./response.ts";

export type Completion = (contents: string, attempt: number) => Promise<string>;

export class GenerationError extends Error {}

/**
 * Asks the model for an edit and only accepts an answer that parses and
 * compiles. A rejected answer is sent back once with the compiler errors.
 */
export async function generateEdit(
  files: Record<string, string>,
  prompt: string,
  complete: Completion,
  maxAttempts = 2,
  log: (message: string) => void = () => {},
  context: EditorContext = {},
): Promise<ModelResponse> {
  let previous = "";
  let problem = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const contents =
      attempt === 1
        ? buildPrompt(files, prompt, context)
        : buildRepairPrompt(files, prompt, previous, problem, context);
    previous = await complete(contents, attempt);

    try {
      const response = parseModelResponse(previous);
      const errors = await findProjectErrors({ ...files, ...response.files });
      if (errors.length === 0) return response;
      problem = `The project did not compile after applying the answer:\n- ${errors.join("\n- ")}`;
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
    }
    log(`attempt ${attempt} rejected: ${problem.slice(0, 400)}`);
  }

  throw new GenerationError(
    `The AI did not return working code after ${maxAttempts} attempts. ${problem.slice(0, 240)}`,
  );
}
