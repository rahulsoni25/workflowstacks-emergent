# Planning and prompting shots in Google Flow

Read this before writing Flow prompts or advising on Flow. Facts about Flow change often. The ones below were researched on 11 October 2026; each names its source, and third-party figures are marked as such. When the user is about to spend money or credits, tell them to check Google's current pages.

## Contents

1. What Flow can and cannot do
2. Plan the film before generating anything
3. A prompt template
4. Continuity across shots
5. The planning fields in film.json
6. Generate, choose, download
7. Sources

## 1. What Flow can and cannot do

| Fact | Source |
| --- | --- |
| Flow is a web app with no official public API. Automation goes through the Gemini API or Vertex AI, which run the same Veo models. Third-party "Flow APIs" drive Google accounts through captcha solvers, which is a terms-of-service and reliability risk. | Skywork guide (third party); no official Google statement of a Flow API was found |
| A Google AI Pro subscription covers the web apps, Flow included, but not API calls. API use needs separate billing in Google AI Studio or Google Cloud. | Google AI Developers Forum, moderator reply |
| AI Pro includes about 1,000 Flow credits a month. For non-Ultra users, Veo 3.1 Fast costs 20 credits per generation and Quality costs 100, so roughly 50 Fast or 10 Quality clips a month. | diyai.io pricing page (third party) |
| Ingredients to Video takes several reference images to control characters, objects and style. Frames to Video takes a start image and an end image and fills in the motion. Extend continues a clip from its final second. | Google blog |
| Through the API, Veo 3.1 clips are 4, 6 or 8 seconds long. Eight seconds is required with reference images, extension, 1080p and 4K, and a request takes up to three reference images. | Gemini API Veo documentation |
| Developers report that image-to-video requests showing realistic people are rejected, even with the documented allow-adult person setting. | Google AI Developers Forum threads |

**What this means for planning.**
- **Clips come from the user.** Flow is driven by hand, so the user generates them in the browser and you automate everything after the download.
- **Plan in 8-second shots.** A 30–60 s film is 5–8 shots, depending on transitions and the end card.
- **Do not count on lip-syncing a fixed script.** Flow writes a clip's sound itself from the prompt. Keep spoken lines short, one per shot at most. Carry exact wording with a separate voice-over (`audio.voiceover`) or on-screen text.
- **Avoid photos of real people as starting frames.** Build characters from descriptions, or from Ingredients reference images of generated people.

## 2. Plan the film before generating anything

Write the shot list and the graphics plan together, in film.json, before the user spends credits. The graphics change what each shot needs:
- A shot that carries a lower-left headline needs a calm lower third.
- A shot with a side panel needs its subject on the other side.
- A 9:16 film needs its subjects near the centre.

A structure that works for 30–60 s product films:

| Beat | Shot | Graphic |
| --- | --- | --- |
| Hook, 0–8 s | the product in use, or a striking moment | headline or checklist |
| The need | someone with the problem the page describes | headline with two `lines` |
| The old way, then the turn | a contrast moment | headline, then a card |
| How it works | the product moment, a person using it | steps with a lowerThird |
| Payoff | the reaction, the result | statement with chips |
| End card | none | name, tagline, URL |

Film length is the sum of the shot lengths, minus the transitions, plus the end card.

## 3. A prompt template

This is a working template, not Google's official format. Write one paragraph per shot, in this order:

1. **Shot and camera.** "Medium close-up, slow push-in, eye level, 35 mm lens."
2. **Subject.** Use the same descriptor sentence in every shot the person appears in: "a man in his early 30s with curly black hair, round black glasses and a charcoal hoodie".
3. **Action, with the beat placed in time.** "He leans back, then smiles and clicks the mouse at about 6 seconds."
4. **Setting.** "A home edit suite at night, two monitors showing timelines, film posters on the wall."
5. **Light and look.** "Teal monitor glow, a warm desk lamp, shallow depth of field, cinematic colour grade."
6. **Sound.** "Quiet room tone, a mouse click, a soft notification chime, no music." Put any spoken line in quotes, and keep it under about 15 words.
7. **Room for graphics.** "Keep the lower third of the frame uncluttered; subject on the left third." For 9:16, add "subject centred".

Leave out:
- **Readable text, screens full of words, and logos in the scene.** Generated text tends to come out garbled, and the engine adds clean, on-brand text.
- **Real people's names or likenesses.**
- **Claims.** A prompt that shows "10,000 happy customers" puts an unsourced claim in the picture.

## 4. Continuity across shots

- **Same people.** Repeat each character's descriptor sentence word for word in every prompt, or give every shot the same Ingredients reference images.
- **Seamless joins.** After downloading shot N, run `node studio.mjs frames <project>`. Then start shot N+1 in Frames to Video from `frames/NN-last.png`. Record that in the shot's `startFrame` so `prompts.md` says so.
- **Same place and time.** Reuse the setting and light words exactly, including the time of day.
- **Screen direction.** Keep movement in one direction across a cut, for example left to right. Use `smoothleft` or `slideleft` transitions when the place changes.
- **Props and wardrobe.** Name them in every shot where they appear: the same glass, the same jacket.

## 5. The planning fields in film.json

```json
{
  "clip": "clips/02-brief.mp4",
  "prompt": "Wide shot, static camera at a roadside chai stall in Mumbai at golden hour. Two men in their late 20s ...",
  "startFrame": "frames/01-last.png",
  "ingredients": ["refs/character-a.png", "refs/character-b.png"],
  "dialogue": "Just post the brief. They pitch you.",
  "continuity": "character A wears the same olive overshirt as in shot 1; same stall, same light",
  "graphics": [ { "type": "headline", "at": 0.8, "until": 7.4, "text": "Post what you need." } ]
}
```

`node studio.mjs prompts <project>` turns these fields into `prompts.md`: one section per shot, with the file name to save the download as, the aspect ratio, the part of the clip the film uses, the start frame, ingredients, spoken line, continuity note and the graphics that will sit on top. The engine itself ignores these fields.

## 6. Generate, choose, download

- **Takes.** Generate two to four takes per shot, using Fast to explore and Quality for the final take of the hero shots. Credits run out quickly: at the third-party figures above, three Fast takes of six shots is 360 credits, and two Quality finals add 200.
- **Download.** Save each take at the highest resolution Flow offers, under the name in `prompts.md`, in `clips/`.
- **Review.** Run `probe` and look at the contact sheets. Common faults are warped hands, faces that morph mid-move, and garbled text on screens. When a fault sits at the start or end of a take, trim it with `in` and `out` instead of regenerating.
- **Record the takes.** If the user keeps alternative takes, name them `02-brief-b.mp4` and so on. Switching takes is then a one-word change in film.json.

## 7. Sources

All were read on 11 October 2026.

- Google, "Bringing new Veo 3.1 updates into Flow to edit AI video": https://blog.google/innovation-and-ai/products/veo-updates-flow/
- Google AI for Developers, "Generate videos with Veo 3.1 in Gemini API": https://ai.google.dev/gemini-api/docs/veo
- Google AI Developers Forum, "Does Google One AI Pro include API access for Veo 3 or is it limited to Flow only?": https://discuss.ai.google.dev/t/does-google-one-ai-pro-include-api-access-for-veo-3-or-is-it-limited-to-flow-only/110794
- Google AI Developers Forum, "Veo 3.1 image-to-video rejects documented personGeneration=allow_adult": https://discuss.ai.google.dev/t/veo-3-1-image-to-video-rejects-documented-persongeneration-allow-adult/181139
- diyai.io (third party), "Google Veo Pricing 2026: Flow Credits, Free Access and API Cost": https://diyai.io/ai-tools/video-generation/google-veo-pricing/
- Skywork (third party), guide to Flow and the Veo APIs: https://skywork.ai/blog/?p=25763
- magichour.ai (third party), "Veo 3.1 pricing (2026)", for API per-second prices if the user considers the API route: https://magichour.ai/blog/veo-3-pricing
