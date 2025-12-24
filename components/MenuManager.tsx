
import React, { useState, useRef } from 'react';
import { MenuItem, InventoryItem } from '../types';
import { analyzeMenuPhoto, fileToGenerativePart } from '../services/geminiService';
import { Plus, Camera, Trash2, Image as ImageIcon, Loader2, Link as LinkIcon, Edit2, X, Save, UploadCloud } from 'lucide-react';

interface Props {
  menu: MenuItem[];
  inventory: InventoryItem[];
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  isStaff?: boolean; 
}

const MenuManager: React.FC<Props> = ({ menu, inventory, onAddMenuItem, onDeleteMenuItem, onUpdateMenuItem, isStaff = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Food');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  
  // BOM Logic
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQty, setIngredientQty] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [currentIngredients, setCurrentIngredients] = useState<{id: string, qty: number, unit: string, cost: number}[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // STAFF EDIT/CREATE STATE
  const [staffEditingItem, setStaffEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [staffEditName, setStaffEditName] = useState('');
  const [staffEditCategory, setStaffEditCategory] = useState('Food');
  const [staffEditPrice, setStaffEditPrice] = useState('');
  const [staffEditImage, setStaffEditImage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const staffImageInputRef = useRef<HTMLInputElement>(null);

  // Group menu items by category
  const groupedMenu = menu.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Order categories for display
  const orderedCategories = ['Starter', 'Main', 'Lunch', 'Dessert', 'Beverage', 'Drink', 'Food', 'Other'];
  const categoriesToDisplay = Array.from(new Set([...orderedCategories, ...Object.keys(groupedMenu)])).filter(c => groupedMenu[c] && groupedMenu[c].length > 0);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isScanning) {
        try {
            const base64 = await fileToGenerativePart(file);
            const items = await analyzeMenuPhoto(base64, file.type);
            items.forEach(item => onAddMenuItem(item));
        } catch (error) {
            console.error(error);
            alert("Failed to analyze menu photo");
        } finally {
            setIsScanning(false);
        }
    } else {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const getCostForUsage = (invItem: InventoryItem, usageQty: number, usageUnit: string): number => {
      const invUnit = (invItem.quantityUnit || 'pcs').toLowerCase();
      const uUnit = usageUnit.toLowerCase();
      const costPerInvUnit = invItem.unitCost || 0;
      let ratio = 0;

      // Simple conversion logic mirroring App.tsx
      if (uUnit === invUnit) ratio = usageQty;
      else if (invUnit === 'kg' && uUnit === 'g') ratio = usageQty / 1000;
      else if (invUnit === 'g' && uUnit === 'kg') ratio = usageQty * 1000;
      else if (invUnit === 'l' && uUnit === 'ml') ratio = usageQty / 1000;
      else if (invUnit === 'ml' && uUnit === 'l') ratio = usageQty * 1000;
      else if (invUnit === 'lb' && uUnit === 'oz') ratio = usageQty / 16;
      else if (invUnit === 'oz' && uUnit === 'lb') ratio = usageQty * 16;
      else ratio = usageQty; 

      return ratio * costPerInvUnit;
  };

  const handleAddIngredient = () => {
    if (selectedIngredient && ingredientQty) {
      const invItem = inventory.find(i => i.id === selectedIngredient);
      if (!invItem) return;

      const qty = parseFloat(ingredientQty);
      const cost = getCostForUsage(invItem, qty, ingredientUnit);

      setCurrentIngredients([...currentIngredients, { 
          id: selectedIngredient, 
          qty, 
          unit: ingredientUnit,
          cost
      }]);
      setSelectedIngredient('');
      setIngredientQty('');
    }
  };

  const totalCost = currentIngredients.reduce((sum, item) => sum + item.cost, 0);

  const handleAddItem = () => {
    if (newItemName && newItemPrice) {
      const newItem: MenuItem = {
        id: Date.now().toString(),
        businessId: '', 
        name: newItemName,
        description: newItemDescription,
        category: newItemCategory,
        sellingPrice: parseFloat(newItemPrice),
        estimatedCost: totalCost > 0 ? totalCost : (parseFloat(newItemPrice) * 0.3),
        imageUrl: newItemImageUrl || uploadedImage || undefined,
        ingredients: currentIngredients.map(i => ({ 
            inventoryItemId: i.id, 
            quantityUsed: i.qty,
            unitUsed: i.unit,
            costSnapshot: i.cost
        }))
      };
      
      onAddMenuItem(newItem);
      
      setNewItemName('');
      setNewItemDescription('');
      setNewItemPrice('');
      setNewItemImageUrl('');
      setCurrentIngredients([]);
      setUploadedImage(null);
    }
  };

  // --- STAFF EDITING HANDLERS ---
  const handleOpenStaffCreate = () => {
    setIsCreating(true);
    setStaffEditingItem({});
    setStaffEditName('');
    setStaffEditCategory('Food');
    setStaffEditPrice('');
    setStaffEditImage('');
  };

  const handleOpenStaffEdit = (item: MenuItem) => {
    setIsCreating(false);
    setStaffEditingItem(item);
    setStaffEditName(item.name);
    setStaffEditCategory(item.category);
    setStaffEditPrice(item.sellingPrice.toString());
    setStaffEditImage(item.imageUrl || '');
  };

  const handleStaffImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStaffEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(staffEditPrice) || 0;

    if (isCreating) {
        // CREATE NEW
        const newItem: MenuItem = {
            id: Date.now().toString(),
            businessId: '', // Set by parent or App.tsx logic
            name: staffEditName,
            category: staffEditCategory,
            sellingPrice: price,
            estimatedCost: price * 0.3, // Rough estimate default
            imageUrl: staffEditImage || undefined,
            description: ''
        };
        onAddMenuItem(newItem);
    } else if (staffEditingItem && staffEditingItem.id) {
        // UPDATE EXISTING
        onUpdateMenuItem({
            ...(staffEditingItem as MenuItem),
            name: staffEditName,
            category: staffEditCategory,
            sellingPrice: price,
            imageUrl: staffEditImage
        });
    }
    setStaffEditingItem(null);
  };

  const handleStaffDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this dish?")) {
      onDeleteMenuItem(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Adaptive for Staff/Manager */}
      {!isStaff ? (
        <div className="bg-background rounded-xl p-8 border border-border flex justify-between items-center">
          <div>
             <h2 className="text-xl font-bold text-primary tracking-tight">Menu Engineering</h2>
             <p className="text-secondary text-sm mt-1">
               Group dishes, build recipes, and track live costs.
             </p>
          </div>
          <button 
            onClick={() => { setIsScanning(true); fileInputRef.current?.click(); }}
            className="bg-white border border-border text-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-background transition-colors flex items-center shadow-sm"
          >
             {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
             Scan Menu Photo
          </button>
          <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handlePhotoUpload}
          />
        </div>
      ) : (
        <div className="flex justify-between items-center pb-2 border-b border-border">
           <h2 className="text-xl font-bold text-primary tracking-tight">Current Menu</h2>
           <button 
              onClick={handleOpenStaffCreate}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center shadow-sm"
           >
              <Plus className="w-4 h-4 mr-2" />
              Add New Dish
           </button>
        </div>
      )}

      <div className={isStaff ? "w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-12"}>
        {/* LEFT: CREATE MENU ITEM FORM - HIDDEN FOR STAFF */}
        {!isStaff && (
        <div className="lg:col-span-1">
           <div className="bg-white rounded-xl p-8 border border-border sticky top-6 shadow-sm">
               <h3 className="font-bold text-lg text-primary mb-6">Create Menu Item</h3>
               
               <div className="space-y-6">
                  {/* Image Upload Area */}
                  <div 
                    onClick={() => { setIsScanning(false); fileInputRef.current?.click(); }}
                    className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-background hover:border-accent transition-all relative overflow-hidden group"
                  >
                     {(newItemImageUrl || uploadedImage) ? (
                        <img src={newItemImageUrl || uploadedImage || ''} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                        <div className="flex flex-col items-center text-secondary">
                           <ImageIcon className="w-8 h-8 mb-3 opacity-50" />
                           <span className="text-xs font-bold uppercase tracking-wide">Upload Dish Photo</span>
                        </div>
                     )}
                  </div>
                  
                  {/* URL fallback */}
                  {!uploadedImage && (
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-secondary" />
                        <input 
                            type="text"
                            placeholder="Or paste image URL"
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                            value={newItemImageUrl}
                            onChange={e => setNewItemImageUrl(e.target.value)}
                        />
                    </div>
                  )}

                  {/* Basic Info */}
                  <div className="space-y-5">
                      <div>
                          <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Item Name</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-5">
                         <div>
                            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Price ($)</label>
                            <input 
                                type="number" 
                                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                                value={newItemPrice}
                                onChange={e => setNewItemPrice(e.target.value)}
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Category</label>
                            <select 
                                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent bg-white"
                                value={newItemCategory}
                                onChange={e => setNewItemCategory(e.target.value)}
                            >
                                <option>Starter</option>
                                <option>Main</option>
                                <option>Lunch</option>
                                <option>Dessert</option>
                                <option>Beverage</option>
                                <option>Drink</option>
                                <option>Other</option>
                            </select>
                         </div>
                      </div>
                  </div>

                  {/* Recipe Costing (BOM) */}
                  <div className="pt-4 border-t border-border">
                     <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 block">Recipe Costing (BOM)</label>
                     <div className="bg-background p-4 rounded-lg space-y-3 border border-border">
                         <div className="flex gap-2">
                            <select 
                                className="w-[45%] text-xs border border-border rounded-md px-2 py-2.5 bg-white focus:outline-none truncate"
                                value={selectedIngredient}
                                onChange={e => setSelectedIngredient(e.target.value)}
                            >
                                <option value="">Ingredient</option>
                                {inventory.map(i => (
                                    <option key={i.id} value={i.id}>
                                        {i.name} (${i.unitCost?.toFixed(2)}/{i.quantityUnit})
                                    </option>
                                ))}
                            </select>
                            <input 
                                type="number" 
                                placeholder="Qty" 
                                className="w-[20%] text-xs border border-border rounded-md px-2 py-2.5 bg-white focus:outline-none"
                                value={ingredientQty}
                                onChange={e => setIngredientQty(e.target.value)}
                            />
                            <select 
                                className="w-[20%] text-xs border border-border rounded-md px-1 py-2.5 bg-white focus:outline-none"
                                value={ingredientUnit}
                                onChange={e => setIngredientUnit(e.target.value)}
                            >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="L">L</option>
                                <option value="pcs">pcs</option>
                                <option value="oz">oz</option>
                                <option value="lb">lb</option>
                            </select>
                            <button onClick={handleAddIngredient} className="w-[15%] flex items-center justify-center bg-white border border-border rounded-md hover:bg-gray-50">
                                <Plus className="w-4 h-4 text-primary" />
                            </button>
                         </div>

                         {/* BOM List */}
                         {currentIngredients.length > 0 && (
                             <div className="space-y-2 pt-2">
                                 {currentIngredients.map((ing, idx) => {
                                     const item = inventory.find(i => i.id === ing.id);
                                     return (
                                         <div key={idx} className="flex justify-between items-center text-xs text-primary py-1 border-b border-border last:border-0">
                                             <span className="font-medium truncate max-w-[120px]">{item?.name} ({ing.qty}{ing.unit})</span>
                                             <div className="flex items-center space-x-2">
                                                <span className="font-mono">${ing.cost.toFixed(2)}</span>
                                                <button onClick={() => setCurrentIngredients(prev => prev.filter((_, i) => i !== idx))} className="text-secondary hover:text-red-600">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                             </div>
                                         </div>
                                     )
                                 })}
                                 <div className="flex justify-between items-center pt-3 text-xs font-bold text-primary border-t border-border">
                                     <span>Total Cost</span>
                                     <span className="font-mono text-sm">${totalCost.toFixed(2)}</span>
                                 </div>
                             </div>
                         )}
                     </div>
                  </div>

                  <button 
                    onClick={handleAddItem}
                    className="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-black transition-colors shadow-sm"
                  >
                     Add Item to Menu
                  </button>
               </div>
           </div>
        </div>
        )}

        {/* RIGHT: MENU GRID */}
        <div className={isStaff ? "w-full space-y-8" : "lg:col-span-2 space-y-10"}>
            {categoriesToDisplay.map(category => (
                <div key={category} className="space-y-4">
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest border-b border-dashed border-border pb-2 flex items-center">
                        {category}
                        <span className="ml-2 bg-gray-100 text-secondary text-[10px] px-1.5 py-0.5 rounded-full border border-border">{groupedMenu[category].length}</span>
                    </h4>
                    
                    {/* RESPONSIVE GRID CONFIGURATION */}
                    <div className={isStaff ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
                        {groupedMenu[category].map(item => {
                            // --- STAFF VIEW: SIMPLIFIED CARD ---
                            if (isStaff) {
                                return (
                                    <div key={item.id} className="bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:border-accent transition-all group relative">
                                        <div className="aspect-[4/3] bg-background relative overflow-hidden">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-border bg-gray-50">
                                                    <ImageIcon className="w-8 h-8 opacity-40" />
                                                </div>
                                            )}
                                            
                                            {/* STAFF ACTIONS: Edit & Delete Overlay */}
                                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleOpenStaffEdit(item); }}
                                                   className="p-1.5 bg-white/90 rounded-md text-primary hover:text-accent shadow-sm backdrop-blur-sm border border-black/5"
                                                   title="Edit Dish"
                                                >
                                                   <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleStaffDelete(item.id); }}
                                                   className="p-1.5 bg-white/90 rounded-md text-red-500 hover:text-red-700 shadow-sm backdrop-blur-sm border border-black/5"
                                                   title="Delete Dish"
                                                >
                                                   <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-primary text-sm leading-tight truncate" title={item.name}>{item.name}</h3>
                                        </div>
                                    </div>
                                );
                            }

                            // --- MANAGER VIEW: FULL CARD ---
                            const margin = item.sellingPrice - item.estimatedCost;
                            const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;
                            
                            return (
                                <div key={item.id} className="bg-white rounded-xl border border-border overflow-hidden hover:border-accent transition-all group flex flex-col shadow-sm">
                                    {/* Image */}
                                    <div className="h-48 bg-background relative overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-border">
                                                <ImageIcon className="w-12 h-12 opacity-50" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button 
                                                className="p-2 bg-white rounded-lg text-primary hover:bg-gray-100 shadow-sm border border-border"
                                                title="Edit"
                                                onClick={() => onUpdateMenuItem(item)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => onDeleteMenuItem(item.id)}
                                                className="p-2 bg-white rounded-lg text-red-600 hover:bg-gray-100 shadow-sm border border-border"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-primary text-lg">{item.name}</h4>
                                            <span className="font-bold text-primary text-lg">${item.sellingPrice.toFixed(2)}</span>
                                        </div>
                                        <p className="text-xs text-secondary font-bold uppercase tracking-wider mb-4">{item.category}</p>

                                        <div className="mt-auto bg-background rounded-lg p-3 border border-border">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-secondary uppercase">Dynamic Cost</span>
                                                <span className="text-sm font-mono font-extrabold text-primary">${item.estimatedCost.toFixed(2)}</span>
                                            </div>
                                            
                                            {/* Progress Bar for Margin */}
                                            <div className="w-full bg-white border border-border rounded-full h-2 mb-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full ${marginPercent < 60 ? 'bg-amber-400' : 'bg-green-500'}`} 
                                                    style={{ width: `${Math.min(Math.max(marginPercent, 0), 100)}%` }}
                                                ></div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-secondary font-medium">Updated live from inventory</span>
                                                <span className={`text-xs font-bold ${marginPercent < 60 ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {marginPercent.toFixed(0)}% Margin
                                                </span>
                                            </div>

                                            {/* Optional Ingredient Breakdown for Transparency */}
                                            {item.ingredients && item.ingredients.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-border/50">
                                                    <p className="text-[10px] text-secondary font-bold uppercase mb-1">Cost Breakdown</p>
                                                    <div className="space-y-1">
                                                        {item.ingredients.slice(0, 3).map((ing, idx) => {
                                                            const invName = inventory.find(i => i.id === ing.inventoryItemId)?.name || 'Unknown';
                                                            return (
                                                                <div key={idx} className="flex justify-between text-[10px] text-secondary">
                                                                    <span className="truncate max-w-[150px]">{invName}</span>
                                                                    <span className="font-mono">${ing.costSnapshot.toFixed(2)}</span>
                                                                </div>
                                                            )
                                                        })}
                                                        {item.ingredients.length > 3 && (
                                                            <div className="text-[10px] text-secondary italic">+ {item.ingredients.length - 3} more</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
            
            {menu.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 bg-background rounded-xl border border-dashed border-border">
                    <div className="mb-4">
                        <ImageIcon className="w-10 h-10 text-border" />
                    </div>
                    <p className="text-base font-medium text-secondary">No menu items added.</p>
                </div>
            )}
        </div>

        {/* STAFF EDIT/CREATE MODAL */}
        {isStaff && staffEditingItem && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-border p-6 relative">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-primary">{isCreating ? 'Create New Dish' : 'Edit Dish Details'}</h3>
                      <button onClick={() => setStaffEditingItem(null)} className="text-secondary hover:text-primary transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveStaffEdit} className="space-y-6">
                      {/* Image Upload Area */}
                      <div className="space-y-2">
                          <div 
                            onClick={() => staffImageInputRef.current?.click()}
                            className={`w-full h-48 rounded-xl border-2 border-dashed ${staffEditImage ? 'border-transparent' : 'border-border'} bg-background hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group`}
                          >
                              {staffEditImage ? (
                                  <>
                                    <img src={staffEditImage} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold text-sm flex items-center"><ImageIcon className="w-4 h-4 mr-2"/> Change Photo</span>
                                    </div>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center text-secondary/60">
                                      <div className="bg-white p-3 rounded-xl shadow-sm border border-border mb-3">
                                        <ImageIcon className="w-6 h-6 text-secondary" />
                                      </div>
                                      <span className="text-xs font-bold uppercase tracking-wide text-secondary">Upload Photo</span>
                                  </div>
                              )}
                          </div>
                          <input 
                              type="file" 
                              ref={staffImageInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleStaffImageUpload}
                          />
                      </div>
                      
                      {/* Dish Name */}
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Dish Name</label>
                          <input 
                              type="text" 
                              required
                              value={staffEditName}
                              onChange={e => setStaffEditName(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium"
                              placeholder="e.g. Grilled Salmon"
                          />
                      </div>

                      {/* Grid: Category & Price */}
                      <div className="grid grid-cols-2 gap-5">
                           <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Category</label>
                              <select 
                                  value={staffEditCategory}
                                  onChange={e => setStaffEditCategory(e.target.value)}
                                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium appearance-none"
                              >
                                  {orderedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Price ($)</label>
                              <input 
                                  type="number" 
                                  step="0.01"
                                  required
                                  value={staffEditPrice}
                                  onChange={e => setStaffEditPrice(e.target.value)}
                                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium"
                                  placeholder="0.00"
                              />
                          </div>
                      </div>

                      {/* URL Fallback */}
                      <div className="space-y-1.5">
                         <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Or Image URL</label>
                         <input 
                            type="text" 
                            placeholder="https://..."
                            value={staffEditImage}
                            onChange={e => setStaffEditImage(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background text-secondary"
                         />
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="flex justify-between items-center pt-4 mt-2">
                          <button 
                              type="button"
                              onClick={() => setStaffEditingItem(null)}
                              className="px-6 py-2.5 text-secondary font-bold hover:text-primary transition-colors text-sm"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold shadow-sm hover:bg-black transition-colors flex items-center justify-center text-sm"
                          >
                              <Save className="w-4 h-4 mr-2" />
                              {isCreating ? 'Create Item' : 'Save Changes'}
                          </button>
                      </div>
                  </form>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManager;
