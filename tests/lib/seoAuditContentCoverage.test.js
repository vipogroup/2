import { describe, expect, it } from 'vitest';
import { buildAuditContentCorpus, buildDuplicateSignature } from '@/lib/seoAuditContentCoverage';

const longCorpusPrefix = 'א'.repeat(230);

function productStub(overrides = {}) {
  return {
    _id: '000000000000000000000001',
    description: '',
    fullDescription: `<p>${longCorpusPrefix}</p>`,
    seo: { metaDescription: '', slug: 'product-a' },
    suitableFor: '',
    whyChooseUs: '',
    warranty: '',
    ...overrides,
  };
}

describe('seoAuditContentCoverage', () => {
  it('buildDuplicateSignature differs by slug when body prefix matches', () => {
    const a = productStub({ seo: { slug: 'same-body-a', metaDescription: '' } });
    const b = productStub({ seo: { slug: 'same-body-b', metaDescription: '' } });
    expect(buildAuditContentCorpus(a)).toBe(buildAuditContentCorpus(b));
    expect(buildDuplicateSignature(a)).not.toBe(buildDuplicateSignature(b));
  });

  it('buildDuplicateSignature returns empty for short corpus', () => {
    const p = productStub({
      fullDescription: '<p>short</p>',
      seo: { slug: 'x', metaDescription: '' },
    });
    expect(buildDuplicateSignature(p)).toBe('');
  });

  it('buildDuplicateSignature falls back to _id when slug missing', () => {
    const p1 = productStub({ _id: '64a1a1a1a1a1a1a1a1a1a1a1', seo: {} });
    const p2 = productStub({ _id: '64b2b2b2b2b2b2b2b2b2b2b2', seo: {} });
    expect(buildDuplicateSignature(p1)).not.toBe(buildDuplicateSignature(p2));
  });
});
