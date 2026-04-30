import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  isContact: { type: Boolean, default: false },
  questions: [QuestionSchema],
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const BotConfigSchema = new mongoose.Schema({
  // Owner type: 'admin' for super admin, 'business' for business owners
  ownerType: {
    type: String,
    enum: ['admin', 'business'],
    required: true,
    index: true
  },
  // Business ID (only for business type, null for admin)
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null,
    index: true
  },
  
  // Bot texts
  texts: {
    title: { type: String, default: 'שירות לקוחות' },
    subtitle: { type: String, default: 'מענה מיידי לשאלות נפוצות' },
    welcome1: { type: String, default: 'שלום! אני הבוט של VIPO.' },
    welcome2: { type: String, default: 'איך אפשר לעזור לך היום?' },
    happyHelp: { type: String, default: 'נשמח לעזור!' },
    writeMessage: { type: String, default: 'כתוב את ההודעה שלך ונציג יחזור אליך בהקדם:' },
    whatKnow: { type: String, default: 'מה תרצה לדעת?' },
    anythingElse: { type: String, default: 'האם יש משהו נוסף שאוכל לעזור?' },
    noAnswer: { type: String, default: 'לא מצאתי תשובה מתאימה.' },
    whatDo: { type: String, default: 'מה תרצה לעשות?' },
    goodbye: { type: String, default: 'תודה רבה! שמחנו לעזור. אם תצטרך עוד משהו, אני כאן.' },
    sentSuccess: { type: String, default: 'ההודעה נשלחה בהצלחה!' },
    teamReply: { type: String, default: 'צוות התמיכה יחזור אליך בהקדם. יש משהו נוסף?' },
    sendError: { type: String, default: 'שגיאה בשליחה. נסה שוב או התקשר 053-375-2633' },
    moreHelp: { type: String, default: 'האם יש משהו נוסף?' },
    chooseTopic: { type: String, default: 'בחר נושא:' }
  },
  
  // Button texts
  buttons: {
    otherTopic: { type: String, default: 'נושא אחר' },
    talkAgent: { type: String, default: 'שיחה עם נציג' },
    thanks: { type: String, default: 'זה הכל, תודה' },
    backTopics: { type: String, default: 'חזרה לנושאים' },
    send: { type: String, default: 'שלח' },
    sending: { type: String, default: 'שולח...' },
    cancel: { type: String, default: 'ביטול' }
  },
  
  // Placeholder texts
  placeholders: {
    message: { type: String, default: 'כתוב את ההודעה שלך...' },
    agent: { type: String, default: 'כתוב הודעה לנציג...' },
    question: { type: String, default: 'כתוב שאלה...' }
  },
  
  // FAQ Categories with questions
  categories: [CategorySchema],
  
  // Settings
  settings: {
    isActive: { type: Boolean, default: true },
    showOnAllPages: { type: Boolean, default: true },
    position: { type: String, enum: ['left', 'right'], default: 'left' },
    primaryColor: { type: String, default: '#1e3a8a' },
    secondaryColor: { type: String, default: '#0891b2' },
    buttonX: { type: Number, default: 24 },
    buttonY: { type: Number, default: 24 },
    buttonScale: { type: Number, default: 1 }
  }
}, {
  timestamps: true
});

// Compound index for unique owner
BotConfigSchema.index({ ownerType: 1, businessId: 1 }, { unique: true });

// Default categories
BotConfigSchema.statics.getDefaultCategories = function() {
  return [
    {
      id: 'shipping',
      name: 'משלוחים',
      isContact: false,
      order: 1,
      isActive: true,
      questions: [
        { id: 'ship_1', question: 'כמה זמן לוקח משלוח?', answer: 'משלוחים מגיעים תוך 3-5 ימי עסקים. משלוח אקספרס תוך 1-2 ימי עסקים.', order: 1, isActive: true },
        { id: 'ship_2', question: 'האם יש משלוח חינם?', answer: 'כן! משלוח חינם בכל הזמנה מעל ₪200.', order: 2, isActive: true },
        { id: 'ship_3', question: 'לאן אתם שולחים?', answer: 'אנחנו שולחים לכל רחבי הארץ, כולל יהודה ושומרון.', order: 3, isActive: true },
        { id: 'ship_4', question: 'מעקב משלוח', answer: 'לאחר המשלוח תקבל SMS עם קישור למעקב. ניתן גם לעקוב באזור "ההזמנות שלי".', order: 4, isActive: true },
      ]
    },
    {
      id: 'payment',
      name: 'תשלומים',
      isContact: false,
      order: 2,
      isActive: true,
      questions: [
        { id: 'pay_1', question: 'אמצעי תשלום', answer: 'אנחנו מקבלים כרטיסי אשראי (ויזה, מאסטרקארד, אמקס), ביט, PayPal ותשלום במזומן בעת האיסוף.', order: 1, isActive: true },
        { id: 'pay_2', question: 'תשלומים', answer: 'כן! עד 12 תשלומים ללא ריבית בכרטיסי אשראי נבחרים.', order: 2, isActive: true },
        { id: 'pay_3', question: 'אבטחת תשלום', answer: 'בהחלט! אנחנו משתמשים בהצפנת SSL ועומדים בתקן PCI DSS לאבטחת תשלומים.', order: 3, isActive: true },
      ]
    },
    {
      id: 'returns',
      name: 'החזרות וביטולים',
      isContact: false,
      order: 3,
      isActive: true,
      questions: [
        { id: 'ret_1', question: 'מדיניות החזרות', answer: 'ניתן להחזיר מוצרים תוך 14 יום מיום הקנייה, כל עוד המוצר באריזתו המקורית ובמצב תקין.', order: 1, isActive: true },
        { id: 'ret_2', question: 'ביטול הזמנה', answer: 'ניתן לבטל הזמנה לפני המשלוח באזור "ההזמנות שלי" או ליצור קשר עם שירות הלקוחות.', order: 2, isActive: true },
        { id: 'ret_3', question: 'החזר כספי', answer: 'ההחזר מתבצע תוך 7-14 ימי עסקים לאמצעי התשלום המקורי.', order: 3, isActive: true },
      ]
    },
    {
      id: 'account',
      name: 'חשבון וסוכנים',
      isContact: false,
      order: 4,
      isActive: true,
      questions: [
        { id: 'acc_1', question: 'הרשמה לאתר', answer: 'לחצו על "החשבון שלי" בתפריט העליון ובחרו "הרשמה". תוכלו להירשם עם מייל או דרך גוגל.', order: 1, isActive: true },
        { id: 'acc_2', question: 'להפוך לסוכן', answer: 'ניתן להירשם כסוכן דרך האזור האישי. סוכנים מרוויחים עמלות על כל מכירה שהביאו!', order: 2, isActive: true },
        { id: 'acc_3', question: 'יתרונות סוכן', answer: 'סוכנים מקבלים עמלה על כל מכירה, גישה למוצרים בלעדיים, ותמיכה אישית.', order: 3, isActive: true },
        { id: 'acc_4', question: 'שכחתי סיסמה', answer: 'לחצו על "שכחתי סיסמה" בדף ההתחברות ונשלח לכם קישור לאיפוס למייל.', order: 4, isActive: true },
      ]
    },
    {
      id: 'general',
      name: 'שאלות כלליות',
      isContact: false,
      order: 5,
      isActive: true,
      questions: [
        { id: 'gen_1', question: 'שעות פעילות', answer: 'אנחנו זמינים בימים א\'-ה\' 9:00-18:00, ו\' 9:00-13:00. שבת - סגור.', order: 1, isActive: true },
        { id: 'gen_2', question: 'יצירת קשר', answer: 'טלפון: 053-375-2633 | מייל: support@vipo.co.il | וואטסאפ: 053-375-2633', order: 2, isActive: true },
        { id: 'gen_3', question: 'חנות פיזית', answer: 'כרגע אנחנו פועלים באונליין בלבד, עם נקודות איסוף ברחבי הארץ.', order: 3, isActive: true },
      ]
    },
    {
      id: 'support',
      name: 'שיחה עם נציג',
      isContact: true,
      order: 6,
      isActive: true,
      questions: []
    }
  ];
};

export default mongoose.models.BotConfig || mongoose.model('BotConfig', BotConfigSchema);
