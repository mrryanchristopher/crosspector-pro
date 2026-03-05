
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  return (
    <div className="glass-panel p-4 rounded-xl flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} bg-opacity-20`}>
        <i className={`fas ${icon} ${color.replace('bg-', 'text-')}`}></i>
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};
