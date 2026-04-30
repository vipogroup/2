import { describe, expect, it } from 'vitest';

import {
  deriveDirectConnectionCandidates,
  expandMongoUriCandidates,
  isDirectConnectionUri,
  isWritablePrimaryFromHello,
} from '@/lib/mongoUriCandidates';

describe('mongoUriCandidates helpers', () => {
  it('derives direct candidates from multi-host mongodb URI', () => {
    const uri =
      'mongodb://user:pass@ac-u55h6xt-shard-00-01.pfotx6u.mongodb.net:27017,ac-u55h6xt-shard-00-02.pfotx6u.mongodb.net:27017/vipo?authSource=admin&replicaSet=atlas-abc-shard-0&tls=true';

    const directCandidates = deriveDirectConnectionCandidates(uri);

    expect(directCandidates).toHaveLength(2);
    expect(directCandidates[0]).toContain('ac-u55h6xt-shard-00-01.pfotx6u.mongodb.net:27017');
    expect(directCandidates[1]).toContain('ac-u55h6xt-shard-00-02.pfotx6u.mongodb.net:27017');
    expect(directCandidates[0]).toContain('directConnection=true');
    expect(directCandidates[1]).toContain('directConnection=true');
    expect(directCandidates[0]).not.toContain('replicaSet=');
    expect(directCandidates[1]).not.toContain('replicaSet=');
  });

  it('does not derive direct candidates from SRV URI', () => {
    const srv = 'mongodb+srv://user:pass@cluster0.pfotx6u.mongodb.net/vipo?retryWrites=true&w=majority';
    expect(deriveDirectConnectionCandidates(srv)).toEqual([]);
  });

  it('expands candidates while keeping original order and uniqueness', () => {
    const multiHost =
      'mongodb://user:pass@ac-u55h6xt-shard-00-01.pfotx6u.mongodb.net:27017,ac-u55h6xt-shard-00-02.pfotx6u.mongodb.net:27017/vipo?authSource=admin&tls=true';
    const expanded = expandMongoUriCandidates([multiHost, multiHost]);

    expect(expanded[0]).toBe(multiHost);
    expect(expanded).toHaveLength(3);
  });

  it('detects direct connection URIs and writable primary hello response', () => {
    expect(isDirectConnectionUri('mongodb://u:p@h/db?directConnection=true')).toBe(true);
    expect(isDirectConnectionUri('mongodb://u:p@h/db?authSource=admin')).toBe(false);

    expect(isWritablePrimaryFromHello({ isWritablePrimary: true })).toBe(true);
    expect(isWritablePrimaryFromHello({ ismaster: true })).toBe(true);
    expect(isWritablePrimaryFromHello({ isWritablePrimary: false, ismaster: false })).toBe(false);
  });
});
