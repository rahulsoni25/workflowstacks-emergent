// Homepage FAQ — the single source for both the visible accordion
// (app/HomeClient.js) and the FAQPage JSON-LD emitted by app/page.js, so the
// rich-result markup can never drift from what visitors actually read.
export function homeFaqs() {
  return [
    {
      q: "Isn't this just GitHub with extra steps?",
      a: 'The repos stay free on GitHub. What you skip is the hours of comparing forks, reading READMEs and writing the prompt that makes them work together. Every listing here is scored, given a plain-English usage guide, and handed to you as one paste-ready blueprint.',
    },
    {
      q: "If it's free, what's the catch?",
      a: 'We earn from done-for-you builds, a few premium tools, and a 15% share of creator-sold agents. The open-source catalog stays free, with every source readable line-by-line before you use it.',
    },
    {
      q: 'Will it work in my AI tool?',
      a: 'Yes. Install hands you a system prompt formatted for Claude, ChatGPT or Gemini. Paste it as a project, custom GPT or Gem instruction. No API keys, no servers, no code.',
    },
    {
      q: 'Do I need to code?',
      a: 'No. If you can describe the job in a sentence, you can install the agent. Describe it, review the match, pick where it should run, paste.',
    },
  ]
}
