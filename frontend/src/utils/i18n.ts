// Multi-language Translation Engine for InsightAI (English, Hindi, Marathi)

export type Language = 'en' | 'hi' | 'mr';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
];

export const translations = {
  en: {
    // Navigation
    navDashboard: 'Dashboard Engine',
    navInsights: 'AI Insights',
    navExplorer: 'Data Explorer',
    navQuality: 'Quality & Cleaning',
    navWhatIf: 'What-If Simulation',
    navClusters: 'Segmentation & Clusters',
    
    // Header
    confidence: 'Deterministic ML Confidence',
    exportPdf: 'Export PDF',
    aiReport: 'AI Report',
    regenerate: 'Regenerate',
    logout: 'Logout',
    selectDataset: 'Select Dataset',
    addDataset: '+ Add Dataset',
    datasetsCount: 'Datasets',
    activeDataset: 'Active Dataset',
    
    // Main Dashboard
    heroTrend: 'Hero Trend',
    performanceTrajectory: 'Performance Trajectory',
    interactiveSlicers: 'Interactive Data Slicers',
    activeSlicers: 'Active Slicers',
    allRecords: 'Showing All Records',
    clearAllFilters: 'Clear All Filters',
    multiDimensionalBreakdowns: 'Multi-Dimensional Breakdowns',
    complementaryViews: 'complementary views',
    noDataMatch: 'No Data Available for Selected Filters',
    noDataDesc: 'No records match the current slicer criteria. Adjust your filter values or clear filters to view all dataset insights.',
    time12m: '12M',
    time30d: '30D',
    time7d: '7D',
    time24h: '24H',
    aiAutonomous: 'AI Autonomous',
    realTimePipeline: 'Real-Time ML Pipeline',
    verifiedActive: 'Verified Active',
    audit: 'Audit',
    
    // AI Insights (Dedicated Tab)
    aiInsightsTitle: 'AI Insights & Strategic Synthesis',
    aiInsightsSubtitle: 'Prioritized, data-driven observations categorized by operational relevance and business impact.',
    patternsFound: 'Patterns Found',
    coreStrategicTakeaways: 'Core Strategic Takeaways',
    viewDetails: 'View Details',
    viewAllInsights: 'View All Insights',
    searchInsights: 'Search findings by keyword, column, or metric...',
    allFindings: 'All Findings',
    criticalPriority: 'HIGH PRIORITY',
    importantPriority: 'IMPORTANT',
    informationalPriority: 'KEY FINDING',
    whyItMatters: 'Why it matters',
    recommendedAction: 'Recommended action',
    keyMetric: 'Key Metric',
    
    // AI Copilot
    askAi: 'Ask AI',
    copilotTitle: 'Autonomous AI Copilot',
    copilotSubtitle: 'Dataset-grounded analytical intelligence',
    copilotInputPlaceholder: 'Type a question or action in English, Hindi, or Marathi...',
    send: 'Send',
    starterQuestions: 'Dataset-Grounded Starter Questions',
    thinking: 'Synthesizing verified dataset metrics...',
    activeFiltersContext: 'Active Filters Context Applied',
    
    // Upload & Large Files
    uploadTitle: 'Turn Raw Data Into Intelligent Dashboards, Automatically',
    uploadSubtitle: 'Upload any CSV or Excel file up to 1 GB. Our ML pipeline profiles your data, detects patterns and anomalies, and builds a fully interactive dashboard.',
    uploadAnyDataset: 'Upload Any Dataset',
    uploadingFile: 'Uploading...',
    processingDataset: 'Processing dataset...',
    analyzingDataset: 'Analyzing dataset...',
    readyStatus: 'Ready',
    fileSizeError: 'File exceeds maximum limit of 1 GB (1024 MB).',
    testWithBenchmark: 'Or test with benchmark data',
    benchmarkSales: 'Sales & Revenue',
    benchmarkMarketing: 'Marketing & Ad Spend',
    benchmarkHealthcare: 'Healthcare & Operations',
  },

  hi: {
    // Navigation
    navDashboard: 'डैशबोर्ड इंजन',
    navInsights: 'एआई अंतर्दृष्टि',
    navExplorer: 'डेटा एक्सप्लोरर',
    navQuality: 'डेटा गुणवत्ता व सफाई',
    navWhatIf: 'व्हॉट-इफ सिमुलेशन',
    navClusters: 'क्लस्टर्स व विभाजन',
    
    // Header
    confidence: 'सत्यापित एमएल सटीकता',
    exportPdf: 'पीडीएफ निर्यात',
    aiReport: 'एआई रिपोर्ट',
    regenerate: 'पुनः उत्पन्न करें',
    logout: 'लॉगआउट',
    selectDataset: 'डेटासेट चुनें',
    addDataset: '+ नया डेटासेट जोड़ें',
    datasetsCount: 'डेटासेट्स',
    activeDataset: 'सक्रिय डेटासेट',
    
    // Main Dashboard
    heroTrend: 'प्रमुख रुझान',
    performanceTrajectory: 'प्रदर्शन प्रक्षेपवक्र (Trajectory)',
    interactiveSlicers: 'इंटरएक्टिव डेटा स्लाइसर्स',
    activeSlicers: 'सक्रिय फ़िल्टर',
    allRecords: 'सभी रिकॉर्ड प्रदर्शित',
    clearAllFilters: 'सभी फ़िल्टर साफ़ करें',
    multiDimensionalBreakdowns: 'बहु-आयामी विश्लेषण व चार्ट',
    complementaryViews: 'पूरक चार्ट दृश्य',
    noDataMatch: 'चयनित फ़िल्टर के लिए कोई डेटा उपलब्ध नहीं',
    noDataDesc: 'वर्तमान स्लाइसर मानदंडों से कोई रिकॉर्ड मेल नहीं खाता। सभी अंतर्दृष्टि देखने के लिए फ़िल्टर बदलें या साफ़ करें।',
    time12m: '12 माह',
    time30d: '30 दिन',
    time7d: '7 दिन',
    time24h: '24 घंटे',
    aiAutonomous: 'एआई स्वायत्त',
    realTimePipeline: 'रीयल-टाइम एमएल पाइपलाइन',
    verifiedActive: 'सत्यापित सक्रिय',
    audit: 'ऑडिट',
    
    // AI Insights (Dedicated Tab)
    aiInsightsTitle: 'एआई अंतर्दृष्टि और रणनीतिक संश्लेषण',
    aiInsightsSubtitle: 'व्यावसायिक प्रभाव और परिचालन प्रासंगिकता के आधार पर प्राथमिकता-प्राप्त डेटा निष्कर्ष।',
    patternsFound: 'पैटर्न पाए गए',
    coreStrategicTakeaways: 'मुख्य रणनीतिक परिणाम',
    viewDetails: 'विवरण देखें',
    viewAllInsights: 'सभी अंतर्दृष्टि देखें',
    searchInsights: 'कीवर्ड, कॉलम या मीट्रिक द्वारा खोजें...',
    allFindings: 'सभी निष्कर्ष',
    criticalPriority: 'उच्च प्राथमिकता',
    importantPriority: 'महत्वपूर्ण',
    informationalPriority: 'मुख्य खोज',
    whyItMatters: 'यह क्यों महत्वपूर्ण है',
    recommendedAction: 'अनुशंसित कार्रवाई',
    keyMetric: 'प्रमुख मीट्रिक',
    
    // AI Copilot
    askAi: 'एआई से पूछें',
    copilotTitle: 'स्वायत्त एआई कोपायलट',
    copilotSubtitle: 'डेटासेट-आधारित विश्लेषणात्मक बुद्धिमत्ता',
    copilotInputPlaceholder: 'अंग्रेजी, हिंदी या मराठी में प्रश्न पूछें...',
    send: 'भेजें',
    starterQuestions: 'डेटासेट पर आधारित सुझाए गए प्रश्न',
    thinking: 'सत्यापित डेटासेट मेट्रिक्स का विश्लेषण जारी...',
    activeFiltersContext: 'सक्रिय फ़िल्टर संदर्भ लागू',
    
    // Upload & Large Files
    uploadTitle: 'कच्चे डेटा को तुरंत बनाएं इंटेलिजेंट डैशबोर्ड',
    uploadSubtitle: '1 GB तक की कोई भी CSV या Excel फ़ाइल अपलोड करें। हमारा ML पाइपलाइन डेटा को प्रोसेस कर इंटरएक्टिव डैशबोर्ड तैयार करता है।',
    uploadAnyDataset: 'डेटासेट अपलोड करें',
    uploadingFile: 'अपलोड हो रहा है...',
    processingDataset: 'डेटा प्रोसेस हो रहा है...',
    analyzingDataset: 'डेटासेट का विश्लेषण हो रहा है...',
    readyStatus: 'तैयार',
    fileSizeError: 'फ़ाइल का आकार 1 GB (1024 MB) की अधिकतम सीमा से अधिक है।',
    testWithBenchmark: 'या बेंचमार्क डेटा के साथ परीक्षण करें',
    benchmarkSales: 'बिक्री व राजस्व',
    benchmarkMarketing: 'मार्केटिंग व विज्ञापन',
    benchmarkHealthcare: 'स्वास्थ्य सेवा व संचालन',
  },

  mr: {
    // Navigation
    navDashboard: 'डॅशबोर्ड इंजिन',
    navInsights: 'एआय अंतर्दृष्टी',
    navExplorer: 'डेटा एक्सप्लोरर',
    navQuality: 'डेटा गुणवत्ता व स्वच्छता',
    navWhatIf: 'व्हॉट-इफ सिम्युलेशन',
    navClusters: 'क्लस्टर्स व विभाजन',
    
    // Header
    confidence: 'सत्यापित एमएल अचूकता',
    exportPdf: 'पीडीएफ निर्यात',
    aiReport: 'एआय अहवाल',
    regenerate: 'पुन्हा व्युत्पन्न करा',
    logout: 'लॉगआउट',
    selectDataset: 'डेटासेट निवडा',
    addDataset: '+ नवीन डेटासेट जोडा',
    datasetsCount: 'डेटासेट्स',
    activeDataset: 'सक्रिय डेटासेट',
    
    // Main Dashboard
    heroTrend: 'प्रमुख कल (Trend)',
    performanceTrajectory: 'कामगिरीचा आलेख (Trajectory)',
    interactiveSlicers: 'परस्परसंवादी डेटा स्लाइसर्स',
    activeSlicers: 'सक्रिय फिल्टर्स',
    allRecords: 'सर्व नोंदी दाखवत आहे',
    clearAllFilters: 'सर्व फिल्टर्स साफ करा',
    multiDimensionalBreakdowns: 'बहु-आयामी विश्लेषण व दृश्ये',
    complementaryViews: 'पूरक तक्ते',
    noDataMatch: 'निवडलेल्या फिल्टर्ससाठी डेटा उपलब्ध नाही',
    noDataDesc: 'सध्याच्या निकषांनुसार कोणतीही नोंद आढळली नाही. डेटा पाहण्यासाठी फिल्टर्स बदला किंवा साफ करा.',
    time12m: '12 महिने',
    time30d: '30 दिवस',
    time7d: '7 दिवस',
    time24h: '24 तास',
    aiAutonomous: 'एआय स्वायत्त',
    realTimePipeline: 'रिअल-टाइम एमएल पाइपलाइन',
    verifiedActive: 'सत्यापित सक्रिय',
    audit: 'ऑडिट',
    
    // AI Insights (Dedicated Tab)
    aiInsightsTitle: 'एआय अंतर्दृष्टी आणि धोरणात्मक निष्कर्ष',
    aiInsightsSubtitle: 'व्यावसायिक प्रभाव आणि व्यवस्थापकीय महत्त्वांनुसार वर्गीकृत केलेली निरीक्षणे.',
    patternsFound: 'पॅटर्न आढळले',
    coreStrategicTakeaways: 'मुख्य धोरणात्मक निष्कर्ष',
    viewDetails: 'तपशील पहा',
    viewAllInsights: 'सर्व अंतर्दृष्टी पहा',
    searchInsights: 'शब्द, स्तंभ किंवा मूल्याद्वारे शोधा...',
    allFindings: 'सर्व निष्कर्ष',
    criticalPriority: 'उच्च प्राथमिकता',
    importantPriority: 'महत्त्वाचे',
    informationalPriority: 'मुख्य शोध',
    whyItMatters: 'हे महत्त्वाचे का आहे',
    recommendedAction: 'शिफारस केलेली कृती',
    keyMetric: 'प्रमुख मूल्य',
    
    // AI Copilot
    askAi: 'एआयला विचारा',
    copilotTitle: 'स्वायत्त एआय सहपायलट',
    copilotSubtitle: 'डेटासेट-आधारित विश्लेषणात्मक बुद्धिमत्ता',
    copilotInputPlaceholder: 'इंग्रजी, हिंदी किंवा मराठीत प्रश्न विचारा...',
    send: 'पाठवा',
    starterQuestions: 'डेटासेटवर आधारित सुचवलेले प्रश्न',
    thinking: 'सत्यापित मेट्रिक्सचे विश्लेषण सुरू आहे...',
    activeFiltersContext: 'सक्रिय फिल्टर्स लागू केले आहेत',
    
    // Upload & Large Files
    uploadTitle: 'कच्च्या डेटाचे त्वरित रूपांतर करा इंटेलिजेंट डॅशबोर्डमध्ये',
    uploadSubtitle: '1 GB पर्यंत कोणतीही CSV किंवा Excel फाईल अपलोड करा. आमचे ML इंजिन पॅटर्न ओळखून थेट डॅशबोर्ड तयार करते.',
    uploadAnyDataset: 'डेटासेट अपलोड करा',
    uploadingFile: 'अपलोड होत आहे...',
    processingDataset: 'डेटा प्रक्रिया सुरू आहे...',
    analyzingDataset: 'डेटासेटचे विश्लेषण सुरू आहे...',
    readyStatus: 'तयार',
    fileSizeError: 'फाईलचा आकार 1 GB (1024 MB) च्या कमाल मर्यादेपेक्षा जास्त आहे.',
    testWithBenchmark: 'किंवा चाचणी डेटासेटसह तपासा',
    benchmarkSales: 'विक्री व महसूल',
    benchmarkMarketing: 'मार्केटिंग व जाहिरात',
    benchmarkHealthcare: 'आरोग्यसेवा व ऑपरेशन्स',
  },
};

const LANGUAGE_KEY = 'insightai_language';

export function getStoredLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'hi' || stored === 'mr' || stored === 'en') {
    return stored;
  }
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  localStorage.setItem(LANGUAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('language_change', { detail: lang }));
}

export function t(key: keyof typeof translations['en'], lang: Language = 'en'): string {
  const dict = translations[lang] || translations['en'];
  return dict[key] || translations['en'][key] || key;
}
