import * as assert from 'assert';
import { strToU8, zipSync } from 'fflate';
import {
  assertEpubArchiveSize,
  unzipEpubWithLimits,
  type EpubSafetyLimits
} from '../../infrastructure/parsers/EpubSafety';

const limits: EpubSafetyLimits = {
  maxArchiveBytes: 2048,
  maxEntryBytes: 16,
  maxTotalUncompressedBytes: 20,
  maxEntries: 2
};

suite('EPUB import safety limits', () => {
  test('accepts a normal small archive and preserves text', () => {
    const zip = zipSync({ 'chapter.xhtml': strToU8('hello') });
    const files = unzipEpubWithLimits(zip, limits);
    assert.strictEqual(new TextDecoder().decode(files['chapter.xhtml']), 'hello');
  });

  test('rejects an oversized compressed archive before unpacking', () => {
    assert.throws(() => assertEpubArchiveSize(2049, limits), /compressed size/);
    const zip = zipSync({ 'chapter.xhtml': strToU8('hello') });
    assert.throws(() => unzipEpubWithLimits(zip, { ...limits, maxArchiveBytes: zip.length - 1 }), /compressed size/);
  });

  test('rejects large expanded entries', () => {
    const zip = zipSync({ 'chapter.xhtml': strToU8('x'.repeat(17)) });
    assert.throws(() => unzipEpubWithLimits(zip, limits), /entry is too large/);
  });

  test('rejects too many entries', () => {
    const zip = zipSync({
      'a.xhtml': strToU8('a'),
      'b.xhtml': strToU8('b'),
      'c.xhtml': strToU8('c')
    });
    assert.throws(() => unzipEpubWithLimits(zip, limits), /too many files/);
  });

  test('rejects too much combined expanded content', () => {
    const zip = zipSync({
      'a.xhtml': strToU8('a'.repeat(11)),
      'b.xhtml': strToU8('b'.repeat(11))
    });
    assert.throws(() => unzipEpubWithLimits(zip, limits), /total uncompressed size/);
  });
});
