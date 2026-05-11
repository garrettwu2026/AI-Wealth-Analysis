import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig, AssetData, LiabilityData, RetirementData, AnalysisResult } from "@/src/types";

const schema = {
  type: Type.OBJECT,
  properties: {
    taiwanPercentile: { type: Type.NUMBER, description: "台灣財富PR值(0-100)" },
    worldPercentile: { type: Type.NUMBER, description: "全球財富PR值(0-100)" },
    prCalculationSteps: { type: Type.STRING, description: "以結構化的 Markdown 詳細列出台灣與全球PR值的推估邏輯、引用之參考數據(例如全球財富報告)與具體推算計算過程。" },
    taiwanDeciles: { 
      type: Type.ARRAY, 
      items: { type: Type.NUMBER }, 
      description: "台灣每10百分位(PR10, PR20...PR90)的淨資產門檻預估數值(單位為新台幣)，請務必提供剛好9個數值"
    },
    calculationSteps: { type: Type.STRING, description: "以結構化的 Markdown 條列式說明詳細的計算邏輯、通膨率與投資回報率假設" },
    analysisMarkdown: { type: Type.STRING, description: "請以頂級、專業的資產分析師角度，用嚴謹、客觀的繁體中文(zh-TW)寫一段詳細的資產與退休規劃深度解析。" },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3到5個具體可行的資產配置與達成FIRE目標的專業建議(繁體中文)"
    }
  },
  required: ["taiwanPercentile", "worldPercentile", "prCalculationSteps", "taiwanDeciles", "calculationSteps", "analysisMarkdown", "recommendations"]
};

// Simple fetch for OpenAI since we don't have the SDK installed
async function callOpenAI(config: AIConfig, prompt: string, signal?: AbortSignal, precalc?: any): Promise<AnalysisResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.openAIKey}`
    },
    body: JSON.stringify({
      model: config.openAIModel,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "wealth_analysis",
          schema: {
            type: "object",
            properties: {
              taiwanPercentile: { type: "number", description: "台灣財富PR值(0-100)" },
              worldPercentile: { type: "number", description: "全球財富PR值(0-100)" },
              prCalculationSteps: { type: "string", description: "推估PR值所使用的推斷邏輯與計算過程(Markdown格式)" },
              taiwanDeciles: { 
                type: "array", 
                items: { type: "number" }, 
                description: "台灣每10百分位(PR10...PR90)的淨資產門檻數值預估(共9個數)"
              },
              calculationSteps: { type: "string", description: "詳細計算邏輯推導步驟 (Markdown格式)" },
              analysisMarkdown: { type: "string", description: "繁體中文 Markdown 格式分析，必須分段與條列，專業語氣且避免 emoji，字數至少1000字極度詳盡" },
              recommendations: { type: "array", items: { type: "string" }, description: "繁體中文建議" }
            },
            required: ["taiwanPercentile", "worldPercentile", "prCalculationSteps", "taiwanDeciles", "calculationSteps", "analysisMarkdown", "recommendations"],
            additionalProperties: false
          },
          strict: true
        }
      }
    }),
    signal
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API Error: ${error}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content) as AnalysisResult;
  return { ...parsed, ...precalc };
}

export async function analyzeWealth(
  config: AIConfig, 
  assets: AssetData, 
  liabilities: LiabilityData, 
  retirement: RetirementData,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  // Local deterministic calculation for projection
  const inflationRate = 0.025;
  const roi = 0.06;
  let simulatedNetWorth = netWorth;
  let currentExpense = Number(retirement.annualExpense);
  const investable = Number(retirement.annualInvestable);
  const postRetirementIncome = Number(retirement.postRetirementIncome) || 0;
  const startAge = Number(retirement.currentAge);
  const retirementAge = Number(retirement.retirementAge);
  const targetLifespan = Number(retirement.targetLifespan) || 120;
  
  let fundsExhaustedAge: number | null = null;
  let assetsAtLifespanEnd = 0;

  for (let age = startAge; age <= targetLifespan; age++) {
     if (simulatedNetWorth < 0 && fundsExhaustedAge === null) {
        fundsExhaustedAge = age;
     }
     
     if (age === targetLifespan) {
        assetsAtLifespanEnd = Math.round(simulatedNetWorth);
     }
     
     if (age < retirementAge) {
       simulatedNetWorth = simulatedNetWorth * (1 + roi) + investable;
     } else {
       simulatedNetWorth = simulatedNetWorth * (1 + roi) - currentExpense + postRetirementIncome;
     }
     currentExpense *= (1 + inflationRate);
  }
  const isSufficient = fundsExhaustedAge === null && simulatedNetWorth >= 0;

  const precalc = {
    fundsExhaustedAge,
    assetsAtLifespanEnd,
    isSufficient
  };

  const prompt = `你現在是一位頂級、專業且客觀的資產配置分析師 (Professional Wealth Management Analyst)。使用者希望你深度剖析他們的資產結構與 FIRE (財務獨立、提早退休) 規劃。
  
以下是他們的財務狀況 (金額單位為新台幣 TWD)：

資產:
- 股票/基金: ${assets.stocks}
- 現金/存款: ${assets.cash}
- 債券: ${assets.bonds}
- 貴金屬: ${assets.metals}
- 加密貨幣: ${assets.crypto}
- 不動產: ${assets.realEstate}

負債:
- 房貸: ${liabilities.mortgage}
- 信貸: ${liabilities.personalLoan}
- 車貸: ${liabilities.carLoan}

總淨資產: ${netWorth}

退休目標與參數輸入:
- 目前年齡: ${retirement.currentAge}
- 目標退休年齡: ${retirement.retirementAge}
- 預估最終壽命: ${retirement.targetLifespan}
- 年收入: ${retirement.annualIncome}
- 年支出: ${retirement.annualExpense}
- 每年可投入投資(儲蓄)金額: ${retirement.annualInvestable}
- 退休後工作收入(每年): ${retirement.postRetirementIncome}

系統已進行嚴謹確定性的數學推估，固定參數為（通膨率 2.5%, 投資回報率 6%）：
- 終老 ${targetLifespan} 歲時餘額預估：${assetsAtLifespanEnd} TWD
- 資金是否充足度過餘生：${isSufficient ? '是' : '否'}
- 資金耗盡年齡：${fundsExhaustedAge !== null ? fundsExhaustedAge + '歲' : '不會耗盡'}

請提供分析並以要求的 JSON 格式返回。必須包含：
1. 'taiwanPercentile' 與 'worldPercentile'：客觀推算這樣的淨資產在台灣與全球大約落在前多少百分比(PR值)。
2. 'prCalculationSteps'：詳細列出推算台灣與全球PR值的邏輯、假設數據基準(例如參考何種年份的財富報告等)與具體推斷步驟(Markdown格式)，讓使用者能明確了解這兩個百分位是如何被計算出來的。
3. 'taiwanDeciles'：推估台灣總體淨資產在 PR10, PR20, PR30, PR40, PR50, PR60, PR70, PR80, PR90 這 9 個門檻的概略數值(TWD)，請提供 9 個數字的 Array。
4. 'calculationSteps'：清楚列出AI推估此結果的過程(不含系統預先算好的，也可總結預算)，讓使用者了解總體假設。
5. 'analysisMarkdown'：字數要求大幅增加(建議達到 1000 字以上)，內容必須極度詳盡且具備頂尖顧問的深度。從系統算好的最終壽終${targetLifespan}歲結餘${assetsAtLifespanEnd} TWD出發，針對資產變化與風險控制、遺產規劃等進行深度剖析。包含短中長期壓力測試、退休後資金是否會耗盡(Drawdown risk)、遺產傳承或長壽風險(Longevity risk)。必須善用 Markdown 標題、粗體、清單等多層次排版。絕不能把一堆文字擠成一團。絕對避免使用表情符號。
6. 'recommendations'：給出 3-5 個針對性強、具體可落地執行的資產優化專業建議。`;

  if (config.provider === 'gemini') {
    // If no key is provided, use the environment key
    const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key is missing");
    
    // Fallback to flash if for some reason the exact enum passed doesn't match a valid model
    let modelName = config.geminiModel;
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Create a local abort promise for Gemini if SDK doesn't natively support it
    let abortReject: (reason?: any) => void;
    const abortPromise = new Promise((_, reject) => {
      abortReject = reject;
      if (signal?.aborted) {
        reject(new Error("AbortError"));
      }
      signal?.addEventListener('abort', () => reject(new Error("AbortError")));
    });

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          }
        }),
        abortPromise
      ]) as Awaited<ReturnType<typeof ai.models.generateContent>>;

      const text = response.text || "{}";
      const parsed = JSON.parse(text) as AnalysisResult;
      return { ...parsed, ...precalc };
    } finally {
      signal?.removeEventListener('abort', () => { abortReject?.(new Error("AbortError")) });
    }
  } else {
    if (!config.openAIKey) throw new Error("OpenAI API Key is missing");
    return await callOpenAI(config, prompt, signal, precalc);
  }
}
