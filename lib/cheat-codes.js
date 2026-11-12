// Cheat codes for the homepage section (components/CheatCodes.js).
//
// Every entry was confirmed on 12 Nov 2026 against the page in its `source`
// field, which is the vendor's own documentation, changelog or source code.
// When you add or change one, open that page and check the wording first:
// these tools rename and remove commands often. Examples of tips that look
// right but are out of date, so they are deliberately absent:
//   - Claude Code `#` (quick memory): removed in v2.0.70 (CHANGELOG.md).
//   - Claude Code "think hard" / "megathink": only `ultrathink` is a keyword
//     now (docs/en/model-config).
//   - Claude Code `/vim`: removed in v2.1.92 (docs/en/commands).
//   - Codex `--full-auto`: removed in rust-v0.147.0; `/undo` and `/approvals`
//     are not in the rust-v0.167.2 command list.
//   - Antigravity Cmd+E (Agent Manager <-> Editor): not in the current docs,
//     which say the Agent Manager became the standalone Antigravity App.
//
// kind: 'copy' renders a Copy button (something you type in full);
//       'key' is a keystroke, prefix or menu path (nothing useful to copy).
// where: optional, shown as a small tag when a code only works in one place.

const CC = 'https://code.claude.com/docs/en'
const CW = 'https://support.claude.com/en/articles'
const CW_LOG = 'https://claude.com/docs/cowork/changelog'
const AG = 'https://antigravity.google/docs'
// Codex links are pinned to the release the entries were checked against.
const CX = 'https://github.com/openai/codex/blob/rust-v0.167.2/codex-rs'

export const CHEAT_CODES_CHECKED = '12 Nov 2026'

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
      },
      {
        code: '@',
        kind: 'key',
        does: 'Type @ and a file or folder path to pull it straight into the conversation.',
        source: `${CC}/common-workflows`,
      },
      {
        code: '?',
        kind: 'key',
        does: 'On an empty prompt, opens the keyboard-shortcut help panel.',
        source: `${CC}/interactive-mode`,
      },
      {
        code: 'Esc Esc',
        kind: 'key',
        does: 'On an empty prompt, opens the rewind menu to take code and chat back to an earlier point.',
        source: `${CC}/interactive-mode`,
      },
      {
        code: 'Shift+Tab',
        kind: 'key',
        does: 'Cycles permission modes: manual, auto-accept edits, and plan mode.',
        source: `${CC}/permission-modes`,
      },
      {
        code: 'Ctrl+B',
        kind: 'key',
        does: 'Sends a running command or agent to the background so you can keep working.',
        source: `${CC}/interactive-mode`,
      },
      {
        code: '/btw',
        kind: 'copy',
        does: 'Ask a quick side question about your work without adding it to the conversation history.',
        source: `${CC}/interactive-mode`,
      },
      {
        code: 'ultrathink',
        kind: 'copy',
        does: 'Put this word anywhere in a prompt for deeper reasoning on that one turn.',
        note: '"think hard" and similar phrases are no longer keywords.',
        source: `${CC}/model-config`,
      },
      {
        code: 'claude -c',
        kind: 'copy',
        does: 'Reopens your most recent conversation in this folder.',
        note: 'claude --resume lets you pick an older one from a list.',
        source: `${CC}/common-workflows`,
      },
      {
        code: 'Ctrl+S',
        kind: 'key',
        does: 'Stashes a half-written prompt. Press it again on an empty prompt to bring the text back.',
        source: `${CC}/interactive-mode`,
      },
      {
        code: '/context',
        kind: 'copy',
        does: 'Shows how full the context window is, as a colored grid.',
        source: `${CC}/commands`,
      },
      {
        code: '/powerup',
        kind: 'copy',
        does: 'Quick interactive lessons, with animated demos, that teach you Claude Code features.',
        source: `${CC}/commands`,
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
      },
      {
        code: 'Every Monday at 9 AM, …',
        kind: 'key',
        does: 'In the new combined Claude, describe the task and how often to run it, and Claude schedules it.',
        source: `${CW}/13854387-schedule-recurring-tasks-in-claude-cowork`,
      },
      {
        code: '/',
        kind: 'key',
        does: 'Lists your available skills, including ones from plugins you have added. Works in chat too.',
        source: `${CW}/13837440-use-plugins-in-claude`,
      },
      {
        code: '/plugin-name:command',
        kind: 'key',
        does: 'Runs one specific command from a plugin you have added.',
        source: `${CW}/13837440-use-plugins-in-claude`,
      },
      {
        code: '/deep-research',
        kind: 'copy',
        does: 'Starts an in-depth Research task.',
        where: 'New combined Claude',
        source: `${CW}/16761823-claude-cowork-and-chat-are-one-claude`,
      },
      {
        code: '/docx /pdf /pptx /xlsx',
        kind: 'key',
        does: 'Call the skill for Word, PDF, PowerPoint or Excel files by name.',
        source: CW_LOG,
      },
      {
        code: '+  →  Memory off',
        kind: 'key',
        does: 'Before your first message, turn Memory off to run one task without using or adding to memory.',
        source: `${CW}/13345190-get-started-with-claude-cowork`,
      },
      {
        code: '⌘K / Ctrl+K',
        kind: 'key',
        does: 'Opens the command palette, where you can archive or delete the current chat, project or task.',
        where: 'Desktop app',
        source: CW_LOG,
      },
      {
        code: 'Cmd/Ctrl+Enter',
        kind: 'key',
        does: 'While Claude is replying, sends your message right away and interrupts the current turn.',
        where: 'Desktop app',
        source: CW_LOG,
      },
      {
        code: 'Option Option',
        kind: 'key',
        does: 'Double-tap Option to open Claude from any app (Quick Entry).',
        where: 'Mac desktop app',
        source: `${CW}/12626668-use-quick-entry-with-claude-desktop-on-mac`,
      },
      {
        code: 'Claude icon in Chrome',
        kind: 'key',
        does: 'Click it in your Chrome toolbar to open the side panel, which starts a Cowork session.',
        where: 'Chrome',
        source: `${CW}/15520349-use-claude-cowork-on-web-desktop-and-mobile`,
      },
      {
        code: 'Use an existing folder',
        kind: 'key',
        does: 'When you create a Cowork project, choose this to build it around a folder already on your computer.',
        where: 'Desktop app',
        source: `${CW}/14116274-organize-your-tasks-with-projects-in-claude-cowork`,
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
      },
      {
        code: '⌘L / Ctrl+L',
        kind: 'key',
        does: 'Select text in an agent reply, then press this to quote it in your next message. ⌘I / Ctrl+I works too.',
        where: 'App',
        source: `${AG}/at-mentions/`,
      },
      {
        code: '@rules:',
        kind: 'copy',
        does: 'Attach any workspace or global rule to your prompt, whatever its trigger.',
        where: 'App & CLI',
        source: `${AG}/at-mentions/`,
      },
      {
        code: '@conversation:',
        kind: 'copy',
        does: 'Point the agent at a past conversation instead of repeating yourself.',
        where: 'App & CLI',
        source: `${AG}/at-mentions/`,
      },
      {
        code: '/btw',
        kind: 'copy',
        does: 'Ask a quick question in the background without pausing the agent’s work.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
      },
      {
        code: '/grill-me',
        kind: 'copy',
        does: 'The agent interviews you one question at a time, each with a suggested answer, to pin down details.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
      },
      {
        code: '/goal',
        kind: 'copy',
        does: 'The agent keeps working on its own until the goal is reached, without pausing in between.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
      },
      {
        code: '/learn',
        kind: 'copy',
        does: 'Turns your feedback and corrections from this session into lasting Rules or Skills.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
      },
      {
        code: '/browser',
        kind: 'copy',
        does: 'Launches a browser subagent to test your UI live, take screenshots and inspect pages.',
        where: 'App & CLI',
        source: `${AG}/slash-commands/`,
      },
      {
        code: '⌘L / Ctrl+L',
        kind: 'key',
        does: 'Jumps to the agent panel and adds the selected lines to your prompt as context.',
        where: 'IDE',
        source: `${AG}/getting-started/`,
      },
      {
        code: 'Option+Enter / Alt+Enter',
        kind: 'key',
        does: 'Accepts the agent’s change under your cursor. Add Shift to reject it instead.',
        where: 'IDE',
        source: `${AG}/ide/review-changes-editor/`,
      },
      {
        code: 'Shift+Tab',
        kind: 'key',
        does: 'Cycles modes: default, accept-edits, auto and plan.',
        where: 'CLI',
        source: `${AG}/cli/modes/`,
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
      },
      {
        code: '@',
        kind: 'key',
        does: 'Search for a file and mention it in your message.',
        source: `${CX}/tui/src/bottom_pane/shortcut_overlay.rs`,
      },
      {
        code: 'Esc',
        kind: 'key',
        does: 'On an empty prompt, steps back so you can edit your last message. Enter confirms.',
        source: `${CX}/tui/assets/tooltips.txt`,
      },
      {
        code: 'Tab',
        kind: 'key',
        does: 'While Codex is working, queues your next message instead of sending it now.',
        source: `${CX}/tui/assets/tooltips.txt`,
      },
      {
        code: 'Ctrl+T',
        kind: 'key',
        does: 'Opens the full transcript of the session.',
        source: `${CX}/tui/src/keymap.rs`,
      },
      {
        code: 'Alt+.  /  Alt+,',
        kind: 'key',
        does: 'Raise or lower reasoning effort without leaving the prompt. Shift+Up and Shift+Down also work.',
        source: `${CX}/tui/src/keymap.rs`,
      },
      {
        code: '/init',
        kind: 'copy',
        does: 'Creates an AGENTS.md file with standing instructions for Codex in your project.',
        source: `${CX}/tui/src/slash_command.rs`,
      },
      {
        code: '/review',
        kind: 'copy',
        does: 'Reviews your current changes and finds issues.',
        source: `${CX}/tui/src/slash_command.rs`,
      },
      {
        code: '/compact',
        kind: 'copy',
        does: 'Summarizes the conversation so you don’t hit the context limit.',
        source: `${CX}/tui/src/slash_command.rs`,
      },
      {
        code: '/side',
        kind: 'copy',
        does: 'Starts a side conversation in a temporary fork, so the main thread stays clean. /btw does the same.',
        source: `${CX}/tui/assets/tooltips.txt`,
      },
      {
        code: 'codex resume --last',
        kind: 'copy',
        does: 'Picks up your most recent session. Leave off --last to choose from a list.',
        source: `${CX}/cli/src/main.rs`,
      },
      {
        code: 'codex exec',
        kind: 'copy',
        does: 'Runs Codex non-interactively, without the chat screen. Short form: codex e.',
        source: `${CX}/cli/src/main.rs`,
      },
    ],
  },
]
