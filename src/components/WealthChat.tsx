import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { AssetData, LiabilityData, RetirementData, AIConfig } from '../types';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface WealthChatProps {
  assets: AssetData;
  liabilities: LiabilityData;
  retirement: RetirementData;
  aiConfig: AIConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function WealthChat({ assets, liabilities, retirement, aiConfig, isOpen, onClose }: WealthChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: aiConfig.geminiKey || process.env.GEMINI_API_KEY || '' });
      
      const context = `你是 Wealth AI 專屬財務策略師。
以下是使用者的當前財務數據（新台幣 TWD）：
- 資產：股票 ${assets.stocks}, 現金 ${assets.cash}, 債券 ${assets.bonds}, 房產 ${assets.realEstate}, 加密貨幣 ${assets.crypto}, 金屬 ${assets.metals}
- 負債：房貸 ${liabilities.mortgage}, 車貸 ${liabilities.carLoan}, 信貸 ${liabilities.personalLoan}
- 退休目標：目前 ${retirement.currentAge} 歲, 預計 ${retirement.retirementAge} 歲退休, 壽命預期 ${retirement.targetLifespan}
- 收入支出：年收 ${retirement.annualIncome}, 年支出 ${retirement.annualExpense}, 每年可投資額 ${retirement.annualInvestable}

你的任務是根據這些數據提供深刻、專業且具有行動力的理財建議。回答請使用正體中文(zh-TW)。`;

      const history = messages.map(m => ({ 
        role: m.role === 'model' ? 'model' : 'user', 
        parts: [{ text: m.content }] 
      }));

      // Using the pattern observed in services/ai.ts
      const response = await (genAI as any).models.generateContent({
        model: aiConfig.geminiModel,
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...history,
          { role: 'user', parts: [{ text: userMsg }] }
        ]
      });

      const text = response.text || "我現在無法回答這個問題。";

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: '抱歉，我現在無法處理您的請求。請確認 API Key 是否設定正確。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0, y: 20, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 20, scale: 0.95 }}
           className="fixed bottom-24 right-4 z-[70] w-full max-w-[400px] shadow-2xl"
        >
          <Card className="border-indigo-200 overflow-hidden rounded-3xl">
            <CardHeader className="bg-indigo-600 text-white p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Sparkles size={16} /> Wealth AI 戰略對話
              </CardTitle>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={18} />
              </button>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[500px]">
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
              >
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bot size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-600">我是您的專屬財務策略師</p>
                    <p className="text-xs text-slate-400 mt-1">您可以問我任何關於「假如...對退休的影響」</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none font-medium' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate text-slate-800 font-medium'}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="例如：假如我明年買了一台 200 萬的房車..."
                    className="flex-1 bg-slate-100 border-0 rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSend}
                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
