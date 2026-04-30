import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import BotConfig from '@/models/BotConfig';

function buildFallbackConfig(ownerType = 'admin', businessId = null) {
  const normalizedOwnerType = ownerType === 'business' ? 'business' : 'admin';

  return {
    ownerType: normalizedOwnerType,
    businessId: normalizedOwnerType === 'business' ? businessId : null,
    texts: {
      title: 'שירות לקוחות',
      subtitle: 'מענה מיידי לשאלות נפוצות',
      welcome1: 'שלום! אני הבוט של VIPO.',
      welcome2: 'איך אפשר לעזור לך היום?',
      happyHelp: 'נשמח לעזור!',
      writeMessage: 'כתוב את ההודעה שלך ונציג יחזור אליך בהקדם:',
      whatKnow: 'מה תרצה לדעת?',
      anythingElse: 'האם יש משהו נוסף שאוכל לעזור?',
      noAnswer: 'לא מצאתי תשובה מתאימה.',
      whatDo: 'מה תרצה לעשות?',
      goodbye: 'תודה רבה! שמחנו לעזור. אם תצטרך עוד משהו, אני כאן.',
      sentSuccess: 'ההודעה נשלחה בהצלחה!',
      teamReply: 'צוות התמיכה יחזור אליך בהקדם. יש משהו נוסף?',
      sendError: 'שגיאה בשליחה. נסה שוב או התקשר 053-375-2633',
      moreHelp: 'האם יש משהו נוסף?',
      chooseTopic: 'בחר נושא:',
    },
    buttons: {
      otherTopic: 'נושא אחר',
      talkAgent: 'שיחה עם נציג',
      thanks: 'זה הכל, תודה',
      backTopics: 'חזרה לנושאים',
      send: 'שלח',
      sending: 'שולח...',
      cancel: 'ביטול',
    },
    placeholders: {
      message: 'כתוב את ההודעה שלך...',
      agent: 'כתוב הודעה לנציג...',
      question: 'כתוב שאלה...',
    },
    categories: BotConfig.getDefaultCategories(),
    settings: {
      isActive: true,
      showOnAllPages: true,
      position: 'left',
      primaryColor: '#1e3a8a',
      secondaryColor: '#0891b2',
      buttonX: 24,
      buttonY: 24,
      buttonScale: 1,
    },
  };
}

// GET - Fetch bot config based on owner type
async function GETHandler(request) {
  const { searchParams } = new URL(request.url);
  const ownerType = searchParams.get('ownerType') || 'admin';
  const businessId = searchParams.get('businessId') || null;

  try {
    await connectMongo();
    
    let query = { ownerType };
    if (ownerType === 'business' && businessId) {
      query.businessId = businessId;
    } else if (ownerType === 'admin') {
      query.businessId = null;
    }
    
    let config = await BotConfig.findOne(query);
    
    // If no config exists, create default
    if (!config) {
      config = new BotConfig({
        ownerType,
        businessId: ownerType === 'business' ? businessId : null,
        categories: BotConfig.getDefaultCategories()
      });
      await config.save();
    }
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
        console.error('BOT_CONFIG_DB_UNAVAILABLE:', error?.message || error);
        return NextResponse.json({
          success: true,
          config: buildFallbackConfig(ownerType, businessId),
          fallback: true,
          reason: 'db_unavailable',
        });
  }
}

// PUT - Update bot config
async function PUTHandler(request) {
  try {
    await connectMongo();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { ownerType, businessId, texts, buttons, placeholders, categories, settings } = body;
    
    let query = { ownerType };
    if (ownerType === 'business' && businessId) {
      query.businessId = businessId;
    } else if (ownerType === 'admin') {
      query.businessId = null;
    }
    
    const updateData = {};
    if (texts) updateData.texts = texts;
    if (buttons) updateData.buttons = buttons;
    if (placeholders) updateData.placeholders = placeholders;
    if (categories) updateData.categories = categories;
    if (settings) updateData.settings = settings;
    
    const config = await BotConfig.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating bot config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add category or question
async function POSTHandler(request) {
  try {
    await connectMongo();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { ownerType, businessId, action, categoryId, data } = body;
    
    let query = { ownerType };
    if (ownerType === 'business' && businessId) {
      query.businessId = businessId;
    } else if (ownerType === 'admin') {
      query.businessId = null;
    }
    
    let config = await BotConfig.findOne(query);
    
    if (!config) {
      config = new BotConfig({
        ownerType,
        businessId: ownerType === 'business' ? businessId : null,
        categories: BotConfig.getDefaultCategories()
      });
    }
    
    if (action === 'addCategory') {
      const newCategory = {
        id: `cat_${Date.now()}`,
        name: data.name || 'קטגוריה חדשה',
        isContact: data.isContact || false,
        order: config.categories.length + 1,
        isActive: true,
        questions: []
      };
      config.categories.push(newCategory);
    } 
    else if (action === 'addQuestion' && categoryId) {
      const category = config.categories.find(c => c.id === categoryId);
      if (category) {
        const newQuestion = {
          id: `q_${Date.now()}`,
          question: data.question || 'שאלה חדשה',
          answer: data.answer || 'תשובה חדשה',
          order: category.questions.length + 1,
          isActive: true
        };
        category.questions.push(newQuestion);
      }
    }
    
    await config.save();
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error adding to bot config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove category or question
async function DELETEHandler(request) {
  try {
    await connectMongo();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const ownerType = searchParams.get('ownerType') || 'admin';
    const businessId = searchParams.get('businessId') || null;
    const action = searchParams.get('action');
    const categoryId = searchParams.get('categoryId');
    const questionId = searchParams.get('questionId');
    
    let query = { ownerType };
    if (ownerType === 'business' && businessId) {
      query.businessId = businessId;
    } else if (ownerType === 'admin') {
      query.businessId = null;
    }
    
    const config = await BotConfig.findOne(query);
    
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    
    if (action === 'deleteCategory' && categoryId) {
      config.categories = config.categories.filter(c => c.id !== categoryId);
    } 
    else if (action === 'deleteQuestion' && categoryId && questionId) {
      const category = config.categories.find(c => c.id === categoryId);
      if (category) {
        category.questions = category.questions.filter(q => q.id !== questionId);
      }
    }
    
    await config.save();
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting from bot config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const PUT = withErrorLogging(PUTHandler);
export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
