const safeDetails = (details = {}) => {
  if (!details || typeof details !== 'object') {
    return details;
  }

  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    const output = {};
    for (const key of Object.keys(details)) {
      const value = details[key];
      output[key] = value instanceof Error ? value.message : value;
    }
    return output;
  }
};

export function logOperationalEvent(event, details = {}) {
  const payload = safeDetails(details);
  console.log(`[OBS] ${event}`, payload);
}

export function logSecurityAlert(event, details = {}) {
  const payload = safeDetails(details);
  console.warn(`[ALERT] ${event}`, payload);
}
