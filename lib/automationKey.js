export function isAutomationRequest(req) {
  try {
    const expected = process.env.AUTOMATION_KEY || 'test-automation-key';
    const incoming = req?.headers?.get?.('x-automation-key');
    return !!incoming && incoming === expected;
  } catch {
    return false;
  }
}
