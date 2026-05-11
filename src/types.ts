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
  mortgageYearsRemaining: number;
  personalLoan: number;
  carLoan: number;
  carLoanYearsRemaining: number;
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
export type OpenAIModel = 'gpt-5.4-pro' | 'gpt-5.4-mini' | 'gpt-5.4-nano';

export type AIConfig = {
  provider: APIProvider;
  geminiKey?: string;
  openAIKey?: string;
  geminiModel: GeminiModel;
  openAIModel: OpenAIModel | string; 
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalCostTWD: number;
};

export type AnalysisResult = {
  taiwanPercentile: number;
  worldPercentile: number;
  prCalculationSteps: string;
  taiwanDeciles: number[];
  assetsAtLifespanEnd: number;
  isSufficient: boolean;
  fundsExhaustedAge: number | null;
  calculationSteps: string;
  analysisMarkdown: string;
  recommendations: string[];
  fireAge: number;
  fireCalculationSteps: string;
  fireTargetAmount?: number;
  tokenUsage?: TokenUsage;
};
