function parseStandardMongoUri(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('mongodb://')) {
    return null;
  }

  const withoutProtocol = uri.slice('mongodb://'.length);
  const slashIndex = withoutProtocol.indexOf('/');
  const authority = slashIndex >= 0 ? withoutProtocol.slice(0, slashIndex) : withoutProtocol;
  const suffix = slashIndex >= 0 ? withoutProtocol.slice(slashIndex) : '/';

  if (!authority) {
    return null;
  }

  const atIndex = authority.lastIndexOf('@');
  const auth = atIndex >= 0 ? authority.slice(0, atIndex) : '';
  const hostListRaw = atIndex >= 0 ? authority.slice(atIndex + 1) : authority;
  const hosts = hostListRaw
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  if (hosts.length === 0) {
    return null;
  }

  const queryIndex = suffix.indexOf('?');
  const pathPart = queryIndex >= 0 ? suffix.slice(0, queryIndex) : suffix;
  const queryPart = queryIndex >= 0 ? suffix.slice(queryIndex + 1) : '';

  return {
    auth,
    hosts,
    pathPart: pathPart || '/',
    queryPart,
  };
}

export function isDirectConnectionUri(uri) {
  if (typeof uri !== 'string' || !uri) {
    return false;
  }

  return /(?:^|[?&])directConnection=true(?:&|$)/i.test(uri);
}

export function isWritablePrimaryFromHello(helloDoc) {
  return Boolean(
    helloDoc?.isWritablePrimary ||
      helloDoc?.ismaster === true ||
      helloDoc?.isMaster === true,
  );
}

export function deriveDirectConnectionCandidates(uri) {
  const parsed = parseStandardMongoUri(uri);
  if (!parsed) {
    return [];
  }

  if (parsed.hosts.length <= 1 || isDirectConnectionUri(uri)) {
    return [];
  }

  const params = new URLSearchParams(parsed.queryPart);
  params.set('directConnection', 'true');
  params.delete('replicaSet');

  const queryString = params.toString();
  const authPrefix = parsed.auth ? `${parsed.auth}@` : '';

  return parsed.hosts.map(
    (host) => `mongodb://${authPrefix}${host}${parsed.pathPart}${queryString ? `?${queryString}` : ''}`,
  );
}

export function expandMongoUriCandidates(candidates) {
  const expanded = [];
  const seen = new Set();

  const addCandidate = (uri) => {
    if (!uri || seen.has(uri)) {
      return;
    }
    seen.add(uri);
    expanded.push(uri);
  };

  for (const uri of candidates || []) {
    addCandidate(uri);
    for (const derived of deriveDirectConnectionCandidates(uri)) {
      addCandidate(derived);
    }
  }

  return expanded;
}
