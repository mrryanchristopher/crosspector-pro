
import React from 'react';
import { Opportunity } from '../types';

interface ShareMenuProps {
  opportunity: Opportunity;
  onClose: () => void;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({ opportunity, onClose }) => {
  const shareUrl = opportunity.sourceUrl;
  const shareText = `Check out this ${opportunity.name} opportunity on Crosspector PRO! Buy: ${opportunity.buyPrice}, Sell: ${opportunity.sellPrice}. ROI: ${opportunity.predictedProfitPercent}%`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert('Details copied to clipboard!');
    } catch (err) {
      // Fallback for older WebViews
      const textArea = document.createElement("textarea");
      textArea.value = `${shareText} ${shareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Details copied to clipboard!');
      } catch (e) {
        alert('Unable to copy to clipboard. Please manually copy the link.');
      }
      document.body.removeChild(textArea);
    }
  };

  const shareLinks = [
    {
      name: 'X (Twitter)',
      icon: 'fa-x-twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-black text-white border-gray-800'
    },
    {
      name: 'Facebook',
      icon: 'fa-facebook-f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'bg-[#1877F2] text-white border-[#1877F2]'
    },
    {
      name: 'LinkedIn',
      icon: 'fa-linkedin-in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-[#0A66C2] text-white border-[#0A66C2]'
    },
    {
      name: 'Nextdoor',
      icon: 'fa-home', // Nextdoor doesn't have a standard FA icon, using home
      url: `https://nextdoor.com/share/`, // Generic share, better to copy
      color: 'bg-[#00B246] text-white border-[#00B246]',
      action: handleCopy
    },
    {
      name: 'Instagram',
      icon: 'fa-instagram',
      url: `https://instagram.com`, // Generic link, copy first
      color: 'bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#cc2366] text-white border-transparent',
      action: handleCopy
    }
  ];

  return (
    <div className="absolute right-0 top-10 z-50 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-1 px-2 py-1">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Share via</div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="space-y-1">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.action ? '#' : link.url}
            onClick={(e) => {
              if (link.action) {
                e.preventDefault();
                link.action();
                if (link.url !== '#') window.open(link.url, '_blank');
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 ${link.color}`}
          >
            <i className={`fab ${link.icon} w-4 text-center`}></i>
            <span>{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
