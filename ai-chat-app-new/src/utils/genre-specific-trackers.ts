/**
 * ジャンル特化トラッカーの定義
 * サスペンス・ホラー、ロマンス、ファンタジーなどのジャンルに特化したトラッカー
 */

import { TrackerDefinition, TrackerCategory, TrackerType, NumericTrackerConfig } from "@/types";

// 簡略化されたトラッカー定義（実行時にTrackerDefinitionに変換）
export interface SimpleTrackerDefinition {
  name: string;
  display_name: string;
  description: string;
  config: NumericTrackerConfig | any;
  category?: TrackerCategory;
  type?: TrackerType;
}

export interface GenreTrackerSet {
  genre: string;
  trackers: SimpleTrackerDefinition[];
  description: string;
}

/**
 * SimpleTrackerDefinitionをTrackerDefinitionに変換
 */
export function toTrackerDefinition(simple: SimpleTrackerDefinition): TrackerDefinition {
  return {
    id: `tracker_${simple.name}_${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    name: simple.name,
    display_name: simple.display_name,
    description: simple.description,
    category: simple.category || 'status',
    type: simple.type || (simple.config.type as TrackerType),
    config: simple.config
  };
}

/**
 * サスペンス・ホラー特化トラッカー
 */
export const SUSPENSE_HORROR_TRACKERS: GenreTrackerSet = {
  genre: "suspense_horror",
  description: "Suspense and horror genre specific trackers",
  trackers: [
    {
      name: "fear_level",
      display_name: "Fear Level",
      description: "Current level of fear and anxiety",
      config: {
        type: "numeric",
        initial_value: 20,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "suspicion",
      display_name: "Suspicion",
      description: "Level of suspicion towards others",
      config: {
        type: "numeric",
        initial_value: 30,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "tension",
      display_name: "Tension",
      description: "Overall tension level in the situation",
      config: {
        type: "numeric",
        initial_value: 40,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "mystery",
      display_name: "Mystery",
      description: "Level of mystery and unknown elements",
      config: {
        type: "numeric",
        initial_value: 60,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "paranoia",
      display_name: "Paranoia",
      description: "Level of paranoia and distrust",
      config: {
        type: "numeric",
        initial_value: 25,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "safety_feeling",
      display_name: "Safety Feeling",
      description: "How safe the character feels",
      config: {
        type: "numeric",
        initial_value: 70,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "mental_state",
      display_name: "Mental State",
      description: "Current mental condition",
      config: {
        type: "state",
        initial_state: "stable",
        possible_states: [
          "stable",
          "anxious",
          "terrified",
          "paranoid",
          "traumatized",
          "numb",
        ],
      },
    },
    {
      name: "threat_level",
      display_name: "Threat Level",
      description: "Perceived level of danger",
      config: {
        type: "state",
        initial_state: "low",
        possible_states: [
          "none",
          "low",
          "moderate",
          "high",
          "extreme",
          "imminent",
        ],
      },
    },
  ],
};

/**
 * ロマンス特化トラッカー
 */
export const ROMANCE_TRACKERS: GenreTrackerSet = {
  genre: "romance",
  description: "Romance genre specific trackers",
  trackers: [
    {
      name: "romance_level",
      display_name: "Romance Level",
      description: "Level of romantic feelings",
      config: {
        type: "numeric",
        initial_value: 30,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "attraction",
      display_name: "Attraction",
      description: "Physical and emotional attraction",
      config: {
        type: "numeric",
        initial_value: 40,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "intimacy",
      display_name: "Intimacy",
      description: "Level of emotional intimacy",
      config: {
        type: "numeric",
        initial_value: 25,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "trust",
      display_name: "Trust",
      description: "Level of trust in the relationship",
      config: {
        type: "numeric",
        initial_value: 50,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "jealousy",
      display_name: "Jealousy",
      description: "Level of jealousy and possessiveness",
      config: {
        type: "numeric",
        initial_value: 20,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "relationship_stage",
      display_name: "Relationship Stage",
      description: "Current stage of the relationship",
      config: {
        type: "state",
        initial_state: "acquaintance",
        possible_states: [
          "stranger",
          "acquaintance",
          "friend",
          "close_friend",
          "dating",
          "boyfriend_girlfriend",
          "engaged",
          "married",
        ],
      },
    },
    {
      name: "emotional_connection",
      display_name: "Emotional Connection",
      description: "Depth of emotional bond",
      config: {
        type: "state",
        initial_state: "surface",
        possible_states: [
          "none",
          "surface",
          "developing",
          "deep",
          "profound",
          "soulmate",
        ],
      },
    },
  ],
};

/**
 * ファンタジー特化トラッカー
 */
export const FANTASY_TRACKERS: GenreTrackerSet = {
  genre: "fantasy",
  description: "Fantasy genre specific trackers",
  trackers: [
    {
      name: "magic_power",
      display_name: "Magic Power",
      description: "Current magical abilities and power level",
      config: {
        type: "numeric",
        initial_value: 50,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "mana_level",
      display_name: "Mana Level",
      description: "Current magical energy reserves",
      config: {
        type: "numeric",
        initial_value: 80,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "adventure_spirit",
      display_name: "Adventure Spirit",
      description: "Enthusiasm for adventure and exploration",
      config: {
        type: "numeric",
        initial_value: 70,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "heroism",
      display_name: "Heroism",
      description: "Level of heroic behavior and courage",
      config: {
        type: "numeric",
        initial_value: 60,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "magical_affinity",
      display_name: "Magical Affinity",
      description: "Natural talent for magic",
      config: {
        type: "state",
        initial_state: "average",
        possible_states: [
          "none",
          "weak",
          "average",
          "strong",
          "exceptional",
          "legendary",
        ],
      },
    },
    {
      name: "quest_status",
      display_name: "Quest Status",
      description: "Current quest or mission status",
      config: {
        type: "state",
        initial_state: "none",
        possible_states: [
          "none",
          "assigned",
          "in_progress",
          "completed",
          "failed",
          "abandoned",
        ],
      },
    },
  ],
};

/**
 * サイエンスフィクション特化トラッカー
 */
export const SCIFI_TRACKERS: GenreTrackerSet = {
  genre: "scifi",
  description: "Science fiction genre specific trackers",
  trackers: [
    {
      name: "tech_understanding",
      display_name: "Tech Understanding",
      description: "Understanding of advanced technology",
      config: {
        type: "numeric",
        initial_value: 60,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "adaptation",
      display_name: "Adaptation",
      description: "Ability to adapt to new environments",
      config: {
        type: "numeric",
        initial_value: 70,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "curiosity",
      display_name: "Curiosity",
      description: "Level of scientific curiosity",
      config: {
        type: "numeric",
        initial_value: 80,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "innovation",
      display_name: "Innovation",
      description: "Ability to create and innovate",
      config: {
        type: "numeric",
        initial_value: 65,
        min_value: 0,
        max_value: 100,
        step: 5,
      },
    },
    {
      name: "tech_level",
      display_name: "Tech Level",
      description: "Familiarity with current technology level",
      config: {
        type: "state",
        initial_state: "advanced",
        possible_states: [
          "primitive",
          "basic",
          "intermediate",
          "advanced",
          "cutting_edge",
          "futuristic",
        ],
      },
    },
  ],
};

/**
 * 全ジャンルトラッカーセット
 */
export const ALL_GENRE_TRACKERS: GenreTrackerSet[] = [
  SUSPENSE_HORROR_TRACKERS,
  ROMANCE_TRACKERS,
  FANTASY_TRACKERS,
  SCIFI_TRACKERS,
];

/**
 * ジャンル名からトラッカーセットを取得
 */
export function getTrackersByGenre(genre: string): GenreTrackerSet | undefined {
  return ALL_GENRE_TRACKERS.find((trackerSet) => trackerSet.genre === genre);
}

/**
 * 利用可能なジャンル一覧を取得
 */
export function getAvailableGenres(): string[] {
  return ALL_GENRE_TRACKERS.map((trackerSet) => trackerSet.genre);
}

/**
 * ジャンル特化トラッカーの説明を取得
 */
export function getGenreDescription(genre: string): string {
  const trackerSet = getTrackersByGenre(genre);
  return trackerSet?.description || "Unknown genre";
}
