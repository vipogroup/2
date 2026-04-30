/**
 * בדיקות אוטומטיות לפונקציות עריכת טקסט בטוחה
 */

import { editTextSafely, validateTextEdit, createProtectedElement } from '@/lib/editTextSafely';
import '@testing-library/jest-dom';

describe('editTextSafely', () => {
  let testElement;
  
  beforeEach(() => {
    // יצירת אלמנט בדיקה
    testElement = document.createElement('div');
    testElement.textContent = 'טקסט מקורי';
    testElement.style.width = '200px';
    testElement.style.height = '50px';
    testElement.className = 'test-class';
    document.body.appendChild(testElement);
  });
  
  afterEach(() => {
    document.body.removeChild(testElement);
  });
  
  test('מאפשר עריכת טקסט רגילה ללא שינוי עיצוב', () => {
    const result = editTextSafely(testElement, 'טקסט חדש');
    expect(result.success).toBe(true);
    expect(testElement.textContent).toBe('טקסט חדש');
  });
  
  test('מסיר HTML מטקסט לא בטוח', () => {
    const result = editTextSafely(testElement, '<script>alert("hack")</script>טקסט נקי');
    expect(result.success).toBe(true);
    expect(testElement.textContent).toBe('טקסט נקי');
    expect(testElement.innerHTML).not.toContain('<script>');
  });
  
  test('לא משנה className של האלמנט', () => {
    const originalClass = testElement.className;
    editTextSafely(testElement, 'טקסט חדש');
    expect(testElement.className).toBe(originalClass);
  });
  
  test('לא משנה style attribute', () => {
    const originalStyle = testElement.getAttribute('style');
    editTextSafely(testElement, 'טקסט חדש');
    expect(testElement.getAttribute('style')).toBe(originalStyle);
  });
  
  test('מזהה טקסט ארוך מדי בולידציה', () => {
    const longText = 'א'.repeat(1000);
    const validation = validateTextEdit(testElement, longText);
    expect(validation.valid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });
  
  test('מזהה תגי HTML בולידציה', () => {
    const validation = validateTextEdit(testElement, '<div>טקסט</div>');
    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain('הטקסט מכיל תגי HTML');
  });
  
  test('מזהה קוד JavaScript בולידציה', () => {
    const validation = validateTextEdit(testElement, 'javascript:alert(1)');
    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain('הטקסט מכיל קוד חשוד');
  });
});

describe('createProtectedElement', () => {
  let testElement;
  
  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.textContent = 'טקסט מקורי';
    testElement.className = 'original-class';
    document.body.appendChild(testElement);
  });
  
  afterEach(() => {
    document.body.removeChild(testElement);
  });
  
  test('יוצר אלמנט מוגן שחוסם שינויי className', () => {
    const protectedEl = createProtectedElement(testElement);
    
    // ניסיון לשנות className
    protectedEl.element.className = 'hacked-class';
    expect(testElement.className).toBe('original-class');
  });
  
  test('יוצר אלמנט מוגן שחוסם innerHTML', () => {
    const protectedEl = createProtectedElement(testElement);
    const originalHTML = testElement.innerHTML;
    
    // ניסיון להזריק HTML
    protectedEl.element.innerHTML = '<script>alert("hack")</script>';
    expect(testElement.innerHTML).toBe(originalHTML);
  });
  
  test('מאפשר שינוי textContent בבטחה', () => {
    const protectedEl = createProtectedElement(testElement);
    
    protectedEl.element.textContent = 'טקסט בטוח';
    expect(testElement.textContent).toBe('טקסט בטוח');
  });
  
  test('פונקציית reset מחזירה למצב המקורי', () => {
    const protectedEl = createProtectedElement(testElement);
    
    testElement.textContent = 'טקסט שונה';
    testElement.className = 'changed-class';
    
    protectedEl.reset();
    
    expect(testElement.textContent).toBe('טקסט מקורי');
    expect(testElement.className).toBe('original-class');
  });
});

describe('Integration Tests', () => {
  test('עריכה מלאה עם ולידציה ו-rollback', async () => {
    const container = document.createElement('div');
    container.style.width = '100px';
    container.style.height = '30px';
    container.textContent = 'קצר';
    document.body.appendChild(container);
    
    // טקסט ארוך מאוד שישבור את הפריסה
    const veryLongText = 'טקסט ארוך מאוד '.repeat(50);
    
    const result = editTextSafely(container, veryLongText, {
      onError: (error) => {
        expect(error.message).toContain('שינוי עיצוב');
      }
    });
    
    // וידוא שהטקסט חזר למקור
    setTimeout(() => {
      expect(container.textContent).toBe('קצר');
      document.body.removeChild(container);
    }, 100);
  });
  
  test('עדכון מרובה של אלמנטים', () => {
    const elements = [];
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('span');
      el.textContent = `טקסט ${i}`;
      el.setAttribute('data-text-key', `key-${i}`);
      document.body.appendChild(el);
      elements.push(el);
    }
    
    elements.forEach((el, i) => {
      const result = editTextSafely(el, `חדש ${i}`);
      expect(result.success).toBe(true);
      expect(el.textContent).toBe(`חדש ${i}`);
    });
    
    // ניקוי
    elements.forEach(el => document.body.removeChild(el));
  });
});
