
import React, { useState, useCallback, useEffect } from 'react';
import { AutomationStatus, Opportunity, LogEntry, MarketCategory, OpportunityType } from './types';
import { findOpportunities, GeminiError } from './services/geminiService';
import { exportToPDF, exportToDOCX } from './services/exportService';
import { StatCard } from './components/StatCard';
import { OpportunityCard } from './components/OpportunityCard';

const CATEGORIES: MarketCategory[] = [
  'Local Listings',
  'Crypto', 
  'Stocks', 
  'Precious Metals',
  'Creative Schemes',
  'Retail Arbitrage',
  'Thrift/Resale', 
  'Liquidation'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [status, setStatus] = useState<AutomationStatus>(AutomationStatus.IDLE);
  const [activeTab, setActiveTab] = useState<OpportunityType>('IMMEDIATE_FLIP');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    // Check for environment variable key first
    // We check both VITE_ prefixed (standard) and process.env (defined in vite.config)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (envKey) {
      setApiKey(envKey);
      setIsAuthorized(true);
      return;
    }

    // Fallback to stored user key
    const storedKey = sessionStorage.getItem('userApiKey');
    if (storedKey) {
      setApiKey(storedKey);
      setIsAuthorized(true);
    }
  }, []);

  const handleKeySubmit = () => {
    if (!apiKeyInput.trim()) {
      alert("Please enter a valid API Key.");
      return;
    }
    sessionStorage.setItem('userApiKey', apiKeyInput);
    setApiKey(apiKeyInput);
    setIsAuthorized(true);
    setApiKeyInput('');
  };

  const handleKeySwitch = () => {
    // If using env key, do not allow switching/logging out via this method
    // unless we want to allow overriding.
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (envKey) {
       addLog("Cannot switch API key: Using system-configured key.", 'warning');
       return;
    }

    sessionStorage.removeItem('userApiKey');
    setApiKey('');
    setIsAuthorized(false);
  };

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  const getCoordinates = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const handleGeminiError = (err: any, category: string) => {
    if (err instanceof GeminiError) {
      switch (err.status) {
        case 429:
          addLog(`[Quota] ${category}: Your API key has exceeded its usage limit.`, 'warning');
          break;
        case 401:
        case 403:
          addLog(`[Auth] ${category}: Invalid API Key or Permissions.`, 'error');
          // Only force logout if NOT using an environment key
          const envKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
          if (!envKey) {
             handleKeySwitch();
          } else {
             addLog(`[System] The configured API Key is being rejected. Check Vercel settings.`, 'error');
          }
          break;
        case 500:
        case 503:
          addLog(`[Server] ${category}: Google AI servers are overloaded.`, 'warning');
          break;
        default:
          addLog(`[API Error ${err.status}] ${category}: ${err.message}`, 'error');
      }
    } else if (!navigator.onLine) {
      addLog(`[Network] ${category}: No internet connection.`, 'error');
    } else {
      addLog(`[Critical] ${category}: Unexpected error during analysis.`, 'error');
    }
  };

  const runAutomation = async () => {
    if (status === AutomationStatus.PROCESSING) return;

    setStatus(AutomationStatus.TRIGGERED);
    addLog('PRO Engine initializing cross-market discovery...', 'info');
    setOpportunities([]); 
    
    let locationStr = '';
    try {
      addLog('Requesting geolocation for local treasure hunt...', 'info');
      const pos = await getCoordinates();
      locationStr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      setUserLocation(locationStr);
      addLog(`Location lock acquired: ${locationStr}`, 'success');
    } catch (err) {
      addLog('Location denied. Scanning global markets only.', 'warning');
    }

    try {
      setStatus(AutomationStatus.PROCESSING);
      
      for (let i = 0; i < CATEGORIES.length; i++) {
        const cat = CATEGORIES[i];
        setCurrentCategoryIndex(i);
        
        if (i > 0) {
          // Increased delay to 5 seconds to respect free tier rate limits (15 RPM)
          await sleep(5000); 
        }

        addLog(`[Agent] Pro-Scraping ${cat}...`, 'info');
        
        try {
          const results = await findOpportunities(cat, locationStr, apiKey);
          setOpportunities(prev => {
            const combined = [...prev, ...results];
            return combined.sort((a, b) => b.predictedProfitPercent - a.predictedProfitPercent);
          });
          addLog(`[Agent] Found ${results.length} high-conviction links in ${cat}.`, 'success');
        } catch (err: any) {
          handleGeminiError(err, cat);
          if (err instanceof GeminiError && err.status === 429) {
            addLog('Session terminated: Quota exhausted. Try again later.', 'error');
            break; 
          }
        }
      }

      setStatus(AutomationStatus.COMPLETED);
      addLog('Discovery phase complete. PRO signals active.', 'success');
      setCurrentCategoryIndex(-1);
    } catch (error) {
      setStatus(AutomationStatus.ERROR);
      addLog('System failure: Engine encountered an unrecoverable state.', 'error');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-green-500/20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <i className="fas fa-flask text-black text-3xl font-bold"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">CROSSPECTOR<span className="text-green-500">PRO</span></h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Enter your Google AI API Key to unlock the hyper-velocity market scanner.
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API Key..."
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              onClick={handleKeySubmit}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-black font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs"
            >
              Authorize & Begin Scan
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/api-key" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest"
            >
              How to get an API Key <i className="fas fa-external-link-alt ml-1"></i>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filteredOpps = opportunities.filter(o => o.type === activeTab);
  const immediateCount = opportunities.filter(o => o.type === 'IMMEDIATE_FLIP').length;
  const strategicCount = opportunities.filter(o => o.type === 'STRATEGIC_ASSET').length;
  const localCount = opportunities.filter(o => o.type === 'LOCAL_GEM').length;

  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const numericString = price.replace(/[^0-9.-]+/g, "");
    return parseFloat(numericString) || 0;
  };

  const totalPotentialROI = opportunities.reduce((acc, opp) => {
    const buy = parsePrice(opp.buyPrice);
    const sell = parsePrice(opp.sellPrice);
    return acc + (sell - buy);
  }, 0);

  return (
    <div className="min-h-screen pb-20 bg-[#050505]">
      <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]">
            <i className="fas fa-flask text-black font-bold"></i>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">CROSSPECTOR<span className="text-green-500">PRO</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
             <span className="text-[9px] font-black text-green-500 uppercase">Pro Access Active</span>
             <i className="fas fa-shield-check text-green-500 text-[10px]"></i>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
            <i className={`fas fa-circle text-[6px] ${status === AutomationStatus.PROCESSING ? 'text-green-500 animate-pulse' : 'text-gray-600'}`}></i>
            <span>{status}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pro Links" value={opportunities.length} icon="fa-link" color="bg-green-500" />
          <StatCard label="Local Finds" value={localCount} icon="fa-map-marker-alt" color="bg-red-500" />
          <StatCard label="Quick Arbitrage" value={immediateCount} icon="fa-bolt" color="bg-yellow-500" />
          <StatCard label="Total Potential ROI" value={`$${totalPotentialROI.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon="fa-sack-dollar" color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6">Arbitrage Hub</h2>
              <button 
                onClick={runAutomation}
                disabled={status === AutomationStatus.PROCESSING}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-black rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg shadow-green-500/10 active:scale-[0.98]"
              >
                {status === AutomationStatus.PROCESSING ? (
                  <>
                    <i className="fas fa-atom fa-spin"></i>
                    <span>SCANNING (SAFE MODE)...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-search-dollar"></i>
                    <span>SCAN CROSS-MARKET</span>
                  </>
                )}
              </button>
              
              {status === AutomationStatus.PROCESSING && (
                <div className="mt-6">
                  <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 shadow-[0_0_10px_#22c55e] transition-all duration-700" style={{ width: `${((currentCategoryIndex + 1) / CATEGORIES.length) * 100}%` }} />
                  </div>
                  <p className="mt-3 text-[10px] text-gray-400 uppercase text-center font-bold tracking-widest">
                    Analyzing <span className="text-white">{CATEGORIES[currentCategoryIndex]}</span>
                  </p>
                </div>
              )}
              
              <button 
                onClick={handleKeySwitch}
                className="w-full mt-4 py-2 border border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-all rounded-lg text-[9px] uppercase font-black tracking-widest"
              >
                Switch API Key
              </button>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                <button 
                  onClick={() => exportToPDF(opportunities)}
                  disabled={opportunities.length === 0}
                  className="py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <i className="fas fa-file-pdf text-red-500"></i> PDF
                </button>
                <button 
                  onClick={() => exportToDOCX(opportunities)}
                  disabled={opportunities.length === 0}
                  className="py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 font-bold rounded-lg text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <i className="fas fa-file-word text-blue-500"></i> DOCX
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl h-[450px] flex flex-col">
               <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Discovery Stream</h2>
               <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar font-mono text-[10px]">
                 {logs.map((log) => (
                   <div key={log.id} className="flex space-x-2 border-b border-white/5 pb-2">
                     <span className="text-gray-600 shrink-0">{log.timestamp}</span>
                     <span className={log.type === 'success' ? 'text-green-500' : log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-blue-400'}>
                       {log.message}
                     </span>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white/5 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('LOCAL_GEM')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center space-x-2 ${activeTab === 'LOCAL_GEM' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                <i className="fas fa-map-marked-alt"></i>
                <span>Local Gems</span>
                <span className="ml-2 text-[10px] opacity-60">({localCount})</span>
              </button>
              <button 
                onClick={() => setActiveTab('IMMEDIATE_FLIP')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center space-x-2 ${activeTab === 'IMMEDIATE_FLIP' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                <i className="fas fa-bolt"></i>
                <span>Fast Arbitrage</span>
                <span className="ml-2 text-[10px] opacity-60">({immediateCount})</span>
              </button>
              <button 
                onClick={() => setActiveTab('STRATEGIC_ASSET')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center space-x-2 ${activeTab === 'STRATEGIC_ASSET' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'}`}
              >
                <i className="fas fa-gem"></i>
                <span>Macro Assets</span>
                <span className="ml-2 text-[10px] opacity-60">({strategicCount})</span>
              </button>
            </div>

            {filteredOpps.length === 0 ? (
              <div className="glass-panel rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-2 border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                   <i className={`fas ${activeTab === 'LOCAL_GEM' ? 'fa-map-pin' : activeTab === 'IMMEDIATE_FLIP' ? 'fa-bolt' : 'fa-balance-scale'} text-gray-700 text-2xl`}></i>
                </div>
                <div>
                   <h3 className="text-lg font-black text-white uppercase tracking-tighter">No Active Signals</h3>
                   <p className="text-gray-500 text-sm max-w-sm mx-auto mt-2 italic">Run a scan to find real-time spreads in local markets, Crypto, Stocks, and Bullion.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOpps.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/10 py-12 text-center space-y-4">
        <p className="text-gray-600 text-[9px] uppercase tracking-[0.4em] font-black">
          PRO-TIER MARKET SCRAPE // BULLION SPREADS // LOCAL MARKETPLACE GEM ANALYZER
        </p>
        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
          © 2026 <a href="https://mediamultitool.com" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 transition-colors underline decoration-green-500/30 underline-offset-4">Media Multi-Tool</a>
        </p>
        <p className="text-gray-700 text-[9px] max-w-2xl mx-auto mt-4 px-4 leading-relaxed">
          DISCLAIMER: This application is for informational and entertainment purposes only. The data provided does not constitute financial, investment, or legal advice. Market conditions change rapidly; always conduct your own due diligence before making any financial decisions. Crosspector PRO and its creators assume no liability for financial losses.
        </p>
      </footer>
    </div>
  );
};

export default App;
