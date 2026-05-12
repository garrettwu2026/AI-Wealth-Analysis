import { useState, useRef, useEffect, useMemo } from 'react';
export {  }; // To satisfy imports if needed
import { MessageSquare, Settings, PieChart as PieChartIcon, TrendingUp, DollarSign, BrainCircuit, Globe, Loader2, Sparkles, Building, Coins, GraduationCap, Banknote, Landmark, CreditCard, ChevronRight, Key, Download,
  Plus, Save, History, ArrowLeftRight, Layers, Scale, Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './components/ui/card';
import { Input, Label } from './components/ui/input';
import { Button } from './components/ui/button';
import { AssetData, LiabilityData, RetirementData, AIConfig, AnalysisResult } from './types';
import { analyzeWealth } from './services/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { WealthChat } from './components/WealthChat';

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

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'analysis'>('input');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCalculationSteps, setShowCalculationSteps] = useState(false);
  const [showPRCalculationSteps, setShowPRCalculationSteps] = useState(false);
  const [showFireCalculationSteps, setShowFireCalculationSteps] = useState(false);

  // Sensitivity Analysis
  const [roi, setRoi] = useState(0.06);
  const [inflation, setInflation] = useState(0.025);
  const [isMonteCarloVisible, setIsMonteCarloVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Scenario Comparison
  const [snapshot, setSnapshot] = useState<{
    assets: AssetData;
    liabilities: LiabilityData;
    retirement: RetirementData;
    result: AnalysisResult;
    roi: number;
    inflation: number;
    timestamp: number;
  } | null>(null);
  const [compareMode, setCompareMode] = useState(false);

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

  const totalAssets: number = Object.values(assets).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
  const totalLiabilities: number = (Number(liabilities.mortgage) || 0) + (Number(liabilities.personalLoan) || 0) + (Number(liabilities.carLoan) || 0);
  const netWorth: number = Number(totalAssets) - Number(totalLiabilities);

  const handleAnalyze = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setLoadingStep(0);
      setError(null);
      
      const steps = [
        '正在彙整您的財富數據...',
        '調研全球財富百分位數資料庫...',
        '運算退休資產長期增長軌跡...',
        'AI 正在讀取並診斷您的財務健康狀況...',
        '產生個人化最佳化建議清單...'
      ];

      const interval = setInterval(() => {
        setLoadingStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 2000);

      abortControllerRef.current = new AbortController();
      const res = await analyzeWealth(aiConfig, assets, liabilities, retirement, abortControllerRef.current.signal);
      
      clearInterval(interval);
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
      setLoadingStep(0);
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
  const generateProjection = (
    customNetWorth?: number, 
    customRoi?: number, 
    customInflation?: number,
    customRetirement?: RetirementData
  ) => {
    const activeRetirement = customRetirement || retirement;
    let simulatedNetWorth = customNetWorth !== undefined ? customNetWorth : netWorth;
    const data = [];
    const inflationRate = customInflation !== undefined ? customInflation : inflation;
    const currentRoi = customRoi !== undefined ? customRoi : roi;
    
    let currentExpense = Number(activeRetirement.annualExpense);
    const investable = Number(activeRetirement.annualInvestable);
    const postRetirementIncome = Number(activeRetirement.postRetirementIncome) || 0;
    const startAge = Number(activeRetirement.currentAge);
    const retirementAge = Number(activeRetirement.retirementAge);
    const targetLifespan = Number(activeRetirement.targetLifespan) || 120;

    for (let age = startAge; age <= targetLifespan; age++) {
       data.push({ 
         age, 
         NetWorth: Math.round(simulatedNetWorth), 
         Expenses: Math.round(currentExpense) 
       });
       
       if (age < retirementAge) {
         simulatedNetWorth = simulatedNetWorth * (1 + currentRoi) + investable;
       } else {
         simulatedNetWorth = simulatedNetWorth * (1 + currentRoi) - currentExpense + postRetirementIncome;
       }
       currentExpense *= (1 + inflationRate);
    }
    return data;
  };

  const projectionData = useMemo(() => generateProjection(), [netWorth, roi, inflation, retirement]);
  
  const comparisonData = useMemo(() => {
    if (!compareMode || !snapshot) return null;
    
    // Calculate snapshot projection
    const sAssets = snapshot.assets;
    const sLiabilities = snapshot.liabilities;
    const sRetirement = snapshot.retirement;
    const sTotalAssets = Object.values(sAssets).reduce((a, b) => Number(a) + (Number(b) || 0), 0);
    const sActualLiabilities = (Number(sLiabilities.mortgage) || 0) + (Number(sLiabilities.personalLoan) || 0) + (Number(sLiabilities.carLoan) || 0);
    const sNetWorth = (Number(sTotalAssets) || 0) - (Number(sActualLiabilities) || 0);
    
    return generateProjection(sNetWorth, snapshot.roi, snapshot.inflation, sRetirement);
  }, [compareMode, snapshot]);

  // Combine data for comparison chart
  const combinedChartData = useMemo(() => {
    if (!comparisonData) return projectionData;
    
    const combined = [];
    const maxAge = Math.max(
      projectionData[projectionData.length - 1]?.age || 0,
      comparisonData[comparisonData.length - 1]?.age || 0
    );
    const minAge = Math.min(
      projectionData[0]?.age || 0,
      comparisonData[0]?.age || 0
    );

    for (let age = minAge; age <= maxAge; age++) {
      const current = projectionData.find(d => d.age === age);
      const prev = comparisonData.find(d => d.age === age);
      combined.push({
        age,
        NetWorth: current?.NetWorth,
        Expenses: current?.Expenses,
        PrevNetWorth: prev?.NetWorth,
        PrevExpenses: prev?.Expenses
      });
    }
    return combined;
  }, [projectionData, comparisonData]);

  const benchmarks = {
    '60/40 股債平衡型': { stocks: 60, bonds: 40, metals: 0, crypto: 0, cash: 0, realEstate: 0 },
    '全天候 (Bridgewater)': { stocks: 30, bonds: 55, metals: 7.5, crypto: 0, cash: 0, realEstate: 7.5 },
    '指數化三基金 (Bogleheads)': { stocks: 33, cash: 33, bonds: 33, metals: 0, crypto: 0, realEstate: 0 },
  };

  // Monte Carlo Simulation Logic
  const monteCarloData = useMemo(() => {
    if (activeTab !== 'analysis') return [];
    
    const simulations = 500;
    const years = (Number(retirement.targetLifespan) || 120) - (Number(retirement.currentAge) || 30);
    const startAge = Number(retirement.currentAge) || 30;
    const retirementAge = Number(retirement.retirementAge) || 55;
    const postRetirementInc = Number(retirement.postRetirementIncome) || 0;
    const investable = Number(retirement.annualInvestable) || 0;
    
    // Estimate volatility based on allocation
    const totalA = Math.max(1, totalAssets);
    const weights = {
      stocks: (Number(assets.stocks) || 0) / totalA,
      bonds: (Number(assets.bonds) || 0) / totalA,
      realEstate: (Number(assets.realEstate) || 0) / totalA,
      crypto: (Number(assets.crypto) || 0) / totalA,
      metals: (Number(assets.metals) || 0) / totalA,
      cash: (Number(assets.cash) || 0) / totalA,
    };
    
    const volMap = {
      stocks: 0.18,
      bonds: 0.06,
      realEstate: 0.04,
      crypto: 0.70,
      metals: 0.15,
      cash: 0.01
    };
    
    const portfolioVol = Object.keys(weights).reduce((acc, key) => {
      const weight = weights[key as keyof typeof weights];
      const vol = volMap[key as keyof typeof volMap];
      return acc + (weight * vol);
    }, 0);

    const resultsByYear: { age: number; p10: number; p50: number; p90: number; successCount: number }[] = [];
    const allPaths: number[][] = Array.from({ length: simulations }, () => [netWorth]);

    for (let sim = 0; sim < simulations; sim++) {
      let currentNW = netWorth;
      let currentExp = Number(retirement.annualExpense) || 600000;
      
      for (let y = 1; y <= years; y++) {
        const age = startAge + y;
        
        // Random normal return using Box-Muller
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const randomReturn = roi + (z * portfolioVol);
        
        if (age < retirementAge) {
          currentNW = (currentNW * (1 + randomReturn)) + investable;
        } else {
          currentNW = (currentNW * (1 + randomReturn)) - currentExp + postRetirementInc;
        }
        
        currentExp *= (1 + inflation);
        allPaths[sim].push(Math.max(-10000000, currentNW));
      }
    }

    // Calculate percentiles
    for (let y = 0; y <= years; y++) {
      const valsAtYear = allPaths.map(p => p[y]).sort((a, b) => a - b);
      const p10 = valsAtYear[Math.floor(simulations * 0.1)];
      const p50 = valsAtYear[Math.floor(simulations * 0.5)];
      const p90 = valsAtYear[Math.floor(simulations * 0.9)];
      const successCount = valsAtYear.filter(v => v > 0).length;
      
      resultsByYear.push({
        age: startAge + y,
        p10: Math.round(p10),
        p50: Math.round(p50),
        p90: Math.round(p90),
        successCount
      });
    }

    return resultsByYear;
  }, [activeTab, netWorth, roi, inflation, retirement, assets, totalAssets]);

  const successProbability = monteCarloData.length > 0 ? (monteCarloData[monteCarloData.length - 1].successCount / 500) * 100 : 0;

  const handleSaveSnapshot = () => {
    if (!result) return;
    setSnapshot({
      assets: JSON.parse(JSON.stringify(assets)),
      liabilities: JSON.parse(JSON.stringify(liabilities)),
      retirement: JSON.parse(JSON.stringify(retirement)),
      result: JSON.parse(JSON.stringify(result)),
      roi,
      inflation,
      timestamp: Date.now()
    });
  };

  const exportReportAsMarkdown = () => {
    if (!result) return;
    
    const totalAssetsVal: number = Object.values(assets).reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
    const actualLiabilities: number = (Number(liabilities.mortgage) || 0) + (Number(liabilities.personalLoan) || 0) + (Number(liabilities.carLoan) || 0);

    const markdown = `# 財富與退休深度診斷報告

## 基本資料
* **目前年紀**: ${Number(retirement.currentAge) || 0} 歲
* **預期壽終**: ${Number(retirement.targetLifespan) || 0} 歲
* **年總收入**: ${formatCurrency(Number(retirement.annualIncome) || 0)} TWD
* **年生活支出**: ${formatCurrency(Number(retirement.annualExpense) || 0)} TWD
* **每年可再投資**: ${formatCurrency(Number(retirement.annualInvestable) || 0)} TWD
* **目前淨資產**: ${formatCurrency(Number(totalAssetsVal) - Number(actualLiabilities))} TWD

## 預估 FIRE 財務獨立年齡
* **預估 FIRE 年齡**: ${result.fireAge} 歲
* **當前 FIRE 目標金額**: ${formatCurrency(result.fireTargetAmount || (Number(retirement.annualExpense) / 0.047))} TWD

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

  const exportToPDF = async () => {
    const element = document.getElementById('analysis-report');
    if (!element) return;
    
    setLoading(true);
    setLoadingStep(0);
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight);
      pdf.save(`FIRE_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setLoading(false);
    }
  };

  const LoadingOverlay = () => {
    const steps = [
      { msg: '正在彙整您的財富數據...', icon: <Banknote size={18} /> },
      { msg: '調研全球財富百分位數資料庫...', icon: <Globe size={18} /> },
      { msg: '運算退休資產長期增長軌跡...', icon: <TrendingUp size={18} /> },
      { msg: 'AI 正在讀取並診斷您的財務健康狀況...', icon: <BrainCircuit size={18} /> },
      { msg: '產生個人化最佳化建議清單...', icon: <Sparkles size={18} /> }
    ];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4"
      >
        <Card className="w-full max-w-md bg-white border-indigo-500 shadow-2xl shadow-indigo-500/20 overflow-hidden">
          <div className="h-1.5 w-full bg-slate-100">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(loadingStep + 1) * 20}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <motion.div 
                   animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-3xl border-4 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <BrainCircuit className="text-indigo-500 animate-pulse" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800">AI 財富診斷進行中</h3>
              <p className="text-slate-500 text-sm mt-2">這預估需要 15-30 秒，請稍候...</p>
            </div>
            
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${i <= loadingStep ? 'opacity-100' : 'opacity-20'}`}>
                  <div className={`p-2 rounded-lg ${i === loadingStep ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : i < loadingStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {i < loadingStep ? <ChevronRight size={18} /> : step.icon}
                  </div>
                  <span className={`text-[13px] font-bold ${i === loadingStep ? 'text-indigo-600' : i < loadingStep ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {step.msg}
                  </span>
                </div>
              ))}
            </div>
            
            <button onClick={handleCancel} className="w-full py-2 text-rose-500 hover:bg-rose-50 text-xs font-bold uppercase tracking-widest transition-colors rounded-xl">
              取消分析程序
            </button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <AnimatePresence>
        {loading && <LoadingOverlay />}
      </AnimatePresence>
 
      {/* Floating Chat Trigger */}
      {result && (
        <button 
          onClick={() => setIsChatVisible(true)}
          className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageSquare className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      <WealthChat 
        isOpen={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        assets={assets}
        liabilities={liabilities}
        retirement={retirement}
        aiConfig={aiConfig}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 mb-6 sticky top-0 z-[60] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-2xl font-bold text-white">W</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic text-slate-800">
                財富<span className="text-indigo-500">透視 AI</span>
              </h1>
            </div>
          </div>
 
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-wrap items-center gap-3 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl shadow-inner">
                 <select 
                    value={aiConfig.provider}
                    onChange={e => setAiConfig({...aiConfig, provider: e.target.value as 'gemini' | 'openai'})}
                    className="bg-transparent text-xs font-bold border-0 rounded-lg px-3 py-1.5 focus:ring-0 text-slate-700 cursor-pointer"
                  >
                    <option value="gemini">Gemini</option>
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
                    className="bg-transparent text-xs font-bold border-0 rounded-lg px-3 py-1.5 focus:ring-0 text-slate-700 cursor-pointer"
                  >
                    {aiConfig.provider === 'gemini' ? (
                      <>
                        <option value="gemini-3-flash-preview">3 Flash</option>
                        <option value="gemini-3.1-pro-preview">3.1 Pro</option>
                        <option value="gemini-3.1-flash-lite">3.1 Lite</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-5.4-pro">GPT 5.4 Pro</option>
                        <option value="gpt-5.4-mini">Mini</option>
                        <option value="gpt-5.4-nano">Nano</option>
                      </>
                    )}
                  </select>
 
                  <div className="h-4 w-px bg-slate-200"></div>
 
                  <input 
                    type="password"
                    placeholder="API Key"
                    className="bg-transparent text-xs font-bold border-0 px-3 py-1.5 focus:ring-0 text-slate-700 w-32 placeholder:text-slate-400"
                    value={aiConfig.provider === 'gemini' ? (aiConfig.geminiKey || '') : (aiConfig.openAIKey || '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (aiConfig.provider === 'gemini') {
                        setAiConfig({...aiConfig, geminiKey: val});
                        localStorage.setItem('_ws_g_key', encryptKey(val));
                      } else {
                        setAiConfig({...aiConfig, openAIKey: val});
                        localStorage.setItem('_ws_o_key', encryptKey(val));
                      }
                    }}
                  />
            </div>
            
            <Button 
               variant="outline" 
               size="icon" 
               className="rounded-xl lg:hidden bg-slate-100 text-slate-600 border-slate-200"
               onClick={() => {}} // Could add a config modal
            >
              <Settings size={20} />
            </Button>
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
                      <Input type="number" value={assets.stocks === '' ? '' : assets.stocks / 10000} onChange={e => setAssets({...assets, stocks: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>現金/儲蓄 (萬)</Label>
                      <Input type="number" value={assets.cash === '' ? '' : assets.cash / 10000} onChange={e => setAssets({...assets, cash: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>債券 (萬)</Label>
                      <Input type="number" value={assets.bonds === '' ? '' : assets.bonds / 10000} onChange={e => setAssets({...assets, bonds: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>貴金屬 (萬)</Label>
                      <Input type="number" value={assets.metals === '' ? '' : assets.metals / 10000} onChange={e => setAssets({...assets, metals: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>加密貨幣 (萬)</Label>
                      <Input type="number" value={assets.crypto === '' ? '' : assets.crypto / 10000} onChange={e => setAssets({...assets, crypto: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label>不動產 (萬)</Label>
                      <Input type="number" value={assets.realEstate === '' ? '' : assets.realEstate / 10000} onChange={e => setAssets({...assets, realEstate: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
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
                          <Input type="number" value={liabilities.mortgage === '' ? '' : liabilities.mortgage / 10000} onChange={e => setLiabilities({...liabilities, mortgage: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-500">房貸剩餘還款年數</Label>
                          <Input type="number" value={liabilities.mortgageYearsRemaining} onChange={e => setLiabilities({...liabilities, mortgageYearsRemaining: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-4 col-span-2 md:col-span-1 border p-4 rounded-xl bg-slate-50/50">
                        <div className="space-y-2">
                           <Label>車貸 (萬)</Label>
                          <Input type="number" value={liabilities.carLoan === '' ? '' : liabilities.carLoan / 10000} onChange={e => setLiabilities({...liabilities, carLoan: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-500">車貸剩餘還款年數</Label>
                          <Input type="number" value={liabilities.carLoanYearsRemaining} onChange={e => setLiabilities({...liabilities, carLoanYearsRemaining: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-white focus:bg-white transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2 col-span-2 mt-2">
                         <Label>信貸與其他負債 (萬)</Label>
                        <Input type="number" value={liabilities.personalLoan === '' ? '' : liabilities.personalLoan / 10000} onChange={e => setLiabilities({...liabilities, personalLoan: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
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
                        <Input type="number" value={retirement.currentAge} onChange={e => setRetirement({...retirement, currentAge: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>預估退休年紀</Label>
                        <Input type="number" value={retirement.retirementAge} onChange={e => setRetirement({...retirement, retirementAge: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>預估最終壽命</Label>
                        <Input type="number" value={retirement.targetLifespan} onChange={e => setRetirement({...retirement, targetLifespan: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>年總收入 (萬)</Label>
                        <Input type="number" value={retirement.annualIncome === '' ? '' : retirement.annualIncome / 10000} onChange={e => setRetirement({...retirement, annualIncome: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>年生活支出 (萬)</Label>
                        <Input type="number" value={retirement.annualExpense === '' ? '' : retirement.annualExpense / 10000} onChange={e => setRetirement({...retirement, annualExpense: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>每年可再投資金額 (萬)</Label>
                        <Input type="number" value={retirement.annualInvestable === '' ? '' : retirement.annualInvestable / 10000} onChange={e => setRetirement({...retirement, annualInvestable: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <Label>退休後工作收入(每年/萬)</Label>
                        <Input type="number" value={retirement.postRetirementIncome === '' ? '' : retirement.postRetirementIncome / 10000} onChange={e => setRetirement({...retirement, postRetirementIncome: e.target.value === '' ? '' : Number(e.target.value) * 10000})} className="bg-slate-50 focus:bg-white transition-colors" />
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
           <div id="analysis-report" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Toolbar */}
             <div className="flex flex-col md:flex-row w-full items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-[4.5rem] z-40">
               <div className="flex flex-wrap items-center gap-2">
                 <Button 
                    onClick={exportToPDF}
                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md h-10 px-4 gap-2 font-bold text-xs"
                  >
                    <Download size={16} />
                    <span>匯出 PDF 報告</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={exportReportAsMarkdown}
                    className="rounded-xl h-10 px-4 gap-2 font-bold text-xs border-slate-200"
                  >
                    <Download size={16} />
                    <span>Markdown</span>
                  </Button>
               </div>
 
               <div className="flex items-center gap-4">
                  <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={snapshot ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={handleSaveSnapshot}
                      className="rounded-xl h-10 px-4 gap-2 font-bold text-xs"
                    >
                      <Save size={16} />
                      {snapshot ? '更新對照點' : '鎖定目前情境'}
                    </Button>
                    
                    {snapshot && (
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <Button
                          variant={compareMode ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCompareMode(!compareMode)}
                          className={`rounded-lg h-8 px-3 gap-2 font-bold text-[11px] ${compareMode ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          <ArrowLeftRight size={14} />
                          情境對照 {compareMode ? '開' : '關'}
                        </Button>
                      </div>
                    )}
                  </div>
               </div>
             </div>

             {/* Sensitivity Sliders */}
             <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm overflow-hidden border-2">
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-sm font-black text-indigo-700 flex items-center gap-2 uppercase tracking-widest">
                     <Scale size={16} />
                     互動式敏感度分析 (Sensitivity Analysis)
                   </CardTitle>
                   <Info size={16} className="text-indigo-300 cursor-help" />
                 </div>
                 <CardDescription className="text-xs">
                   即時調整參數觀測資產壽命變化 (不消耗 Token)
                 </CardDescription>
               </CardHeader>
               <CardContent className="pt-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <Label className="text-xs font-bold">預期年化投資報酬率 (ROI): <span className="text-indigo-600 font-black">{(roi * 100).toFixed(1)}%</span></Label>
                     </div>
                     <input 
                       type="range" 
                       min="0" max="0.15" step="0.005" 
                       value={roi} 
                       onChange={e => setRoi(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                     />
                     <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                       <span>保守 (0%)</span>
                       <span>歷史均值 (7-8%)</span>
                       <span>激進 (15%)</span>
                     </div>
                   </div>
 
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <Label className="text-xs font-bold">預期通膨與生活增長率: <span className="text-rose-500 font-black">{(inflation * 100).toFixed(1)}%</span></Label>
                     </div>
                     <input 
                       type="range" 
                       min="0" max="0.1" step="0.005" 
                       value={inflation} 
                       onChange={e => setInflation(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                     />
                     <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                       <span>通縮 (0%)</span>
                       <span>正常通膨 (2-3%)</span>
                       <span>高通膨 (10%)</span>
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>

              {/* Monte Carlo Simulation */}
              <Card className="bg-white border-indigo-100 shadow-sm border-2 overflow-hidden mb-8">
                <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black text-indigo-700 flex items-center gap-2 uppercase tracking-widest">
                      <BrainCircuit size={18} /> 蒙地卡羅隨機模擬 (Monte Carlo Simulation)
                    </CardTitle>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${Number(successProbability) > 80 ? 'bg-emerald-100 text-emerald-700' : Number(successProbability) > 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      退休成功率: {Number(successProbability).toFixed(1)}%
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    進行 500 次市場波動隨機模擬，評估在不同市場極端情況下的資產安全性。
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monteCarloData}>
                          <defs>
                            <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="age" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis tickFormatter={(v) => `${(v/10000).toFixed(0)}W`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip formatter={(v: any) => formatCurrency(Number(v))} labelFormatter={(l) => `年齡: ${l}歲`} />
                          <Area type="monotone" dataKey="p90" stroke="#10b981" fillOpacity={1} fill="url(#colorP90)" name="楽觀展望 (前10%)" />
                          <Area type="monotone" dataKey="p50" stroke="#6366f1" fillOpacity={1} fill="url(#colorP50)" name="平均預期 (中位數)" />
                          <Area type="monotone" dataKey="p10" stroke="#f43f5e" fillOpacity={0} name="最差情況 (後10%)" strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b pb-2">模擬診斷</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold">成功概率意義</p>
                          <p className="text-xs text-slate-700 leading-normal mt-1">
                            {successProbability > 90 ? '您的配置極其穩健，幾乎能應對所有歷史級別的市場崩盤。' : 
                             successProbability > 70 ? '配置良好，但在持續通膨或長期熊市下仍有一定風險。' : 
                             '目前的配置波動率較高或儲蓄率不足，建議增加防禦性資產。'}
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-[10px] text-slate-500 font-bold">計算方法</p>
                          <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
                            基於您資產構成的歷史波動率 (Volatility)，透過常態分佈隨機生成年度報酬，重複運算 500 次路徑得出百分位分佈。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <div className="text-xs text-white/90 mt-1 font-bold tracking-widest uppercase">FIRE 目標: {formatCurrency(result.fireTargetAmount || (Number(retirement.annualExpense) / 0.047))} TWD</div>
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
                               {Math.round((result.taiwanDeciles[i] || 0) / 10000)}W
                             </div>
                             <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap md:hidden">
                               {Math.round((result.taiwanDeciles[i] || 0) / 10000)}
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
                 {/* Asset Heatmap Section */}
                 <Card className="lg:col-span-3 bg-white border-slate-200 shadow-sm overflow-hidden mb-8">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                       <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Layers size={18} className="text-indigo-500" /> 資產類別熱圖：風險與流動性分析
                       </CardTitle>
                       <CardDescription className="text-xs">
                          分析資產轉現速度 (Liquidity) 與價值波動度 (Volatility) 的二維分布。
                       </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {[
                             { name: '股票/基金', val: Number(assets.stocks), vol: '高', liq: '中', color: 'bg-orange-500' },
                             { name: '現金/存款', val: Number(assets.cash), vol: '低', liq: '極高', color: 'bg-emerald-500' },
                             { name: '債券/定存', val: Number(assets.bonds), vol: '低', liq: '高', color: 'bg-blue-500' },
                             { name: '貴金屬', val: Number(assets.metals), vol: '中', liq: '中', color: 'bg-yellow-500' },
                             { name: '加密貨幣', val: Number(assets.crypto), vol: '極高', liq: '極高', color: 'bg-purple-500' },
                             { name: '不動產', val: Number(assets.realEstate), vol: '低', liq: '低', color: 'bg-slate-500' },
                          ].filter(a => a.val > 0).map(asset => (
                             <div key={asset.name} className="flex flex-col border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className={`h-1 ${asset.color}`} />
                                <div className="p-3 space-y-2">
                                   <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black text-slate-800">{asset.name}</span>
                                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded italic">{Math.round((Number(asset.val) / Number(totalAssets)) * 100)}%</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 mt-2">
                                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                                         <p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">波動性</p>
                                         <p className={`text-[10px] font-black ${asset.vol.includes('高') ? 'text-rose-500' : 'text-emerald-500'}`}>{asset.vol}</p>
                                      </div>
                                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                                         <p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">流動性</p>
                                         <p className={`text-[10px] font-black ${asset.liq.includes('高') ? 'text-emerald-500' : 'text-slate-500'}`}>{asset.liq}</p>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                       <div className="mt-6 p-4 bg-indigo-50 rounded-2xl flex items-start gap-3">
                          <Info size={16} className="text-indigo-400 mt-1" />
                          <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                             <span className="font-bold">策略提示：</span>
                             雖然「不動產」波動低，但其代價是低流動性。若市場轉差，您無法立即變現以應對生活開支。
                             目前的「現金+債券」高流動性資產佔比為 <span className="font-black italic">{Math.round(((Number(assets.cash) + Number(assets.bonds)) / Number(totalAssets)) * 100)}%</span>，
                             {((Number(assets.cash) + Number(assets.bonds)) / Number(totalAssets)) < 0.2 ? '略顯不足，建議提升流動緩衝。' : '覆蓋良好，足以應對突發狀況。'}
                          </p>
                       </div>
                    </CardContent>
                 </Card>

               <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
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
                          label={({name, percent}: any) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                        <RechartsTooltip formatter={(value: number, name: string) => [`${formatCurrency(value)} (${((Number(value) / Number(totalAssets)) * 100).toFixed(1)}%)`, name]} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                 </CardContent>
                 <CardFooter className="flex-col items-stretch gap-4 pt-4 border-t border-slate-100">
                   <div className="flex flex-col gap-1.5 mb-2">
                      <div className="flex items-center gap-2">
                         <Layers size={14} className="text-indigo-500" />
                         <span className="text-xs font-bold text-slate-700">資產配置診斷 (Benchmark)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        將您的「股票/基金」佔比與國際知名投資組合模型進行對照，評估您的風險承受度與資產分散程度。
                      </p>
                   </div>
                   <div className="space-y-3">
                      {Object.entries(benchmarks).map(([name, data]) => {
                        const totalVal = Object.values(assets).reduce((acc: number, b: any) => acc + (Number(b)||0), 0);
                        const stocksP = (Number(assets.stocks) / Number(totalVal)) * 100 || 0;
                        const diff = Math.abs(stocksP - data.stocks);
                        const isSimilar = diff < 10;
                        
                        return (
                          <div key={name} className="flex items-center justify-between group">
                             <span className="text-[10px] font-medium text-slate-500 group-hover:text-indigo-500 transition-colors uppercase tracking-wider">{name}</span>
                             <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-slate-300 rounded-full" style={{ width: `${data.stocks}%` }}></div>
                                </div>
                                <span className={`text-[10px] font-black ${isSimilar ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {isSimilar ? '您的配置接近' : `目標 ${Math.round(data.stocks)}%`}
                                </span>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                 </CardFooter>
               </Card>

               <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
                 <CardHeader className="border-b border-slate-100 mb-4 bg-slate-50/50 rounded-t-3xl flex flex-row items-center justify-between">
                   <CardTitle className="flex items-center gap-2 text-slate-800"><TrendingUp size={18} className="text-emerald-500" /> 退休資產軌跡 {compareMode && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold ml-2">對照模式</span>}</CardTitle>
                   <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8 text-slate-600 border-slate-200"
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
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="age" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${(v/10000).toFixed(0)}W`} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `年齡: ${label}歲`} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="NetWorth" stroke="#10b981" strokeWidth={4} dot={false} name="淨資產 (當前參數)" />
                        {compareMode && <Line yAxisId="left" type="monotone" dataKey="PrevNetWorth" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="淨資產 (前次鎖定)" />}
                        <Line yAxisId="left" type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} dot={false} name="預期年支出 (目前通膨)" />
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

