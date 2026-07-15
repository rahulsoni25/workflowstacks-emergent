// Catalog trust gates — shared by every ingest path and the retro-cleanup.
//
// Two jobs:
//  1. isSpamRepo():   reject listings that would betray visitor trust
//     (fork-farms, ToS-violating account-automation bots).
//  2. classifyContentType(): split "tool" (an AI skill someone can use)
//     from "resource" (learning material: awesome-lists, courses, books).
//     Resources keep their pages (SEO) but live on the /learn shelf,
//     out of the skills library, homepage rails, and recommender.

// ToS-violating / spam automation categories. Word-boundaried to avoid
// false hits (e.g. "selfhosted" must not match "self-bot").
const SPAM_PATTERN = new RegExp(
  [
    'userbot', 'self[- ]bot', 'selfbot',
    'mass[- ]?dm', 'auto[- ]?follow', 'follow(er)?[- ]?bot',
    'account[- ]?(generator|creator|checker|cracker)',
    'token[- ]?(grabber|stealer|logger)',
    'view[- ]?bot', 'like[- ]?bot', 'vote[- ]?bot',
    '(sms|call|email)[- ]?bomber',
    'combo[- ]?list', 'credential[- ]?stuff',
  ].join('|'),
  'i'
);

// Learning material, not a usable tool. Name/topic driven; description is
// only consulted for the unambiguous "curated list" phrasing.
const RESOURCE_NAME_PATTERN = new RegExp(
  [
    '^awesome([-_]|$)',
    'free[-_]programming',
    'build[-_]your[-_]own',
    '^(coding|tech|developer)[-_]?interview',
    'interview[-_](questions|handbook|prep)',
    'cheat[-_]?sheets?$',
    '(^|[-_])roadmaps?($|[-_])',
    '^free[-_]for[-_]dev',
    '^public[-_]apis$',
    '(^|[-_])books?$',
    '^freecodecamp$',
    '^(the[-_])?(odin|open)[-_]project$',
    'curriculum',
  ].join('|'),
  'i'
);

const RESOURCE_TOPICS = new Set([
  'awesome', 'awesome-list', 'lists', 'books', 'education',
  'interview', 'interview-questions', 'curriculum', 'roadmap',
  'learning-resources', 'cheatsheets', 'tutorials',
]);

function repoText(repo) {
  const topics = repo.github_topics || repo.topics || [];
  return `${repo.name || ''} ${repo.description || ''} ${topics.join(' ')}`;
}

// Returns a reason string when the repo must not be listed, else null.
export function isSpamRepo(repo) {
  const stars = repo.github_stars ?? repo.stargazers_count ?? 0;
  const forks = repo.github_forks ?? repo.forks_count ?? 0;
  // Fork-farm signal: organic repos are starred far more than forked.
  // (Catches e.g. a "userbot" with 377 forks on 200 stars.)
  if (forks > stars) return 'fork-ratio';
  if (SPAM_PATTERN.test(repoText(repo))) return 'spam-denylist';
  return null;
}

// 'resource' = learning material for the /learn shelf; 'tool' = real listing.
export function classifyContentType(repo) {
  if (RESOURCE_NAME_PATTERN.test(repo.name || '')) return 'resource';
  const topics = repo.github_topics || repo.topics || [];
  if (topics.some((t) => RESOURCE_TOPICS.has(String(t).toLowerCase()))) return 'resource';
  if (/curated list of|list of (free|awesome|curated)/i.test(repo.description || '')) return 'resource';
  return 'tool';
}

// Mongo filter fragment: what belongs in the skills library / recommender.
// Missing content_type (legacy docs not yet re-classified) still shows —
// the cleanup pass backfills them within a day.
export const TOOLS_ONLY = { content_type: { $ne: 'resource' } };
