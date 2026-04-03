import { PromptPreset, SystemPrompts } from "@/types/core/settings.types";
import { GPT_ANCHOR_PROMPT, GPT_SYSTEM_PROMPT } from "./presets/gpt";
import {
  CLAUDE_ANCHOR_PROMPT,
  CLAUDE_SYSTEM_PROMPT,
} from "./presets/claude";
import { GEMINI_ANCHOR_PROMPT, GEMINI_SYSTEM_PROMPT } from "./presets/gemini";
import { NSFW_ANCHOR_PROMPT, NSFW_SYSTEM_PROMPT } from "./presets/nsfw";

const normalizePrompt = (value: string): string =>
  value.replace(/\r\n/g, "\n").trim();

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "gpt",
    name: "GPT",
    description: "Balanced preset tuned for GPT-style chat responses.",
    prompts: {
      system: GPT_SYSTEM_PROMPT,
      anchor: GPT_ANCHOR_PROMPT,
    },
  },
  {
    id: "claude",
    name: "Claude",
    description: "Preset tuned for thoughtful and natural Claude-style output.",
    prompts: {
      system: CLAUDE_SYSTEM_PROMPT,
      anchor: CLAUDE_ANCHOR_PROMPT,
    },
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Preset tuned for fast and flexible Gemini-style output.",
    prompts: {
      system: GEMINI_SYSTEM_PROMPT,
      anchor: GEMINI_ANCHOR_PROMPT,
    },
  },
  {
    id: "nsfw",
    name: "NSFW",
    description: "Preset tuned for explicit roleplay and intense scenes.",
    prompts: {
      system: NSFW_SYSTEM_PROMPT,
      anchor: NSFW_ANCHOR_PROMPT,
    },
  },
];

export const getPromptPreset = (
  presetId: string | null | undefined
): PromptPreset | undefined =>
  PROMPT_PRESETS.find((preset) => preset.id === presetId);

export const inferPromptPresetId = (
  prompts: Pick<SystemPrompts, "system" | "anchor">
): string | null => {
  const normalizedSystem = normalizePrompt(prompts.system);
  const normalizedAnchor = normalizePrompt(prompts.anchor);

  const match = PROMPT_PRESETS.find(
    (preset) =>
      normalizePrompt(preset.prompts.system) === normalizedSystem &&
      normalizePrompt(preset.prompts.anchor) === normalizedAnchor
  );

  return match?.id ?? null;
};

export interface ReplyApproachOption {
  id: string;
  label: string;
  description: string;
  promptInstruction: string;
}

export const REPLY_APPROACH_OPTIONS: ReplyApproachOption[] = [
  {
    id: "empathy",
    label: "Empathy",
    description: "Lead with emotional resonance and support.",
    promptInstruction:
      "Write a reply that prioritizes empathy and emotional attunement.",
  },
  {
    id: "question",
    label: "Question",
    description: "Move the conversation forward by asking.",
    promptInstruction:
      "Write a reply that advances the exchange with a natural question.",
  },
  {
    id: "topic",
    label: "Topic Shift",
    description: "Open a new but relevant branch of the conversation.",
    promptInstruction:
      "Write a reply that introduces a related new angle without breaking flow.",
  },
  {
    id: "analysis",
    label: "Analysis",
    description: "Acknowledge the situation with a thoughtful take.",
    promptInstruction:
      "Write a reply that briefly analyzes the situation before responding.",
  },
  {
    id: "tease",
    label: "Tease",
    description: "Use a light, playful edge.",
    promptInstruction:
      "Write a reply with light teasing while staying in character.",
  },
];

export const DEFAULT_REPLY_SUGGESTION_APPROACHES: [string, string, string] = [
  REPLY_APPROACH_OPTIONS[0].promptInstruction,
  REPLY_APPROACH_OPTIONS[1].promptInstruction,
  REPLY_APPROACH_OPTIONS[2].promptInstruction,
];

export const DEFAULT_REPLY_SUGGESTION_PROMPT = `【Character Style】
性格: \${replySuggestionStyle.personality}
口調: \${replySuggestionStyle.tone}
振る舞い: \${replySuggestionStyle.behavior}
一人称: \${replySuggestionStyle.firstPerson}

【Task】
\${userName} に対して、\${charName} として自然な返信候補を3つ作成してください。
各候補には次の方向性をそれぞれ反映してください。
1. \${approaches[0]}
2. \${approaches[1]}
3. \${approaches[2]}

【Context】
\${context}

【Output Rules】
- 各候補は1文から3文程度に収める
- 相手の発言をそのまま繰り返さない
- \${charName} の口調と人格を保つ
- 説明文や番号は出力しない`;

export function buildReplySuggestionFromApproaches(
  instructions: string[]
): string {
  const selectedInstructions = instructions
    .map((instruction) => instruction.trim())
    .filter(Boolean)
    .slice(0, 3);

  const approaches = [...selectedInstructions];
  while (approaches.length < 3) {
    approaches.push(
      DEFAULT_REPLY_SUGGESTION_APPROACHES[
        Math.min(
          approaches.length,
          DEFAULT_REPLY_SUGGESTION_APPROACHES.length - 1
        )
      ]
    );
  }

  return DEFAULT_REPLY_SUGGESTION_PROMPT
    .replace(/\$\{approaches\[0\]\}/g, approaches[0])
    .replace(/\$\{approaches\[1\]\}/g, approaches[1])
    .replace(/\$\{approaches\[2\]\}/g, approaches[2]);
}
