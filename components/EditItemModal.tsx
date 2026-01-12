import React, { useState, useEffect } from 'react';
import { InventoryItem, Container } from '../types';
import { X, Box } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem, newCategory?: string, newLocation?: string) => void;
  item: InventoryItem | null;
  categories: string[];
  locations: string[];
  containers?: Container[];  // 已註冊的容器列表
}

const DEFAULT_ITEM: Partial<InventoryItem> = {
  name: '',
  quantity: '',
  quantityValue: 1,
  quantityUnit: 'pcs',
  unitCost: 0,
  category: 'Produce',
  location: 'Fridge',
  expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
};


const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'lb', 'oz', 'jar', 'tub', 'container', 'bottle', 'box', 'bag'];

const EditItemModal: React.FC<Props> = ({ isOpen, onClose, onSave, item, categories, locations, containers = [] }) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>(DEFAULT_ITEM);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [totalPrice, setTotalPrice] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData(item);
        setCustomCategory('');
        setCustomLocation('');
        setIsCustomCategory(false);
        setIsCustomLocation(false);
        if (item.unitCost && item.quantityValue) {
          setTotalPrice((item.unitCost * item.quantityValue).toFixed(2));
        } else {
          setTotalPrice('');
        }
      } else {
        setFormData({
          ...DEFAULT_ITEM,
          category: categories[0] || 'Produce',
          location: locations[0] || 'Fridge'
        });
        setTotalPrice('');
      }
    }
  }, [isOpen, item, categories, locations]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category' && value === 'add-new') { setIsCustomCategory(true); return; }
    if (name === 'location' && value === 'add-new') { setIsCustomLocation(true); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numVal = parseFloat(value);
    setFormData(prev => ({ ...prev, [name]: numVal }));
    if (name === 'quantityValue' && totalPrice && numVal > 0) {
      const tp = parseFloat(totalPrice);
      setFormData(prev => ({ ...prev, unitCost: tp / numVal }));
    }
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTotalPrice(val);
    if (val && formData.quantityValue && formData.quantityValue > 0) {
      const cost = parseFloat(val) / formData.quantityValue;
      setFormData(prev => ({ ...prev, unitCost: cost }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategory : formData.category!;
    const finalLocation = isCustomLocation ? customLocation : formData.location!;

    if (formData.name && formData.quantityValue && finalCategory && finalLocation) {
      const displayQuantity = `${formData.quantityValue} ${formData.quantityUnit}`;
      const savedItem: InventoryItem = {
        id: item?.id || Date.now().toString(),
        businessId: item?.businessId || '',
        name: formData.name!,
        quantity: displayQuantity,
        quantityValue: formData.quantityValue,
        quantityUnit: formData.quantityUnit || 'pcs',
        unitCost: formData.unitCost ? Number(formData.unitCost) : 0,
        category: finalCategory,
        location: finalLocation,
        expiryDate: formData.expiryDate!,
        addedDate: item?.addedDate || new Date().toISOString().split('T')[0],
        minStockLevel: formData.minStockLevel || 0,
      };
      onSave(savedItem, isCustomCategory ? customCategory : undefined, isCustomLocation ? customLocation : undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-border overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h3 className="font-bold text-lg text-primary">{item ? 'Edit Item' : 'New Inventory Item'}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Qty</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  name="quantityValue"
                  value={formData.quantityValue}
                  onChange={handleNumericChange}
                  className="w-2/3 px-3 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                  required
                />
                <select
                  name="quantityUnit"
                  value={formData.quantityUnit}
                  onChange={handleChange}
                  className="w-1/3 px-2 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Total Price</label>
              <input
                type="number"
                step="0.01"
                value={totalPrice}
                onChange={handleTotalPriceChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Expiry Date</label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              required
            />
          </div>

          {/* Par Level */}
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
              Par Level
              <span className="font-normal text-gray-400 ml-1">(auto-reorder)</span>
            </label>
            <input
              type="number"
              name="minStockLevel"
              value={formData.minStockLevel || 0}
              onChange={handleNumericChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              min="0"
              step="1"
              placeholder="0 = disabled"
            />
          </div>

          {/* Container Selector */}
          {containers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center">
                <Box className="w-3 h-3 mr-1" />
                Container
                <span className="font-normal text-gray-400 ml-1">(auto-unit)</span>
              </label>
              <select
                name="containerId"
                value={formData.containerId || ''}
                onChange={(e) => {
                  const containerId = e.target.value || undefined;
                  const container = containers.find(c => c.id === containerId);
                  setFormData(prev => ({
                    ...prev,
                    containerId,
                    containerName: container?.name,
                    // Auto-set unit based on container capacity unit
                    quantityUnit: container ? container.capacityUnit.toLowerCase() : prev.quantityUnit,
                  }));
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent"
              >
                <option value="">None (loose item)</option>
                {containers.map(c => (
                  <option key={c.id} value={c.id}>
                    📦 {c.name} ({c.capacityValue} {c.capacityUnit})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Category</label>
              {isCustomCategory ? (
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="New..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                />
              ) : (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="add-new">+ New</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Location</label>
              {isCustomLocation ? (
                <input
                  type="text"
                  value={customLocation}
                  onChange={e => setCustomLocation(e.target.value)}
                  placeholder="New..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                />
              ) : (
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent"
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="add-new">+ New</option>
                </select>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-secondary hover:bg-background rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-bold tracking-wide hover:bg-accentHover transition-colors shadow-sm"
            >
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;