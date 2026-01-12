const pinyinLib = require('pinyin');

// Handle pinyin import (support both CommonJS and ESM/default export)
let pinyinFunc = pinyinLib;
if (typeof pinyinFunc !== 'function' && pinyinFunc.default) {
    pinyinFunc = pinyinFunc.default;
}
// Ensure we handle the case where pinyinLib itself is the function or an object containing it
// Some versions might export properties on the function itself

/**
 * Convert filename to SEO-friendly format
 * @param {string} filename - Original filename
 * @param {boolean} convertChinese - Whether to convert Chinese to pinyin
 * @returns {string} SEO-optimized filename
 */
function optimizeFilenameForSEO(filename, convertChinese = true) {
    let optimized = filename;

    // Convert Chinese to pinyin if enabled
    if (convertChinese && /[\u4e00-\u9fa5]/.test(optimized)) {
        try {
            // Use constants from original lib object or fallback to integers
            // STYLE_NORMAL is usually 0
            // Ensure we get the constant from the resolved function or the original lib
            const STYLE_NORMAL = pinyinFunc.STYLE_NORMAL !== undefined ? pinyinFunc.STYLE_NORMAL :
                (pinyinLib.STYLE_NORMAL !== undefined ? pinyinLib.STYLE_NORMAL : 0);

            const style = STYLE_NORMAL;

            // Convert Chinese characters to pinyin
            const pinyinArray = pinyinFunc(optimized, {
                style: style,
                heteronym: false
            });
            // Join pinyin with hyphens
            optimized = pinyinArray.map(p => p[0]).join('-');
        } catch (e) {
            console.error('Pinyin conversion error:', e);
            // Fallback: don't convert if error
        }
    }

    // Convert to lowercase
    optimized = optimized.toLowerCase();

    // Replace spaces with hyphens
    optimized = optimized.replace(/\s+/g, '-');

    // Replace underscores with hyphens
    optimized = optimized.replace(/_/g, '-');

    // Remove special characters (keep only letters, numbers, hyphens)
    optimized = optimized.replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');

    // Replace multiple consecutive hyphens with single hyphen
    optimized = optimized.replace(/-+/g, '-');

    // Remove leading/trailing hyphens
    optimized = optimized.replace(/^-+|-+$/g, '');

    // If empty after optimization, use 'image' as fallback
    if (!optimized) {
        optimized = 'image';
    }

    return optimized;
}

module.exports = { optimizeFilenameForSEO };
