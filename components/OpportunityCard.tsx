
import React, { useState } from 'react';
import { Opportunity } from '../types';
import { ShareMenu } from './ShareMenu';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isImmediate = opportunity.type === 'IMMEDIATE_FLIP';
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-950/30 border-green-800';
      case 'Medium': return 'text-yellow-400 bg-yellow-950/30 border-yellow-800';
      case 'High': return 'text-red-400 bg-red-950/30 border-red-800';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl transition-all duration-500 group flex flex-col h-full border relative ${isImmediate ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-white/5'} ${isExpanded ? 'ring-1 ring-white/20' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
             <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${isImmediate ? 'bg-green-500 text-black' : 'bg-blue-600 text-white'}`}>
                {opportunity.strategyType}
             </span>
             <span className="text-[10px] text-gray-500 font-mono italic">{opportunity.timeToProfit}</span>
          </div>
          <h3 className="text-lg font-black text-white group-hover:text-green-400 transition-colors leading-tight pr-8">
            {opportunity.name}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 relative">
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskColor(opportunity.riskLevel)}`}>
            {opportunity.riskLevel}
          </div>
          <button 
            onClick={() => setIsShareOpen(!isShareOpen)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <i className="fas fa-share-nodes"></i>
          </button>
          {isShareOpen && <ShareMenu opportunity={opportunity} onClose={() => setIsShareOpen(false)} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-[9px] text-gray-500 mb-0.5 uppercase font-bold">Buy Price</p>
          <p className="text-base font-black text-white truncate">{opportunity.buyPrice}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
          <p className="text-[9px] text-green-500/70 mb-0.5 uppercase font-bold">Sell Price</p>
          <p className="text-base font-black text-green-400">{opportunity.sellPrice}</p>
        </div>
      </div>

      {/* Secret Sauce Section */}
      <div className="mb-4 bg-green-500/5 border border-green-500/10 p-3 rounded-xl">
        <p className="text-[10px] font-black text-green-500 uppercase mb-1.5 flex items-center">
          <i className="fas fa-flask mr-2"></i> Profit Strategy
        </p>
        <p className={`text-xs text-gray-200 leading-relaxed font-medium ${isExpanded ? '' : 'line-clamp-3'}`}>
          {opportunity.secretSauce}
        </p>
      </div>

      <div className="mb-4">
        <p className={`text-[11px] text-gray-400 leading-relaxed italic ${isExpanded ? '' : 'line-clamp-2'}`}>
          {opportunity.trendReasoning}
        </p>
      </div>

      <div className="space-y-3 mt-auto">
        <div className={`bg-black/40 rounded-xl p-3 border border-white/5 transition-all duration-500 ${isExpanded ? 'max-h-[1000px]' : 'max-h-32 overflow-hidden'}`}>
          <div className="flex justify-between items-center mb-2">
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Execution Protocol</p>
             <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className="text-[9px] font-black text-green-500 uppercase hover:underline"
             >
               {isExpanded ? 'Hide Details' : 'Expand Steps'}
             </button>
          </div>
          <ul className="space-y-2">
            {(isExpanded ? opportunity.instructions : opportunity.instructions.slice(0, 2)).map((step, idx) => (
              <li key={idx} className="text-[10px] text-gray-300 flex items-start animate-in fade-in slide-in-from-left-2">
                <span className="mr-2 text-green-500 font-bold shrink-0">{idx + 1}.</span>
                <span className="leading-normal">{step}</span>
              </li>
            ))}
            {!isExpanded && opportunity.instructions.length > 2 && (
              <li className="text-[9px] text-gray-500 italic mt-1">+ {opportunity.instructions.length - 2} more steps...</li>
            )}
          </ul>
        </div>
        
        <a 
          href={opportunity.sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-3 bg-white hover:bg-green-500 hover:text-black text-black text-center font-black rounded-xl transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest shadow-lg active:scale-95"
        >
          <span>Open Direct Listing</span>
          <i className="fas fa-external-link-alt text-[10px]"></i>
        </a>
      </div>
    </div>
  );
};
