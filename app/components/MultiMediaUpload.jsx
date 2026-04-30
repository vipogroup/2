'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * MultiMediaUpload - Component for uploading multiple images and one video
 * Separate upload sections for images and videos
 */
export default function MultiMediaUpload({ 
  images = [], 
  videoUrl = '',
  onImagesChange, 
  onVideoChange,
  maxImages = 5,
  label = 'מדיה למוצר'
}) {
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageError, setImageError] = useState('');
  const [videoError, setVideoError] = useState('');

  const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];

  const WEB_MAX_PX = 2000;
  const WEB_JPEG_QUALITY = 0.85;

  function resizeImageForWeb(file) {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { naturalWidth: w, naturalHeight: h } = img;
        if (w <= WEB_MAX_PX && h <= WEB_MAX_PX) {
          resolve(file);
          return;
        }
        const scale = Math.min(WEB_MAX_PX / w, WEB_MAX_PX / h);
        const nw = Math.round(w * scale);
        const nh = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const resized = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            console.log(`[auto-resize] ${w}x${h} → ${nw}x${nh} | ${(file.size/1024).toFixed(0)}KB → ${(blob.size/1024).toFixed(0)}KB`);
            resolve(resized);
          },
          'image/jpeg',
          WEB_JPEG_QUALITY
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadFile(file, isVideo = false) {
    // Upload directly to Cloudinary (bypasses Vercel size limit)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'vipo_unsigned');
    formData.append('folder', 'vipo-products');

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      throw new Error('חסר NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME בקובץ ENV');
    }
    // Use specific endpoint for videos vs images
    const resourceType = isVideo ? 'video' : 'image';
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    console.log(`Uploading ${resourceType} to Cloudinary...`, file.name, file.size);

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
    console.log(`Upload success:`, data.secure_url);
    return data.secure_url;
  }

  // Handle image file selection
  async function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImageError('');
    setUploadingImages(true);

    try {
      for (const file of files) {
        if (!allowedImageTypes.includes(file.type)) {
          setImageError('סוג קובץ לא נתמך. השתמש ב-PNG, JPEG או WebP');
          continue;
        }
        if (images.length >= maxImages) {
          setImageError(`ניתן להעלות עד ${maxImages} תמונות`);
          break;
        }
        if (file.size > 10 * 1024 * 1024) {
          setImageError('תמונה גדולה מדי. מקסימום 10MB');
          continue;
        }
        const optimized = await resizeImageForWeb(file);
        const url = await uploadFile(optimized);
        onImagesChange([...images, url]);
      }
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploadingImages(false);
    }
  }

  // Handle video file selection
  async function handleVideoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError('');

    if (!allowedVideoTypes.includes(file.type)) {
      setVideoError('סוג קובץ לא נתמך. השתמש ב-MP4, MOV או AVI');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideoError('סרטון גדול מדי. מקסימום 100MB');
      return;
    }

    setUploadingVideo(true);
    try {
      const url = await uploadFile(file, true); // true = isVideo
      onVideoChange(url);
    } catch (err) {
      setVideoError(err.message);
    } finally {
      setUploadingVideo(false);
    }
  }

  function removeImage(index) {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }

  function removeVideo() {
    onVideoChange('');
  }

  return (
    <div className="mb-4 space-y-6">
      <label className="block font-bold text-gray-700">{label}</label>
      
      {/* === IMAGES SECTION === */}
      <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-blue-900">תמונות ({images.length}/{maxImages})</h3>
        </div>

        {/* Images Upload Button */}
        {images.length < maxImages && (
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageChange}
              disabled={uploadingImages}
              multiple
              className="hidden"
              id="images-upload"
            />
            <label 
              htmlFor="images-upload" 
              className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
            >
              {uploadingImages ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-600">מעלה תמונות...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-blue-600 font-medium">בחר תמונות (PNG, JPEG, WebP - עד 10MB)</span>
                </>
              )}
            </label>
          </div>
        )}

        {imageError && <p className="text-red-500 mt-2 text-sm">{imageError}</p>}

        {/* Images Preview */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-300 bg-white">
                  <Image src={url} alt={`תמונה ${index + 1}`} fill className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded shadow">
                    ראשית
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === VIDEO SECTION === */}
      <div className="p-4 bg-cyan-50 rounded-xl border-2 border-cyan-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <h3 className="font-bold text-cyan-900">סרטון (אופציונלי)</h3>
        </div>

        {/* Video Upload Button */}
        {!videoUrl && (
          <div>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={handleVideoChange}
              disabled={uploadingVideo}
              className="hidden"
              id="video-upload"
            />
            <label 
              htmlFor="video-upload" 
              className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-cyan-300 rounded-lg cursor-pointer hover:bg-cyan-100 transition-all"
            >
              {uploadingVideo ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-cyan-600">מעלה סרטון...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-cyan-600 font-medium">בחר סרטון (MP4, MOV, AVI - עד 100MB)</span>
                </>
              )}
            </label>
          </div>
        )}

        {videoError && <p className="text-red-500 mt-2 text-sm">{videoError}</p>}

        {/* Video Preview */}
        {videoUrl && (
          <div className="relative inline-block mt-2">
            <video src={videoUrl} controls className="max-w-full h-48 rounded-lg border-2 border-cyan-300" />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
