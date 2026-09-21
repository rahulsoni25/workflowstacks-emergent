#!/bin/bash
# Vercel "Ignored Build Step" (vercel.json -> ignoreCommand).
# Exit 0 = skip the build, exit 1 = build.
#
# Why: every production deploy empties the ISR cache, and crawlers then
# re-render the whole ~2.7k-page catalog. With ~35 prod deploys a month that
# alone put ISR Writes (287K / 200K) and Fluid Active CPU (5h18m / 4h) over the
# Hobby caps (usage window 2026-08-22 -> 09-21). So: don't deploy commits that
# can't change the site, and don't build previews nobody opens.

# Previews: skipped unless the branch opts in with a `preview/` prefix.
if [ "$VERCEL_ENV" != "production" ]; then
  case "$VERCEL_GIT_COMMIT_REF" in
    preview/*) echo "preview/ branch - building"; exit 1 ;;
    *) echo "non-production build on '$VERCEL_GIT_COMMIT_REF' - skipped (use a preview/ branch to get one)"; exit 0 ;;
  esac
fi

# Production: compare against the last deployed commit so a multi-commit push
# is judged as a whole. If that SHA isn't in the shallow clone, git diff fails
# (non-zero) and we fall through to building - the safe default.
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
  echo "only reports/docs/CI/tests changed since $BASE_SHA - skipped"
  exit 0
fi
echo "site files changed (or diff unavailable) - building"
exit 1
