import { useState } from 'react';
import { ChefHat, Coffee, Pizza, Wine, UtensilsCrossed, Fish, Soup } from 'lucide-react';

interface OnboardingProps {
  onComplete: (data: any) => void;
}

const businessTypes = [
  { id: 'cafe', name: 'Café', icon: Coffee, color: 'bg-amber-500' },
  { id: 'bar', name: 'Bar', icon: Wine, color: 'bg-purple-500' },
  { id: 'pizza', name: 'Pizza', icon: Pizza, color: 'bg-red-500' },
  { id: 'italian', name: 'Italian', icon: UtensilsCrossed, color: 'bg-green-500' },
  { id: 'bistro', name: 'Bistro', icon: ChefHat, color: 'bg-blue-500' },
  { id: 'sushi', name: 'Sushi', icon: Fish, color: 'bg-teal-500' },
  { id: 'chinese', name: 'Chinese', icon: Soup, color: 'bg-orange-500' },
];

const businessSizes = [
  { id: 'small', name: 'Small', description: '1-10 seats', employees: '1-3 staff' },
  { id: 'medium', name: 'Medium', description: '11-30 seats', employees: '4-10 staff' },
  { id: 'large', name: 'Large', description: '31+ seats', employees: '11+ staff' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);

  const handleComplete = () => {
    onComplete({
      name: businessName,
      type: selectedType,
      size: selectedSize,
      useTemplate,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#37352f] rounded-xl mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#37352f] mb-2">SmartStock</h1>
          <p className="text-[#787774]">Intelligent Inventory Management for Restaurants</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#37352f]">Step {step} of 4</span>
            <span className="text-sm text-[#9b9a97]">{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-[#e9e9e7] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#37352f] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-[#e9e9e7] p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-[#37352f] mb-2">Welcome! Let's get started</h2>
              <p className="text-[#787774] mb-6">First, what's your business name?</p>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., The Corner Café"
                className="w-full px-4 py-3 border border-[#e9e9e7] rounded-lg focus:border-[#37352f] focus:outline-none text-lg bg-white"
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-[#37352f] mb-2">What type of business?</h2>
              <p className="text-[#787774] mb-6">Select your business category</p>
              <div className="grid grid-cols-2 gap-4">
                {businessTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 border rounded-lg transition-all ${
                        selectedType === type.id
                          ? 'border-[#37352f] bg-[#f7f6f3]'
                          : 'border-[#e9e9e7] hover:border-[#9b9a97]'
                      }`}
                    >
                      <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center mb-3 mx-auto`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-semibold text-[#37352f]">{type.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-[#37352f] mb-2">Business size</h2>
              <p className="text-[#787774] mb-6">Help us customize your experience</p>
              <div className="space-y-3">
                {businessSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`w-full p-5 border rounded-lg transition-all text-left ${
                      selectedSize === size.id
                        ? 'border-[#37352f] bg-[#f7f6f3]'
                        : 'border-[#e9e9e7] hover:border-[#9b9a97]'
                    }`}
                  >
                    <div className="font-semibold text-[#37352f] mb-1">{size.name}</div>
                    <div className="text-sm text-[#787774]">{size.description} • {size.employees}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-[#37352f] mb-2">Industry template</h2>
              <p className="text-[#787774] mb-6">Would you like to use a pre-built inventory template?</p>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setUseTemplate(true)}
                  className={`w-full p-5 border rounded-lg transition-all text-left ${
                    useTemplate
                      ? 'border-[#37352f] bg-[#f7f6f3]'
                      : 'border-[#e9e9e7] hover:border-[#9b9a97]'
                  }`}
                >
                  <div className="font-semibold text-[#37352f] mb-1">Yes, use template</div>
                  <div className="text-sm text-[#787774]">Start with industry-standard items for {selectedType}</div>
                </button>
                
                <button
                  onClick={() => setUseTemplate(false)}
                  className={`w-full p-5 border rounded-lg transition-all text-left ${
                    !useTemplate
                      ? 'border-[#37352f] bg-[#f7f6f3]'
                      : 'border-[#e9e9e7] hover:border-[#9b9a97]'
                  }`}
                >
                  <div className="font-semibold text-[#37352f] mb-1">Start from scratch</div>
                  <div className="text-sm text-[#787774]">Build your own inventory list</div>
                </button>
              </div>

              <div className="bg-[#fff3e0] border border-[#ffe0b2] rounded-lg p-4">
                <p className="text-sm text-[#9a6324]">
                  <span className="font-semibold">Coming Soon:</span> Industry templates will include pre-configured items, categories, and suppliers specific to your business type.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-[#e9e9e7] text-[#37352f] rounded-lg font-medium hover:bg-[#f7f6f3] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < 4) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={
                (step === 1 && !businessName) ||
                (step === 2 && !selectedType) ||
                (step === 3 && !selectedSize)
              }
              className="flex-1 px-6 py-3 bg-[#37352f] text-white rounded-lg font-medium hover:bg-[#1f1e1b] transition-colors disabled:bg-[#e9e9e7] disabled:text-[#9b9a97] disabled:cursor-not-allowed"
            >
              {step === 4 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}