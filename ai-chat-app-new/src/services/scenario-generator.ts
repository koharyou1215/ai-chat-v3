import { Character } from '@/types/core/character.types';
import { Persona } from '@/types/core/persona.types';
import { simpleAPIManagerV2 } from './simple-api-manager-v2';

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  setting: string;
  situation: string;
  objectives?: string[];
  tone: 'casual' | 'dramatic' | 'romantic' | 'adventure' | 'mystery' | 'comedy';
  character_requirements: {
    min_count: number;
    max_count: number;
    preferred_types?: string[]; // 例: ['魔法使い', '探偵', '貴族']
  };
}

export interface GeneratedScenario {
  title: string;
  setting: string;
  situation: string;
  initial_prompt: string;
  character_roles: Record<string, string>; // character_id -> role description
  objectives: string[];
  background_context: string;
}

export class ScenarioGenerator {
  // ⚡ シナリオキャッシュ for 高速化
  private scenarioCache: Map<string, GeneratedScenario> = new Map();
  private readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30分
  
  private templates: ScenarioTemplate[] = [
    {
      id: 'magic_academy',
      name: '魔法学院の日常',
      description: '魔法学院での学生生活や授業での出来事',
      setting: '名門魔法学院の校舎内',
      situation: '新学期が始まり、生徒たちが様々な魔法の授業や課題に取り組む',
      objectives: ['魔法技術の向上', '友情の構築', '謎の解決'],
      tone: 'casual',
      character_requirements: { min_count: 2, max_count: 5, preferred_types: ['魔法使い', '学生'] }
    },
    {
      id: 'detective_case',
      name: '探偵事務所の事件',
      description: '探偵と助手、関係者が謎の事件を解決する',
      setting: '都市部の探偵事務所周辺',
      situation: '不可解な事件が発生し、調査が必要になる',
      objectives: ['事件の真相究明', '証拠の収集', '犯人の特定'],
      tone: 'mystery',
      character_requirements: { min_count: 2, max_count: 4, preferred_types: ['探偵', '助手'] }
    },
    {
      id: 'royal_court',
      name: '宮廷の陰謀',
      description: '王宮での政治的駆け引きや貴族間の関係',
      setting: '華麗な王宮の宮廷',
      situation: '重要な政治的決定を控え、各勢力が動き出す',
      objectives: ['政治的優位の確保', '同盟の構築', '陰謀の阻止'],
      tone: 'dramatic',
      character_requirements: { min_count: 2, max_count: 5, preferred_types: ['貴族', '王族'] }
    },
    {
      id: 'cafe_meeting',
      name: 'カフェでの偶然の出会い',
      description: 'カフェで偶然出会ったキャラクターたちの交流',
      setting: '街角のおしゃれなカフェ',
      situation: '偶然同じカフェに居合わせたキャラクターたちが交流を深める',
      objectives: ['相互理解', '友情の芽生え', '新しい発見'],
      tone: 'casual',
      character_requirements: { min_count: 2, max_count: 4 }
    },
    {
      id: 'adventure_quest',
      name: '冒険クエスト',
      description: '危険なクエストに挑むパーティー',
      setting: '未知の土地や古代遺跡',
      situation: '重要なアイテムや情報を求めて冒険に出発する',
      objectives: ['目標の達成', 'チームワークの発揮', '困難の克服'],
      tone: 'adventure',
      character_requirements: { min_count: 3, max_count: 5 }
    }
  ];

  /**
   * キャラクターに基づいてシナリオテンプレートを推奨
   */
  getRecommendedTemplates(characters: Character[]): ScenarioTemplate[] {
    return this.templates.filter(template => {
      const characterCount = characters.length;
      
      // キャラクター数の条件チェック
      if (characterCount < template.character_requirements.min_count || 
          characterCount > template.character_requirements.max_count) {
        return false;
      }
      
      // キャラクタータイプの適合性チェック
      if (template.character_requirements.preferred_types) {
        const characterTypes = characters.flatMap(char => char.tags || []);
        const hasMatchingType = template.character_requirements.preferred_types.some(type =>
          characterTypes.some(tag => tag.includes(type))
        );
        return hasMatchingType;
      }
      
      return true;
    }).sort((a, b) => {
      // 適合度の高い順にソート
      const aScore = this.calculateTemplateScore(a, characters);
      const bScore = this.calculateTemplateScore(b, characters);
      return bScore - aScore;
    });
  }

  /**
   * テンプレートとキャラクターの適合度を計算
   */
  private calculateTemplateScore(template: ScenarioTemplate, characters: Character[]): number {
    let score = 0;
    
    // キャラクタータイプマッチング
    if (template.character_requirements.preferred_types) {
      const characterTypes = characters.flatMap(char => char.tags || []);
      template.character_requirements.preferred_types.forEach(preferredType => {
        if (characterTypes.some(tag => tag.includes(preferredType))) {
          score += 10;
        }
      });
    }
    
    // キャラクター数の最適性
    const optimalCount = (template.character_requirements.min_count + template.character_requirements.max_count) / 2;
    const countDiff = Math.abs(characters.length - optimalCount);
    score += Math.max(0, 5 - countDiff);
    
    return score;
  }

  /**
   * AIを使用してカスタムシナリオを生成
   */
  async generateCustomScenario(characters: Character[], persona: Persona, userRequest?: string, apiConfig?: Record<string, unknown>): Promise<GeneratedScenario> {
    // ⚡ キャッシュキー生成
    const cacheKey = `${characters.map(c => c.id).sort().join('-')}-${persona.id}-${userRequest || 'default'}`;
    const cachedScenario = this.scenarioCache.get(cacheKey);
    
    if (cachedScenario) {
      console.log('⚡ シナリオキャッシュヒット!');
      return cachedScenario;
    }
    const characterDescriptions = characters.map(char => ({
      name: char.name,
      occupation: char.occupation,
      personality: (char.personality ?? '').substring(0, 200), // 短縮
      tags: char.tags?.slice(0, 3) || []
    }));

    const allParticipantRoles = [
      `    "${persona.name}": "ユーザーの役割・立場"`,
      ...characters.map(char => 
        `    "${char.name}": "役割・立場"`
      )
    ].join(',\n');

    const prompt = `JSON形式でグループチャットシナリオを生成してください。

参加者: ${persona.name}(${persona.occupation})、${characterDescriptions.map(char => `${char.name}(${char.occupation})`).join('、')}
リクエスト: ${userRequest || 'キャラクターの個性を活かしたシナリオ'}

以下のJSON形式で回答（説明文は不要）:
\`\`\`json
{
  "title": "シナリオのタイトル",
  "setting": "場所や環境の説明",
  "situation": "現在起きている出来事",
  "initial_prompt": "グループチャットの最初の状況説明",
  "character_roles": {
${allParticipantRoles}
  },
  "objectives": ["目標1", "目標2", "目標3"],
  "background_context": "世界観や背景"
}
\`\`\``;

    try {
      console.log('AI シナリオ生成開始:', {
        characters: characters.map(c => c.name),
        userRequest: userRequest || 'なし'
      });

      // ⚡ 高速化されたシナリオ生成（タイムアウト付き）
      let response = await Promise.race([
        simpleAPIManagerV2.generateMessage(
          prompt,
          '',
          [],
          { 
            ...apiConfig,
            max_tokens: 1200,  // より長い生成のため増やす
            temperature: 0.8   // 創造的な生成のため温度を上げる
          }
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AI生成タイムアウト')), 15000) // 15秒タイムアウト
        )
      ]);

      console.log('AI レスポンス:', response);

      // JSONが含まれていない場合は再試行
      if (!response.includes('"title"') || !response.includes('"setting"')) {
        console.warn('レスポンスにJSONが含まれていません。再試行...');
        
        // より簡潔なプロンプトで再試行
        const shorterPrompt = `
以下のユーザーとキャラクターでグループチャットシナリオをJSON形式で生成:
ユーザー: ${persona.name}(${persona.occupation})
キャラクター: ${characterDescriptions.map(char => `${char.name}(${char.occupation})`).join(', ')}

JSON:
{
  "title": "シナリオタイトル",
  "setting": "場所・環境",
  "situation": "現在の状況",
  "initial_prompt": "導入文",
  "character_roles": {${allParticipantRoles}},
  "objectives": ["目標1", "目標2"],
  "background_context": "背景"
}`;

        response = await simpleAPIManagerV2.generateMessage(
          '以下のJSONフォーマットを完成させてください。JSONのみで回答し、他の説明は一切不要です。',
          shorterPrompt,
          [],
          { 
            ...apiConfig,
            max_tokens: 800
          }
        );
        
        console.log('再試行レスポンス:', response);
      }

      // より柔軟なJSONレスポンスの抽出
      // まず```jsonブロックを優先的に探す
      let jsonMatch = null;
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
      
      // ```jsonがない場合は通常のJSONを探す
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[\s\S]*\}/);
      }

      // 不完全なJSONの修復を試行
      if (!jsonMatch && response.includes('{')) {
        console.log('不完全なJSONの修復を試行...');
        let jsonStr = response.substring(response.indexOf('{'));
        
        // 最後の}を見つけて、その後の不完全な部分をカット
        const lastBraceIndex = jsonStr.lastIndexOf('}');
        if (lastBraceIndex > 0) {
          jsonStr = jsonStr.substring(0, lastBraceIndex + 1);
          jsonMatch = [jsonStr];
          console.log('修復されたJSON:', jsonStr.substring(0, 200) + '...');
        }
      }

      if (jsonMatch) {
        try {
          const scenarioData = JSON.parse(jsonMatch[0]);
          console.log('パース成功:', scenarioData);
          
          // 必須フィールドの検証
          if (scenarioData.title && scenarioData.setting) {
            const generatedScenario = {
              title: scenarioData.title,
              setting: scenarioData.setting,
              situation: scenarioData.situation || 'シナリオが開始されます',
              initial_prompt: scenarioData.initial_prompt || `${scenarioData.title}のシナリオが始まります。${scenarioData.situation || ''}`,
              character_roles: scenarioData.character_roles || {},
              objectives: Array.isArray(scenarioData.objectives) ? scenarioData.objectives : ['楽しい時間を過ごす'],
              background_context: scenarioData.background_context || scenarioData.setting || ''
            };
            
            // ⚡ キャッシュに保存
            this.scenarioCache.set(cacheKey, generatedScenario);
            return generatedScenario;
          } else {
            console.warn('必須フィールドが不足:', scenarioData);
          }
        } catch (parseError) {
          console.error('JSON パースエラー:', parseError);
          console.log('パース対象:', jsonMatch[0].substring(0, 300) + '...');
          
          // パースエラーの場合、部分的な情報でも抽出を試行
          const partialData = this.extractPartialScenarioData(response);
          if (partialData.title) {
            console.log('部分的なデータ抽出成功:', partialData);
            return partialData;
          }
        }
      } else {
        console.warn('JSONが見つからない。レスポンス:', response.substring(0, 500));
        
        // JSONが見つからない場合でも、テキストから情報抽出を試行
        const partialData = this.extractPartialScenarioData(response);
        if (partialData.title) {
          console.log('テキストからの部分抽出成功:', partialData);
          return partialData;
        }
      }
    } catch (error) {
      console.error('Custom scenario generation failed:', error);
    }

    // フォールバック：基本シナリオを生成
    const fallbackScenario = this.generateBasicScenario(characters, persona);
    // ⚡ フォールバックシナリオもキャッシュに保存
    this.scenarioCache.set(cacheKey, fallbackScenario);
    return fallbackScenario;
  }

  /**
   * テンプレートベースのシナリオ生成
   */
  generateFromTemplate(template: ScenarioTemplate, characters: Character[]): GeneratedScenario {
    const characterRoles: Record<string, string> = {};
    
    // キャラクターに役割を割り当て
    characters.forEach((char, index) => {
      const roles = this.generateCharacterRole(template, char, index);
      characterRoles[char.id] = roles;
    });

    const characterNames = characters.map(c => c.name).join('、');
    
    return {
      title: `${template.name} - ${characterNames}`,
      setting: template.setting,
      situation: template.situation,
      initial_prompt: `${template.setting}にて、${characterNames}が${template.situation}。どのような物語が展開されるでしょうか？`,
      character_roles: characterRoles,
      objectives: template.objectives || [],
      background_context: template.description
    };
  }

  /**
   * キャラクターの役割を生成
   */
  private generateCharacterRole(template: ScenarioTemplate, character: Character, index: number): string {
    const baseRoles = {
      'magic_academy': ['先輩生徒', '新入生', '優等生', '問題児', '委員長'],
      'detective_case': ['主任探偵', '助手', '依頼人', '証人', '容疑者'],
      'royal_court': ['王族', '重臣', '新参貴族', '外交官', '侍従'],
      'cafe_meeting': ['常連客', '初来店客', '店員', '作家', '学生'],
      'adventure_quest': ['リーダー', 'サポート', 'スカウト', '戦士', '魔法使い']
    };

    const templateRoles = baseRoles[template.id as keyof typeof baseRoles] || ['参加者'];
    const assignedRole = templateRoles[index % templateRoles.length];
    
    return `${assignedRole}として、${(character.personality ?? '').substring(0, 100)}の特徴を活かして行動`;
  }

  /**
   * レスポンステキストから部分的なシナリオデータを抽出
   */
  private extractPartialScenarioData(response: string): Partial<GeneratedScenario> {
    const result: Partial<GeneratedScenario> = {};
    
    // タイトルの抽出
    const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/);
    if (titleMatch) {
      result.title = titleMatch[1];
    }
    
    // 設定の抽出
    const settingMatch = response.match(/"setting"\s*:\s*"([^"]+)"/);
    if (settingMatch) {
      result.setting = settingMatch[1];
    }
    
    // 状況の抽出
    const situationMatch = response.match(/"situation"\s*:\s*"([^"]+)"/);
    if (situationMatch) {
      result.situation = situationMatch[1];
    }
    
    // 導入文の抽出
    const promptMatch = response.match(/"initial_prompt"\s*:\s*"([^"]+)"/);
    if (promptMatch) {
      result.initial_prompt = promptMatch[1];
    }
    
    // 背景の抽出
    const contextMatch = response.match(/"background_context"\s*:\s*"([^"]+)"/);
    if (contextMatch) {
      result.background_context = contextMatch[1];
    }
    
    // 目標の抽出
    const objectivesMatch = response.match(/"objectives"\s*:\s*\[([^\]]+)\]/);
    if (objectivesMatch) {
      try {
        const objectivesStr = '[' + objectivesMatch[1] + ']';
        result.objectives = JSON.parse(objectivesStr);
      } catch (_e) {
        // パースに失敗した場合は簡単な分割で対応
        const simpleObjectives = objectivesMatch[1]
          .split(',')
          .map(obj => obj.replace(/"/g, '').trim())
          .filter(obj => obj.length > 0);
        if (simpleObjectives.length > 0) {
          result.objectives = simpleObjectives;
        }
      }
    }
    
    return result.title && result.setting ? {
      title: result.title,
      setting: result.setting,
      situation: result.situation || 'シナリオが開始されます',
      initial_prompt: result.initial_prompt || `${result.title}のシナリオが始まります。`,
      character_roles: {},
      objectives: result.objectives || ['楽しい時間を過ごす'],
      background_context: result.background_context || result.setting
    } : {};
  }

  /**
   * 基本シナリオの生成（フォールバック）
   */
  private generateBasicScenario(characters: Character[], persona?: Persona): GeneratedScenario {
    const characterNames = characters.map(c => c.name).join('、');
    const participantNames = persona ? `${persona.name}と${characterNames}` : characterNames;
    const characterRoles: Record<string, string> = {};
    
    // ランダムなシナリオテーマを選択
    const scenarios = [
      {
        title: `${participantNames}の謎解き冒険`,
        setting: '古い洋館の書斎',
        situation: '不思議な手紙が届き、全員が同じ場所に呼び出された',
        objectives: ['謎の送り主を突き止める', '隠された秘密を解明する', 'お互いの推理力を発揮する']
      },
      {
        title: `${participantNames}のカフェ会議`,
        setting: '街の人気カフェテラス',
        situation: '偶然同じカフェで出会い、興味深い話題で盛り上がる',
        objectives: ['共通の関心事を発見する', 'それぞれの専門知識を共有する', '新しい企画を立てる']
      },
      {
        title: `${participantNames}の夜市探索`,
        setting: '賑やかな夜市',
        situation: '珍しい夜市が開催され、皆で探索することになった',
        objectives: ['珍しい品物を見つける', '美味しい屋台料理を楽しむ', '思い出を作る']
      },
      {
        title: `${participantNames}の創作会議`,
        setting: 'クリエイティブスペース',
        situation: '新しいプロジェクトのアイデア出しに集まった',
        objectives: ['革新的なアイデアを生み出す', '各自の才能を活かす', 'チームワークを発揮する']
      }
    ];
    
    const selected = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // ペルソナがある場合は含める
    if (persona) {
      characterRoles[persona.id] = `${persona.occupation || '参加者'}として積極的に参加する`;
    }
    
    characters.forEach(char => {
      characterRoles[char.id] = `${char.occupation || 'キャラクター'}として独自の視点を提供する`;
    });

    return {
      title: selected.title,
      setting: selected.setting,
      situation: selected.situation,
      initial_prompt: `${selected.setting}で、${selected.situation}。${participantNames}はどう反応するでしょうか？`,
      character_roles: characterRoles,
      objectives: selected.objectives,
      background_context: `${persona ? 'ユーザーと' : ''}キャラクターたちが織りなす特別な物語です。`
    };
  }

  /**
   * 全テンプレートを取得
   */
  getAllTemplates(): ScenarioTemplate[] {
    return [...this.templates];
  }
}

export const scenarioGenerator = new ScenarioGenerator();