'use client';

import { useState } from 'react';
import { 
  PhoneIcon, 
  EmailIcon, 
  EditIcon, 
  StarIcon,
  BackIcon,
} from './CRMIcons';

const statusOptions = [
  { value: 'new', label: 'חדש', color: 'bg-green-500' },
  { value: 'contacted', label: 'נוצר קשר', color: 'bg-blue-500' },
  { value: 'qualified', label: 'מתאים', color: 'bg-purple-500' },
  { value: 'proposal', label: 'הצעה', color: 'bg-orange-500' },
  { value: 'won', label: 'נסגר בהצלחה', color: 'bg-green-600' },
  { value: 'lost', label: 'לא רלוונטי', color: 'bg-gray-500' },
];

const snoozeOptions = [
  { hours: 1, label: 'שעה אחת' },
  { hours: 4, label: '4 שעות' },
  { hours: 24, label: 'מחר' },
  { hours: 48, label: 'יומיים' },
  { hours: 168, label: 'שבוע' },
];

export default function LeadPanel({
  lead,
  conversation,
  users = [],
  onUpdateStatus,
  onUpdateAssignment,
  onAddTag,
  onSaveNotes,
  onSnooze,
  onCreateLead,
  onClose,
  isMobile = false,
}) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');

  const formatPhone = (phone) => {
    if (!phone) return '';
    if (phone.startsWith('972')) {
      return '0' + phone.substring(3);
    }
    return phone;
  };

  const handleAddTag = () => {
    if (newTag.trim() && onAddTag) {
      onAddTag(newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleSaveNote = () => {
    if (newNote.trim() && onSaveNotes) {
      onSaveNotes(newNote.trim());
      setNewNote('');
    }
  };

  const handleSnooze = (hours) => {
    if (onSnooze) {
      onSnooze(hours);
      setShowSnoozeMenu(false);
    }
  };

  // If no lead, show option to create one
  if (!lead && conversation) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Mobile Header */}
        {isMobile && (
          <header className="flex items-center gap-3 px-3 py-3 border-b border-gray-200">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <BackIcon className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="font-semibold text-gray-900">פרטי שיחה</h2>
          </header>
        )}
        
        <div className="p-4 flex-1">
          <div className="text-center py-8">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {formatPhone(conversation.phone).substring(0, 2)}
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">{formatPhone(conversation.phone)}</p>
            <p className="text-sm text-gray-500 mb-6">אין ליד משויך לשיחה זו</p>
            
            <button
              onClick={onCreateLead}
              className="w-full py-3 text-white rounded-xl text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                צור ליד חדש
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center text-gray-400 p-4">
        <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-sm">בחר שיחה לראות פרטים</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <header className="flex items-center gap-3 px-3 py-3 border-b border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <BackIcon className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="font-semibold text-gray-900">פרטי ליד</h2>
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Lead Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: '#1e3a8a' }}>פרטי ליד</h3>
            {/* SLA Badge */}
            {lead.slaStatus && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                lead.slaStatus === 'met' ? 'bg-green-100 text-green-700' :
                lead.slaStatus === 'breached' ? 'bg-red-100 text-red-700' :
                lead.slaDeadline && new Date(lead.slaDeadline) < new Date() ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {lead.slaStatus === 'met' ? 'SLA [v]' :
                 lead.slaStatus === 'breached' ? 'SLA [x]' :
                 lead.slaDeadline && new Date(lead.slaDeadline) < new Date() ? 'SLA [x]' :
                 'ממתין'}
              </span>
            )}
          </div>
          
          {/* Status & Assignment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">סטטוס:</span>
              <select
                value={lead.status || 'new'}
                onChange={(e) => onUpdateStatus?.(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 min-w-[120px]"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">מקור:</span>
              <span className="text-sm text-gray-900">{lead.source || 'WhatsApp'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">נציג:</span>
              <select
                value={lead.assignedTo?._id || lead.assignedTo || ''}
                onChange={(e) => onUpdateAssignment?.(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 min-w-[120px]"
              >
                <option value="">לא מוקצה</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.fullName || user.email}</option>
                ))}
              </select>
            </div>
            
            {lead.snoozedUntil && new Date(lead.snoozedUntil) > new Date() && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">מושהה עד:</span>
                <span className="text-sm text-orange-600">{new Date(lead.snoozedUntil).toLocaleString('he-IL')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {lead.name?.substring(0, 2) || '??'}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{lead.name || 'לא ידוע'}</h4>
              <p className="text-sm text-gray-500">{lead.phone}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-cyan-600">
                <EmailIcon className="w-4 h-4" style={{ color: '#0891b2' }} />
                <span className="text-gray-600 truncate">{lead.email}</span>
              </a>
            )}
            {lead.company && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-gray-600">{lead.company}</span>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <a 
              href={`tel:${lead.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <PhoneIcon className="w-4 h-4" />
              התקשר
            </a>
            <a 
              href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            {lead.tags?.map((tag, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 text-xs rounded-full"
                style={{ background: 'rgba(8, 145, 178, 0.15)', color: '#0891b2' }}
              >
                {tag}
              </span>
            ))}
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="px-2 py-0.5 text-xs border border-gray-300 rounded-full w-20"
                  placeholder="תג חדש"
                  autoFocus
                />
                <button 
                  onClick={() => setShowTagInput(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowTagInput(true)}
                className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full hover:bg-gray-200"
              >
                + הוסף תג
              </button>
            )}
          </div>
        </div>

        {/* Snooze */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm" style={{ color: '#1e3a8a' }}>דחיית טיפול</h4>
            <div className="relative">
              <button 
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                השהה
              </button>
              {showSnoozeMenu && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-32">
                  {snoozeOptions.map(opt => (
                    <button 
                      key={opt.hours}
                      onClick={() => handleSnooze(opt.hours)} 
                      className="w-full px-3 py-2 text-sm text-right hover:bg-gray-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="p-4">
          <h4 className="font-medium text-sm mb-3" style={{ color: '#1e3a8a' }}>הערות</h4>
          
          {lead.notes && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">{lead.notes}</pre>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="הוסף הערה חדשה..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
              style={{ focusRingColor: '#0891b2' }}
              rows={3}
            />
            {newNote.trim() && (
              <button 
                onClick={handleSaveNote}
                className="self-end px-4 py-2 text-white text-sm rounded-lg font-medium"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                שמור הערה
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
