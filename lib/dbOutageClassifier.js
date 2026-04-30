const OUTAGE_ERROR_CODES = new Set([
  'MONGO_CIRCUIT_OPEN',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
]);

const OUTAGE_ERROR_NAMES = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoTopologyClosedError',
]);

const OUTAGE_MESSAGE_FRAGMENTS = [
  'mongo_circuit_open',
  'server selection timed out',
  'replicasetnoprimary',
  'topology is closed',
  'failed to connect',
  'connection timed out',
  'querysrv enotfound',
  'getaddrinfo enotfound',
  'socket timeout',
];

function collectErrorChain(error) {
  const chain = [];
  let current = error;
  let depth = 0;

  while (current && depth < 5) {
    chain.push(current);
    current = current.cause;
    depth += 1;
  }

  return chain;
}

export function isDbUnavailableError(error) {
  if (!error) {
    return false;
  }

  const chain = collectErrorChain(error);

  return chain.some((item) => {
    const code = String(item?.code || '').toUpperCase();
    const name = String(item?.name || '');
    const message = String(item?.message || '').toLowerCase();

    if (OUTAGE_ERROR_CODES.has(code)) {
      return true;
    }

    if (OUTAGE_ERROR_NAMES.has(name)) {
      return true;
    }

    return OUTAGE_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment));
  });
}
