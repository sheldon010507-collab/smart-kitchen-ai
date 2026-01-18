import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { X, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (business: Partial<Business>) => void;
  onDelete?: (businessId: string) => void;
  onFirstStoreCreated?: () => void;  // Callback for template onboarding after first store
  initialBusiness: Business | null;
  ownerId: string;
  isFirstStore?: boolean;  // Flag to indicate this is the user's first store
}

const StoreModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, onFirstStoreCreated, initialBusiness, ownerId, isFirstStore }) => {
  const [formData, setFormData] = useState<Partial<Business>>({
    name: '',
    address: '',
    hours: '',
    contactInfo: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialBusiness) {
        setFormData(initialBusiness);
      } else {
        setFormData({ name: '', address: '', hours: '', contactInfo: '', notes: '' });
      }
    }
  }, [isOpen, initialBusiness]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // ✅ Fix: 不要生成 biz_... ID，讓 Backend 生成 UUID
    // 這裡只傳遞業務數據，ID 由外部處理 (App.tsx -> Supabase)
    const newBusiness: Partial<Business> = {
      ...formData,
      ownerId: initialBusiness?.ownerId || ownerId,
      // 如果是編輯，保留原 ID；如果是新建，此字段為 undefined
      id: initialBusiness?.id,

      // 保留或初始化預設值
      joinCode: initialBusiness?.joinCode, // 新建時後端或App生成的
      customCategories: initialBusiness?.customCategories || ['Produce', 'Dairy', 'Meat', 'Pantry'],
      customLocations: initialBusiness?.customLocations || ['Fridge', 'Freezer', 'Pantry'],
      pendingStaffIds: initialBusiness?.pendingStaffIds || [],
    };

    onSave(newBusiness);
    onClose();

    // Trigger template onboarding if this is the first store
    if (!initialBusiness && isFirstStore && onFirstStoreCreated) {
      // Check if user has dismissed the onboarding before
      if (localStorage.getItem('skip_template_onboarding') !== 'true') {
        setTimeout(() => onFirstStoreCreated(), 300); // Small delay for UX
      }
    }
  };

  const handleDelete = () => {
    if (initialBusiness && onDelete) {
      if (window.confirm(`Are you sure you want to delete "${initialBusiness.name}"?`)) {
        onDelete(initialBusiness.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-border overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-bold text-primary tracking-tight">
            {initialBusiness ? 'Edit Store Details' : 'Create New Store'}
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Store Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Location / Address</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Opening Hours</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                value={formData.hours || ''}
                onChange={e => setFormData({ ...formData, hours: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Contact Info</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                value={formData.contactInfo || ''}
                onChange={e => setFormData({ ...formData, contactInfo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Notes</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
              rows={3}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            {initialBusiness && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 text-xs font-bold uppercase tracking-wide flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Store
              </button>
            ) : <div></div>}

            <button
              type="submit"
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-bold tracking-wide hover:bg-accentHover transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreModal;