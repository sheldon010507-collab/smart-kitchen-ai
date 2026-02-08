import React, { useState, useRef, useEffect } from 'react';
import { generateChefResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

interface AIChefProps {
  onBack: () => void;
}

export const AIChef: React.FC<AIChefProps> = ({ onBack }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiText = await generateChefResponse(userMsg.text);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="bg-[#f6f8f6] text-[#111813] font-display min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#f6f8f6] sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-2 cursor-pointer text-[#1A1A1A] hover:text-[#13ec5b] transition-colors">
          <span className="material-symbols-outlined" style={{fontSize: '24px'}}>home</span>
          <span className="text-base font-medium leading-none">Home</span>
        </button>
        <div className="w-8"></div>
      </header>

      {/* Main Content Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar pb-4 flex flex-col">
        {/* Intro / Default State */}
        {messages.length === 0 && (
          <>
            <div className="flex items-center gap-4 px-4 py-4 mb-2">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d1fadf] shadow-sm border border-[#a8f0c2]/30">
                  <span className="material-symbols-outlined text-3xl text-[#111813]">cookie</span>
                </div>
                <div className="absolute -right-1 -top-1 rounded-full bg-[#13ec5b] p-1 border-2 border-[#f6f8f6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-white">auto_awesome</span>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl font-bold leading-tight tracking-[-0.015em] text-[#111813]">AI Chef</h1>
                <p className="text-sm font-medium text-gray-500">Smart Kitchen AI</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 mb-6">
              <ActionCard icon="restaurant_menu" label="Generate Menu" imgUrl="https://picsum.photos/300/169?random=1" />
              <ActionCard icon="inventory_2" label="Stock Audit" imgUrl="https://picsum.photos/300/169?random=2" />
            </div>

            <div className="flex flex-col gap-6 px-4">
              <div className="flex justify-center">
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Today, 10:23 AM</span>
              </div>
              
              {/* Initial Suggestion Bubble */}
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[#d1fadf]/30 border border-[#a8f0c2] flex items-center justify-center overflow-hidden">
                    <span className="material-symbols-outlined text-[#13ec5b] text-xl">smart_toy</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 max-w-[90%]">
                  <span className="text-xs font-semibold text-gray-500 ml-1">AI Chef</span>
                  <div className="p-4 bg-[#d1fadf]/20 rounded-2xl rounded-tl-sm shadow-sm border border-[#a8f0c2]">
                    <p className="text-[15px] leading-relaxed text-[#111813]">
                        Based on your current overstock of <span className="font-semibold text-[#0ea641]">Whole Milk</span> and <span className="font-semibold text-[#0ea641]">Spinach</span>, I recommend making a Creamy Spinach Soup today. This will reduce potential wastage by 15%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chat History */}
        <div className="flex flex-col gap-4 px-4 pt-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="relative shrink-0">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden ${msg.sender === 'ai' ? 'bg-[#d1fadf]/30 border border-[#a8f0c2]' : 'bg-gray-100'}`}>
                  <span className={`material-symbols-outlined text-xl ${msg.sender === 'ai' ? 'text-[#13ec5b]' : 'text-gray-600'}`}>
                    {msg.sender === 'ai' ? 'smart_toy' : 'person'}
                  </span>
                </div>
              </div>
              <div className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs font-semibold text-gray-500 mx-1">{msg.sender === 'ai' ? 'AI Chef' : 'You'}</span>
                <div className={`p-4 rounded-2xl shadow-sm ${msg.sender === 'ai' ? 'bg-[#d1fadf]/20 border border-[#a8f0c2] rounded-tl-sm' : 'bg-white border border-gray-100 rounded-tr-sm'}`}>
                  <p className="text-[15px] leading-relaxed text-[#111813]">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 px-4">
               <div className="h-10 w-10 rounded-full bg-[#d1fadf]/30 border border-[#a8f0c2] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#13ec5b] text-xl animate-pulse">more_horiz</span>
               </div>
            </div>
          )}
        </div>
        <div className="h-4"></div>
      </main>

      {/* Footer / Input */}
      <footer className="bg-[#f6f8f6] w-full shrink-0 flex flex-col gap-3 pb-safe border-t border-transparent z-20">
        <div className="w-full overflow-x-auto no-scrollbar px-4 pt-2">
          <div className="flex gap-2">
            <SuggestionBtn icon="local_dining" label="Suggest Recipes" onClick={() => setInput("Suggest some recipes based on current inventory")} />
            <SuggestionBtn icon="delete_outline" label="Analyze Wastage" onClick={() => setInput("Analyze my current food wastage")} />
            <SuggestionBtn icon="low_priority" label="Check Low Stock" onClick={() => setInput("Which items are running low?")} />
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 pr-1.5 shadow-md border border-[#a8f0c2]/50 ring-1 ring-black/5">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-transparent text-base text-[#111813] placeholder-gray-400 focus:outline-none py-2 outline-none" 
              placeholder="Ask the Chef..." 
              type="text"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex size-10 items-center justify-center rounded-full bg-[#13ec5b] text-white shadow-sm hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined" style={{fontSize: '20px'}}>arrow_upward</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ActionCard: React.FC<{ icon: string; label: string; imgUrl: string }> = ({ icon, label, imgUrl }) => (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-[#13ec5b]/50 transition-colors">
    <div className="w-full aspect-[16/9] rounded-lg bg-cover bg-center relative overflow-hidden group" style={{ backgroundImage: `url('${imgUrl}')` }}>
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-white drop-shadow-md text-2xl">{icon}</span>
      </div>
    </div>
    <p className="text-sm font-semibold text-[#111813] text-center">{label}</p>
  </div>
);

const SuggestionBtn: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#d1fadf]/20 border border-[#a8f0c2] pl-3 pr-3 active:scale-95 transition-transform hover:bg-[#d1fadf]/40">
        <span className="material-symbols-outlined text-base text-[#0ea641]">{icon}</span>
        <p className="text-sm font-medium leading-normal text-[#111813]">{label}</p>
    </button>
);
