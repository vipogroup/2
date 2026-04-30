'use client';

import { buildWhatsAppUrl } from '@/lib/whatsapp';

export default function AdminsTab({ 
  superAdmins, 
  currentUserId,
  onDeleteUser,
  deletingId 
}) {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#dc2626' }}>
              מנהלי מערכת
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              מנהלים ראשיים מוגנים של המערכת
            </p>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900 mb-1">אזהרה - משתמשים מוגנים</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• מנהלים אלו מוגנים ולא ניתן למחוק אותם</li>
                <li>• מחיקה דורשת סיסמת-על מיוחדת</li>
                <li>• שינויים במנהלים אלו עלולים להשבית את המערכת</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="space-y-3">
          {superAdmins.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500">אין מנהלי מערכת</p>
            </div>
          ) : (
            superAdmins.map((admin) => {
              const isCurrentUser = admin._id === currentUserId;
              const isProtected = admin.protected || admin.email === 'm0587009938@gmail.com';
              
              return (
                <div
                  key={admin._id}
                  className="border-2 rounded-xl p-4 transition-all"
                  style={{
                    borderColor: isProtected ? '#dc2626' : '#e5e7eb',
                    background: isCurrentUser 
                      ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)'
                      : isProtected
                      ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.02) 0%, rgba(239, 68, 68, 0.02) 100%)'
                      : 'white'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
                      >
                        {admin.fullName?.charAt(0) || admin.email?.charAt(0) || 'A'}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {admin.fullName || admin.email}
                          </h3>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">אתה</span>
                          )}
                          {isProtected && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              מוגן
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{admin.email}</p>
                        {admin.phone && (
                          <p className="text-sm text-gray-500">{admin.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {admin.phone && (
                        <a
                          href={buildWhatsAppUrl(admin.phone, `היי ${admin.fullName || ''}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-white transition-all hover:opacity-90"
                          style={{ background: '#25D366' }}
                          title="WhatsApp"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      )}
                      
                      {!isCurrentUser && !isProtected && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(admin)}
                          disabled={deletingId === admin._id}
                          className="p-2 rounded-lg border-2 border-red-600 text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                          title="מחק משתמש"
                        >
                          {deletingId === admin._id ? (
                            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(admin.createdAt).toLocaleDateString('he-IL')}
                      </span>
                      <span className={`flex items-center gap-1 ${admin.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${admin.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {admin.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </div>
                    {admin.isSuperAdmin && (
                      <span className="px-2 py-1 rounded bg-gradient-to-r from-red-100 to-orange-100 text-red-800 font-medium">
                        Super Admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
