import React from 'react';
import { InventoryItem } from '../types';
import { Trash2, Clock, AlertTriangle, Pencil, Calendar } from 'lucide-react';

interface Props {
  item: InventoryItem;
  onRemove: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onWastage?: (item: InventoryItem) => void;
}

const InventoryCard: React.FC<Props> = ({ item, onRemove, onEdit, onWastage }) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );

  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 3;

  let statusColor = 'text-primary bg-background border-border';
  let Icon = Clock;

  if (isExpired) {
    statusColor = 'text-red-700 bg-red-50 border-red-100';
    Icon = AlertTriangle;
  } else if (isExpiringSoon) {
    statusColor = 'text-amber-700 bg-amber-50 border-amber-100';
    Icon = Clock;
  }

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border border-border bg-background text-secondary`}>
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-base font-bold text-primary tracking-tight">{item.name}</h3>
          <p className="text-xs text-secondary font-mono mt-0.5 uppercase tracking-wide">{item.quantity} • {item.location}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Expiry Status Badge */}
        <div className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center border ${statusColor}`}>
          <Icon className="w-3.5 h-3.5 mr-1.5" />
          {isExpired ? 'EXPIRED' : `${daysUntilExpiry} DAYS`}
        </div>

        {/* 🆕 Expired Item Actions */}
        {isExpired && (
          <div className="flex space-x-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="p-1.5 rounded-md hover:bg-blue-50 transition-colors"
              title="調整日期"
            >
              <Calendar className="w-4 h-4 text-blue-500" />
            </button>
            {onWastage && (
              <button
                onClick={(e) => { e.stopPropagation(); onWastage(item); }}
                className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                title="記錄浪費"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        )}

        {/* Standard Actions (hover reveal) */}
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-secondary hover:text-primary hover:bg-background rounded-md transition-colors"
            title="Edit Item"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-secondary hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Remove Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryCard;