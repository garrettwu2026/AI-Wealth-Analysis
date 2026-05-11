import { useState, useRef } from 'react';
import { Settings, PieChart as PieChartIcon, TrendingUp, DollarSign, BrainCircuit, Globe, Loader2, Sparkles, Building, Coins, GraduationCap, Banknote, Landmark, CreditCard, ChevronRight, Key, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Input, Label } from './components/ui/input';
import { Button } from './components/ui/button';
import { AssetData, LiabilityData, RetirementData, AIConfig, AnalysisResult } from './types';
import { analyzeWealth } from './services/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const COLORS = ['#f97316', '#14b8a6', '#eab308', '#6366f1', '#ec4899', '#8b5cf6'];

function encryptKey(key: string) {
  if (!key) return '';
  return btoa(unescape(encodeURIComponent(key))).split('').reverse().join('');
}

function decryptKey(enc: string) {
  if (!enc) return '';
  try {
    return decodeURIComponent(escape(atob(enc.split('').reverse().join(''))));
  } catch (e) {
    return '';
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'analysis'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalculationSteps, setShowCalculationSteps] = useState(false);
  const [showPRCalculationSteps, setShowPRCalculationSteps] = useState(false);
  const [showFireCalculationSteps, setShowFireCalculationSteps] = useState(false);

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    let savedGemini = '';
    let savedOpenAI = '';
    try {
      const g = localStorage.getItem('_ws_g_key');
      if (g) savedGemini = decryptKey(g);
      const o = localStorage.getItem('_ws_o_key');
      if (o) savedOpenAI = decryptKey(o);
    } catch (e) {}

    return {
      provider: 'gemini',
      geminiModel: 'gemini-3.1-pro-preview',
      openAIModel: 'gpt-5.4-pro',
      geminiKey: savedGemini || '',
      openAIKey: savedOpenAI || '',
    };
  });

  const [assets, setAssets] = useState<AssetData>({
    stocks: 1000000,
    cash: 500000,
    bonds: 0,
    metals: 0,
    crypto: 0,
    realEstate: 5000000,
  });

  const [liabilities, setLiabilities] = useState<LiabilityData>({
    mortgage: 3000000,
    mortgageYearsRemaining: 20,
    personalLoan: 0,
    carLoan: 500000,
    carLoanYearsRemaining: 5,
  });

  const [retirement, setRetirement] = useState<RetirementData>({
    currentAge: 30,
    retirementAge: 55,
    targetLifespan: 120,
    annualIncome: 1200000,
    annualExpense: 600000,
    annualInvestable: 400000,
    postRetirementIncome: 0,
  });

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const totalAssets = Object.values(assets).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + (Number(b) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const handleAnalyze = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();
      const res = await analyzeWealth(aiConfig, assets, liabilities, retirement, abortControllerRef.current.signal);
      setResult(res);
      setActiveTab('analysis');
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError') {
        setError('分析已取消');
      } else {
        setError(err.message || 'An error occurred during analysis');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const assetChartData = [
    { name: '股票/基金', value: Number(assets.stocks) },
    { name: '現金/存款', value: Number(assets.cash) },
    { name: '債券', value: Number(assets.bonds) },
    { name: '貴金屬', value: Number(assets.metals) },
    { name: '加密貨幣', value: Number(assets.crypto) },
    { name: '不動產', value: Number(assets.realEstate) },
  ].filter(d => d.value > 0);

  // Generate projection data
  const generateProjection = () => {
    let simulatedNetWorth = netWorth;
    const data = [];
    const inflationRate = 0.025;
    const roi = 0.06;
    let currentExpense = Number(retirement.annualExpense);
    const investable = Number(retirement.annualInvestable);
    const postRetirementIncome = Number(retirement.postRetirementIncome) || 0;
    const startAge = Number(retirement.currentAge);
    const retirementAge = Number(retirement.retirementAge);
    const targetLifespan = Number(retirement.targetLifespan) || 120;

    for (let age = startAge; age <= targetLifespan; age++) {
       data.push({ 
         age, 
         NetWorth: Math.round(simulatedNetWorth), 
         Expenses: Math.round(currentExpense) 
       });
       
       if (age < retirementAge) {
         simulatedNetWorth = simulatedNetWorth * (1 + roi) + investable;
       } else {
         simulatedNetWorth = simulatedNetWorth * (1 + roi) - currentExpense + postRetirementIncome;
       }
       currentExpense *= (1 + inflationRate);
    }
    return data;
  };

  const exportReportAsMarkdown = () => {
    if (!result) return;
    
    const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
    const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0) - liabilities.carLoanYearsRemaining; // Note: hacky summation assuming others are amounts
    const actualLiabilities = liabilities.mortgage + liabilities.personalLoan + liabilities.carLoan;

    const markdown = `# 財富與退休深度診斷報告

## 基本資料
* **目前年紀**: ${retirement.currentAge} 歲
* **預期壽終**: ${retirement.targetLifespan} 歲
* **年總收入**: ${formatCurrency(retirement.annualIncome)} TWD
* **年生活支出**: ${formatCurrency(retirement.annualExpense)} TWD
* **每年可再投資**: ${formatCurrency(retirement.annualInvestable)} TWD
* **目前淨資產**: ${formatCurrency(totalAssets - actualLiabilities)} TWD

## 預估 FIRE 財務獨立年齡
* **預估 FIRE 年齡**: ${result.fireAge} 歲
* **當前 FIRE 目標金額**: ${formatCurrency(result.fireTargetAmount || (retirement.annualExpense / 0.047))} TWD

### 推導過程
${result.fireCalculationSteps}

---

## 財富結構與PR值
* **台灣財富 PR 值**: PR ${result.taiwanPercentile}
* **全球財富 PR 值**: PR ${result.worldPercentile}

### PR 值推導細節
${result.prCalculationSteps}

---

## 退休資產軌跡
### 計算基礎與參數說明
${result.calculationSteps}

---

## AI 深度診斷報告
${result.analysisMarkdown}

---

## 具體優化建議
${result.recommendations.map(r => `* ${r}`).join('\\n')}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FIRE_Analysis_Report_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 mb-6 drop-shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-2xl font-bold">W</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic text-slate-800">
                財富<span className="text-indigo-500">透視 AI</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-slate-500 px-2">分析引擎設定</label>
                <div className="flex gap-2">
                  <select 
                    value={aiConfig.provider}
                    onChange={e => setAiConfig({...aiConfig, provider: e.target.value as 'gemini' | 'openai'})}
                    className="bg-white text-xs border border-slate-200 rounded-lg px-3 py-1 focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer shadow-sm"
                  >
                    <option value="gemini">Gemini AI</option>
                    <option value="openai">OpenAI</option>
                  </select>
                
                  <div className="h-4 w-px bg-slate-200"></div>

                  <select
                    value={aiConfig.provider === 'gemini' ? aiConfig.geminiModel : aiConfig.openAIModel}
                    onChange={e => {
                      const val = e.target.value;
                      if (aiConfig.provider === 'gemini') {
                        setAiConfig({...aiConfig, geminiModel: val as any});
                      } else {
                        setAiConfig({...aiConfig, openAIModel: val as any});
                      }
                    }}
                    className="bg-white text-xs border border-slate-200 rounded-lg px-3 py-1 focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer shadow-sm"
                  >
                    {aiConfig.provider === 'gemini' ? (
                      <>
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-5.4-pro">GPT 5.4 Pro</option>
                        <option value="gpt-5.4-mini">GPT 5.4 Mini</option>
                        <option value="gpt-5.4-nano">GPT 5.4 Nano</option>
                      </>
                    )}
                  </select>

                  <div className="h-4 w-px bg-slate-200"></div>
                
                  <div className="flex flex-col gap-1">
                    <input 
                      type="password"
                      placeholder={aiConfig.provider === 'gemini' ? "(可選留白) 輸入 Gemini API Key" : "(必填) 輸入 OpenAI API Key"}
                      className="bg-white text-xs border border-slate-200 shadow-sm rounded-lg px-3 py-1 w-48 focus:ring-1 focus:ring-indigo-500 text-slate-800 h-[28px] focus-visible:outline-none placeholder:text-slate-400"
                      value={aiConfig.provider === 'gemini' ? (aiConfig.geminiKey || '') : (aiConfig.openAIKey || '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (aiConfig.provider === 'gemini') {
                          setAiConfig({...aiConfig, geminiKey: val});
                          try {
                            if (val) localStorage.setItem('_ws_g_key', encryptKey(val));
                            else localStorage.removeItem('_ws_g_key');
                          } catch (e) {}
                        } else {
                          setAiConfig({...aiConfig, openAIKey: val});
                          try {
                            if (val) localStorage.setItem('_ws_o_key', encryptKey(val));
                            else localStorage.removeItem('_ws_o_key');
                          } catch (e) {}
                        }
                      }}
                    />
                    <span className="text-[9px] text-slate-500 pl-1">*金鑰將加密儲存於您的瀏覽器本地端</span>
                  </div>
                  
                  <a
                    href={aiConfig.provider === 'gemini' ? "https://aistudio.google.com/app/apikey" : "https://platform.openai.com/api-keys"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 px-2 py-1 rounded-lg h-[28px] transition-colors"
                    title="取得 API Key"
                  >
                    <Key size={12} />
                    <span className="hidden sm:inline">取得金鑰</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-3 px-6 rounded-2xl font-bold uppercase tracking-widest text-[12px] transition-all ${activeTab === 'input' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 shadow-sm'}`}
          >
            1. 輸入財富與目標數據
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            disabled={!result}
            className={`flex-1 py-3 px-6 rounded-2xl font-bold uppercase tracking-widest text-[12px] transition-all ${activeTab === 'analysis' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400' : 'bg-white text-slate-500 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-300 shadow-sm'}`}
          >
            2. 檢視AI分析與財務預測
          </button>
        </div>

        {activeTab === 'input' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="bg-white border-slate-200 text-slate-800 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">總資產 (Total Assets)</p>
                    <p className="text-3xl font-black italic">{formatCurrency(totalAssets)}</p>
                  </CardContent>
               </Card>
               <Card className="bg-white border-slate-200 text-slate-800 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">總負債 (Total Liabilities)</p>
                    <p className="text-3xl font-black italic">{formatCurrency(totalLiabilities)}</p>
                  </CardContent>
               </Card>
               <Card className="bg-white border-slate-200 text-slate-800 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">淨資產 (Net Worth)</p>
                    <p className="text-3xl font-black italic">{formatCurrency(netWorth)}</p>
                  </CardContent>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Assets Form */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 mb-4">
                  <CardTitle className="flex items-center gap-2 text-indigo-600">
                    <Landmark size={18} />
                    目前持有的資產 (Assets)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>股票/基金 (萬)</Label>
                      <Input type="number" value={assets.stocks / 10000} onChange={e => setAssets({...assets, stocks: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>現金/儲蓄 (萬)</Label>
                      <Input type="number" value={assets.cash / 10000} onChange={e => setAssets({...assets, cash: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>債券 (萬)</Label>
                      <Input type="number" value={assets.bonds / 10000} onChange={e => setAssets({...assets, bonds: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>貴金屬 (萬)</Label>
                      <Input type="number" value={assets.metals / 10000} onChange={e => setAssets({...assets, metals: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>加密貨幣 (萬)</Label>
                      <Input type="number" value={assets.crypto / 10000} onChange={e => setAssets({...assets, crypto: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>不動產 (萬)</Label>
                      <Input type="number" value={assets.realEstate / 10000} onChange={e => setAssets({...assets, realEstate: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                {/* Liabilities Form */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 mb-4">
                    <CardTitle className="flex items-center gap-2 text-rose-500">
                      <CreditCard size={18} />
                      目前的負債 (Liabilities)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4 col-span-2 md:col-span-1 border p-4 rounded-xl bg-slate-50/50">
                        <div className="space-y-2">
                           <Label>房貸 (萬)</Label>
                          <Input type="number" value={liabilities.mortgage / 10000} onChange={e => setLiabilities({...liabilities, mortgage: Number(e.target.value) * 10000})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-500">房貸剩餘還款年數</Label>
                          <Input type="number" value={liabilities.mortgageYearsRemaining} onChange={e => setLiabilities({...liabilities, mortgageYearsRemaining: Number(e.target.value)})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-4 col-span-2 md:col-span-1 border p-4 rounded-xl bg-slate-50/50">
                        <div className="space-y-2">
                           <Label>車貸 (萬)</Label>
                          <Input type="number" value={liabilities.carLoan / 10000} onChange={e => setLiabilities({...liabilities, carLoan: Number(e.target.value) * 10000})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-500">車貸剩餘還款年數</Label>
                          <Input type="number" value={liabilities.carLoanYearsRemaining} onChange={e => setLiabilities({...liabilities, carLoanYearsRemaining: Number(e.target.value)})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2 col-span-2 mt-2">
                         <Label>信貸與其他負債 (萬)</Label>
                        <Input type="number" value={liabilities.personalLoan / 10000} onChange={e => setLiabilities({...liabilities, personalLoan: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Retirement Planning Form */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 mb-4">
                    <CardTitle className="flex items-center gap-2 text-emerald-500">
                      <GraduationCap size={18} />
                      退休後資產變化計算
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>目前年紀</Label>
                        <Input type="number" value={retirement.currentAge} onChange={e => setRetirement({...retirement, currentAge: Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>預估退休年紀</Label>
                        <Input type="number" value={retirement.retirementAge} onChange={e => setRetirement({...retirement, retirementAge: Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>預估最終壽命</Label>
                        <Input type="number" value={retirement.targetLifespan} onChange={e => setRetirement({...retirement, targetLifespan: Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>年總收入 (萬)</Label>
                        <Input type="number" value={retirement.annualIncome / 10000} onChange={e => setRetirement({...retirement, annualIncome: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>年生活支出 (萬)</Label>
                        <Input type="number" value={retirement.annualExpense / 10000} onChange={e => setRetirement({...retirement, annualExpense: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>每年可再投資金額 (萬)</Label>
                        <Input type="number" value={retirement.annualInvestable / 10000} onChange={e => setRetirement({...retirement, annualInvestable: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>退休後工作收入(每年/萬)</Label>
                        <Input type="number" value={retirement.postRetirementIncome / 10000} onChange={e => setRetirement({...retirement, postRetirementIncome: Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {error && (
               <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-xl text-sm shadow-sm">
                 {error}
               </div>
            )}

            <div className="flex justify-center pt-4 gap-4">
               <Button 
                 size="lg" 
                 onClick={handleAnalyze} 
                 disabled={loading}
                 className="w-full md:w-auto min-w-[320px] text-lg gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 border-0 rounded-2xl h-14"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                 {loading ? 'AI 分析中...' : '開始產生 AI 財富與目標分析'}
               </Button>

               {loading && (
                 <Button 
                   size="lg" 
                   onClick={handleCancel}
                   variant="outline"
                   className="w-full md:w-auto text-lg gap-2 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-2xl h-14"
                 >
                   停止分析
                 </Button>
               )}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && result && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Actions and Token Usage UI */}
             <div className="flex flex-col md:flex-row w-full items-stretch justify-between gap-4">
               <Button 
                  onClick={exportReportAsMarkdown}
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-2xl shadow-lg h-auto py-4 px-6 gap-2 shrink-0 font-bold tracking-wide flex-1 md:flex-none justify-center"
                >
                  <Download size={20} />
                  <span>下載完整分析報告 (Markdown)</span>
                </Button>

               {result.tokenUsage && (
                 <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between text-orange-900 shadow-[0_4px_20px_-4px_rgba(251,146,60,0.15)] relative overflow-hidden flex-1">
                  <div className="flex items-center gap-2 mb-3 md:mb-0 relative z-10 w-full md:w-auto justify-center md:justify-start">
                    <Sparkles className="text-orange-500" size={20} />
                    <span className="font-bold text-[15px] tracking-wide text-orange-700">AI 運算總計花費</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-xs font-semibold relative z-10 w-full md:w-auto">
                    <div className="flex bg-white/70 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-orange-200 shadow-sm gap-2 whitespace-nowrap text-orange-900 items-center justify-center">
                      <span className="text-[14px]">NT$</span>
                      <span className="text-[18px] font-black leading-none">{result.tokenUsage.totalCostTWD}</span>
                    </div>
                    <div className="flex gap-2">
                       <div className="flex flex-col bg-white/60 px-3 py-1.5 rounded-lg border border-orange-100/50 min-w-24 text-center">
                         <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-0.5">輸入 Tokens</span>
                         <span className="text-orange-800 text-[13px]">{result.tokenUsage.promptTokens.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col bg-white/60 px-3 py-1.5 rounded-lg border border-orange-100/50 min-w-24 text-center">
                         <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-0.5">輸出 Tokens</span>
                         <span className="text-orange-800 text-[13px]">{result.tokenUsage.completionTokens.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
               </div>
             )}
            </div>

             {/* Highlight Stats */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-5 rounded-3xl flex flex-col justify-between text-white shadow-lg col-span-1 md:col-span-4 shadow-orange-500/20 relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                    <TrendingUp size={160} className="-mt-8 -mr-8" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-100/80">預估 FIRE 財務獨立年齡 (4.7% 提領率)</span>
                    <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <div className="text-6xl font-black italic">{result.fireAge} 歲</div>
                        <div className="text-xs text-white/90 mt-1 font-bold tracking-widest uppercase">FIRE 目標: {formatCurrency(result.fireTargetAmount || (retirement.annualExpense / 0.047))} TWD</div>
                      </div>
                      <div className="flex md:justify-end w-full md:w-auto">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-white/20 hover:bg-white/30 text-white border-0 transition-colors w-full md:w-auto"
                          onClick={() => setShowFireCalculationSteps(!showFireCalculationSteps)}
                        >
                          {showFireCalculationSteps ? '隱藏 FIRE 年齡計算過程' : '查看完整的 FIRE 數學推導過程'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {showFireCalculationSteps && result.fireCalculationSteps && (
                  <div className="col-span-1 md:col-span-4 bg-orange-50 border border-orange-200 p-5 rounded-2xl text-sm prose prose-orange prose-headings:text-orange-900 text-orange-800 max-w-none shadow-sm animate-in fade-in slide-in-from-top-4 mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.fireCalculationSteps.replace(/\\n/g, '\n')}</ReactMarkdown>
                  </div>
                )}
                <div className="bg-white text-slate-800 p-5 rounded-3xl flex flex-col justify-between border border-slate-200 shadow-sm col-span-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">台灣財富分佈PR值</span>
                  <div className="mt-4">
                    <div className="text-6xl font-black italic">TOP {parseFloat((100 - result.taiwanPercentile).toFixed(2))}%</div>
                    <div className="text-xs opacity-60 mt-1 font-bold">全台前 {parseFloat((100 - result.taiwanPercentile).toFixed(2))}% (PR {parseFloat(result.taiwanPercentile.toFixed(2))})</div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${result.taiwanPercentile}%` }}></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl flex flex-col justify-between text-white border-0 shadow-lg col-span-1 md:col-span-2 shadow-indigo-500/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70">全球財富分佈PR值</span>
                  <div className="mt-4">
                    <div className="text-6xl font-black italic">TOP {parseFloat((100 - result.worldPercentile).toFixed(2))}%</div>
                    <div className="text-xs opacity-80 mt-1 font-bold">全球前 {parseFloat((100 - result.worldPercentile).toFixed(2))}% (PR {parseFloat(result.worldPercentile.toFixed(2))})</div>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full mt-4">
                    <div className="bg-white h-full rounded-full" style={{ width: `${result.worldPercentile}%` }}></div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-4 flex justify-end">
                   <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8 text-slate-600 bg-white"
                      onClick={() => setShowPRCalculationSteps(!showPRCalculationSteps)}
                    >
                      {showPRCalculationSteps ? '隱藏 PR 估算與推導邏輯' : '查看 PR 估算與推導邏輯'}
                    </Button>
                </div>

                {showPRCalculationSteps && result.prCalculationSteps && (
                  <div className="col-span-1 md:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl text-sm prose prose-slate prose-headings:text-slate-800 text-slate-700 max-w-none shadow-sm animate-in fade-in slide-in-from-top-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.prCalculationSteps.replace(/\\n/g, '\n')}</ReactMarkdown>
                  </div>
                )}

                <div className={`border rounded-3xl p-5 flex flex-col justify-between col-span-1 md:col-span-2 shadow-lg text-white ${result.isSufficient ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20' : 'bg-rose-500 border-rose-400 shadow-rose-500/20'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/70">最終退休資金檢定</span>
                  <div className="mt-4">
                    <div className="text-4xl font-black italic">
                      {result.isSufficient ? '資金足以度過餘生' : `${result.fundsExhaustedAge} 歲面臨耗盡`} 
                    </div>
                    <div className="text-xs text-white/80 mt-1 font-bold tracking-widest uppercase">終老 ({retirement.targetLifespan}歲) 剩餘淨值預估: {formatCurrency(result.assetsAtLifespanEnd)}</div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-5 flex flex-col justify-between col-span-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">目前總淨資產</span>
                  <div className="mt-4">
                    <div className="text-4xl font-black italic text-slate-800">{formatCurrency(netWorth)}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold tracking-widest uppercase">你的財務自由起跑點</div>
                  </div>
                </div>
             </div>

             {result.taiwanDeciles && result.taiwanDeciles.length === 9 && (
               <Card className="bg-white border-slate-200 shadow-sm">
                 <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                   <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-2">
                     <TrendingUp size={18} className="text-indigo-500"/> 台灣財富百分位數 (PR) 分布與您的落點
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="pt-12 pb-8 px-6 lg:px-12">
                   <div className="w-full relative">
                     <div className="h-4 w-full bg-slate-100 rounded-full relative shadow-inner">
                       <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full" style={{ width: `${result.taiwanPercentile}%` }}></div>
                       
                       {/* PR Markers */}
                       {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pr, i) => (
                          <div key={pr} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${pr}%` }}>
                             {/* Top Label */}
                             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-bold">PR{pr}</div>
                             {/* Bottom Value */}
                             <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 whitespace-nowrap hidden md:block">
                               {Math.round(result.taiwanDeciles[i] / 10000)}W
                             </div>
                             <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap md:hidden">
                               {Math.round(result.taiwanDeciles[i] / 10000)}
                             </div>
                          </div>
                       ))}

                       {/* User Indicator */}
                       <div className="absolute top-1/2 w-5 h-5 bg-indigo-600 rounded-full border-[3px] border-white shadow-md -mt-2.5 -ml-2.5 z-10 transition-all duration-1000" style={{ left: `${result.taiwanPercentile}%` }}>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] md:text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                            您在 PR {result.taiwanPercentile}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                          </div>
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )}

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-1 border-slate-200 shadow-sm">
                 <CardHeader className="border-b border-slate-100 mb-4 bg-slate-50/50 rounded-t-3xl">
                   <CardTitle className="flex items-center gap-2 text-slate-800"><PieChartIcon size={18} className="text-indigo-500" /> 現有資產配置</CardTitle>
                 </CardHeader>
                 <CardContent className="h-64 mt-4 text-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={{stroke: '#cbd5e1', strokeWidth: 1}}
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {assetChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number, name: string) => [`${formatCurrency(value)} (${((value / totalAssets) * 100).toFixed(1)}%)`, name]} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                 </CardContent>
               </Card>

               <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                 <CardHeader className="border-b border-slate-100 mb-4 bg-slate-50/50 rounded-t-3xl flex flex-row items-center justify-between">
                   <CardTitle className="flex items-center gap-2 text-slate-800"><TrendingUp size={18} className="text-emerald-500" /> 退休資產軌跡 (淨資產增長 & 通膨變化)</CardTitle>
                   <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8 text-slate-600"
                      onClick={() => setShowCalculationSteps(!showCalculationSteps)}
                    >
                      {showCalculationSteps ? '隱藏計算過程' : '查看計算過程'}
                    </Button>
                 </CardHeader>
                 <CardContent className="mt-4 text-slate-800 flex flex-col gap-4">
                    {showCalculationSteps && result.calculationSteps && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-sm prose prose-slate prose-headings:text-indigo-800 text-indigo-900 max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.calculationSteps.replace(/\\n/g, '\n')}</ReactMarkdown>
                      </div>
                    )}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateProjection()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="age" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${(v/10000).toFixed(0)}W`} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `年齡: ${label}歲`} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="NetWorth" stroke="#10b981" strokeWidth={3} dot={false} name="淨資產" />
                        <Line yAxisId="left" type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} dot={false} name="預期年支出 (含通膨)" />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                 </CardContent>
               </Card>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2 bg-white border-indigo-100 shadow-md shadow-indigo-100/50">
                  <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 rounded-t-3xl mb-4">
                     <CardTitle className="flex items-center gap-2 text-indigo-700">
                        <BrainCircuit size={20} /> AI 理財顧問深度解析
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-slate prose-a:text-indigo-600 prose-headings:text-slate-800 max-w-none text-slate-700 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.analysisMarkdown.replace(/\\n/g, '\n')}</ReactMarkdown>
                  </CardContent>
               </Card>

               <Card className="bg-white border-rose-100 shadow-md shadow-rose-100/50">
                  <CardHeader className="bg-rose-50/50 border-b border-rose-100 rounded-t-3xl mb-4">
                     <CardTitle className="flex items-center gap-2 text-rose-600">
                        <span className="text-[12px]">★</span> 核心行動指南
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {result.recommendations.map((rec, i) => (
                       <div key={i} className="flex gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:border-rose-200 hover:bg-rose-50/30 transition-colors">
                         <div className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[12px] mt-0.5">{i + 1}</div>
                         <p className="text-sm font-medium text-slate-700 leading-relaxed">{rec}</p>
                       </div>
                     ))}
                  </CardContent>
               </Card>
             </div>

           </div>
        )}
      </main>
    </div>
  );
}

