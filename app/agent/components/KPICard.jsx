'use client';

const CartIcon = () => (
  <svg
    className="w-4 h-4 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 5h2l1 10h12l2-6H7" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg
    className="w-4 h-4 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 9l1 11h10l1-11H6z" />
    <path d="M9 9V7a3 3 0 016 0v2" />
  </svg>
);

const WalletIcon = () => (
  <svg
    className="w-4 h-4 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M21 10h-6a2 2 0 100 4h6" />
  </svg>
);

const HourglassIcon = () => (
  <svg
    className="w-4 h-4 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 2h12v6l-6 6 6 6v6H6v-6l6-6-6-6V2z" />
  </svg>
);

const DiamondIcon = () => (
  <svg
    className="w-4 h-4 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 9l9 12 9-12-4-6H7l-4 6z" />
    <path d="M3 9h18" />
    <path d="M7 3l5 18 5-18" />
  </svg>
);

const iconMap = {
  cart: CartIcon,
  bag: ShoppingBagIcon,
  wallet: WalletIcon,
  hourglass: HourglassIcon,
  diamond: DiamondIcon,
};

export default function KPICard({ title, value, iconName, highlight = false }) {
  const IconComponent = iconMap[iconName] || CartIcon;

  // Highlight style for important cards like available balance
  const highlightStyle = highlight
    ? {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
        border: 'none',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.3)',
      }
    : {
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 2px 10px rgba(8, 145, 178, 0.08)',
      };

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={highlightStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = highlight
          ? '0 8px 25px rgba(8, 145, 178, 0.4)'
          : '0 8px 20px rgba(8, 145, 178, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = highlight
          ? '0 4px 15px rgba(8, 145, 178, 0.3)'
          : '0 2px 10px rgba(8, 145, 178, 0.08)';
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${highlight ? 'text-white' : ''}`} style={highlight ? {} : { color: '#1e3a8a' }}>
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: highlight ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <IconComponent />
        </div>
      </div>
      <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
