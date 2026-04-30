import { withErrorLogging } from './errorLogger';

export function wrapRouteHandlers(handlers = {}, options = {}) {
  const wrapped = {};

  Object.entries(handlers).forEach(([method, handler]) => {
    if (typeof handler !== 'function') {
      wrapped[method] = handler;
      return;
    }

    wrapped[method] = withErrorLogging(handler, options);
  });

  return wrapped;
}

export default wrapRouteHandlers;
