import { NormalizedBookSchema } from './schema.js';

/**
 * Normalizes raw price text into a float (GBP), e.g. "£51.77" -> 51.77.
 *
 * @param {string} priceText
 * @returns {number}
 */
export function normalizePrice(priceText) {
  if (!priceText || typeof priceText !== 'string') {
    throw new Error(`Invalid priceText input: ${priceText}`);
  }

  // Remove currency symbols (e.g. £), whitespace, and extract number
  const cleaned = priceText.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    throw new Error(`Unable to parse numeric price from: "${priceText}"`);
  }

  // Ensure two decimal precision
  return Math.round(parsed * 100) / 100;
}

/**
 * Transforms and validates a raw book record against the NormalizedBookSchema.
 * Returns both valid data and schema error reasons if validation fails.
 *
 * @param {object} rawRecord
 * @returns {{
 *   isValid: boolean,
 *   record?: object,
 *   error?: { url: string, reason: string, raw_data: any, timestamp: string }
 * }}
 */
export function normalizeAndValidateBook(rawRecord) {
  try {
    const priceGbp = normalizePrice(rawRecord.price_text);

    // Keep raw value and clean value side by side
    const candidate = {
      ...rawRecord,
      price_gbp: priceGbp
    };

    const parseResult = NormalizedBookSchema.safeParse(candidate);

    if (parseResult.success) {
      return {
        isValid: true,
        record: parseResult.data
      };
    } else {
      const issueMessages = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      return {
        isValid: false,
        error: {
          url: rawRecord?.product_url,
          reason: `Schema validation failed: ${issueMessages}`,
          raw_data: rawRecord,
          timestamp: new Date().toISOString()
        }
      };
    }
  } catch (err) {
    return {
      isValid: false,
      error: {
        url: rawRecord?.product_url,
        reason: err.message,
        raw_data: rawRecord,
        timestamp: new Date().toISOString()
      }
    };
  }
}
