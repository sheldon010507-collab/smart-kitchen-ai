import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface OperationsProps {
  onBack: () => void;
}

const dataMeat = [{v: 10}, {v: 12}, {v: 11}, {v: 14}, {v: 16}, {v: 15}, {v: 18}];
const dataProduce = [{v: 18}, {v: 17}, {v: 16}, {v: 15}, {v: 14}, {v: 13}, {v: 14}];
const dataDairy = [{v: 10}, {v: 11}, {v: 10}, {v: 12}, {v: 11}, {v: 13}, {v: 14}];
const dataAlcohol = [{v: 10}, {v: 10}, {v: 10}, {v: 10}, {v: 10}, {v: 10}, {v: 10}];
const dataDry = [{v: 10}, {v: 11}, {v: 12}, {v: 13}, {v: 14}, {v: 15}, {v: 16}];

const Sparkline: React.FC<{ data: { v: number }[], color: string }> = ({ data, color }) => (
    <div className="h-8 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export const Operations: React.FC<OperationsProps> = ({ onBack }) => {
  return (
    <div className="bg-[#f6f8f6] text-[#111813] font-display min-h-screen flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-[#f6f8f6]/95 backdrop-blur-sm px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A1A] hover:text-green-600 transition-colors">
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span>Home</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-[#111813]">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#cbfad4] text-[#102216] shadow-sm">
            <span className="material-symbols-outlined text-[32px] font-bold">bar_chart</span>
          </div>
          <div className="flex flex-col items-start text-left">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#111813]">Operations</h1>
            <p className="text-[#61896f] text-sm font-medium mt-0.5">Smart Kitchen AI</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-3">
        <button className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-50 text-gray-500">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-[#61896f] font-medium uppercase tracking-wider mb-0.5">Period</p>
              <p className="text-sm font-bold text-[#111813]">Oct 1 - Oct 7 (Last 7 Days)</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-400">expand_more</span>
        </button>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          <button className="flex shrink-0 items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <span className="text-sm font-medium text-[#111813]">All Departments</span>
            <span className="material-symbols-outlined text-[18px] text-gray-400">expand_more</span>
          </button>
          <button className="flex shrink-0 items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <span className="text-sm font-medium text-[#111813]">Main Kitchen</span>
            <span className="material-symbols-outlined text-[18px] text-gray-400">expand_more</span>
          </button>
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-4 right-4 p-2 bg-[#cbfad4]/30 rounded-lg">
              <span className="material-symbols-outlined text-xl text-[#102216]">inventory_2</span>
            </div>
            <p className="text-xs font-bold text-[#61896f] uppercase tracking-wider z-10 mt-1">Total Inventory</p>
            <div>
              <h3 className="text-[26px] font-bold text-[#111813] tracking-tight">$12,450</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-bold text-[#1fcc6e]">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+2.4% vs last week</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute top-4 right-4 p-2 bg-orange-100 rounded-lg">
              <span className="material-symbols-outlined text-xl text-orange-600">pie_chart</span>
            </div>
            <p className="text-xs font-bold text-[#61896f] uppercase tracking-wider z-10 mt-1">Food Cost %</p>
            <div>
              <h3 className="text-[26px] font-bold text-[#111813] tracking-tight">28.4%</h3>
              <div className="flex items-center gap-1 mt-1 text-xs font-bold text-red-500">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+1.2% over target</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[2rem] border-t border-gray-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-extrabold text-[#111813] tracking-widest uppercase">Performance Insights</h2>
          <span className="bg-[#cbfad4] text-[#102216] px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">3 ALERTS</span>
        </div>

        <div className="grid grid-cols-12 gap-2 mb-4 px-2">
          <div className="col-span-5 text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Category</div>
          <div className="col-span-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Usage Trend</div>
          <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-1">Wastage</div>
        </div>

        <div className="space-y-2">
            <TableRow label="Meat" sub="High value" icon="lunch_dining" iconColor="text-red-500" iconBg="bg-red-50" chartData={dataMeat} chartColor="#1fcc6e" stat="2.1%" statBg="bg-[#cbfad4] text-[#102216]" />
            <TableRow label="Produce" sub="Perishable" icon="grass" iconColor="text-green-600" iconBg="bg-green-50" chartData={dataProduce} chartColor="#e5e7eb" stat="12.4%" statBg="text-red-500" hasDot />
            <TableRow label="Dairy" sub="Daily" icon="egg" iconColor="text-blue-500" iconBg="bg-blue-50" chartData={dataDairy} chartColor="#1fcc6e" stat="4.5%" statBg="text-yellow-600" />
            <TableRow label="Alcohol" sub="Bottle" icon="liquor" iconColor="text-orange-500" iconBg="bg-orange-50" chartData={dataAlcohol} chartColor="#e5e7eb" stat="0.8%" statBg="bg-[#cbfad4] text-[#102216]" />
            <TableRow label="Dry Goods" sub="Bulk" icon="kitchen" iconColor="text-purple-500" iconBg="bg-purple-50" chartData={dataDry} chartColor="#1fcc6e" stat="1.2%" statBg="bg-[#cbfad4] text-[#102216]" />
        </div>

        <div className="mt-8">
          <button className="w-full bg-[#102216] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/5 hover:shadow-green-900/10 active:scale-[0.99] transition-all">
            <span className="material-symbols-outlined">download</span>
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

const TableRow: React.FC<any> = ({ label, sub, icon, iconColor, iconBg, chartData, chartColor, stat, statBg, hasDot }) => (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 hover:bg-gray-50 rounded-xl transition-colors">
    <div className="col-span-5 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-[#111813]">{label}</p>
        <p className="text-[11px] text-gray-400 font-medium">{sub}</p>
      </div>
    </div>
    <div className="col-span-4 flex items-center justify-center h-8">
      <Sparkline data={chartData} color={chartColor} />
    </div>
    <div className={`col-span-3 text-right flex items-center justify-end ${typeof statBg === 'string' && statBg.includes('bg') ? '' : 'pr-1'}`}>
      <span className={`inline-flex items-center justify-center gap-1.5 text-sm font-bold ${statBg} ${typeof statBg === 'string' && statBg.includes('bg') ? 'px-2.5 py-1 rounded-lg' : ''}`}>
        {stat}
        {hasDot && <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>}
      </span>
    </div>
  </div>
);
