import { useState } from 'react';
import { Camera, FileText, Refrigerator, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export function Scanner() {
  const [scanMode, setScanMode] = useState<'receipt' | 'fridge' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = (mode: 'receipt' | 'fridge') => {
    setScanMode(mode);
    setIsScanning(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false);
      
      // Mock scan results
      if (mode === 'receipt') {
        setScanResult({
          type: 'receipt',
          supplier: 'Tesco',
          date: '2026-01-16',
          items: [
            { name: 'Whole Milk (2L)', quantity: 4, unit: 'bottles', cost: 1.20, location: 'Fridge A' },
            { name: 'Cheddar Cheese (500g)', quantity: 2, unit: 'packs', cost: 4.50, location: 'Fridge A' },
            { name: 'Tomatoes (500g)', quantity: 3, unit: 'packs', cost: 1.80, location: 'Fridge B' },
            { name: 'All-Purpose Flour (1kg)', quantity: 2, unit: 'bags', cost: 0.80, location: 'Dry Storage' },
          ],
          total: 19.80
        });
      } else {
        setScanResult({
          type: 'fridge',
          location: 'Fridge A',
          items: [
            { name: 'Whole Milk', quantity: 2, unit: 'L', confidence: 95 },
            { name: 'Cheddar Cheese', quantity: 1.5, unit: 'kg', confidence: 88 },
            { name: 'Butter', quantity: 0.5, unit: 'kg', confidence: 92 },
            { name: 'Eggs', quantity: 12, unit: 'pcs', confidence: 98 },
          ]
        });
      }
    }, 2000);
  };

  const handleConfirm = () => {
    // In real app, this would update the inventory
    alert('Inventory updated successfully!');
    setScanResult(null);
    setScanMode(null);
  };

  const handleReset = () => {
    setScanResult(null);
    setScanMode(null);
  };

  if (isScanning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#37352f]">
        <div className="text-center">
          <div className="relative w-64 h-64 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#9b9a97] rounded-lg animate-pulse" />
            <div className="absolute inset-4 border-4 border-[#787774] rounded-lg animate-pulse delay-75" />
            <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Scanning...</h2>
          <p className="text-[#9b9a97]">Processing {scanMode === 'receipt' ? 'receipt' : 'image'}</p>
        </div>
      </div>
    );
  }

  if (scanResult) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 text-[#27ae60]" />
            <h1 className="text-2xl font-bold text-[#37352f]">Scan Complete</h1>
          </div>
          <p className="text-[#787774]">
            {scanResult.type === 'receipt' ? 'Review and confirm items' : 'Detected items in location'}
          </p>
        </div>

        {scanResult.type === 'receipt' && (
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e9e9e7] mb-4">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e9e9e7]">
              <div>
                <div className="text-sm text-[#787774]">Supplier</div>
                <div className="font-bold text-[#37352f]">{scanResult.supplier}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#787774]">Date</div>
                <div className="font-bold text-[#37352f]">
                  {new Date(scanResult.date).toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {scanResult.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start justify-between p-3 bg-[#f7f6f3] rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-[#37352f] mb-1">{item.name}</div>
                    <div className="text-sm text-[#787774]">
                      {item.quantity} {item.unit} → {item.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#37352f]">£{item.cost.toFixed(2)}</div>
                    <div className="text-sm text-[#787774]">per item</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#e9e9e7]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#37352f]">Total</span>
                <span className="text-xl font-bold text-[#37352f]">£{scanResult.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {scanResult.type === 'fridge' && (
          <div className="bg-white rounded-lg p-5 shadow-sm border border-[#e9e9e7] mb-4">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#e9e9e7]">
              <Refrigerator className="w-5 h-5 text-[#1565c0]" />
              <span className="font-bold text-[#37352f]">{scanResult.location}</span>
            </div>

            <div className="space-y-3">
              {scanResult.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#f7f6f3] rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-[#37352f] mb-1">{item.name}</div>
                    <div className="text-sm text-[#787774]">
                      Confidence: {item.confidence}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#37352f]">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 border border-[#e9e9e7] text-[#37352f] rounded-lg font-medium hover:bg-[#f7f6f3] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-[#37352f] text-white rounded-lg font-medium hover:bg-[#1f1e1b] transition-colors"
          >
            Confirm & Update
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#37352f] mb-2">Smart Scanner</h1>
        <p className="text-[#787774]">Scan receipts or take photos of your inventory</p>
      </div>

      <div className="space-y-4">
        {/* Receipt Scan */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-[#e9e9e7]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#e3f2fd] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#1565c0]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#37352f] mb-1">Receipt Scan</h3>
              <p className="text-sm text-[#787774] mb-3">
                Scan delivery receipts and invoices to automatically add items to your inventory
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-[#787774]">
                <span className="bg-[#f7f6f3] px-2 py-1 rounded-md border border-[#e9e9e7]">✓ Auto-detect items</span>
                <span className="bg-[#f7f6f3] px-2 py-1 rounded-md border border-[#e9e9e7]">✓ Extract quantities</span>
                <span className="bg-[#f7f6f3] px-2 py-1 rounded-md border border-[#e9e9e7]">✓ Save to location</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleScan('receipt')}
            className="w-full py-3 bg-[#37352f] text-white rounded-lg font-medium hover:bg-[#1f1e1b] transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Scan Receipt
          </button>
        </div>

        {/* Fridge/Shelf Scan */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-[#e9e9e7]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#d3e5d0] rounded-lg flex items-center justify-center flex-shrink-0">
              <Refrigerator className="w-6 h-6 text-[#2d5f2e]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#37352f] mb-1">Fridge / Shelf Scan</h3>
              <p className="text-sm text-[#787774] mb-3">
                Take photos of your fridge or shelves to update inventory by location
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-[#fff3e0] text-[#9a6324] px-2.5 py-1 rounded-md font-medium border border-[#ffe0b2]">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleScan('fridge')}
            className="w-full py-3 bg-[#27ae60] text-white rounded-lg font-medium hover:bg-[#229954] transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Scan Location
          </button>
        </div>

        {/* Manual Upload */}
        <div className="bg-[#f7f6f3] rounded-lg p-6 border border-[#e9e9e7]">
          <div className="text-center">
            <Upload className="w-10 h-10 text-[#9b9a97] mx-auto mb-3" />
            <h3 className="font-semibold text-[#37352f] mb-1">Upload Image</h3>
            <p className="text-sm text-[#787774] mb-3">
              Or upload an existing photo from your device
            </p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="file-upload"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleScan('receipt');
                }
              }}
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-2 bg-white border border-[#e9e9e7] text-[#37352f] rounded-lg font-medium hover:bg-[#f7f6f3] transition-colors cursor-pointer"
            >
              Choose File
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}