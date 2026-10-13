import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

let client: Anthropic | null = null;

/** Returns null when ANTHROPIC_API_KEY is not set so callers can fall back. */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({
      // Requests from a Vercel function: keep well under the function timeout.
      timeout: 55_000,
      maxRetries: 1,
    });
  }
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** True for errors worth retrying with a fallback path rather than surfacing. */
export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'Anthropic API key is invalid.';
  if (error instanceof Anthropic.RateLimitError) return 'Anthropic rate limit reached. Try again in a minute.';
  if (error instanceof Anthropic.APIConnectionTimeoutError) return 'The AI request timed out.';
  if (error instanceof Anthropic.APIError) return `AI request failed (${error.status ?? 'unknown'}).`;
  return 'AI request failed.';
}
