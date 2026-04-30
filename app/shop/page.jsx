import { redirect } from 'next/navigation';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// דף /shop הופנה לדף הבית החדש (מרקטפלייס)
// כל הסינון לפי עסקים וסוג מכירה נמצא בדף הבית
export default function ShopPage() {
  redirect('/');
}
