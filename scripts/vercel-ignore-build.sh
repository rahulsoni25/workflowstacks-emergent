#!/bin/bash
# Vercel "Ignored Build Step" (vercel.json -> ignoreCommand).
# Exit 0 = skip the build, exit 1 = build.
#
# Why this exists: every production deploy starts with an EMPTY ISR cache
# (Vercel scopes the cache to a deployment), so each deploy makes the whole
# catalog regenerate on demand again — and every regeneration is billed in ISR
# write units and function CPU. The Hobby plan was at 328K / 200K write units
# and 5h47m / 4h CPU (2026-09-28) with ~45 production deploys a month.
#
# Policy (see docs/COSTS.md):
#   - Previews build only on branches named preview/*.
#   - Production builds only when the commit message contains [deploy].
#     Merging to main no longer goes live by itself; the weekly
#     .github/workflows/release.yml run (or a manual run of it) pushes the
#     [deploy] commit. For an urgent fix, put [deploy] in the merge commit.
#   - Even a [deploy] commit is skipped when nothing the site is built from
#     changed since the last deployed commit.

if [ "$VERCEL_ENV" != "production" ]; then
  case "$VERCEL_GIT_COMMIT_REF" in
    preview/*) echo "preview/ branch - building"; exit 1 ;;
    *) echo "non-production build on '$VERCEL_GIT_COMMIT_REF' - skipped (use a preview/ branch to get one)"; exit 0 ;;
  esac
fi

MSG="${VERCEL_GIT_COMMIT_MESSAGE}
$(git log -1 --pretty=%B 2>/dev/null)"
case "$MSG" in
  *"[deploy]"*) ;;
  *) echo "production build without [deploy] in the commit message - skipped (batched into the next release; see docs/COSTS.md)"; exit 0 ;;
esac

# [deploy] requested. Compare against the last deployed commit; if that SHA
# isn't in the shallow clone, git diff fails (non-zero) and we build.
BASE_SHA="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

git diff --quiet "$BASE_SHA" HEAD -- . \
  ':(exclude)reports' \
  ':(exclude).github' \
  ':(exclude)docs' \
  ':(exclude)memory' \
  ':(exclude)tests' \
  ':(exclude)test_reports' \
  ':(exclude)cli' \
  ':(exclude,glob)*.md' \
  ':(exclude)backend_test.py'
status=$?

if [ "$status" -eq 0 ]; then
  echo "[deploy] requested but only reports/docs/CI/tests changed since $BASE_SHA - skipped"
  exit 0
fi
echo "[deploy] requested and site files changed (or diff unavailable) - building"
exit 1
