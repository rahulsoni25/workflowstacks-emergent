import type { Recommendation, RecommendationSummary } from './reorder';

/**
 * `Infinity` is not JSON-serialisable, so recommendations crossing the
 * server -> client boundary use `null` for "no recent sales".
 */
export type ClientRecommendation = Omit<Recommendation, 'daysOfCover'> & { daysOfCover: number | null };

export function toClientRecommendation(r: Recommendation): ClientRecommendation {
  return { ...r, daysOfCover: Number.isFinite(r.daysOfCover) ? r.daysOfCover : null };
}

export type { RecommendationSummary };
