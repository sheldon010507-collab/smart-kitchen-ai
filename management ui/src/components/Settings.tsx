import { Store, Users, Bell, HelpCircle, LogOut, ChevronRight, Building } from 'lucide-react';

interface SettingsProps {
  businessData: any;
  setBusinessData: (data: any) => void;
}

export function Settings({ businessData, setBusinessData }: SettingsProps) {
  const handleResetOnboarding = () => {
    if (confirm('Are you sure you want to reset? This will clear all data and restart onboarding.')) {
      localStorage.removeItem('businessData');
      window.location.reload();
    }
  };

  const settingsSections = [
    {
      title: 'Business',
      items: [
        { icon: Store, label: 'Business Details', value: businessData?.name, action: () => {} },
        { icon: Building, label: 'Manage Locations', value: '1 location', action: () => {} },
        { icon: Users, label: 'Team & Permissions', value: 'Coming Soon', action: () => {} },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', value: 'Enabled', action: () => {} },
        { icon: HelpCircle, label: 'Help & Support', value: '', action: () => {} },
      ]
    }
  ];

  return (
    <div className="pb-24 px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Business Info Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{businessData?.name || 'Your Business'}</h2>
            <p className="text-blue-100 text-sm capitalize">{businessData?.type || 'Restaurant'} • {businessData?.size || 'Small'}</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg px-3 py-2 text-sm">
          <span className="text-blue-100">Member since:</span>
          <span className="font-semibold ml-2">
            {businessData?.createdAt ? new Date(businessData.createdAt).toLocaleDateString('en-GB') : 'Recently'}
          </span>
        </div>
      </div>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">{section.title}</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  key={itemIndex}
                  onClick={item.action}
                  className={`w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{item.label}</div>
                      {item.value && (
                        <div className="text-sm text-gray-500">{item.value}</div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Danger Zone */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Account</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={handleResetOnboarding}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-red-600">Reset App</div>
                <div className="text-sm text-gray-500">Clear all data and start over</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-sm text-gray-500">
        <p>SmartStock v1.0.0</p>
        <p className="mt-1">© 2026 SmartStock. All rights reserved.</p>
      </div>
    </div>
  );
}
