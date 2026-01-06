import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface Props {
  defaultTitle: string;
  storageKey: string; // 用于在 localStorage 区分不同模块
  className?: string;
}

export const EditableTitle: React.FC<Props> = ({ defaultTitle, storageKey, className = '' }) => {
  // 优先从本地读取自定义命名，没有则用默认
  const [title, setTitle] = useState(() => {
    try {
      return localStorage.getItem(`dashboard_title_${storageKey}`) || defaultTitle;
    } catch {
      return defaultTitle;
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleSave = () => {
    const newTitle = tempTitle.trim() || defaultTitle;
    setTitle(newTitle);
    try {
      localStorage.setItem(`dashboard_title_${storageKey}`, newTitle);
    } catch {
      // ignore localStorage errors
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempTitle(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <input
          autoFocus
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="border-b-2 border-accent bg-transparent outline-none font-bold px-1 min-w-[120px]"
          style={{ font: 'inherit' }}
        />
        <button
          onClick={handleSave}
          className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:bg-slate-100 p-1 rounded transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group inline-flex items-center gap-2 cursor-pointer hover:text-accent transition-colors ${className}`}
      onClick={() => {
        setTempTitle(title);
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      <span>{title}</span>
      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  );
};

export default EditableTitle;
