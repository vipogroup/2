'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function MediaUpload({ 
  value, 
  onChange, 
  label = 'מדיה', 
  type = 'image', // 'image' or 'video'
  accept 
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const defaultAccept = type === 'video' 
    ? 'video/mp4,video/quicktime,video/x-msvideo'
    : 'image/png,image/jpeg,image/jpg,image/webp';

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    
    if (type === 'image' && !allowedImageTypes.includes(file.type)) {
      setError('סוג קובץ לא נתמך. השתמש ב-PNG, JPEG או WebP');
      return;
    }
    
    if (type === 'video' && !allowedVideoTypes.includes(file.type)) {
      setError('סוג קובץ לא נתמך. השתמש ב-MP4, MOV או AVI');
      return;
    }

    // Validate file size (100MB max for video, 10MB for image)
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`הקובץ גדול מדי. מקסימום ${type === 'video' ? '100MB' : '10MB'}`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Upload directly to Cloudinary (bypasses Vercel limit)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'vipo_unsigned');
      formData.append('folder', 'vipo-products');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        throw new Error('חסר NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME בקובץ ENV');
      }
      // Use 'auto' resource type to let Cloudinary detect the file type
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const res = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Cloudinary upload error:', data);
        throw new Error(data.error?.message || `העלאה נכשלה (${res.status})`);
      }

      const data = await res.json();
      onChange(data.secure_url);
    } catch (err) {
      console.error('Upload error:', err);
      if (err.message === 'Failed to fetch') {
        setError('שגיאת רשת - בדוק את החיבור לאינטרנט');
      } else {
        setError(err.message);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange('');
    setError('');
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      
      {!value ? (
        <div>
          <label
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all"
            style={{ borderColor: '#cbd5e1' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0891b2')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-3"
                style={{ color: '#0891b2' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mb-2 text-sm" style={{ color: '#0891b2' }}>
                <span className="font-semibold">לחץ להעלאה</span> או גרור קובץ
              </p>
              <p className="text-xs text-gray-500">
                {type === 'video' ? 'MP4, MOV, AVI (עד 100MB)' : 'PNG, JPG, WebP (עד 10MB)'}
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept={accept || defaultAccept}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
          {uploading && (
            <p className="text-sm text-center mt-2" style={{ color: '#0891b2' }}>
              מעלה...
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          {type === 'image' ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2" style={{ borderColor: '#0891b2' }}>
              <Image
                src={value}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="relative w-full rounded-lg overflow-hidden border-2" style={{ borderColor: '#0891b2' }}>
              <video
                src={value}
                controls
                className="w-full max-h-64"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 rounded-full text-white shadow-lg transition-all"
            style={{ background: '#dc2626' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
