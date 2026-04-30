'use client';

import { useState } from 'react';
import { SearchIcon, PlusIcon } from './CRMIcons';

const statusOptions = [
  { value: '', label: 'הכל' },
  { value: 'new', label: 'חדש', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'נוצר קשר', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'qualified', label: 'מתאים', color: 'bg-green-100 text-green-700' },
  { value: 'converted', label: 'הומר', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'lost', label: 'אבוד', color: 'bg-red-100 text-red-700' },
];

export default function LeadsTab({ 
  leads = [], 
  onSelectLead,
  onCreateLead,
}) {
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = leads.filter(lead => {
    if (filter && lead.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.email?.toLowerCase().includes(query)
      );
    }
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#1e3a8a' }}>לידים</h2>
          <button 
            onClick={onCreateLead}
            className="px-4 py-2 text-white rounded-lg text-sm flex items-center gap-2 font-medium"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">ליד חדש</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2"
            dir="rtl"
          />
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

      {/* Leads List/Table */}
      <div className="flex-1 overflow-auto p-4">
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">שם</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">טלפון</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">מקור</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">סטטוס</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">תאריך</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.source || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => onSelectLead?.(lead)}
                      className="text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 font-medium"
                      style={{ color: '#0891b2' }}
                    >
                      צפה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchQuery || filter ? 'לא נמצאו תוצאות' : 'אין לידים'}
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredLeads.map(lead => (
            <div 
              key={lead._id} 
              onClick={() => onSelectLead?.(lead)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 active:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    {lead.name?.substring(0, 2) || '??'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(lead.status)}`}>
                  {getStatusLabel(lead.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{lead.source || 'לא ידוע'}</span>
                <span>{new Date(lead.createdAt).toLocaleDateString('he-IL')}</span>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
              {searchQuery || filter ? 'לא נמצאו תוצאות' : 'אין לידים'}
            </div>
          )}
        </div>
      </div>

      {/* Count Footer */}
      <div className="px-4 py-2 bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {filteredLeads.length} לידים
          {filter && ` (מסונן)`}
        </p>
      </div>
    </div>
  );
}
