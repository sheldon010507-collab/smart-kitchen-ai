import { Package, TrendingDown, ShoppingCart, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  businessData: any;
}

export function Dashboard({ businessData }: DashboardProps) {
  // Mock data
  const stats = [
    { label: 'Total Items', value: '248', icon: Package, color: 'bg-[#37352f]', change: '+12 this week' },
    { label: 'Low Stock', value: '18', icon: AlertTriangle, color: 'bg-[#f2994a]', change: 'Needs attention' },
    { label: 'Shopping List', value: '24', icon: ShoppingCart, color: 'bg-[#27ae60]', change: 'Items to order' },
    { label: 'Wastage This Week', value: '£145', icon: TrendingDown, color: 'bg-[#eb5757]', change: '-8% vs last week' },
  ];

  const recentActivity = [
    { action: 'Scanned receipt', item: 'Tesco delivery', time: '2 hours ago', type: 'scan' },
    { action: 'Low stock alert', item: 'Milk (Whole)', time: '5 hours ago', type: 'alert' },
    { action: 'Wastage recorded', item: 'Lettuce (200g)', time: '1 day ago', type: 'waste' },
    { action: 'Item added', item: 'Organic Eggs (12)', time: '2 days ago', type: 'add' },
  ];

  const lowStockItems = [
    { name: 'Whole Milk', current: 2, par: 12, unit: 'L', location: 'Fridge A' },
    { name: 'All-Purpose Flour', current: 1, par: 5, unit: 'kg', location: 'Dry Storage' },
    { name: 'Tomatoes', current: 0.5, par: 3, unit: 'kg', location: 'Fridge B' },
    { name: 'Coffee Beans', current: 0.3, par: 2, unit: 'kg', location: 'Coffee Station' },
  ];

  return (
    <div className="pb-24 px-4 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#37352f] mb-1">Welcome back!</h1>
        <p className="text-[#787774]">{businessData?.name || 'Your Business'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-[#e9e9e7]">
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#37352f] mb-1">{stat.value}</div>
              <div className="text-xs text-[#787774] mb-1">{stat.label}</div>
              <div className="text-xs text-[#9b9a97]">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e9e9e7] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#37352f]">Low Stock Alerts</h2>
          <span className="text-xs bg-[#ffe5e5] text-[#8b3a3a] px-3 py-1 rounded-md font-medium border border-[#ffc9c9]">
            {lowStockItems.length} items
          </span>
        </div>
        <div className="space-y-3">
          {lowStockItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[#f7f6f3] rounded-lg">
              <div className="flex-1">
                <div className="font-semibold text-[#37352f] mb-1">{item.name}</div>
                <div className="text-xs text-[#787774]">{item.location}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#eb5757]">
                  {item.current} {item.unit}
                </div>
                <div className="text-xs text-[#9b9a97]">PAR: {item.par} {item.unit}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 py-2.5 bg-[#37352f] text-white rounded-lg font-medium hover:bg-[#1f1e1b] transition-colors">
          Generate Shopping List
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e9e9e7]">
        <h2 className="font-bold text-[#37352f] mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 hover:bg-[#f7f6f3] rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                activity.type === 'scan' ? 'bg-[#e3f2fd] text-[#1565c0]' :
                activity.type === 'alert' ? 'bg-[#fff3e0] text-[#9a6324]' :
                activity.type === 'waste' ? 'bg-[#ffe5e5] text-[#8b3a3a]' :
                'bg-[#d3e5d0] text-[#2d5f2e]'
              }`}>
                {activity.type === 'scan' && <Package className="w-4 h-4" />}
                {activity.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                {activity.type === 'waste' && <TrendingDown className="w-4 h-4" />}
                {activity.type === 'add' && <ShoppingCart className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#37352f] text-sm">{activity.action}</div>
                <div className="text-sm text-[#787774]">{activity.item}</div>
              </div>
              <div className="text-xs text-[#9b9a97]">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
