import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  MessageSquare,
  ArrowRight,
  Filter,
  BarChart3,
  Minimize2,
  Trash2,
  Bot,
  User,
  Sliders,
  Database,
  ChevronDown,
} from "lucide-react";
import { dashboardApi } from "../services/api";
import { Language, getStoredLanguage, t } from "../utils/i18n";

export interface CopilotAction {
  label: string;
  type: "navigate" | "view_chart" | "apply_filter" | "clear_filter";
  target: any;
}

export interface CopilotMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  supportingMetric?: string;
  action?: CopilotAction;
  timestamp: Date;
}

interface GlobalAICopilotProps {
  datasetId: string;
  suggestedQuestions?: string[];
  activeFilters?: Record<string, any>;
  currentContext?: {
    currentTab?: string;
    currentChartId?: string;
    currentChartTitle?: string;
    currentMetric?: string;
  };
  language?: Language;
  onNavigateTab?: (tab: string) => void;
  onViewChart?: (chartIdOrCol: string) => void;
  onApplyFilter?: (column: string, value: any) => void;
  onClearFilter?: (column?: string) => void;
}

export default function GlobalAICopilot({
  datasetId,
  suggestedQuestions = [],
  activeFilters = {},
  currentContext,
  language,
  onNavigateTab,
  onViewChart,
  onApplyFilter,
  onClearFilter,
}: GlobalAICopilotProps) {
  const [currentLang, setCurrentLang] = useState<Language>(language || getStoredLanguage());

  useEffect(() => {
    if (language) {
      setCurrentLang(language);
    }
  }, [language]);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setCurrentLang(e.detail);
    };
    window.addEventListener("language_change", handleLangChange);
    return () => window.removeEventListener("language_change", handleLangChange);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const getInitialGreeting = (lang: Language) => {
    if (lang === 'hi') {
      return "नमस्ते! मैं आपका InsightAI कोपायलट हूँ। मैं आपके लाइव डेटासेट का विश्लेषण करता हूँ और आपके प्रश्नों का उत्तर दे सकता हूँ।";
    }
    if (lang === 'mr') {
      return "नमस्कार! मी तुमचा InsightAI कोपायलट आहे. मी तुमच्या थेट डेटासेटचे विश्लेषण करतो आणि कोणत्याही प्रश्नाचे उत्तर देऊ शकतो.";
    }
    return "Hello! I am your InsightAI Copilot. I analyze your live dataset, understand active filters, and can execute actions across the dashboard.";
  };

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "initial",
      sender: "copilot",
      text: getInitialGreeting(currentLang),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = Object.keys(activeFilters).filter(
    (k) => activeFilters[k] !== undefined && activeFilters[k] !== "all"
  ).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Multilingual suggested questions
  const defaultQuestionsByLang: Record<Language, string[]> = {
    en: [
      "What is the most important insight?",
      "Which variables are most correlated?",
      "Find statistical anomalies",
      "Show highest volume category",
      "Open Data Explorer",
    ],
    hi: [
      "सबसे महत्वपूर्ण अंतर्दृष्टि क्या है?",
      "किन चरों में सबसे अधिक सहसंबंध है?",
      "सांख्यिकीय विसंगतियों का पता लगाएं",
      "सर्वोच्च मान दिखाएं",
      "डेटा एक्सप्लोरर खोलें",
    ],
    mr: [
      "सर्वात महत्त्वाचा निष्कर्ष कोणता आहे?",
      "कोणत्या व्हेरिएबल्समध्ये जास्त सहसंबंध आहे?",
      "सांख्यिकीय विसंगती शोधा",
      "सर्वाधिक प्रमाण दाखवा",
      "डेटा एक्सप्लोरर उघडा",
    ],
  };

  const defaultQuestions = defaultQuestionsByLang[currentLang] || defaultQuestionsByLang.en;
  const queryPills = suggestedQuestions.length > 0 ? suggestedQuestions.slice(0, 5) : defaultQuestions;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || loading || !datasetId) return;

    const userMsg: CopilotMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await dashboardApi.askData(
        datasetId,
        textToSend,
        activeFilters,
        currentContext,
        currentLang
      );

      const aiMsg: CopilotMessage = {
        id: `ai_${Date.now()}`,
        sender: "copilot",
        text: res.answer || (currentLang === 'hi' ? "डेटासेट मेट्रिक्स का सफलतापूर्वक विश्लेषण किया गया।" : currentLang === 'mr' ? "डेटासेट मेट्रिक्सचे यशस्वीपणे विश्लेषण केले." : "Analyzed dataset metrics successfully."),
        supportingMetric: res.supporting_metric,
        action: res.action,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Copilot query failed:", err);
      const errorMsg: CopilotMessage = {
        id: `err_${Date.now()}`,
        sender: "copilot",
        text: currentLang === 'hi'
          ? "विश्लेषणात्मक उत्तर प्राप्त करने में असमर्थ। कृपया सुनिश्चित करें कि बैकएंड सर्वर सक्रिय है।"
          : currentLang === 'mr'
          ? "विश्लेषणात्मक उत्तर मिळवता आले नाही. कृपया बॅकएंड सर्व्हर चालू असल्याची खात्री करा."
          : "Could not retrieve analytical answer. Please ensure the backend server is running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = (action: CopilotAction) => {
    if (!action) return;

    if (action.type === "navigate" && onNavigateTab) {
      onNavigateTab(action.target);
    } else if (action.type === "view_chart" && onViewChart) {
      onViewChart(action.target);
    } else if (action.type === "apply_filter" && onApplyFilter) {
      if (typeof action.target === "object" && action.target.column) {
        onApplyFilter(action.target.column, action.target.value);
      }
    } else if (action.type === "clear_filter" && onClearFilter) {
      onClearFilter(action.target === "all" ? undefined : action.target);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl hover:shadow-indigo-500/20 hover:scale-105 transition-all cursor-pointer border border-slate-700/60 group"
          aria-label="Open AI Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-black tracking-wide pr-0.5">{t('askAi', currentLang)}</span>
          {activeFilterCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Drawer / Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-[420px] max-w-[92vw] h-[580px] max-h-[82vh] bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Panel Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/80 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white tracking-wide truncate">
                    {t('copilotTitle', currentLang)}
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} ${currentLang === 'hi' ? 'फ़िल्टर सक्रिय' : currentLang === 'mr' ? 'फिल्टर्स सक्रिय' : 'filters active'}`
                    : (currentLang === 'hi' ? 'संपूर्ण डेटासेट संदर्भ' : currentLang === 'mr' ? 'संपूर्ण डेटासेट संदर्भ' : 'Full Dataset Context')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: "cleared",
                      sender: "copilot",
                      text: "Chat cleared. Ask anything about your dataset, statistics, or metrics.",
                      timestamp: new Date(),
                    },
                  ])
                }
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Copilot"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner: Active Filters or Chart Focus */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <Filter className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="truncate">
                {activeFilterCount > 0
                  ? `Filtering applied: Respecting current slicers`
                  : `Context: Active across entire dashboard`}
              </span>
            </div>
            {currentContext?.currentChartTitle && (
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]">
                {currentContext.currentChartTitle}
              </span>
            )}
          </div>

          {/* Suggested Questions Carousel/Chips */}
          <div className="px-4 py-2 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {queryPills.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="whitespace-nowrap text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2.5 py-1 rounded-full transition shrink-0 cursor-pointer border border-slate-200/60"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "copilot" && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3 ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white rounded-br-xs"
                      : "bg-slate-100/90 text-slate-800 rounded-bl-xs border border-slate-200/60"
                  }`}
                >
                  <p className="leading-relaxed font-medium">{msg.text}</p>

                  {/* Supporting metric pill */}
                  {msg.supportingMetric && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Indicator:</span>
                      <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {msg.supportingMetric}
                      </span>
                    </div>
                  )}

                  {/* Executable Action Button */}
                  {msg.action && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                      <button
                        onClick={() => handleExecuteAction(msg.action!)}
                        className="w-full py-1.5 px-3 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-[11px] rounded-xl border border-indigo-200 shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{msg.action.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-200" />
                <span className="font-medium text-[11px] ml-1">{t('thinking', currentLang)}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('copilotInputPlaceholder', currentLang)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-slate-900 hover:bg-indigo-950 text-white rounded-xl transition disabled:opacity-40 cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
