'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const showNew = searchParams.get('action') === 'new';
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'task', priority: 'medium' });
  const [showForm, setShowForm] = useState(showNew);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
          router.push('/');
          return;
        }
        setUser(data.user);
        await loadTasks();
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadTasks() {
    try {
      const res = await fetch('/api/admin/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        setNewTask({ title: '', description: '', type: 'task', priority: 'medium' });
        setShowForm(false);
        await loadTasks();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }

  async function toggleTask(taskId) {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' })
      });
      if (res.ok) {
        await loadTasks();
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('האם למחוק את המשימה?')) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    if (filter === 'bugs') return task.type === 'bug';
    if (filter === 'features') return task.type === 'feature';
    return true;
  });

  const priorityColors = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' }
  };

  const getTypeIcon = (type) => {
    const icons = {
      task: <svg className="w-4 h-4" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      bug: <svg className="w-4 h-4" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      feature: <svg className="w-4 h-4" style={{ color: '#7c3aed' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
      fix: <svg className="w-4 h-4" style={{ color: '#d97706' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    };
    return icons[type] || icons.task;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <span className="flex items-center gap-3">
              <svg className="w-8 h-8" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              משימות ותיקונים
            </span>
          </h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' }}
          >
            + הוסף משימה
          </button>
        </div>

        {/* Add Task Form */}
        {showForm && (
          <form onSubmit={addTask} className="mb-6 p-4 rounded-xl bg-white shadow-md" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #16a34a, #22c55e)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
            <h3 className="font-bold text-gray-900 mb-4">משימה חדשה</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="כותרת המשימה..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
              <select
                value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="task">משימה</option>
                <option value="bug">באג</option>
                <option value="feature">פיצר חדש</option>
                <option value="fix">תיקון</option>
              </select>
            </div>
            <textarea
              placeholder="תיאור (אופציונלי)..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 mb-4"
              rows={2}
            />
            <div className="flex items-center gap-4">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="p-2 border rounded-lg"
              >
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' }}
              >
                שמור משימה
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'הכל' },
            { key: 'pending', label: 'ממתינות' },
            { key: 'completed', label: 'הושלמו' },
            { key: 'bugs', label: 'באגים' },
            { key: 'features', label: 'פיצרים' }
          ].map(tab => (
            <Link
              key={tab.key}
              href={`/admin/tasks${tab.key === 'all' ? '' : `?filter=${tab.key}`}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key 
                  ? 'text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={filter === tab.key ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <div 
                key={task._id} 
                className={`p-4 rounded-xl border-2 transition-all ${
                  task.completed ? 'bg-gray-50 opacity-60' : priorityColors[task.priority]?.bg || 'bg-white'
                } ${priorityColors[task.priority]?.border || 'border-gray-200'}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task._id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                      task.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-cyan-500'
                    }`}
                  >
                    {task.completed && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getTypeIcon(task.type)}</span>
                      <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]?.text || ''} ${priorityColors[task.priority]?.bg || ''}`}>
                        {task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600">{task.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      נוצר: {new Date(task.createdAt).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-lg font-medium">אין משימות</p>
              <p className="text-sm">לחץ על &quot;הוסף משימה&quot; להתחיל</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 text-center">
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            <p className="text-sm text-gray-600">סה״כ</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 text-center">
            <p className="text-2xl font-bold text-amber-700">{tasks.filter(t => !t.completed).length}</p>
            <p className="text-sm text-amber-600">ממתינות</p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 text-center">
            <p className="text-2xl font-bold text-green-700">{tasks.filter(t => t.completed).length}</p>
            <p className="text-sm text-green-600">הושלמו</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 text-center">
            <p className="text-2xl font-bold text-red-700">{tasks.filter(t => t.type === 'bug' && !t.completed).length}</p>
            <p className="text-sm text-red-600">באגים פתוחים</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
