
import React from 'react';
import { InventoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
}

const COLORS = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9'];

const StaffInventoryOverview: React.FC<Props> = ({ inventory }) => {
  // Aggregate data by category
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  }, [inventory]);

  return (
    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-background p-2 rounded-lg border border-border">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-primary leading-none">Inventory Status</h3>
          <p className="text-xs text-secondary mt-1">Stock distribution by category</p>
        </div>
      </div>
      
      <div className="h-40 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={16}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} 
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                itemStyle={{ color: '#111827', fontWeight: 600, fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20} background={{ fill: '#F3F4F6', radius: 4 }}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-secondary text-sm italic">
            No inventory data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffInventoryOverview;
