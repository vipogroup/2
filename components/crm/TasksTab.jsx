'use client';

import { useState } from 'react';
import { PlusIcon } from './CRMIcons';

const statusOptions = [
  { value: '', label: 'הכל' },
  { value: 'pending', label: 'ממתין', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'בתהליך', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'הושלם', color: 'bg-green-100 text-green-700' },
];

const priorityColors = {
  low: 'bg-gray-400',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export default function TasksTab({ 
  tasks = [], 
  onSelectTask,
  onCreateTask,
}) {
  const [filter, setFilter] = useState('');

  const filteredTasks = tasks.filter(task => {
    if (filter && task.status !== filter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const option = statusOptions.find(o => o.value === status);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(o => o.value === status);
    return option?.label || status;
  };

  const isOverdue = (task) => {
    return task.status !== 'completed' && new Date(task.dueAt) < new Date();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>משימות</h2>
          <button 
            onClick={onCreateTask}
            className="px-4 py-2 text-white rounded-lg text-sm flex items-center gap-2 font-medium"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">משימה חדשה</span>
          </button>
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                filter === opt.value 
                  ? 'text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={filter === opt.value ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {filteredTasks.map(task => (
            <div 
              key={task._id} 
              onClick={() => onSelectTask?.(task)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-start gap-4 active:bg-gray-50 cursor-pointer"
            >
              {/* Priority Indicator */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${priorityColors[task.priority] || priorityColors.normal}`} />
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${getStatusBadge(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className={`${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {isOverdue(task) && (
                      <svg className="w-3 h-3 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {new Date(task.dueAt).toLocaleDateString('he-IL')}
                  </span>
                  {task.type && (
                    <span className="text-gray-400">
                      {task.type === 'call' ? 'שיחה' :
                       task.type === 'meeting' ? 'פגישה' :
                       task.type === 'email' ? 'אימייל' :
                       task.type === 'whatsapp' ? 'WhatsApp' :
                       task.type === 'follow_up' ? 'מעקב' : 'אחר'}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
              {filter ? 'לא נמצאו משימות בסטטוס זה' : 'אין משימות'}
            </div>
          )}
        </div>
      </div>

      {/* Count Footer */}
      <div className="px-4 py-2 bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {filteredTasks.length} משימות
          {filter && ` (מסונן)`}
        </p>
      </div>
    </div>
  );
}
