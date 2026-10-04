# Daily social posts

One story a day on X, LinkedIn and Instagram, about a repo that is new or
rising in the catalog, or a WorkflowStacks product (on Wednesdays, and on the
first run after a new one is added). `.github/workflows/social-daily.yml` runs it at 13:35
UTC; `scripts/social-daily.mjs` is the whole job.

## The team

Five agents, each its own model call with its own role. Every one has to pass
before anything is published, and the code checks each verdict rather than
taking the model's word for it.

| Agent | Job | Passes when |
|---|---|---|
| Scout | Reads the catalog the site is built from (new in the last 14 days first, then the fastest-rising by 7-day stars) and picks up to three topics with a story angle. | It returns a valid pick. |
| Fact-checker | Confirms the repo still exists and is not archived, and that the page we will link to loads. Then it checks the angle against the facts and writes the brief: the points the writer may use, each tied to a fact. | The repo and page are live, and the model approves with at least two supported points. |
| Writer | Writes the story: a scroll-stopping hook, then X, LinkedIn and Instagram versions and 3–5 slide beats. | — |
| Editor | Scores hook, story, clarity, call to action and platform fit. Approves, sends notes back, or returns a corrected draft. | Every score is 8 or more. |
| Hygiene | First the rules: no number, link or @handle that is not in the facts, length limits, at most two emoji, no clichés, no near-repeat of a hook from the last 30 days. Then a claim audit: every claim must name the fact that supports it. Then each platform's limits on the final text. | No rule broken, and no claim without a fact behind it. |

The Writer gets four rounds per topic. If no draft gets through, the team
moves on to the Scout's next pick. If none get through, nothing is posted, the
run fails, and the job summary shows where each topic stopped.

What a post may say comes only from the catalog entry, live GitHub data and,
for products, `scripts/social-products.json`. The writer is told never to
invent customers, quotes, results, time saved or user counts, and the Hygiene
check enforces it. Every post credits the repo's creator.

## Formats

| Day (UTC) | Instagram | LinkedIn | X |
|---|---|---|---|
| Sun, Tue, Fri | Carousel: hook cover, one slide per beat, call to action | Multi-image post | Text + link card |
| Mon, Thu | Reel: the same frames as a 9:16 video | Multi-image post | Text + link card |
| Wed, Sat | Single image (the hook card) | Single image | Text + link card |

Change the rotation in `formatFor()` in `scripts/social-lib.mjs`. Instagram
captions can't hold a clickable link, so they tell readers to search
workflowstacks.com.

## Connecting the accounts

Add these under **Settings → Secrets and variables → Actions**. A platform
with no secrets is skipped (shown as ⏭️ in the run summary), so you can connect
them one at a time. `MONGO_URL`, `DB_NAME`, `GROQ_API_KEY` and
`OPENROUTER_API_KEY` are already set for the other jobs.

**X**: secrets `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`.
In the X developer portal (developer.x.com), create an app and set its user
authentication to **Read and write**. Then generate the access token and secret
while signed in as the account that should post. If you change the permission
later, generate the access token again. Check that your X API plan allows
posting.

**LinkedIn** (the WorkflowStacks company page): secrets `LINKEDIN_ACCESS_TOKEN`
and `LINKEDIN_ORG_ID`.
1. In linkedin.com/developers, create an app linked to the company page.
2. Request the **Community Management API** product, which LinkedIn reviews
   before granting.
3. As a page admin, generate a token with the `w_organization_social` scope.
4. `LINKEDIN_ORG_ID` is the number in the page's admin URL, not the
   `workflowstacks-com` vanity name.

Tokens expire after 60 days. Optionally set the repository *variable*
`LINKEDIN_VERSION` (a `YYYYMM`) when LinkedIn retires the default.

**Instagram**: secrets `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID`.
1. The account must be a professional account (Business or Creator).
2. In developers.facebook.com, create an app using the Instagram API with
   Instagram Login.
3. Grant `instagram_business_basic` and `instagram_business_content_publish`.
4. Generate a long-lived token. It lasts 60 days.

If the account is connected through a Facebook Page instead, set the variable
`INSTAGRAM_GRAPH_URL` to `https://graph.facebook.com/v23.0`.

Instagram fetches media from a public URL. The job commits each day's images
or video to the `social-assets` branch of this repository: one commit,
replaced every run, carrying its own `vercel.json` so Vercel never builds it.

When a token expires, that platform's post fails, the run goes red, and the
error says the token expired.

## Trying it

**Actions → Daily social posts → Run workflow.** Dry run is on by default: the
team runs and the media is rendered, but nothing is published or recorded. The
run summary shows every agent's verdict and the full text for each platform.
The rendered images and video are attached to the run as an artifact. You can
also force a format or a product day from the same form.

Locally: `MONGO_URL=... GROQ_API_KEY=... node scripts/social-daily.mjs --dry-run`
(Node 22, plus `npm install --no-save sharp` and ffmpeg). The rules have unit
tests: `node --test tests/social.test.mjs`.

## Products

`scripts/social-products.json` lists the house products. Each `facts` entry is
copied from the product's own page, which is named in `source`; the agents may
say nothing else about it. To announce a new product, add an entry with
`"added": "YYYY-MM-DD"`, and it goes out on the next run. Founder Avatar
Studio is listed with `"enabled": false` because it is a FluoDigital service,
not a WorkflowStacks one; flip that to include it.

## Records

Each day is one document in the `social_posts` collection: the topic, the
facts, the brief, the approved copy, every agent's verdict, and each
platform's result. A second run on the same day reuses the approved copy and
only retries platforms that did not post, so nothing goes out twice. A repo is
not featured again for a year.
