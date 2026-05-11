import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig, AssetData, LiabilityData, RetirementData, AnalysisResult } from "@/src/types";

const schema = {
  type: Type.OBJECT,
  properties: {
    taiwanPercentile: { type: Type.NUMBER, description: "台灣財富PR值(0-100)" },
    worldPercentile: { type: Type.NUMBER, description: "全球財富PR值(0-100)" },
    prCalculationSteps: { type: Type.STRING, description: "以結構化的純 Markdown (絕對不能有HTML) 詳細列出推估PR值所使用的推斷邏輯、引用之公開報告與年份。並說明如何考量報告發佈迄今的股市增長、房市漲幅與通膨等數據，推演出當前最新狀況與對應之精確PR值。" },
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
    },
    fireAge: {
      type: Type.NUMBER,
      description: "預測達成 FIRE 目標的年紀（整數），使用 4.7% 提領率，且需將年支出考慮 2.5% 的通膨估算。"
    },
    fireTargetAmount: {
      type: Type.NUMBER,
      description: "達成 FIRE 時當下的目標金額（整數）。"
    },
    fireCalculationSteps: {
      type: Type.STRING,
      description: "推導 FIRE 年紀的完整計算過程。說明 4.7% 提領率的基準，每年資產成長(6%)與年支出通膨(2.5%)造成目標金額逐年提升的過程。(Markdown格式)"
    }
  },
  required: ["taiwanPercentile", "worldPercentile", "prCalculationSteps", "taiwanDeciles", "calculationSteps", "analysisMarkdown", "recommendations", "fireAge", "fireTargetAmount", "fireCalculationSteps"]
};

function calculateCostTWD(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  let promptPricePerM = 0;
  let completionPricePerM = 0;
  const USD_TO_TWD = 32;

  if (provider === 'gemini') {
    if (model.includes('flash-lite')) {
      promptPricePerM = 0.075;
      completionPricePerM = 0.3;
    } else if (model.includes('pro')) {
      promptPricePerM = 1.25;
      completionPricePerM = 5.0;
    } else {
      promptPricePerM = 0.15;
      completionPricePerM = 0.6;
    }
  } else {
    if (model.includes('nano')) {
      promptPricePerM = 0.075;
      completionPricePerM = 0.3;
    } else if (model.includes('mini')) {
      promptPricePerM = 0.15;
      completionPricePerM = 0.6;
    } else {
      promptPricePerM = 2.5;
      completionPricePerM = 10.0;
    }
  }

  const promptCost = (promptTokens / 1000000) * promptPricePerM * USD_TO_TWD;
  const compCost = (completionTokens / 1000000) * completionPricePerM * USD_TO_TWD;
  // Ensure we show at least a tiny number if not 0
  return Number((promptCost + compCost).toFixed(6));
}

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
              prCalculationSteps: { type: "string", description: "推估PR值所使用的推斷邏輯與計算過程。引用的報告需考慮發表年份並以當前的最新通膨與股市房市狀況加權計算(限用純 Markdown 格式)" },
              taiwanDeciles: { 
                type: "array", 
                items: { type: "number" }, 
                description: "台灣每10百分位(PR10...PR90)的淨資產門檻數值預估(共9個數)"
              },
              calculationSteps: { type: "string", description: "詳細計算邏輯推導步驟 (Markdown格式)" },
              analysisMarkdown: { type: "string", description: "繁體中文 Markdown 格式分析，必須分段與條列，專業語氣且避免 emoji，字數至少1000字極度詳盡" },
              recommendations: { type: "array", items: { type: "string" }, description: "繁體中文建議" },
              fireAge: { type: "number", description: "預測達成 FIRE 目標的年紀（整數），使用 4.7% 提領率估算，且需將年支出考慮 2.5% 的通膨" },
              fireTargetAmount: { type: "number", description: "達成 FIRE 時當下的目標金額（整數）" },
              fireCalculationSteps: { type: "string", description: "推導 FIRE 年紀的完整計算過程 (Markdown格式)" }
            },
            required: ["taiwanPercentile", "worldPercentile", "prCalculationSteps", "taiwanDeciles", "calculationSteps", "analysisMarkdown", "recommendations", "fireAge", "fireTargetAmount", "fireCalculationSteps"],
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
  
  const tokenUsage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalCostTWD: calculateCostTWD('openai', config.openAIModel, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0)
  };
  
  return { ...parsed, ...precalc, tokenUsage };
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
- 房貸: ${liabilities.mortgage} (剩餘 ${liabilities.mortgageYearsRemaining} 年)
- 信貸與其他: ${liabilities.personalLoan}
- 車貸: ${liabilities.carLoan} (剩餘 ${liabilities.carLoanYearsRemaining} 年)

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
2. 'prCalculationSteps'：詳細列出推算台灣與全球PR值的邏輯。**重要：現在是 ${new Date().getFullYear()} 年，引用公開的全球財富報告時，必須同步考慮報告的發表年份，並利用股市增長、房市漲幅與通膨等經濟數據，將標準精確推演至 ${new Date().getFullYear()} 年目前的最新狀況，再對應出精確的PR值**。寫出具體推斷步驟(使用純 Markdown 格式，絕對不能使用 HTML 標籤)，讓使用者能明確了解這兩個百分位是如何被重點計算出來的。
3. 'taiwanDeciles'：推估台灣總體淨資產在 PR10, PR20...PR90 這 9 個門檻的概略數值(TWD)，請提供 9 個數字的 Array。
4. 'calculationSteps'：清楚列出AI推估此結果的過程(不含系統預先算好的，也可總結預算)，讓使用者了解總體假設。
5. 'analysisMarkdown'：字數要求大幅增加(建議達到 1000 字以上)，內容必須極度詳盡且具備頂尖顧問的深度。從系統算好的最終壽終${targetLifespan}歲結餘${assetsAtLifespanEnd} TWD出發，針對資產變化與風險控制、遺產規劃等進行深度剖析。包含短中長期壓力測試、退休後資金是否會耗盡(Drawdown risk)、遺產傳承或長壽風險(Longevity risk)。必須善用 Markdown 標題、粗體、清單等多層次排版。避免使用表情符號。
6. 'recommendations'：給出 3-5 個針對性強、具體可落地執行的資產優化專業建議。
7. 'fireAge', 'fireTargetAmount' 與 'fireCalculationSteps'：請以目前年支出 ${retirement.annualExpense} TWD 為基礎，使用最新研究的 **4.7% 提領率** 計算 FIRE 的目標總金額。但須注意，**每一年的年支出都會因為 2.5% 的通膨而增加，因此每年的FIRE目標金額都會提高**。請根據目前的淨資產、每年的儲蓄(${retirement.annualInvestable} TWD，假設儲蓄也不調整)，以及 6% 的投資回報率，逐年計算淨資產成長與FIRE目標。預測使用者在幾歲時淨資產會超越當年的 FIRE 目標金額 ('fireAge')，以及達成當下的目標金額('fireTargetAmount')。並在 'fireCalculationSteps' 提供此完整的推導與逐年數學計算說明內容(包含每年目標金額變化與資產成長的對照表，必須使用純 Markdown 格式，**絕對不能使用任何 HTML 標籤例如 <ul> <li> <br> <b> 等**)。`;

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
      
      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const completionTokens = usageMetadata?.candidatesTokenCount || 0;
      const tokenUsage = {
        promptTokens,
        completionTokens,
        totalCostTWD: calculateCostTWD('gemini', modelName, promptTokens, completionTokens)
      };

      return { ...parsed, ...precalc, tokenUsage };
    } finally {
      signal?.removeEventListener('abort', () => { abortReject?.(new Error("AbortError")) });
    }
  } else {
    if (!config.openAIKey) throw new Error("OpenAI API Key is missing");
    return await callOpenAI(config, prompt, signal, precalc);
  }
}
