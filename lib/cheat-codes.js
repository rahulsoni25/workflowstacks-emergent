// Cheat codes for the homepage section (components/CheatCodes.js).
//
// Rules for this file are in docs/CHEAT_CODES.md. In short:
//   - Every entry comes from the vendor's own docs, changelog or source code,
//     linked in `source`. No blogs, forums or memory.
//   - Every entry carries `proof`: short verbatim text from that source.
//     `npm run check-cheat-codes` fetches each source and fails if the text is
//     gone, which is how a renamed or removed code gets caught.
//   - `does` says only what the source says, in plain English.
//
// Fields:
//   code    what the visitor types or presses
//   kind    'copy' renders a Copy button (typed in full); 'key' is a
//           keystroke, prefix or menu path (nothing useful to copy)
//   does    one plain-English sentence
//   note    optional second line
//   where   optional tag when a code only works in one place
//   source  the official page that backs it (the card links here)
//   proof   verbatim snippets; a string is checked against `source`, a
//           [url, text] pair against another official page
//   added   'YYYY-MM-DD' for entries added after the first set; shows "New"
//           for 30 days after CHEAT_CODES_CHECKED
//
// Tips that look right but are out of date, so they are deliberately absent
// (add to this list when the daily refresh removes one):
//   - Claude Code `#` (quick memory): removed in v2.0.70 (CHANGELOG.md).
//   - Claude Code "think hard" / "megathink": only `ultrathink` is a keyword
//     now (docs/en/model-config).
//   - Claude Code `/vim`: removed in v2.1.92 (docs/en/commands).
//   - Codex `--full-auto`: removed in rust-v0.147.0; `/undo` and `/approvals`
//     are not in the rust-v0.167.2 command list.
//   - Antigravity Cmd+E (Agent Manager <-> Editor): not in the current docs,
//     which say the Agent Manager became the standalone Antigravity App.

const CC = 'https://code.claude.com/docs/en'
const CW = 'https://support.claude.com/en/articles'
const CW_LOG = 'https://claude.com/docs/cowork/changelog'
const AG = 'https://antigravity.google/docs'
// Codex links are pinned to the release the entries were checked against.
// The daily refresh moves this to the newest stable tag once every Codex
// proof passes there.
const CODEX_TAG = 'rust-v0.167.2'
const CX = `https://github.com/openai/codex/blob/${CODEX_TAG}/codex-rs`

// The date every entry was last confirmed against its source.
export const CHEAT_CODES_CHECKED = '2026-11-12'

// How far each tool's changelog has been read. The daily refresh reads only
// newer entries (`npm run cheat-codes-changelogs`), then moves these forward
// in the same pull request. Claude Code: a version in CHANGELOG.md. Cowork
// and Antigravity: the date of the newest entry read (their pages hold
// several release streams, but every entry is dated). Codex: a release tag.
export const CHEAT_CODES_SEEN = {
  'claude-code': '2.1.322', // https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
  cowork: '2026-11-10', // https://claude.com/docs/cowork/changelog (Claude Desktop v5.1231.2)
  antigravity: '2026-11-10', // https://antigravity.google/docs/changelog/
  codex: CODEX_TAG, // git ls-remote --tags https://github.com/openai/codex
}

export const CHEAT_CODE_TOOLS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    tagline: 'Type these in the Claude Code prompt in your terminal.',
    docs: `${CC}/interactive-mode`,
    codes: [
      {
        code: '!',
        kind: 'key',
        does: 'Start a message with ! to run a terminal command yourself, e.g. ! git status. The output joins the chat.',
        source: `${CC}/interactive-mode#shell-mode-with-prefix`,
        proof: [
          'Run shell commands directly without going through Claude by prefixing your input with',
          'Adds the command and its output to the conversation context',
        ],
      },
      {
        code: '@',
        kind: 'key',
        does: 'Type @ and a file or folder path to pull it straight into the conversation.',
        source: `${CC}/common-workflows`,
        proof: ['Use @ to quickly include files or directories without waiting for Claude to read them'],
      },
      {
        code: '?',
        kind: 'key',
        does: 'On an empty prompt, opens the keyboard-shortcut help panel.',
        source: `${CC}/interactive-mode`,
        proof: ['Toggle the shortcut help panel'],
      },
      {
        code: 'Esc Esc',
        kind: 'key',
        does: 'On an empty prompt, opens the rewind menu to take code and chat back to an earlier point.',
        source: `${CC}/interactive-mode`,
        proof: ['When the input is empty, double Esc opens the', 'restore or summarize code and conversation from a previous point'],
      },
      {
        code: 'Shift+Tab',
        kind: 'key',
        does: 'Cycles permission modes: manual, auto-accept edits, and plan mode.',
        source: `${CC}/permission-modes`,
        proof: ['press Shift+Tab to cycle permission modes'],
      },
      {
        code: 'Ctrl+B',
        kind: 'key',
        does: 'Sends a running command or agent to the background so you can keep working.',
        source: `${CC}/interactive-mode`,
        proof: ['Backgrounds Bash commands and agents'],
      },
      {
        code: '/btw',
        kind: 'copy',
        does: 'Ask a quick side question about your work without adding it to the conversation history.',
        source: `${CC}/interactive-mode`,
        proof: ['Use /btw to ask a question about your current work without adding to the conversation history'],
      },
      {
        code: 'ultrathink',
        kind: 'copy',
        does: 'Put this word anywhere in a prompt for deeper reasoning on that one turn.',
        note: '"think hard" and similar phrases are no longer keywords.',
        source: `${CC}/model-config`,
        proof: [
          'Include ultrathink anywhere in your prompt to request deeper reasoning on that turn',
          "doesn't recognize them as keywords",
        ],
      },
      {
        code: 'claude -c',
        kind: 'copy',
        does: 'Reopens your most recent conversation in this folder.',
        note: 'claude --resume lets you pick an older one from a list.',
        source: `${CC}/cli-reference`,
        proof: [
          '--continue, -c | Load the most recent conversation in the current directory',
          [`${CC}/common-workflows`, 'Use claude --resume to choose from a list'],
        ],
      },
      {
        code: 'Ctrl+S',
        kind: 'key',
        does: 'Stashes a half-written prompt. Press it again on an empty prompt to bring the text back.',
        source: `${CC}/interactive-mode`,
        proof: ['With text in the input, stashes it and clears the prompt. Pressed again on an empty prompt, restores the stashed text'],
      },
      {
        code: '/context',
        kind: 'copy',
        does: 'Shows how full the context window is, as a colored grid.',
        source: `${CC}/commands`,
        proof: ['Visualize current context usage as a colored grid'],
      },
      {
        code: '/powerup',
        kind: 'copy',
        does: 'Quick interactive lessons, with animated demos, that teach you Claude Code features.',
        source: `${CC}/commands`,
        proof: ['Discover Claude Code features through quick interactive lessons with animated demos'],
      },
    ],
  },
  {
    id: 'cowork',
    name: 'Claude Cowork',
    tagline: 'Cowork in the Claude apps. Cards say when a code needs the desktop app or a Mac.',
    docs: `${CW}/13345190-get-started-with-claude-cowork`,
    codes: [
      {
        code: '/schedule',
        kind: 'copy',
        does: 'Turns the task you are in into a scheduled task.',
        note: 'Type it in full: it no longer appears in the / menu.',
        source: `${CW}/13345190-get-started-with-claude-cowork`,
        proof: [
          'To schedule a task, type /schedule in any Cowork task',
          [CW_LOG, 'Removed /schedule from the slash menu; typing it now fills in a request to schedule the task'],
        ],
      },
      {
        code: 'Every Monday at 9 AM, …',
        kind: 'key',
        does: 'In the new combined Claude, describe the task and how often to run it, and Claude schedules it.',
        source: `${CW}/13854387-schedule-recurring-tasks-in-claude-cowork`,
        proof: ['Describe the task and how often it should run, for example, "Every Monday at 9 AM'],
      },
      {
        code: '/',
        kind: 'key',
        does: 'Lists your available skills, including ones from plugins you have added. Works in chat too.',
        source: `${CW}/13837440-use-plugins-in-claude`,
        proof: ['to see the available skills from your plugins, in chat and in Cowork'],
      },
      {
        code: '/plugin-name:command',
        kind: 'key',
        does: 'Runs one specific command from a plugin you have added.',
        source: `${CW}/13837440-use-plugins-in-claude`,
        proof: ["you can also run a plugin's command by typing /plugin-name:command"],
      },
      {
        code: '/deep-research',
        kind: 'copy',
        does: 'Starts an in-depth Research task.',
        where: 'New combined Claude',
        source: `${CW}/16761823-claude-cowork-and-chat-are-one-claude`,
        proof: ['Research: Type /deep-research'],
      },
      {
        code: '/docx /pdf /pptx /xlsx',
        kind: 'key',
        does: 'Call the skill for Word, PDF, PowerPoint or Excel files by name.',
        source: CW_LOG,
        proof: ['/docx, /pdf, /pptx and /xlsx being rejected as unknown skills and missing from the Cowork slash menu'],
      },
      {
        code: '+  →  Memory off',
        kind: 'key',
        does: 'Before your first message, turn Memory off to run one task without using or adding to memory.',
        source: `${CW}/13345190-get-started-with-claude-cowork`,
        proof: ['To run a single task without memory, turn "Memory" off in the "+" menu before you send the first message'],
      },
      {
        code: '⌘K / Ctrl+K',
        kind: 'key',
        does: 'Opens the command palette, where you can archive or delete the current chat, project or task.',
        where: 'Desktop app',
        source: CW_LOG,
        proof: ['archive or delete the current chat, project, task, or coding session directly from the command palette (⌘K, or Ctrl+K on Windows and Linux)'],
      },
      {
        code: 'Cmd/Ctrl+Enter',
        kind: 'key',
        does: 'While Claude is replying, sends your message right away and interrupts the current turn.',
        where: 'Desktop app',
        source: CW_LOG,
        proof: ['Cmd/Ctrl+Enter sends your message right away, interrupting the current turn'],
      },
      {
        code: 'Option Option',
        kind: 'key',
        does: 'Double-tap Option to open Claude from any app (Quick Entry).',
        where: 'Mac desktop app',
        source: `${CW}/12626668-use-quick-entry-with-claude-desktop-on-mac`,
        proof: ['Double-tap the Option key to open Claude from any app'],
      },
      {
        code: 'Claude icon in Chrome',
        kind: 'key',
        does: 'Click it in your Chrome toolbar to open the side panel, which starts a Cowork session.',
        where: 'Chrome',
        source: `${CW}/15520349-use-claude-cowork-on-web-desktop-and-mobile`,
        proof: ['Click the Claude icon in your Chrome toolbar to open the side panel. The side panel starts a Cowork session'],
      },
      {
        code: 'Use an existing folder',
        kind: 'key',
        does: 'When you create a Cowork project, choose this to build it around a folder already on your computer.',
        where: 'Desktop app',
        source: `${CW}/14116274-organize-your-tasks-with-projects-in-claude-cowork`,
        proof: ['Use an existing folder on your computer', 'After selecting a folder, you can name the new Cowork project'],
      },
    ],
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    tagline: "Google Antigravity. Each card says whether it's for the App, the IDE or the CLI.",
    docs: `${AG}/getting-started/`,
    codes: [
      {
        code: '⌘K / Ctrl+K',
        kind: 'key',
        does: 'One palette to search past conversations, find project files and run app commands.',
        where: 'App',
        source: `${AG}/features/`,
        proof: [
          'Press Cmd + K (macOS) or Ctrl + K (Windows and Linux) to search past conversations by title, project, and full text',
          'The same command palette also finds files in your project, runs app commands',
        ],
      },
      {
        code: '⌘L / Ctrl+L',
        kind: 'key',
        does: 'Select text in an agent reply, then press this to quote it in your next message. ⌘I / Ctrl+I works too.',
        where: 'App',
        source: `${AG}/at-mentions/`,
        proof: ['press Cmd + L or Cmd + I on macOS, or Ctrl + L or Ctrl + I on Windows and Linux'],
      },
      {
        code: '@rules:',
        kind: 'copy',
        does: 'Attach any workspace or global rule to your prompt, whatever its trigger.',
        where: 'App & CLI',
        source: `${AG}/at-mentions/`,
        proof: ['type @rules:, to list all your workspace and global rules'],
      },
      {
        code: '@conversation:',
        kind: 'copy',
        does: 'Point the agent at a past conversation instead of repeating yourself.',
        where: 'App & CLI',
        source: `${AG}/at-mentions/`,
        proof: ['type @conversation:, to list your recent conversations'],
      },
      {
        code: '/btw',
        kind: 'copy',
        does: 'Ask a quick question in the background without pausing the agent’s work.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
        proof: ['Asks a quick contextual question in the background without pausing work'],
      },
      {
        code: '/grill-me',
        kind: 'copy',
        does: 'The agent interviews you one question at a time, each with a suggested answer, to pin down details.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
        proof: ['Interviews you one question at a time, with a recommended answer for each'],
      },
      {
        code: '/goal',
        kind: 'copy',
        does: 'The agent keeps working on its own until the goal is reached, without pausing in between.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
        proof: ['Autonomous execution until the goal is achieved without intermediate pauses'],
      },
      {
        code: '/learn',
        kind: 'copy',
        does: 'Turns your feedback and corrections from this session into lasting Rules or Skills.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
        proof: ['Distills session feedback and corrections into persistent Rules or Skills'],
      },
      {
        code: '/browser',
        kind: 'copy',
        does: 'Launches a browser subagent to test your UI live, take screenshots and inspect pages.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
        proof: ['Launches a browser subagent for live UI testing, screenshots, and web inspection'],
      },
      {
        code: '⌘L / Ctrl+L',
        kind: 'key',
        does: 'Jumps to the agent panel and adds the selected lines to your prompt as context.',
        where: 'IDE',
        source: `${AG}/getting-started/`,
        proof: ['to move to the panel. From the editor, this also adds the selected lines'],
      },
      {
        code: 'Option+Enter / Alt+Enter',
        kind: 'key',
        does: 'Accepts the agent’s change under your cursor. Add Shift to reject it instead.',
        where: 'IDE',
        source: `${AG}/ide/review-changes-editor/`,
        proof: ['to accept the focused change, or Alt+Shift+Enter'],
      },
      {
        code: 'Shift+Tab',
        kind: 'key',
        does: 'Cycles modes: default, accept-edits, auto and plan.',
        where: 'CLI',
        source: `${AG}/cli/modes/`,
        proof: ['Press Shift + Tab inside the prompt box to cycle through the active sequence: default > accept-edits > auto > plan'],
      },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    tagline: 'OpenAI’s Codex CLI. Keys are the defaults; remap any of them with /keymap.',
    docs: 'https://developers.openai.com/codex',
    codes: [
      {
        code: '!',
        kind: 'key',
        does: 'Start a message with ! to run any shell command from inside Codex, e.g. !ls.',
        source: `${CX}/tui/assets/tooltips.txt`,
        proof: ['You can run any shell command from Codex using !'],
      },
      {
        code: '@',
        kind: 'key',
        does: 'Search for a file and mention it in your message.',
        source: `${CX}/tui/src/bottom_pane/shortcut_overlay.rs`,
        proof: [`KeyCode::Char('@')), "Mention files"`],
      },
      {
        code: 'Esc',
        kind: 'key',
        does: 'On an empty prompt, steps back so you can edit your last message. Enter confirms.',
        source: `${CX}/tui/assets/tooltips.txt`,
        proof: ['When the composer is empty, press Esc to step back and edit your last message; Enter confirms'],
      },
      {
        code: 'Tab',
        kind: 'key',
        does: 'While Codex is working, queues your next message instead of sending it now.',
        source: `${CX}/tui/assets/tooltips.txt`,
        proof: [
          'to queue a message when a task is running',
          [`${CX}/tui/src/keymap.rs`, 'queue: default_bindings![plain(KeyCode::Tab)]'],
        ],
      },
      {
        code: 'Ctrl+T',
        kind: 'key',
        does: 'Opens the full transcript of the session.',
        source: `${CX}/tui/src/keymap.rs`,
        proof: [`open_transcript: default_bindings![ctrl(KeyCode::Char('t'))]`],
      },
      {
        code: 'Alt+.  /  Alt+,',
        kind: 'key',
        does: 'Raise or lower reasoning effort without leaving the prompt. Shift+Up and Shift+Down also work.',
        source: `${CX}/tui/src/keymap.rs`,
        proof: [
          `increase_reasoning_effort: default_bindings![ alt(KeyCode::Char('.')), shift(KeyCode::Up)`,
          `decrease_reasoning_effort: default_bindings![ alt(KeyCode::Char(',')), shift(KeyCode::Down)`,
        ],
      },
      {
        code: '/init',
        kind: 'copy',
        does: 'Creates an AGENTS.md file with standing instructions for Codex in your project.',
        source: `${CX}/tui/src/slash_command.rs`,
        proof: ['SlashCommand::Init => "create an AGENTS.md file with instructions for Codex"'],
      },
      {
        code: '/review',
        kind: 'copy',
        does: 'Reviews your current changes and finds issues.',
        source: `${CX}/tui/src/slash_command.rs`,
        proof: ['SlashCommand::Review => "review my current changes and find issues"'],
      },
      {
        code: '/compact',
        kind: 'copy',
        does: 'Summarizes the conversation so you don’t hit the context limit.',
        source: `${CX}/tui/src/slash_command.rs`,
        proof: ['SlashCommand::Compact => "summarize conversation to prevent hitting the context limit"'],
      },
      {
        code: '/side',
        kind: 'copy',
        does: 'Starts a side conversation in a temporary fork, so the main thread stays clean. /btw does the same.',
        source: `${CX}/tui/assets/tooltips.txt`,
        proof: [
          'Use /side to start a side conversation in a temporary fork without polluting the main thread',
          [`${CX}/tui/src/slash_command.rs`, 'SlashCommand::Side | SlashCommand::Btw =>'],
        ],
      },
      {
        code: 'codex resume --last',
        kind: 'copy',
        does: 'Picks up your most recent session. Leave off --last to choose from a list.',
        source: `${CX}/cli/src/main.rs`,
        proof: ['Resume a previous interactive session (picker by default; use --last to continue the most recent)'],
      },
      {
        code: 'codex exec',
        kind: 'copy',
        does: 'Runs Codex non-interactively, without the chat screen. Short form: codex e.',
        source: `${CX}/cli/src/main.rs`,
        proof: ['/// Run Codex non-interactively. #[clap(visible_alias = "e")]'],
      },
    ],
  },
]
