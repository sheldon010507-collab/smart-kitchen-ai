import React, { useState, useEffect } from 'react';
import { PrepTask, User } from '../types';
import { CheckSquare, Square, Plus, Trash2, Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Props {
  tasks: PrepTask[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  currentUser: User;
}

const PrepList: React.FC<Props> = ({ tasks, onAddTask, onToggleTask, onDeleteTask, currentUser }) => {
  const [newTask, setNewTask] = useState('');

  // 语音输入 Hook
  const {
    transcript,
    isListening,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    lang: 'zh-CN', // 支持中文
    continuous: false,
    interimResults: true,
  });

  // 当语音识别有结果时，自动填充到输入框
  useEffect(() => {
    if (transcript) {
      setNewTask(transcript);
    }
  }, [transcript]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim()) {
      onAddTask(newTask);
      setNewTask('');
      resetTranscript(); // 重置语音识别结果
    }
  };

  // 处理麦克风按钮点击
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E9E9E7] h-full flex flex-col">
      <div className="p-4 border-b border-[#E9E9E7] flex justify-between items-center">
        <h3 className="font-medium text-[#37352F]">Prep List</h3>
        <span className="text-xs text-[#787774] bg-[#F7F6F3] px-1.5 py-0.5 rounded">
          {tasks.filter(t => !t.completed).length} left
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#D3D1CB] p-6">
            <p className="text-xs">No tasks yet.</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {tasks.map(task => (
              <li key={task.id} className="group flex items-center justify-between p-2 hover:bg-[#F7F6F3] rounded transition-colors">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={`flex-shrink-0 transition-colors ${task.completed ? 'text-[#2383E2]' : 'text-[#D3D1CB] hover:text-[#787774]'}`}
                  >
                    {task.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className={`truncate ${task.completed ? 'line-through text-[#D3D1CB]' : 'text-[#37352F]'}`}>
                    <p className="text-sm truncate">{task.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#D3D1CB] hover:text-red-500 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAdd} className="p-3 border-t border-[#E9E9E7]">
        <div className="flex items-center space-x-2">
          <Plus className="w-4 h-4 text-[#D3D1CB]" />
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={isListening ? "正在聆听..." : "Add a task..."}
            className="flex-1 text-sm bg-transparent border-none focus:ring-0 placeholder-[#D3D1CB] text-[#37352F]"
          />
          {/* 语音输入按钮 */}
          {isSupported && (
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-1.5 rounded transition-all ${isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-[#D3D1CB] hover:text-[#787774] hover:bg-[#F7F6F3]'
                }`}
              title={isListening ? '点击停止录音' : '点击开始语音输入'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>
        {/* 语音识别错误提示 */}
        {voiceError && (
          <div className="mt-2 text-xs text-red-500">
            {voiceError}
          </div>
        )}
      </form>
    </div>
  );
};

export default PrepList;