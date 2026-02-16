import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion';
import { COLORS } from '../lib/constants';
import { SEGMENTS } from '../timeline';
import { Network, ArrowRight } from 'lucide-react';
import { BottomCaption } from '../components/BottomCaption';

/**
 * 4. Neural Link — "The Network"
 * Button Click -> Nodes brighten -> Lines connect -> Order Generated
 */

const TOTAL_FRAMES = SEGMENTS.autoPurchase.durationFrames;

export const AutoPurchaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const startClick = 20;

  // 1. Initial State: Button
  const buttonScale = interpolate(frame, [startClick, startClick + 10], [1, 0.9, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.elastic(1.5),
  });

  // 2. Network Activation
  const netStart = startClick + 15;
  const bgDarken = interpolate(frame, [netStart, netStart + 20], [0, 0.8]);

  // Nodes positions
  const nodes = [
    { x: width * 0.2, y: height * 0.3, label: 'Low Stock' },
    { x: width * 0.8, y: height * 0.3, label: 'Expiring' },
    { x: width * 0.5, y: height * 0.7, label: 'Sales Forecast' },
  ];

  const centerNode = { x: width * 0.5, y: height * 0.4 };

  // 3. Order Card Appearance
  const orderAppear = netStart + 60;
  const orderScale = interpolate(frame, [orderAppear, orderAppear + 20], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>

      {/* Background UI (Blurred) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 opacity-20 filter blur-sm">
        <div className="w-2/3 h-1/2 bg-gray-100 rounded-xl" />
        <div className="w-2/3 h-24 bg-gray-100 rounded-xl" />
      </div>

      {/* Main Action Button */}
      <div style={{
        position: 'relative',
        transform: `scale(${buttonScale})`,
        zIndex: 10,
        marginBottom: 400,
      }}>
        <div className="bg-gray-900 text-white px-12 py-6 rounded-full text-2xl font-semibold shadow-2xl flex items-center gap-4 cursor-pointer">
          <Network />
          <span>Auto Generate Order</span>
        </div>
      </div>

      {/* Neural Network Layer */}
      <AbsoluteFill style={{
        backgroundColor: `rgba(0,0,0,${bgDarken})`,
        pointerEvents: 'none',
      }}>
        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full">
          {nodes.map((node, i) => {
            const lineProgress = interpolate(frame, [netStart + 20 + (i * 10), netStart + 40 + (i * 10)], [0, 1], { extrapolateRight: 'clamp' });
            const x2 = interpolate(lineProgress, [0, 1], [node.x, centerNode.x]);
            const y2 = interpolate(lineProgress, [0, 1], [node.y, centerNode.y]);

            return (
              <line
                key={i}
                x1={node.x} y1={node.y}
                x2={x2} y2={y2}
                stroke={COLORS.googleBlue}
                strokeWidth={2}
                opacity={lineProgress}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const nodeScale = interpolate(frame, [netStart + 10 + (i * 10), netStart + 20 + (i * 10)], [0, 1], { extrapolateRight: 'clamp', easing: Easing.elastic(1) });
          return (
            <div key={i} style={{
              position: 'absolute',
              left: node.x, top: node.y,
              transform: `translate(-50%, -50%) scale(${nodeScale})`,
            }}>
              <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(66,133,244,0.8)]" />
              <span className="absolute top-6 left-1/2 -translate-x-1/2 text-white font-mono text-sm whitespace-nowrap">{node.label}</span>
            </div>
          );
        })}

        {/* PULSE at Center */}
        {frame > netStart + 50 && (
          <div style={{
            position: 'absolute',
            left: centerNode.x, top: centerNode.y,
            transform: 'translate(-50%, -50%)',
          }}>
            <div className="w-8 h-8 bg-white rounded-full animate-ping absolute opacity-50" />
            <div className="w-8 h-8 bg-white rounded-full shadow-[0_0_40px_white]" />
          </div>
        )}

        {/* Result: Purchase Order Card */}
        <div style={{
          position: 'absolute',
          left: centerNode.x,
          top: centerNode.y,
          transform: `translate(-50%, -50%) scale(${orderScale})`,
          zIndex: 20,
        }}>
          <div className="bg-white text-gray-900 rounded-xl p-8 w-[500px] shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-bold">Purchase Order #4402</h3>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Ready</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Coffee Beans (Low Stock)</span>
                <span className="font-mono">5 kg</span>
              </div>
              <div className="flex justify-between">
                <span>Whole Milk (Expiring)</span>
                <span className="font-mono">10 Gal</span>
              </div>
            </div>
            <div className="mt-2 pt-4 border-t flex justify-end">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                Send to Supplier <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* On-screen Text */}
        <BottomCaption text="It knows what you need." fadeInRange={[orderAppear, orderAppear + 20]} color="text-white/90" />

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
