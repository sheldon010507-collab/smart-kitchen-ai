import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion';
import { COLORS, EASING_MATERIAL } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { PieChart, User, Utensils, ChefHat, Wand2, TrendingUp, BarChart3 } from 'lucide-react';

/**
 * 5. Connected OS — "The Flow" (Updated 5-Step Version)
 * 1. AI Chef (Idea) -> 2. Costing (Validation) -> 3. Staff (Execution) -> 4. Menu (Update) -> 5. Analytics (Insight)
 */

const TOTAL_FRAMES = SEGMENTS.ecosystem.durationFrames;

export const EcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Timings (Divide 55 seconds roughly by 5, ~11s each, but keep it snappy)
  // Frame count references: 30fps * 55s = 1650 frames? No, 60fps * 55s = 3300 frames. 
  // Let's stick to the relative progress for simplicity or define explicit keyframes.
  // Total frames for this scene is roughly 3300.

  const stepDuration = TOTAL_FRAMES / 5;

  const t1 = stepDuration * 1; // Transition to Costing
  const t2 = stepDuration * 2; // Transition to Staff
  const t3 = stepDuration * 3; // Transition to Menu
  const t4 = stepDuration * 4; // Transition to Analytics

  // SCROLL ANIMATION (Accumulated width offset)
  // We have 5 screens total.
  // Screen X positions:
  // 0: Chef
  // 1: Costing
  // 2: Staff
  // 3: Menu
  // 4: Analytics

  const transitions = [t1, t2, t3, t4];
  const scrollProgresses = transitions.map((t) =>
    interpolate(frame, [t, t + 30], [0, 1], { extrapolateRight: 'clamp', easing: EASING_MATERIAL })
  );
  const totalScrollX = -width * scrollProgresses.reduce((sum, p) => sum + p, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.gray[100], overflow: 'hidden' }}>

      {/* CONTAINER for 5 sliding screens */}
      <div style={{
        display: 'flex',
        width: width * 5,
        height: '100%',
        transform: `translateX(${totalScrollX}px)`,
      }}>

        {/* 1. AI CHEF */}
        <StepScreen title="AI Chef Suggestion" icon={ChefHat}>
          <div className="flex flex-col items-center gap-6">
            <div className="text-2xl text-gray-500">Inventory indicates excessive mushrooms.</div>
            <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center gap-6 animate-pulse">
              <Wand2 className="text-blue-500" size={48} />
              <div>
                <div className="text-sm text-blue-400 font-bold uppercase">Suggestion</div>
                <div className="text-3xl font-bold text-gray-900">Truffle Mushroom Soup</div>
              </div>
            </div>
          </div>
        </StepScreen>

        {/* 2. COSTING */}
        <StepScreen title="Real-time Costing" icon={PieChart}>
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 rounded-full border-[32px] border-gray-100" />
              <div className="absolute inset-0 rounded-full border-[32px] border-transparent border-t-green-500 transform -rotate-45" />
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-5xl font-bold text-gray-900">72%</span>
                <span className="text-sm text-gray-500 font-bold uppercase">Profit Margin</span>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold">Approved</span>
            </div>
          </div>
        </StepScreen>

        {/* 3. STAFF */}
        <StepScreen title="Team Schedule" icon={User}>
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">M</div>
              <div className="flex-1">
                <div className="font-bold">Mario</div>
                <div className="text-sm text-gray-500">Head Chef</div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-bold">Assigned: Soup Prep</span>
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-xl shadow-sm opacity-50">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-4 bg-gray-100 rounded" />
                <div className="w-32 h-3 bg-gray-50 rounded" />
              </div>
            </div>
          </div>
        </StepScreen>

        {/* 4. MENU AI */}
        <StepScreen title="Menu Updates" icon={Utensils}>
          <div className="grid grid-cols-2 gap-8 w-full max-w-2xl text-center">
            <div className="p-6 bg-gray-800 text-white rounded-2xl flex flex-col items-center gap-4 shadow-xl">
              <span className="text-sm opacity-50 uppercase tracking-widest">In-Store POS</span>
              <div className="text-xl font-bold border-b border-gray-600 pb-2 mb-2 w-full">Updated</div>
              <div className="text-green-400 font-mono">Truffle Soup $12</div>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-2xl flex flex-col items-center gap-4 shadow-xl">
              <span className="text-sm text-gray-400 uppercase tracking-widest">Online Delivery</span>
              <div className="text-xl font-bold border-b border-gray-100 pb-2 mb-2 w-full text-gray-900">Updated</div>
              <div className="text-green-600 font-mono">Truffle Soup $14</div>
            </div>
          </div>
        </StepScreen>

        {/* 5. ANALYTICS (New) */}
        <StepScreen title="Operational Analysis" icon={TrendingUp}>
          <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
            <h3 className="text-lg font-bold text-gray-500 mb-6 uppercase tracking-wider">Kitchen Efficiency vs. Waste</h3>

            {/* Animated Graph Lines */}
            <div className="relative h-48 w-full border-b border-l border-gray-100">
              <svg className="absolute inset-0 w-full h-full overflow-visible">
                {/* Profit Line (Green) */}
                <path
                  d="M0,150 C50,140 100,100 150,80 C200,60 250,50 300,20"
                  fill="none" stroke="#22c55e" strokeWidth="4"
                  strokeDasharray="1000" strokeDashoffset={interpolate(frame, [t4, t4 + 40], [1000, 0])}
                />
                {/* Waste Line (Red) */}
                <path
                  d="M0,50 C50,60 100,90 150,120 C200,150 250,160 300,180"
                  fill="none" stroke="#ef4444" strokeWidth="4"
                  strokeDasharray="1000" strokeDashoffset={interpolate(frame, [t4, t4 + 40], [1000, 0])}
                />
              </svg>

              {/* Data Points */}
              <div className="absolute right-0 top-0 transform translate-x-1/2 -translate-y-1/2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                +24% Efficiency
              </div>
            </div>

            {/* Scanline Effect over graph */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full animate-pulse opacity-10" />
          </div>
        </StepScreen>

      </div>

      {/* Bottom Text Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 120,
        width: '100%',
        textAlign: 'center',
      }}>
        <h2 className="text-5xl font-medium text-gray-800 tracking-tight">
          {/* Dynamic Text switching based on scroll position */}
          {frame < t1 + 30 ? "It starts with an idea." :
            frame < t2 + 30 ? "Instant Validation." :
              frame < t3 + 30 ? "Team Aligned." :
                frame < t4 + 30 ? "Menu Synced." :
                  "Turn invisible patterns into visible profit."}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

// Helper Component for consistency
const StepScreen: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => {
  const { width } = useVideoConfig();
  return (
    <div style={{ width: width, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-white p-12 rounded-[48px] shadow-2xl w-[900px] h-[700px] flex flex-col items-center gap-12 border-4 border-gray-50">
        <div className="flex items-center gap-6 self-start w-full border-b border-gray-100 pb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
            <Icon size={32} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="flex-1 w-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};
