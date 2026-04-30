/**
 * editTextSafely - פונקציה מרכזית מוגנת לעריכת טקסט
 * מבטיחה שרק התוכן הטקסטואלי ישתנה ללא פגיעה בעיצוב או בפריסה
 */

// רשימת תכונות CSS קריטיות לבדיקה
const CRITICAL_STYLES = [
  // Typography
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'textTransform', 'textAlign', 'textDecoration', 'whiteSpace', 'direction',
  
  // Colors
  'color', 'backgroundColor',
  
  // Box Model
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'border', 'borderWidth', 'borderStyle', 'borderColor',
  
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left',
  'float', 'clear', 'overflow', 'overflowX', 'overflowY',
  
  // Flexbox
  'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'order', 'alignSelf',
  
  // Grid
  'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gap',
  'gridColumn', 'gridRow', 'justifySelf',
  
  // Transform & Effects
  'transform', 'opacity', 'visibility', 'zIndex'
];

// טולרנס למדדי פיקסלים
const PIXEL_TOLERANCE = 1;

// סניטציה של טקסט - הסרת HTML וסקריפטים
function sanitizeText(text) {
  // הסרת תגי HTML
  const temp = document.createElement('div');
  temp.textContent = text;
  return temp.textContent;
}

// לקיחת snapshot של סגנונות
function captureStyles(element) {
  const computed = window.getComputedStyle(element);
  const snapshot = {};
  
  // שמירת computed styles
  CRITICAL_STYLES.forEach(prop => {
    snapshot[prop] = computed[prop];
  });
  
  // שמירת מידות ומיקום
  const rect = element.getBoundingClientRect();
  snapshot.boundingRect = {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom
  };
  
  // שמירת attributes
  snapshot.className = element.className;
  snapshot.id = element.id;
  snapshot.style = element.getAttribute('style') || '';
  
  // שמירת הורים
  if (element.parentElement) {
    const parentRect = element.parentElement.getBoundingClientRect();
    snapshot.parentRect = {
      width: parentRect.width,
      height: parentRect.height
    };
  }
  
  return snapshot;
}

// השוואת סגנונות
function compareStyles(before, after, element) {
  const computed = window.getComputedStyle(element);
  const violations = [];
  
  // בדיקת computed styles
  CRITICAL_STYLES.forEach(prop => {
    const beforeVal = before[prop];
    const afterVal = computed[prop];
    
    if (beforeVal !== afterVal) {
      // בדיקה מיוחדת למדדי פיקסלים
      if (beforeVal && afterVal && (beforeVal.includes('px') || afterVal.includes('px'))) {
        const beforeNum = parseFloat(beforeVal);
        const afterNum = parseFloat(afterVal);
        
        if (!isNaN(beforeNum) && !isNaN(afterNum)) {
          if (Math.abs(beforeNum - afterNum) > PIXEL_TOLERANCE) {
            violations.push({
              property: prop,
              before: beforeVal,
              after: afterVal,
              delta: Math.abs(beforeNum - afterNum)
            });
          }
        } else {
          violations.push({ property: prop, before: beforeVal, after: afterVal });
        }
      } else if (beforeVal !== afterVal) {
        violations.push({ property: prop, before: beforeVal, after: afterVal });
      }
    }
  });
  
  // בדיקת מידות
  const rect = element.getBoundingClientRect();
  const rectChanges = [];
  
  ['width', 'height'].forEach(dim => {
    const delta = Math.abs(rect[dim] - before.boundingRect[dim]);
    if (delta > PIXEL_TOLERANCE) {
      rectChanges.push({
        dimension: dim,
        before: before.boundingRect[dim],
        after: rect[dim],
        delta
      });
    }
  });
  
  // בדיקת class ו-style attribute
  if (element.className !== before.className) {
    violations.push({
      property: 'className',
      before: before.className,
      after: element.className
    });
  }
  
  const currentStyle = element.getAttribute('style') || '';
  if (currentStyle !== before.style) {
    violations.push({
      property: 'style attribute',
      before: before.style,
      after: currentStyle
    });
  }
  
  return {
    hasViolations: violations.length > 0 || rectChanges.length > 0,
    violations,
    rectChanges
  };
}

/**
 * עריכת טקסט בטוחה עם rollback אוטומטי
 * @param {HTMLElement} element - האלמנט לעריכה
 * @param {string} newText - הטקסט החדש
 * @param {object} options - אפשרויות נוספות
 * @returns {object} - { success, error, rollback }
 */
export function editTextSafely(element, newText, options = {}) {
  const {
    allowHTML = false,
    skipValidation = false,
    onError = null
  } = options;
  
  if (!element) {
    return { success: false, error: 'Element is required' };
  }
  
  // סניטציה של הטקסט
  const sanitizedText = allowHTML ? newText : sanitizeText(newText);
  
  // שמירת מצב לפני השינוי
  const originalText = element.textContent;
  const stylesBefore = skipValidation ? null : captureStyles(element);
  
  try {
    // עדכון הטקסט בלבד - לא innerHTML!
    element.textContent = sanitizedText;
    
    // אם לא צריך ולידציה, סיום
    if (skipValidation) {
      return { success: true };
    }
    
    // המתנה קצרה לרנדור
    requestAnimationFrame(() => {
      // בדיקת שינויים
      const comparison = compareStyles(stylesBefore, stylesBefore, element);
      
      if (comparison.hasViolations) {
        // Rollback
        element.textContent = originalText;
        
        const errorMsg = 'הטקסט גורם לשינוי עיצוב - נדרש קיצור או שבירת שורות';
        
        if (onError) {
          onError({
            message: errorMsg,
            violations: comparison.violations,
            rectChanges: comparison.rectChanges
          });
        }
        
        return {
          success: false,
          error: errorMsg,
          violations: comparison.violations,
          rectChanges: comparison.rectChanges,
          rollback: true
        };
      }
    });
    
    return { success: true };
    
  } catch (error) {
    // במקרה של שגיאה, החזרת המצב המקורי
    try {
      element.textContent = originalText;
    } catch (e) {
      console.error('Failed to rollback:', e);
    }
    
    return {
      success: false,
      error: error.message,
      rollback: true
    };
  }
}

/**
 * ולידציה של טקסט לפני עריכה
 * @param {HTMLElement} element - האלמנט לבדיקה
 * @param {string} newText - הטקסט החדש
 * @returns {object} - { valid, issues }
 */
export function validateTextEdit(element, newText) {
  if (!element || !newText) {
    return { valid: false, issues: ['Element and text are required'] };
  }
  
  const issues = [];
  
  // בדיקת אורך
  const currentLength = element.textContent.length;
  const newLength = newText.length;
  const lengthRatio = newLength / currentLength;
  
  if (lengthRatio > 2) {
    issues.push(`הטקסט החדש ארוך פי ${lengthRatio.toFixed(1)} מהמקורי`);
  }
  
  // בדיקת תווים מיוחדים
  if (/<[^>]+>/.test(newText)) {
    issues.push('הטקסט מכיל תגי HTML');
  }
  
  if (/<script|javascript:|on\w+=/i.test(newText)) {
    issues.push('הטקסט מכיל קוד חשוד');
  }
  
  // בדיקת שורות חדשות
  const currentLines = element.textContent.split('\n').length;
  const newLines = newText.split('\n').length;
  
  if (newLines > currentLines * 2) {
    issues.push('יותר מדי שורות חדשות');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * יצירת wrapper לאלמנט עם הגנה
 * @param {HTMLElement} element 
 * @returns {object} - Protected element wrapper
 */
export function createProtectedElement(element) {
  // שמירת המצב ההתחלתי
  const initialState = {
    text: element.textContent,
    styles: captureStyles(element),
    attributes: {
      className: element.className,
      id: element.id,
      style: element.getAttribute('style')
    }
  };
  
  // יצירת Proxy להגנה
  const protectedElement = new Proxy(element, {
    set(target, property, value) {
      // חסימת שינויי style ו-class
      if (property === 'className' || property === 'style' || property === 'innerHTML') {
        console.warn(`Blocked attempt to modify ${property}`);
        return false;
      }
      
      // רק textContent מותר
      if (property === 'textContent') {
        const result = editTextSafely(target, value);
        if (result.success) {
          return Reflect.set(target, property, value);
        } else {
          console.error('Text edit failed:', result.error);
          return false;
        }
      }
      
      return Reflect.set(target, property, value);
    }
  });
  
  return {
    element: protectedElement,
    reset: () => {
      element.textContent = initialState.text;
      element.className = initialState.attributes.className;
      if (initialState.attributes.style) {
        element.setAttribute('style', initialState.attributes.style);
      }
    },
    getInitialState: () => initialState
  };
}

export default editTextSafely;
