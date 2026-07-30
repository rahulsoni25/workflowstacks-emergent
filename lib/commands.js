// Verified Claude Code slash commands. Hand-checked seed set, same pattern as
// mcp-servers.js: each entry links to its real source file (the source of
// truth — if the author updates it, the repo link stays current) and shows
// the ACTUAL command content, not a paraphrase, so it's genuinely
// copy-paste-usable rather than just a description of one.
//
// Sourced from public .claude/commands/*.md files, cross-referenced against
// the community-maintained "Awesome Claude Code" list (hesreallyhim/
// awesome-claude-code) for attribution and license info. Several candidates
// from that list were dropped after checking the actual file: some were
// single-line, project-specific one-liners with no reuse value, one used a
// shell built-in that only exists in fish (not bash/zsh), one was mislabeled
// (named for git hooks, actually a hardcoded CI-fix loop for one monorepo's
// own tooling), and one lived on a since-deleted feature branch (404). Only
// genuinely complete, portable commands made the cut — quality over count,
// same discipline as the MCP registry and the finishing kits.
//
// `plainWhy` — what it does for you, in plain language, no jargon.
// `stat` — a real, checked number (GitHub stars via the API, same day this
// was written) about the project the command comes from. Never invented.
// `idea` — a non-obvious way to use it, for someone browsing who doesn't
// yet know what they'd do with a slash command at all.

export const SLASH_COMMANDS = {
  commit: {
    slug: 'commit',
    name: '/commit',
    blurb: 'Create well-formatted git commits — conventional-commit type + emoji, split into atomic commits when a diff covers more than one concern.',
    category: 'Version control & git',
    repo: 'https://github.com/evmts/tevm-monorepo/blob/main/.claude/commands/commit.md',
    author: 'evmts (tevm-monorepo)',
    license: 'MIT',
    plainWhy: 'You stop writing commit messages by hand. It looks at what actually changed, writes a proper message for it (with the right emoji and type), and splits unrelated changes into separate commits instead of one messy blob.',
    stat: '442★ · from Tevm, an open-source Ethereum dev toolkit',
    idea: 'Make this your default way to commit, full stop — once it\'s in .claude/commands/, every commit on the project gets the same consistent style with zero extra thought from you.',
    note: 'The pre-commit checks (`pnpm lint`, `pnpm build`, `pnpm generate:docs`) are this project\'s own — swap them for your own project\'s lint/build/test commands.',
    content: `# Claude Command: Commit

This command helps you create well-formatted commits with conventional commit messages and emoji.

## Usage

To create a commit, just type:
\`\`\`
/commit
\`\`\`

Or with options:
\`\`\`
/commit --no-verify
\`\`\`

## What This Command Does

1. Unless specified with \`--no-verify\`, automatically runs pre-commit checks:
   - \`pnpm lint\` to ensure code quality
   - \`pnpm build\` to verify the build succeeds
   - \`pnpm generate:docs\` to update documentation
2. Checks which files are staged with \`git status\`
3. If 0 files are staged, automatically adds all modified and new files with \`git add\`
4. Performs a \`git diff\` to understand what changes are being committed
5. Analyzes the diff to determine if multiple distinct logical changes are present
6. If multiple distinct changes are detected, suggests breaking the commit into multiple smaller commits
7. For each commit (or the single commit if not split), creates a commit message using emoji conventional commit format

## Best Practices for Commits

- **Verify before committing**: Ensure code is linted, builds correctly, and documentation is updated
- **Atomic commits**: Each commit should contain related changes that serve a single purpose
- **Split large changes**: If changes touch multiple concerns, split them into separate commits
- **Conventional commit format**: Use the format \`<type>: <description>\` where type is one of:
  - \`feat\`: A new feature
  - \`fix\`: A bug fix
  - \`docs\`: Documentation changes
  - \`style\`: Code style changes (formatting, etc)
  - \`refactor\`: Code changes that neither fix bugs nor add features
  - \`perf\`: Performance improvements
  - \`test\`: Adding or fixing tests
  - \`chore\`: Changes to the build process, tools, etc.
- **Present tense, imperative mood**: Write commit messages as commands (e.g., "add feature" not "added feature")
- **Concise first line**: Keep the first line under 72 characters
- **Emoji**: Each commit type is paired with an appropriate emoji — see the full table in the source file (linked above) for all ~60 mappings (feat ✨, fix 🐛, docs 📝, refactor ♻️, perf ⚡️, test ✅, chore 🔧, and many more specific ones).

## Guidelines for Splitting Commits

When analyzing the diff, consider splitting commits based on these criteria:

1. **Different concerns**: Changes to unrelated parts of the codebase
2. **Different types of changes**: Mixing features, fixes, refactoring, etc.
3. **File patterns**: Changes to different types of files (e.g., source code vs documentation)
4. **Logical grouping**: Changes that would be easier to understand or review separately
5. **Size**: Very large changes that would be clearer if broken down

## Examples

Good commit messages:
- ✨ feat: add user authentication system
- 🐛 fix: resolve memory leak in rendering process
- 📝 docs: update API documentation with new endpoints
- ♻️ refactor: simplify error handling logic in parser
- 🎨 style: reorganize component structure for better readability

## Command Options

- \`--no-verify\`: Skip running the pre-commit checks (lint, build, generate:docs)

## Important Notes

- By default, pre-commit checks (\`pnpm lint\`, \`pnpm build\`, \`pnpm generate:docs\`) will run to ensure code quality
- If these checks fail, you'll be asked if you want to proceed with the commit anyway or fix the issues first
- If specific files are already staged, the command will only commit those files
- If no files are staged, it will automatically stage all modified and new files
- Always reviews the commit diff to ensure the message matches the changes`,
    source: 'verified',
  },

  'create-pr': {
    slug: 'create-pr',
    name: '/create-pr',
    blurb: 'Branch, commit (split into logical units automatically), push, and open a pull request in one command.',
    category: 'Version control & git',
    repo: 'https://github.com/toyamarinyon/giselle/blob/main/.claude/commands/create-pr.md',
    author: 'toyamarinyon (giselle)',
    license: 'Apache-2.0',
    plainWhy: 'You finish a feature and just say "make a PR" — it branches, splits your changes into sensible commits, pushes, and opens the pull request with a real summary, instead of you doing five separate git commands.',
    stat: '549★ · part of Giselle, an open-source AI agentic-workflow builder (this file lives in a contributor\'s fork of it)',
    idea: 'Pair it with /commit as your end-of-task ritual: /commit to wrap up, then /create-pr to hand it off for review — "done coding" to "PR open" in two commands instead of a dozen.',
    note: 'Formats changed files with Biome before committing — remove that step or swap in your own formatter if you don\'t use Biome.',
    content: `# Create Pull Request Command

Create a new branch, commit changes, and submit a pull request.

## Behavior
- Creates a new branch based on current changes
- Formats modified files using Biome
- Analyzes changes and automatically splits into logical commits when appropriate
- Each commit focuses on a single logical change or feature
- Creates descriptive commit messages for each logical unit
- Pushes branch to remote
- Creates pull request with proper summary and test plan

## Guidelines for Automatic Commit Splitting
- Split commits by feature, component, or concern
- Keep related file changes together in the same commit
- Separate refactoring from feature additions
- Ensure each commit can be understood independently
- Multiple unrelated changes should be split into separate commits`,
    source: 'verified',
  },

  'fix-github-issue': {
    slug: 'fix-github-issue',
    name: '/fix-github-issue',
    blurb: 'Give it an issue number — it reads the issue via `gh`, finds the relevant code, fixes it, tests it, and commits.',
    category: 'Code analysis & testing',
    repo: 'https://github.com/jeremymailen/kotlinter-gradle/blob/master/.claude/commands/fix-github-issue.md',
    author: 'jeremymailen (kotlinter-gradle)',
    license: 'Apache-2.0',
    plainWhy: 'You paste in an issue number instead of an explanation. It reads the actual GitHub issue itself, works out what\'s broken, fixes it, tests it, and writes the commit — you don\'t have to re-explain the bug in your own words at all.',
    stat: '708★ · from Kotlinter, a widely-used Kotlin linter Gradle plugin',
    idea: 'Work through a whole backlog of small, well-described bugs this way — one `/fix-github-issue 142`, `/fix-github-issue 143`... per issue — and clear a sprint\'s worth of minor tickets in an afternoon instead of a week.',
    note: 'Requires the GitHub CLI (`gh`) authenticated in your project — it\'s how the command reads the issue.',
    content: `Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use \`gh issue view\` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix
6. Ensure code passes linting and type checking
7. Create a descriptive commit message

Remember to use the GitHub CLI (\`gh\`) for all GitHub-related tasks.`,
    source: 'verified',
  },

  'add-to-changelog': {
    slug: 'add-to-changelog',
    name: '/add-to-changelog',
    blurb: 'Add a properly formatted entry to CHANGELOG.md — Keep a Changelog style, correct section, no manual formatting.',
    category: 'Documentation & changelogs',
    repo: 'https://github.com/berrydev-ai/blockdoc-python/blob/main/.claude/commands/add-to-changelog.md',
    author: 'berrydev-ai (blockdoc-python)',
    license: 'MIT',
    plainWhy: 'You give it three words — version, type of change, what changed — and it writes a properly formatted CHANGELOG.md entry in the right section, instead of you hand-editing a file you probably forget to update half the time.',
    stat: '3★ · a small, focused open-source Python library — proof this doesn\'t need to come from a huge project to be genuinely useful',
    idea: 'Make it part of your release habit, not just an afterthought: run it the moment you decide something\'s "done", so the changelog is always current instead of reconstructed from git log at release time.',
    note: 'The last line ("update the package version in __init__.py and setup.py") is Python-specific — drop or adapt it for your stack.',
    content: `# Update Changelog

This command adds a new entry to the project's CHANGELOG.md file.

## Usage

\`\`\`
/add-to-changelog <version> <change_type> <message>
\`\`\`

Where:
- \`<version>\` is the version number (e.g., "1.1.0")
- \`<change_type>\` is one of: "added", "changed", "deprecated", "removed", "fixed", "security"
- \`<message>\` is the description of the change

## Examples

\`\`\`
/add-to-changelog 1.1.0 added "New markdown to BlockDoc conversion feature"
\`\`\`

\`\`\`
/add-to-changelog 1.0.2 fixed "Bug in HTML renderer causing incorrect output"
\`\`\`

## Description

This command will:

1. Check if a CHANGELOG.md file exists and create one if needed
2. Look for an existing section for the specified version
   - If found, add the new entry under the appropriate change type section
   - If not found, create a new version section with today's date
3. Format the entry according to Keep a Changelog conventions
4. Commit the changes if requested

The CHANGELOG follows the [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/).

## Implementation

The command should:

1. Parse the arguments to extract version, change type, and message
2. Read the existing CHANGELOG.md file if it exists
3. If the file doesn't exist, create a new one with standard header
4. Check if the version section already exists
5. Add the new entry in the appropriate section
6. Write the updated content back to the file
7. Suggest committing the changes

Remember to update the package version in \`__init__.py\` and \`setup.py\` if this is a new version.`,
    source: 'verified',
  },

  todo: {
    slug: 'todo',
    name: '/todo',
    blurb: 'A full project todo manager — add, complete, remove, due dates, sorting — living in a plain todos.md file.',
    category: 'Project & task management',
    repo: 'https://github.com/chrisleyva/todo-slash-command/blob/main/todo.md',
    author: 'chrisleyva',
    license: 'MIT',
    plainWhy: 'A full to-do list that lives in a plain todos.md file next to your code — add tasks, set due dates, mark things done — without opening a browser tab or a separate app.',
    stat: '28★ · a small, purpose-built repo — this command is the entire project',
    idea: 'Use it as your whole project tracker for solo or small side-projects — skip signing up for Trello/Linear/Asana entirely and keep the task list versioned in the same repo as the code it\'s about.',
    note: null,
    content: `---
name: todo
description: Manage project todos in todos.md file
---

# Project Todo Manager

Manage todos in a \`todos.md\` file at the root of your current project directory.

## Usage Examples:
- \`/user:todo add "Fix navigation bug"\`
- \`/user:todo add "Fix navigation bug" [date/time/"tomorrow"/"next week"]\` an optional 2nd parameter to set a due date
- \`/user:todo complete 1\`
- \`/user:todo remove 2\`
- \`/user:todo list\`
- \`/user:todo undo 1\`

## Instructions:

You are a todo manager for the current project. When this command is invoked:

1. **Determine the project root** by looking for common indicators (.git, package.json, etc.)
2. **Locate or create** \`todos.md\` in the project root
3. **Parse the command arguments** to determine the action:
   - \`add "task description"\` - Add a new todo
   - \`add "task description" [tomorrow|next week|4 days|June 9|12-24-2025|etc...]\` - Add a new todo with the provided due date
   - \`due N [tomorrow|next week|4 days|June 9|12-24-2025|etc...]\` - Mark todo N with the due date provided
   - \`complete N\` - Mark todo N as completed and move from the ##Active list to the ##Completed list
   - \`remove N\` - Remove todo N entirely
   - \`undo N\` - Mark completed todo N as incomplete
   - \`list [N]\` or no args - Show all (or N number of) todos in a user-friendly format, with each todo numbered for reference
   - \`past due\` - Show all of the tasks which are past due and still active
   - \`next\` - Shows the next active task in the list, this should respect Due dates, if there are any. If not, just show the first todo in the Active list

## Todo Format:
Use this markdown format in todos.md:
\`\`\`markdown
# Project Todos

## Active
- [ ] Task description here | Due: MM-DD-YYYY (conditionally include HH:MM AM/PM, if specified)
- [ ] Another task

## Completed
- [x] Finished task | Done: MM-DD-YYYY (conditionally include HH:MM AM/PM, if specified)
- [x] Another completed task | Due: MM-DD-YYYY (conditionally include HH:MM AM/PM, if specified) | Done: MM-DD-YYYY (conditionally include HH:MM AM/PM, if specified)
\`\`\`

## Behavior:
- Number todos when displaying (1, 2, 3...)
- Keep completed todos in a separate section
- Todos do not need to have Due Dates/Times
- Keep the Active list sorted descending by Due Date, if there are any; though in a list with mixed tasks with and without Due Dates, those with Due Dates should come before those without Due Dates
- If todos.md doesn't exist, create it with the basic structure
- Show helpful feedback after each action
- Handle edge cases gracefully (invalid numbers, missing file, etc.)
- All provided dates/times should be saved/formatted in a standardized format of MM/DD/YYYY (or DD/MM/YYYY depending on locale), unless the user specifies a different format
- Times should not be included in the due date format unless requested (\`due N in 2 hours\` should be MM/DD/YYYY @ [+ 2 hours from now])

Always be concise and helpful in your responses.`,
    source: 'verified',
  },

  'update-branch-name': {
    slug: 'update-branch-name',
    name: '/update-branch-name',
    blurb: 'Look at what actually changed on this branch and rename it to something descriptive — no more guessing a name before you\'ve written the code.',
    category: 'Version control & git',
    repo: 'https://github.com/giselles-ai/giselle/blob/main/.claude/commands/update-branch-name.md',
    author: 'giselles-ai (giselle)',
    license: 'Apache-2.0',
    plainWhy: 'You start a branch as "fix" or "wip" because you don\'t know yet what you\'ll end up building — then once the work is actually done, this looks at the real diff and renames the branch to something a teammate could understand at a glance.',
    stat: '549★ · Giselle, an open-source AI agentic-workflow builder',
    idea: 'Stop overthinking branch names at the start of a task entirely — just branch as "wip" and run this at the end. It removes a tiny but constant naming-things tax from your day.',
    note: null,
    content: `# Update Branch Name

Follow these steps to update the current branch name:

1. Check differences between current branch and main branch HEAD using \`git diff main...HEAD\`
2. Analyze the changed files to understand what work is being done
3. Determine an appropriate descriptive branch name based on the changes
4. Update the current branch name using \`git branch -m [new-branch-name]\`
5. Verify the branch name was updated with \`git branch\``,
    source: 'verified',
  },
}

export function getSlashCommand(slug) {
  // hasOwnProperty guard: a plain object lookup would resolve slugs like
  // "__proto__" or "constructor" to prototype members instead of 404ing.
  if (!Object.prototype.hasOwnProperty.call(SLASH_COMMANDS, slug)) return null
  return SLASH_COMMANDS[slug]
}
