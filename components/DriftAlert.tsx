
import React from 'react';
import { Wind, Coffee } from 'lucide-react';

interface DriftAlertProps {
  onStartBreak: () => void;
  onDismiss: () => void;
  darkMode: boolean;
}

const DriftAlert: React.FC<DriftAlertProps> = ({ onStartBreak, onDismiss, darkMode }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-in zoom-in-95 duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
          }`}>
            <Wind size={24} />
          </div>
          
          <div>
            <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              You've been drifting for over 10 minutes.
            </h3>
            <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
               Want to make it an official break?
            </p>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button 
              onClick={onDismiss}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                darkMode ? 'bg-transparent hover:bg-slate-800 text-slate-500' : 'bg-transparent hover:bg-slate-50 text-slate-500'
              }`}
            >
              Dismiss
            </button>
            <button 
              onClick={onStartBreak}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Coffee size={14} />
              Take Break
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriftAlert;
