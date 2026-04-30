'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { 
  ShoppingCart, Users, Share2, TrendingDown, CheckCircle, Truck,
  Shield, UserPlus, Star, Phone, Mail, MapPin, Clock,
  ChevronDown, Instagram, MessageCircle, Facebook
} from 'lucide-react';

const CONTACT = {
  phone: '053-375-2633',
  phoneIntl: '972533752633',
  email: 'vipogroup1@gmail.com',
  address: "ז'בוטינסקי 5, באר יעקב",
  whatsappGroup: 'https://chat.whatsapp.com/KP5UIdBHiKdGmOdyWeJySa',
  instagram: 'vipoconnect'
};

const gradient = 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const carouselRef = useRef(null);

  const testimonials = [
    { name: 'מיכל כהן', location: 'תל אביב', text: 'חסכתי 1,500 ש"ח על כורסת עיסוי! מדהים!', rating: 5 },
    { name: 'יוסי לוי', location: 'חיפה', text: 'תהליך פשוט ומהיר. ממליץ לכולם!', rating: 5 },
    { name: 'דני אברהם', location: 'ירושלים', text: 'איכות מעולה במחיר שלא ייאמן. תודה VIPO!', rating: 5 },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=10&type=stock');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!carouselRef.current || products.length === 0) return;
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [products]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const steps = [
    { icon: ShoppingCart, title: 'בחירת מוצר', desc: 'בוחרים מוצר מהקטלוג שלנו' },
    { icon: Users, title: 'הצטרפות לקבוצה', desc: 'מצטרפים לקבוצת רכישה' },
    { icon: Share2, title: 'שיתוף', desc: 'משתפים עם חברים ומשפחה' },
    { icon: TrendingDown, title: 'המחיר יורד', desc: 'ככל שמצטרפים יותר - המחיר יורד' },
    { icon: CheckCircle, title: 'סגירת קבוצה', desc: 'הקבוצה נסגרת כשמגיעים ליעד' },
    { icon: Truck, title: 'משלוח', desc: 'המוצר נשלח ישירות אליכם' },
  ];

  const priceTable = [
    { participants: '1-9', price: '₪1,850', highlight: false },
    { participants: '10-19', price: '₪1,600', highlight: false },
    { participants: '20-39', price: '₪1,350', highlight: false },
    { participants: '40+', price: '₪1,150', highlight: true },
  ];

  const audiences = [
    { title: 'משפחות', desc: 'חיסכון משמעותי על מוצרים לבית', icon: 'F' },
    { title: 'עסקים קטנים', desc: 'רכישה סיטונאית במחירי מפעל', icon: 'B' },
    { title: 'יזמים', desc: 'הזדמנות להרוויח כסוכנים', icon: 'E' },
    { title: 'מוסדות', desc: 'רכישות גדולות בהנחות משמעותיות', icon: 'I' },
  ];

  const faqs = [
    { q: 'האם יש התחייבות כספית?', a: 'לא! מצטרפים בלי לשלם. רק כשהקבוצה נסגרת ומגיעים ליעד - משלמים.' },
    { q: 'איך עובד חבר מביא חבר?', a: 'כל חבר שמצטרף דרך הקישור שלכם מזכה אתכם בעמלה. ככל שמביאים יותר - מרוויחים יותר!' },
    { q: 'מה אם לא מצטרפים מספיק אנשים?', a: 'אם הקבוצה לא מגיעה ליעד המינימלי, העסקה מבוטלת ואף אחד לא משלם.' },
    { q: 'כיצד מתבצע המשלוח?', a: 'המוצרים נשלחים ישירות מהמפעל לכתובת שלכם. משלוח חינם ברוב המקרים!' },
    { q: 'יש אחריות על המוצרים?', a: 'כן! כל המוצרים מגיעים עם אחריות יצרן מלאה, בדיוק כמו בחנות רגילה.' },
  ];

  const stats = [
    { value: '+9,500', label: 'לקוחות מרוצים' },
    { value: '2018', label: 'שנת הקמה' },
    { value: 'ישראל + סין', label: 'נוכחות בינלאומית' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.85) 0%, rgba(8, 145, 178, 0.85) 100%)' }}
        />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 
            className="text-4xl md:text-6xl font-bold text-white mb-4"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            קונים חכם, חוסכים יותר
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            פלטפורמת הרכישה הקבוצתית המובילה בישראל
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/products"
              className="px-8 py-4 bg-white text-blue-900 font-bold rounded-full text-lg hover:scale-105 transition-transform shadow-xl"
            >
              למוצרים
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border-2 border-white text-white font-bold rounded-full text-lg hover:bg-white/10 transition-all"
            >
              איך זה עובד?
            </a>
          </div>

          {products.length > 0 && (
            <div className="mt-8">
              <h3 className="text-white text-lg mb-4 font-semibold">מוצרים חמים</h3>
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                {products.map((product) => {
                  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
                  const firstImage = mediaImages[0];
                  const primaryImage =
                    firstImage?.url || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=%F0%9F%93%A6';
                  const productPath = getProductPublicPath(product);

                  return (
                    <Link
                      key={product._id}
                      href={productPath}
                      className="flex-shrink-0 w-40 bg-white/95 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
                    >
                      <div className="aspect-square relative bg-gray-100">
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="p-2 text-right">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{product.name}</h4>
                        <p className="text-lg font-bold" style={{ color: '#1e3a8a' }}>
                          ₪{product.price?.toLocaleString('he-IL')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto">
            <path d="M0 100V50C360 0 1080 100 1440 50V100H0Z" fill="#f8f9fa"/>
          </svg>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
            איך זה עובד?
          </h2>
          <p className="text-gray-600 mb-8">צפו בסרטון ההסבר שלנו</p>
          
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <video
              className="w-full"
              poster="/images/hero-bg.jpg"
              controls
            >
              <source src="/videos/explainer.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4" style={{ background: gradient }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            6 צעדים פשוטים לחיסכון
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-all"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm mb-2">
                  שלב {index + 1}
                </span>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-white/80 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price Table */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
            ככל שמצטרפים יותר - המחיר יורד!
          </h2>
          <p className="text-gray-600 mb-8">דוגמה לטבלת מחירים</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {priceTable.map((tier, index) => (
              <div
                key={index}
                className={`rounded-xl p-6 ${tier.highlight ? 'ring-4 ring-cyan-400' : ''}`}
                style={{ 
                  background: tier.highlight ? gradient : 'linear-gradient(135deg, #f8f9fa 0%, #e5e7eb 100%)',
                  color: tier.highlight ? 'white' : '#1e3a8a'
                }}
              >
                <div className="text-lg font-bold mb-2">{tier.participants}</div>
                <div className="text-sm opacity-80 mb-2">משתתפים</div>
                <div className="text-2xl font-bold">{tier.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No Commitment */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: gradient }}>
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
            אין התחייבות!
          </h2>
          <p className="text-gray-600 text-lg">
            מצטרפים בלי לשלם. רק כשהקבוצה נסגרת ומגיעים ליעד - משלמים.
          </p>
        </div>
      </section>

      {/* Refer a Friend */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: gradient }}>
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#1e3a8a' }}>
              חבר מביא חבר
            </h2>
            <p className="text-gray-600">הרוויחו כסף על כל חבר שמצטרף!</p>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="p-4">
                <div className="text-3xl mb-2 font-bold">1</div>
                <h4 className="font-bold mb-1">קבלו קישור אישי</h4>
                <p className="text-sm text-gray-600">הירשמו כסוכנים וקבלו קישור ייחודי</p>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2 font-bold">2</div>
                <h4 className="font-bold mb-1">שתפו חברים</h4>
                <p className="text-sm text-gray-600">שלחו את הקישור לחברים ומשפחה</p>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2 font-bold">3</div>
                <h4 className="font-bold mb-1">הרוויחו עמלה</h4>
                <p className="text-sm text-gray-600">קבלו עמלה על כל רכישה!</p>
              </div>
            </div>
            
            <Link
              href="/join"
              className="inline-block px-8 py-3 text-white font-bold rounded-full hover:scale-105 transition-transform"
              style={{ background: gradient }}
            >
              להירשם כסוכן
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 px-4" style={{ background: gradient }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            למי זה מתאים?
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {audiences.map((audience, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-3">{audience.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{audience.title}</h3>
                <p className="text-white/0 group-hover:text-white/80 text-sm transition-all">
                  {audience.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#1e3a8a' }}>
            שאלות נפוצות
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl overflow-hidden border border-gray-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-right bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold" style={{ color: '#1e3a8a' }}>{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    style={{ color: '#0891b2' }}
                  />
                </button>
                {openFaq === index && (
                  <div className="p-4 bg-white text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12" style={{ color: '#1e3a8a' }}>
            מה הלקוחות אומרים
          </h2>
          
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-xl text-gray-700 mb-6">
                &quot;{testimonials[currentTestimonial].text}&quot;
              </p>
              <div className="font-bold" style={{ color: '#1e3a8a' }}>
                {testimonials[currentTestimonial].name}
              </div>
              <div className="text-gray-500 text-sm">
                {testimonials[currentTestimonial].location}
              </div>
            </div>
            
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentTestimonial ? 'scale-125' : 'bg-gray-300'
                  }`}
                  style={{ background: index === currentTestimonial ? gradient : undefined }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4" style={{ background: gradient }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">VIPO Group</h2>
          <p className="text-white/80 mb-12">מובילים את מהפכת הרכישה הקבוצתית מאז 2018</p>
          
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-2">קונים חכם</h3>
              <p className="text-gray-400 text-sm mb-4">
                פלטפורמת הרכישה הקבוצתית המובילה בישראל. מחברים לקוחות למפעלים בעולם.
              </p>
              <div className="flex gap-3">
                <a
                  href={`https://instagram.com/${CONTACT.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href={CONTACT.whatsappGroup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a
                  href="https://facebook.com/vipogroup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">קישורים</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">עמוד הבית</Link></li>
                <li><Link href="/products" className="hover:text-white transition-colors">מוצרים</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">אודות</Link></li>
                <li><Link href="/join" className="hover:text-white transition-colors">הצטרפו כסוכנים</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">צרו קשר</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: '#0891b2' }} />
                  <a href={`tel:${CONTACT.phone}`} className="hover:text-white">{CONTACT.phone}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: '#0891b2' }} />
                  <a href={`mailto:${CONTACT.email}`} className="hover:text-white">{CONTACT.email}</a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: '#0891b2' }} />
                  <span>{CONTACT.address}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#0891b2' }} />
                  <span>א&apos;-ה&apos; 09:00-18:00</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} VIPO Group. כל הזכויות שמורות.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">פרטיות</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${CONTACT.phoneIntl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        style={{ background: '#25D366' }}
      >
        <MessageCircle className="w-7 h-7 text-white fill-white" />
      </a>
    </div>
  );
}
