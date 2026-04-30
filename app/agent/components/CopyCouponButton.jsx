'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/app/utils/copyToClipboard';

export default function CopyCouponButton({ code, label = 'העתק', successMessage = 'הועתק!', variant = 'text' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    const normalizedCode = typeof code === 'string' ? code : String(code);

    const success = await copyToClipboard(normalizedCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const baseClasses = "px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0";
  
  const variantClasses = {
    primary: "text-white",
    outline: "border-2",
    text: "text-blue-600 hover:text-blue-700 px-0 py-0",
  };

  const variantStyles = {
    primary: { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' },
    outline: { borderColor: '#1e3a8a', color: '#1e3a8a' },
    text: {},
  };

  return (
    <button 
      onClick={handleCopy} 
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.text}`}
      style={variantStyles[variant] || variantStyles.text}
    >
      {copied ? successMessage : label}
    </button>
  );
}
