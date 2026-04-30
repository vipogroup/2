'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ChatList, 
  ChatView, 
  CRMBottomNav, 
  LeadPanel,
  LeadsTab,
  TasksTab,
  PipelineTab,
  BellIcon, 
  RefreshIcon 
} from '@/components/crm';

export default function CRMPage() {
  // State
  const [activeTab, setActiveTab] = useState('inbox');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLeadPanel, setShowLeadPanel] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    checkConnection();
    fetchConversations();
    fetchLeads();
    fetchTasks();
    fetchUsers();
    
    const interval = setInterval(() => {
      if (activeTab === 'inbox') {
        fetchConversations();
        if (selectedConversation) {
          fetchMessages(selectedConversation.phone);
        }
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedConversation, activeTab]);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/status');
      const data = await res.json();
      setConnected(data.ready);
    } catch (error) {
      setConnected(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/messages');
      const data = await res.json();
      
      if (data.messages) {
        const grouped = {};
        data.messages.forEach(msg => {
          const phone = msg.type === 'incoming' ? msg.from : msg.to;
          if (!phone) return;
          
          if (!grouped[phone]) {
            grouped[phone] = {
              phone,
              messages: [],
              lastMessage: null,
              unread: 0,
            };
          }
          grouped[phone].messages.push(msg);
          
          if (!grouped[phone].lastMessage || 
              new Date(msg.timestamp) > new Date(grouped[phone].lastMessage.timestamp)) {
            grouped[phone].lastMessage = msg;
          }
          
          if (msg.type === 'incoming' && msg.status !== 'read') {
            grouped[phone].unread++;
          }
        });
        
        const convList = Object.values(grouped).sort((a, b) => 
          new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0)
        );
        
        setConversations(convList);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/crm/leads?limit=100');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/crm/tasks?limit=100');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?role=admin&limit=50');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Lead management functions
  const updateLeadStatus = async (status) => {
    if (!selectedLead) return;
    try {
      await fetch(`/api/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setSelectedLead({ ...selectedLead, status });
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const updateLeadAssignment = async (assignedTo) => {
    if (!selectedLead) return;
    try {
      await fetch(`/api/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      setSelectedLead({ ...selectedLead, assignedTo });
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead assignment:', error);
    }
  };

  const addLeadTag = async (tag) => {
    if (!selectedLead || !tag.trim()) return;
    const newTags = [...(selectedLead.tags || []), tag.trim()];
    try {
      await fetch(`/api/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      setSelectedLead({ ...selectedLead, tags: newTags });
      fetchLeads();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const saveLeadNotes = async (note) => {
    if (!selectedLead || !note.trim()) return;
    const updatedNotes = selectedLead.notes 
      ? `${selectedLead.notes}\n\n[${new Date().toLocaleString('he-IL')}]\n${note}`
      : `[${new Date().toLocaleString('he-IL')}]\n${note}`;
    try {
      await fetch(`/api/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes }),
      });
      setSelectedLead({ ...selectedLead, notes: updatedNotes });
      fetchLeads();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const snoozeLead = async (hours) => {
    if (!selectedLead) return;
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    try {
      await fetch(`/api/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozedUntil, status: 'contacted' }),
      });
      setSelectedLead({ ...selectedLead, snoozedUntil });
      fetchLeads();
    } catch (error) {
      console.error('Error snoozing lead:', error);
    }
  };

  const fetchMessages = async (phone) => {
    try {
      const res = await fetch('/api/crm/whatsapp/messages');
      const data = await res.json();
      
      if (data.messages) {
        const phoneMessages = data.messages.filter(msg => 
          msg.from === phone || msg.to === phone
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setMessages(phoneMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const selectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.phone);
    
    // Find matching lead
    const lead = leads.find(l => 
      l.phone === conv.phone || 
      l.phone === formatPhone(conv.phone) ||
      conv.phone.includes(l.phone?.replace(/\D/g, ''))
    );
    setSelectedLead(lead || null);
    
    // On mobile, show chat view
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBack = () => {
    setShowChat(false);
  };

  const sendMessage = async (message) => {
    if (!message.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/crm/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phone,
          message: message,
        }),
      });
      
      if (res.ok) {
        fetchMessages(selectedConversation.phone);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchConversations(), fetchLeads(), fetchTasks()]);
    setLoading(false);
  }, []);

  // Handle selecting a lead from any tab
  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    if (isMobile) {
      setShowLeadPanel(true);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowChat(false);
    setShowLeadPanel(false);
  };

  function formatPhone(phone) {
    if (!phone) return '';
    if (phone.startsWith('972')) {
      return '0' + phone.substring(3);
    }
    return phone;
  }

  // Calculate total unread
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <div className="h-screen flex flex-col bg-white" dir="rtl">
      {/* Top Header - Desktop & Mobile */}
      <header className="h-14 flex items-center justify-between px-3 md:px-6 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin" 
            className="text-lg md:text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            VIPO
          </Link>
          <span className="text-gray-300 hidden md:inline">|</span>
          <h1 className="text-base md:text-lg font-bold hidden md:block" style={{ color: '#1e3a8a' }}>
            מערכת CRM
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* QR Code Button */}
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="hidden sm:inline">QR Code</span>
          </button>

          {/* Connection Status */}
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
              connected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700 animate-pulse'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium hidden sm:inline">{connected ? 'מחובר' : 'מנותק'}</span>
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <BellIcon className="w-5 h-5 text-gray-600" />
            {totalUnread > 0 && (
              <span 
                className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>

          {/* Refresh - Desktop */}
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 hidden md:block"
          >
            <RefreshIcon className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Back to Admin */}
          <Link 
            href="/admin" 
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            חזרה
          </Link>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#1e3a8a' }}>חיבור WhatsApp</h3>
            <p className="text-gray-600 mb-4 text-sm">סרוק את הקוד עם אפליקציית WhatsApp בטלפון</p>
            
            <iframe 
              src="http://localhost:3002/qr" 
              className="w-full h-72 mx-auto border-0 rounded-lg bg-gray-50"
              title="WhatsApp QR Code"
            />
            
            <button
              onClick={() => {
                setShowQRModal(false);
                checkConnection();
              }}
              className="mt-4 w-full py-2.5 text-white rounded-lg transition-colors font-medium"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              סיימתי לסרוק
            </button>
            <button
              onClick={() => setShowQRModal(false)}
              className="mt-2 w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Desktop Tab Navigation */}
      {!isMobile && (
        <nav className="h-12 flex items-center gap-1 px-4 bg-gray-50 border-b border-gray-200">
          {[
            { id: 'inbox', label: 'Inbox' },
            { id: 'leads', label: 'לידים' },
            { id: 'tasks', label: 'משימות' },
            { id: 'pipeline', label: 'Pipeline' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* MOBILE VIEW */}
        {isMobile ? (
          <>
            {/* Mobile: Show appropriate view based on state */}
            {showLeadPanel ? (
              <div className="flex-1">
                <LeadPanel
                  lead={selectedLead}
                  conversation={selectedConversation}
                  users={users}
                  onUpdateStatus={updateLeadStatus}
                  onUpdateAssignment={updateLeadAssignment}
                  onAddTag={addLeadTag}
                  onSaveNotes={saveLeadNotes}
                  onSnooze={snoozeLead}
                  onClose={() => setShowLeadPanel(false)}
                  isMobile={true}
                />
              </div>
            ) : showChat ? (
              <div className="flex-1">
                <ChatView
                  conversation={selectedConversation}
                  lead={selectedLead}
                  messages={messages}
                  onBack={handleBack}
                  onSendMessage={sendMessage}
                  sending={sending}
                  connected={connected}
                  isMobile={true}
                />
              </div>
            ) : (
              <div className="flex-1 pb-14">
                {activeTab === 'inbox' && (
                  <ChatList
                    conversations={conversations}
                    leads={leads}
                    selectedPhone={selectedConversation?.phone}
                    onSelectConversation={selectConversation}
                    onRefresh={handleRefresh}
                    loading={loading}
                  />
                )}
                {activeTab === 'leads' && (
                  <LeadsTab
                    leads={leads}
                    onSelectLead={handleSelectLead}
                  />
                )}
                {activeTab === 'tasks' && (
                  <TasksTab
                    tasks={tasks}
                    onSelectTask={(task) => console.log('Select task:', task)}
                  />
                )}
                {activeTab === 'pipeline' && (
                  <PipelineTab
                    leads={leads}
                    onSelectLead={handleSelectLead}
                  />
                )}
              </div>
            )}
            
            {/* Bottom Navigation - hide when in chat or lead panel */}
            {!showChat && !showLeadPanel && (
              <CRMBottomNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                unreadCount={totalUnread}
              />
            )}
          </>
        ) : (
          /* DESKTOP VIEW */
          <>
            {activeTab === 'inbox' && (
              <>
                {/* Left Panel - Chat List */}
                <aside className="w-80 lg:w-96 border-l border-gray-200 flex-shrink-0">
                  <ChatList
                    conversations={conversations}
                    leads={leads}
                    selectedPhone={selectedConversation?.phone}
                    onSelectConversation={selectConversation}
                    onRefresh={handleRefresh}
                    loading={loading}
                  />
                </aside>

                {/* Center Panel - Chat View */}
                <main className="flex-1 flex flex-col bg-gray-50">
                  {selectedConversation ? (
                    <ChatView
                      conversation={selectedConversation}
                      lead={selectedLead}
                      messages={messages}
                      onBack={() => setSelectedConversation(null)}
                      onSendMessage={sendMessage}
                      sending={sending}
                      connected={connected}
                      isMobile={false}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg 
                          className="w-24 h-24 mx-auto mb-4 opacity-30" 
                          style={{ color: '#0891b2' }} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-lg">בחר שיחה מהרשימה</p>
                      </div>
                    </div>
                  )}
                </main>

                {/* Right Panel - Lead Panel */}
                <aside className="w-80 border-r border-gray-200 flex-shrink-0 hidden xl:block">
                  <LeadPanel
                    lead={selectedLead}
                    conversation={selectedConversation}
                    users={users}
                    onUpdateStatus={updateLeadStatus}
                    onUpdateAssignment={updateLeadAssignment}
                    onAddTag={addLeadTag}
                    onSaveNotes={saveLeadNotes}
                    onSnooze={snoozeLead}
                    isMobile={false}
                  />
                </aside>
              </>
            )}

            {activeTab === 'leads' && (
              <div className="flex-1 flex">
                <main className="flex-1">
                  <LeadsTab
                    leads={leads}
                    onSelectLead={handleSelectLead}
                  />
                </main>
                {selectedLead && (
                  <aside className="w-80 border-r border-gray-200 flex-shrink-0">
                    <LeadPanel
                      lead={selectedLead}
                      users={users}
                      onUpdateStatus={updateLeadStatus}
                      onUpdateAssignment={updateLeadAssignment}
                      onAddTag={addLeadTag}
                      onSaveNotes={saveLeadNotes}
                      onSnooze={snoozeLead}
                      onClose={() => setSelectedLead(null)}
                      isMobile={false}
                    />
                  </aside>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="flex-1">
                <TasksTab
                  tasks={tasks}
                  onSelectTask={(task) => console.log('Select task:', task)}
                />
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div className="flex-1 flex">
                <main className="flex-1">
                  <PipelineTab
                    leads={leads}
                    onSelectLead={handleSelectLead}
                  />
                </main>
                {selectedLead && (
                  <aside className="w-80 border-r border-gray-200 flex-shrink-0">
                    <LeadPanel
                      lead={selectedLead}
                      users={users}
                      onUpdateStatus={updateLeadStatus}
                      onUpdateAssignment={updateLeadAssignment}
                      onAddTag={addLeadTag}
                      onSaveNotes={saveLeadNotes}
                      onSnooze={snoozeLead}
                      onClose={() => setSelectedLead(null)}
                      isMobile={false}
                    />
                  </aside>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
