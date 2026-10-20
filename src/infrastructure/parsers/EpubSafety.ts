import { unzipSync } from 'fflate';

/** Import limits are intended to bound memory use for untrusted EPUB archives. */
export interface EpubSafetyLimits {
  readonly maxArchiveBytes: number;
  readonly maxEntryBytes: number;
  readonly maxTotalUncompressedBytes: number;
  readonly maxEntries: number;
}

export const DEFAULT_EPUB_LIMITS: EpubSafetyLimits = {
  maxArchiveBytes: 128 * 1024 * 1024,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalUncompressedBytes: 256 * 1024 * 1024,
  maxEntries: 4096
};

/** Call before reading from disk and once more after reading to limit races. */
export function assertEpubArchiveSize(
  size: number,
  limits: EpubSafetyLimits = DEFAULT_EPUB_LIMITS
): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > limits.maxArchiveBytes) {
    throw new Error(`EPUB exceeds the maximum compressed size (${limits.maxArchiveBytes} bytes)`);
  }
}

/**
 * fflate's filter receives ZIP central-directory metadata before extraction.
 * Reject the whole archive instead of silently dropping over-limit chapters.
 * This limits declared output sizes; it is NOT a general parser sandbox.
 */
export function unzipEpubWithLimits(
  bytes: Uint8Array,
  limits: EpubSafetyLimits = DEFAULT_EPUB_LIMITS
): Record<string, Uint8Array> {
  assertEpubArchiveSize(bytes.byteLength, limits);

  let entryCount = 0;
  let totalUncompressedBytes = 0;

  return unzipSync(bytes, {
    filter: (file) => {
      entryCount += 1;
      if (entryCount > limits.maxEntries) {
        throw new Error(`EPUB contains too many files (max ${limits.maxEntries})`);
      }

      if (
        !Number.isSafeInteger(file.originalSize) ||
        file.originalSize < 0 ||
        file.originalSize > limits.maxEntryBytes
      ) {
        throw new Error(`EPUB entry is too large: ${file.name}`);
      }
      if (!Number.isSafeInteger(file.size) || file.size < 0) {
        throw new Error(`EPUB entry has an invalid compressed size: ${file.name}`);
      }

      totalUncompressedBytes += file.originalSize;
      if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
        throw new Error('EPUB total uncompressed size exceeds safety limit');
      }

      return true;
    }
  });
}
