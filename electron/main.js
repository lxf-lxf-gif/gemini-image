const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1f2937', // Slate-800
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Simplify local file access for MVP
        },
    });

    // Check if we are in dev mode
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

const { dialog } = require('electron');
const { processImage } = require('./image-processor');
const { writeMetadata, cleanup } = require('./metadata-manager');
const { generateImageMeta, generateAltText, generateImageFromText } = require('./ai-service');
const { optimizeFilenameForSEO } = require('./seo-helper');

// --- IPC Handlers ---

// 1. Select Files
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'webp', 'jpeg'] }
        ]
    });
    return result.filePaths;
});

// 1.5 Select Watermark Image
ipcMain.handle('select-watermark', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'webp', 'jpeg'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
});

// 1.6 Select Reference Image
ipcMain.handle('select-reference-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'webp', 'jpeg', 'gif', 'bmp'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
});

// 2. Select Output Directory
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

// 3. Process Single Image (for batch loop in frontend or single test)
ipcMain.handle('process-image', async (event, { inputPath, outputDir, options, metadata }) => {
    // 1. Image Processing
    const result = await processImage(inputPath, outputDir, options);

    if (result.success && metadata) {
        // 2. Metadata Injection (if successful)
        await writeMetadata(result.path, metadata);
    }

    return result;
});

// 4. AI Generation
ipcMain.handle('generate-meta', async (event, { imagePath, apiKey, modelName, userContext }) => {
    return await generateImageMeta(imagePath, apiKey, modelName, userContext);
});

// 4.5. AI Alt Text Generation
ipcMain.handle('generate-alt-text', async (event, { imagePath, apiKey, modelName, userContext }) => {
    return await generateAltText(imagePath, apiKey, modelName, userContext);
});

// 4.6. AI Text-to-Image Generation
ipcMain.handle('generate-image-from-text', async (event, { textPrompt, apiKey, model, provider, referenceImagePath }) => {
    return await generateImageFromText(textPrompt, apiKey, { model, provider, referenceImagePath });
});


// 5. Validate Path
ipcMain.handle('validate-path', async (event, { filePath, type }) => {
    try {
        const exists = fs.existsSync(filePath);
        if (!exists) return { valid: false, error: '路径不存在' };

        const stat = fs.statSync(filePath);

        if (type === 'file') {
            return { valid: stat.isFile(), error: stat.isFile() ? null : '不是有效文件' };
        } else if (type === 'directory') {
            if (!stat.isDirectory()) {
                return { valid: false, error: '不是有效目录' };
            }

            // 检查写权限
            try {
                fs.accessSync(filePath, fs.constants.W_OK);
                return { valid: true };
            } catch (e) {
                return { valid: false, error: '没有写权限' };
            }
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
});

// 7. Optimize Filename (for preview)
ipcMain.handle('optimize-filename', async (event, { filename, customFilename, seoEnabled }) => {
    try {
        let result = filename;
        if (customFilename && customFilename.trim() !== '') {
            result = customFilename;
        }

        if (seoEnabled) {
            result = optimizeFilenameForSEO(result, true);
        }

        return result;
    } catch (error) {
        console.error('Error optimizing filename:', error);
        return filename;
    }
});

// 6. Cleanup on quit
app.on('will-quit', () => {
    cleanup();
});
