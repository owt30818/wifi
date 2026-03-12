/**
 * Format student info consistently across the app
 * @param {number} grade - 학년
 * @param {number} classNum - 반
 * @param {number} number - 번호
 * @returns {string} Formatted string like "1학년 2반 3번"
 */
export const formatStudentInfo = (grade, classNum, number) => {
    if (!grade || !classNum || !number) return '-';
    return `${grade}학년 ${classNum}반 ${number}번`;
};

/**
 * Format student info in compact format
 * @returns {string} Formatted string like "1-2-3"
 */
export const formatStudentInfoCompact = (grade, classNum, number) => {
    if (!grade || !classNum || !number) return '-';
    return `${grade}-${classNum}-${number}`;
};

/**
 * Format MAC address to consistent format AA-BB-CC-DD-EE-FF
 */
export const formatMacAddress = (mac) => {
    if (!mac) return '';
    const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length !== 12) return mac;
    return clean.match(/.{1,2}/g).join('-');
};
