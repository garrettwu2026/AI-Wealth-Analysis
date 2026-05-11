export type AssetData = {
  stocks: number;
  cash: number;
  bonds: number;
  metals: number;
  crypto: number;
  realEstate: number;
};

export type LiabilityData = {
  mortgage: number;
  personalLoan: number;
  carLoan: number;
};

export type RetirementData = {
  currentAge: number;
  retirementAge: number;
  targetLifespan: number;
  annualIncome: number;
  annualExpense: number;
  annualInvestable: number;
  postRetirementIncome: number;
};

export type APIProvider = 'gemini' | 'openai';
export type GeminiModel = 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
export type OpenAIModel = 'gpt-5.4-nano' | 'gpt-4o-mini' | 'gpt-4o'; // Provide reasonable defaults, mapping the request

export type AIConfig = {
  provider: APIProvider;
  geminiKey?: string;
  openAIKey?: string;
  geminiModel: GeminiModel;
  openAIModel: OpenAIModel | string; 
};

export type AnalysisResult = {
  taiwanPercentile: number;
  worldPercentile: number;
  prCalculationSteps: string;
  taiwanDeciles: number[];
  fireAge: number | null;
  fireYear: number | null;
  calculationSteps: string;
  analysisMarkdown: string;
  recommendations: string[];
};
