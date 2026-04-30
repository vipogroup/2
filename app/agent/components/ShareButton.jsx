'use client';

export default function ShareButton({ link, label = 'שתף' }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'הנחה מיוחדת ב-VIPO',
        text: 'קבלו הנחה מיוחדת על המוצרים שלנו!',
        url: link,
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent('קבלו הנחה מיוחדת! ' + link)}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {label}
    </button>
  );
}
