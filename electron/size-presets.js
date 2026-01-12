/**
 * Default size presets for responsive image export
 */
const SIZE_PRESETS = {
    thumbnail: { width: 200, height: 200, suffix: '-thumbnail' },
    small: { width: 400, height: 400, suffix: '-small' },
    medium: { width: 800, height: 800, suffix: '-medium' },
    large: { width: 1200, height: 1200, suffix: '-large' },
    og: { width: 1200, height: 630, suffix: '-og', fit: 'cover' }, // Open Graph signature size
};

module.exports = { SIZE_PRESETS };
