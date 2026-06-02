import React from 'react';
import { InventoryItem } from '../types';
import { Trash2, Clock, AlertTriangle, Pencil, Calendar, MapPin } from 'lucide-react';
import { getCategoryStyle, getStockStatus, getStatusStyle, getProgressBarColor } from '../utils/categoryColors';

interface Props {
  item: InventoryItem;
  onRemove: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onWastage?: (item: InventoryItem) => void;
}

const InventoryCard: React.FC<Props> = ({ item, onRemove, onEdit, onWastage }) => {
  // Calculate expiry status
  const hasExpiryDate = Boolean(item.expiryDate);
  const daysUntilExpiry = hasExpiryDate
    ? Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 3;

  // Get category styling
  const categoryStyle = getCategoryStyle(item.category || 'Other');

  // Calculate stock status (using parLevel if available, otherwise estimate)
  const parLevel = (item as any).minStockLevel || (item as any).parLevel || 10;
  const currentQuantity = parseFloat(String(item.quantity).replace(/[^0-9.]/g, '')) || 0;
  const stockPercentage = Math.min((currentQuantity / parLevel) * 100, 100);
  const stockStatus = getStockStatus(currentQuantity, parLevel);
  const statusStyle = getStatusStyle(stockStatus);
  const progressColor = getProgressBarColor(stockPercentage);

  // Expiry badge style
  let expiryBadgeStyle = 'bg-[#d3e5d0] text-[#2d5f2e] border-[#b8d4b5]';
  let ExpiryIcon = Clock;
  if (isExpired) {
    expiryBadgeStyle = 'bg-[#ffe5e5] text-[#8b3a3a] border-[#ffc9c9]';
    ExpiryIcon = AlertTriangle;
  } else if (isExpiringSoon) {
    expiryBadgeStyle = 'bg-[#fff3e0] text-[#9a6324] border-[#ffe0b2]';
    ExpiryIcon = Clock;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-[#e9e9e7] group">
      {/* Item Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-[#37352f] mb-2">{item.name}</h3>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {/* Category Badge with Emoji */}
            <span className={`${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border} px-2.5 py-1 rounded-md font-medium flex items-center gap-1`}>
              <span>{categoryStyle.emoji}</span>
              <span>{item.category || 'Other'}</span>
            </span>
            {/* Location */}
            <span className="flex items-center gap-1 text-[#787774]">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
          </div>
        </div>

        {/* Expiry Status Badge */}
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium border flex items-center ${expiryBadgeStyle}`}>
          <ExpiryIcon className="w-3.5 h-3.5 mr-1" />
          {!hasExpiryDate ? 'No date' : isExpired ? 'Expired' : `${daysUntilExpiry}d`}
        </span>
      </div>

      {/* Stock Level Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-[#787774]">Stock Level</span>
          <span className="font-semibold text-[#37352f]">
            {item.quantity} / {parLevel}
          </span>
        </div>
        <div className="h-1.5 bg-[#f7f6f3] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${progressColor}`}
            style={{ width: `${stockPercentage}%` }}
          />
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between pt-3 border-t border-[#e9e9e7]">
        {/* Stock Status */}
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${statusStyle.bg} ${statusStyle.text} border-${statusStyle.border?.replace('border-', '')}`}>
          {statusStyle.label}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Expired Item Special Actions */}
          {isExpired && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="p-1.5 rounded-md hover:bg-[#e3f2fd] transition-colors"
                title="Adjust Date"
              >
                <Calendar className="w-4 h-4 text-[#1565c0]" />
              </button>
              {onWastage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onWastage(item); }}
                  className="p-1.5 rounded-md hover:bg-[#ffe5e5] transition-colors"
                  title="Record Wastage"
                >
                  <Trash2 className="w-4 h-4 text-[#eb5757]" />
                </button>
              )}
            </>
          )}

          {/* Standard Actions (hover reveal) */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-md hover:bg-[#f7f6f3] transition-colors"
              title="Edit Item"
            >
              <Pencil className="w-4 h-4 text-[#787774]" />
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-md hover:bg-[#ffe5e5] transition-colors"
              title="Remove Item"
            >
              <Trash2 className="w-4 h-4 text-[#787774] hover:text-[#eb5757]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryCard;
