const { exiftool } = require('exiftool-vendored');

/**
 * Write metadata to an image file
 * @param {string} filePath - Absolute path to the file
 * @param {object} metadata - Metadata to write
 */
async function writeMetadata(filePath, metadata) {
    try {
        const tags = {};

        if (metadata.title) {
            tags.Title = metadata.title;
            tags.XPTitle = metadata.title;
            tags.Headline = metadata.title;
            tags.ObjectName = metadata.title;
        }

        if (metadata.copyright) {
            tags.Copyright = metadata.copyright;
            tags['IFD0:Copyright'] = metadata.copyright;
        }

        if (metadata.author) {
            tags.Artist = metadata.author;
            tags['XPAuthor'] = metadata.author;
        }

        if (metadata.keywords && Array.isArray(metadata.keywords)) {
            tags.Keywords = metadata.keywords;
            tags.Subject = metadata.keywords;
        }

        if (metadata.description) {
            tags.Description = metadata.description;
            tags['ImageDescription'] = metadata.description;
        }

        // Alt text for SEO and accessibility
        if (metadata.alt) {
            tags['Caption-Abstract'] = metadata.alt;
            tags['XMP:Description'] = metadata.alt;
            tags['IPTC:Caption-Abstract'] = metadata.alt;
        }

        if (metadata.url) {
            tags['XMP-xmpRights:WebStatement'] = metadata.url;
            // Note: CreatorContactInfo requires a specific structure, simplified for now
            tags['XMP-iptcCore:CreatorWorkURL'] = metadata.url;
        }

        await exiftool.write(filePath, tags, ['-overwrite_original']);
        return { success: true };
    } catch (error) {
        console.error('Error writing metadata:', filePath, error);
        return { success: false, error: error.message };
    }
}

/**
 * Cleanup exiftool process when app closes
 */
function cleanup() {
    exiftool.end();
}

module.exports = {
    writeMetadata,
    cleanup
};
