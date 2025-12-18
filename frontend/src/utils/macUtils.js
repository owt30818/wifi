/**
 * Format a string into a standardized MAC address format.
 * Format: AA-BB-CC-DD-EE-FF (Uppercase, Hyphen-separated)
 * @param {string} value - The input string
 * @returns {string} - The formatted MAC address
 */
export const formatMac = (value) => {
    if (!value) return '';

    // Remove non-hex characters
    const clean = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();

    // Group by 2 and join with hyphen
    const groups = clean.match(/.{1,2}/g);

    if (!groups) return clean;

    // Join and slice to max length of 17 (12 hex + 5 hyphens)
    return groups.join('-').slice(0, 17);
};
