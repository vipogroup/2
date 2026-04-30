import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VIPO - ציוד נירוסטה למטבחים מוסדיים';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #0891b2 100%)',
          color: '#ffffff',
          fontFamily: 'Arial',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(255,255,255,0.14), transparent 30%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 108,
                height: 108,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.24)',
                fontSize: 52,
                fontWeight: 800,
              }}
            >
              V
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>VIPO GROUP</div>
              <div style={{ fontSize: 20, opacity: 0.88 }}>Stainless solutions for professional kitchens</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
            <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, marginBottom: 18 }}>
              ציוד נירוסטה למטבחים מוסדיים ותעשייתיים
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.92 }}>
              שולחנות, כיורים, ארונות, עגלות ומדפים עם משלוח ארצי, מפרטים מלאים ודפי מוצר קנוניים לגוגל.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              {['שולחנות נירוסטה', 'כיורים מקצועיים', 'משלוח לכל הארץ'].map((label) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 18px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 24, opacity: 0.88 }}>www.vipo-group.com</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
