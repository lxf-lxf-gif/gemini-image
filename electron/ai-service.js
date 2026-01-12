const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// ============================================
// 配置常量
// ============================================
const MAX_IMAGE_SIZE_MB = 10; // 最大图片大小（MB）
const API_TIMEOUT_MS = 60000; // API 超时时间（60秒）
const MAX_RETRIES = 2; // 最大重试次数
const RETRY_DELAY_MS = 1000; // 重试延迟（1秒）

// Vector Engine (OpenAI) API 配置
const VECTOR_ENGINE_BASE_URL = "https://api.vectorengine.ai/v1"; // Vector Engine API 地址
const DEFAULT_IMAGE_MODEL = "dall-e-3"; // 默认图片生成模型
const DEFAULT_IMAGE_SIZE = "1024x1024"; // 默认图片尺寸
const DEFAULT_IMAGE_QUALITY = "standard"; // 默认图片质量

// ============================================
// 公共工具函数
// ============================================

/**
 * 从文件路径获取 MIME 类型
 * @param {string} filePath - 文件路径
 * @returns {string} MIME 类型
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

/**
 * 验证图片文件有效性
 * @param {string} filePath - 文件路径
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @throws {Error} 如果文件无效
 */
function validateImageFile(filePath, maxSizeMB = MAX_IMAGE_SIZE_MB) {
    // 检查路径是否为空
    if (!filePath || typeof filePath !== 'string') {
        throw new Error("文件路径无效");
    }

    // 规范化路径，防止路径遍历攻击
    const normalizedPath = path.normalize(filePath);

    // 检查文件是否存在
    if (!fs.existsSync(normalizedPath)) {
        throw new Error(`文件不存在: ${normalizedPath}`);
    }

    // 检查是否为文件（而非目录）
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
        throw new Error("路径不是一个有效的文件");
    }

    // 检查文件大小
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
        throw new Error(`文件大小 (${fileSizeMB.toFixed(2)}MB) 超过限制 (${maxSizeMB}MB)`);
    }

    // 检查文件扩展名
    const ext = path.extname(normalizedPath).toLowerCase().slice(1);
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!validExtensions.includes(ext)) {
        throw new Error(`不支持的文件格式: ${ext}。支持的格式: ${validExtensions.join(', ')}`);
    }

    return normalizedPath;
}

/**
 * 读取图片文件并转换为 Base64
 * @param {string} filePath - 文件路径
 * @returns {Object} {base64: string, mimeType: string}
 */
function readImageAsBase64(filePath) {
    const validatedPath = validateImageFile(filePath);
    const imageBuffer = fs.readFileSync(validatedPath);
    const imageBase64 = imageBuffer.toString("base64");
    const mimeType = getMimeType(validatedPath);

    return { base64: imageBase64, mimeType };
}

/**
 * 带超时的 fetch 请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch 选项
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`请求超时 (${timeout / 1000}秒)`);
        }
        throw error;
    }
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 主要功能函数
// ============================================

/**
 * Generate SEO metadata for an image using Gemini
 * @param {string} imagePath - 图片文件路径
 * @param {string} apiKey - Google API Key
 * @param {string} modelName - Gemini 模型名称
 * @param {string} userContext - 用户上下文信息
 * @returns {Promise<{filename: string, alt: string}>}
 */
async function generateImageMeta(imagePath, apiKey, modelName = "gemini-1.5-flash", userContext = "") {
    try {
        // 参数验证
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            throw new Error("API Key 不能为空");
        }

        // 读取并验证图片
        const { base64: imageBase64, mimeType } = readImageAsBase64(imagePath);

        // 初始化 Gemini AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        // 构建提示词
        let promptContext = "";
        if (userContext && userContext.trim()) {
            promptContext = `\nPrioritize this user context/info: "${userContext}".`;
        }

        const prompt = `
Analyze this image for an e-commerce context.${promptContext}
1. Generate a short, SEO-friendly filename (kebab-case, lowercase, no extension) that describes the product, brand, and category.
2. Generate a descriptive Alt Text (max 15 words).

Return ONLY valid JSON format:
{
  "filename": "brand-product-category",
  "alt": "A description of the product"
}
    `;

        // 发送请求
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // 解析 JSON（支持代码块格式）
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("AI 返回的内容不包含有效的 JSON");
        }

        const metadata = JSON.parse(jsonMatch[0]);

        // 验证返回的数据结构
        if (!metadata.filename || !metadata.alt) {
            throw new Error("AI 返回的数据结构不完整");
        }

        return metadata;

    } catch (error) {
        console.error("AI 元数据生成错误:", error);

        // 返回更友好的错误信息
        if (error.message.includes("API Key")) {
            throw new Error("API Key 无效或未设置");
        } else if (error.message.includes("文件")) {
            throw error; // 直接抛出文件相关错误
        } else if (error.message.includes("quota")) {
            throw new Error("API 配额已用尽，请稍后再试");
        } else {
            throw new Error(`AI 元数据生成失败: ${error.message}`);
        }
    }
}

/**
 * Generate SEO-friendly Alt text for an image
 * @param {string} imagePath - 图片文件路径
 * @param {string} apiKey - Google API Key
 * @param {string} modelName - Gemini 模型名称
 * @param {string} userContext - 用户上下文信息
 * @returns {Promise<string>} Alt text (max 125 characters)
 */
async function generateAltText(imagePath, apiKey, modelName = "gemini-1.5-flash", userContext = "") {
    try {
        // 参数验证
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            throw new Error("API Key 不能为空");
        }

        // 读取并验证图片
        const { base64: imageBase64, mimeType } = readImageAsBase64(imagePath);

        // 初始化 Gemini AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        // 构建提示词
        let promptContext = "";
        if (userContext && userContext.trim()) {
            promptContext = `\nContext: "${userContext}".`;
        }

        const prompt = `
Analyze this image and generate a concise, SEO-friendly alt text.${promptContext}

Requirements:
- Maximum 125 characters
- Describe what's in the image clearly and concisely
- Focus on key visual elements
- Use natural language
- No quotes or special formatting

Return ONLY the alt text, nothing else.
    `;

        // 发送请求
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType,
                },
            },
        ]);

        const response = await result.response;
        let altText = response.text().trim();

        // 清理文本
        altText = altText.replace(/^["']|["']$/g, ''); // 移除首尾引号
        altText = altText.replace(/\n/g, ' '); // 替换换行符为空格

        // 限制长度
        if (altText.length > 125) {
            altText = altText.substring(0, 122) + '...';
        }

        return altText;

    } catch (error) {
        console.error("AI Alt 文本生成错误:", error);

        // 返回更友好的错误信息
        if (error.message.includes("API Key")) {
            throw new Error("API Key 无效或未设置");
        } else if (error.message.includes("文件")) {
            throw error;
        } else if (error.message.includes("quota")) {
            throw new Error("API 配额已用尽，请稍后再试");
        } else {
            throw new Error(`AI Alt 文本生成失败: ${error.message}`);
        }
    }
}

/**
 * Generate an image from text description using Gemini API
 * @param {string} textPrompt - Text description for image generation
 * @param {string} apiKey - API Key (Google or Vector Engine)
 * @param {Object} options - Generation options
 * @param {string} options.model - Model name (e.g., gemini-2.0-flash-exp)
 * @param {string} options.provider - API provider ('google' or 'vectorengine')
 * @returns {Promise<{success: boolean, imagePath?: string, error?: string}>}
 */
async function generateImageFromText(textPrompt, apiKey, options = {}) {
    const os = require('os');
    const https = require('https');

    // Default options
    const {
        model = 'gemini-2.0-flash-exp',
        provider = 'google',
        referenceImagePath = null
    } = options;

    try {
        // Parameter validation
        if (!textPrompt || typeof textPrompt !== 'string' || textPrompt.trim() === '') {
            throw new Error("请输入图片描述文字");
        }

        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            throw new Error("API Key 不能为空");
        }

        // Determine API endpoint based on provider
        let API_URL;
        if (provider === 'google') {
            // Google official API
            API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        } else {
            // Vector Engine
            API_URL = `https://api.vectorengine.ai/v1beta/models/${model}:generateContent`;
        }

        console.log(`使用 ${provider === 'google' ? 'Google 官方' : 'Vector Engine'} API: ${API_URL}`);

        // Build request body in Gemini format
        const parts = [{
            text: textPrompt.trim()
        }];

        // Add reference image if provided
        if (referenceImagePath) {
            try {
                console.log('添加参考图:', referenceImagePath);
                const { base64: imageBase64, mimeType } = readImageAsBase64(referenceImagePath);
                parts.unshift({
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType
                    }
                });
                console.log('参考图已添加到请求中');
            } catch (error) {
                console.error('读取参考图失败:', error);
                // Continue without reference image
            }
        }

        const requestBody = {
            contents: [{
                role: "user",
                parts: parts
            }]
        };

        // Retry logic
        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`重试第 ${attempt} 次...`);
                    await delay(RETRY_DELAY_MS * attempt);
                }

                // Send request with timeout
                // Different auth methods for different providers
                const headers = {
                    'Content-Type': 'application/json'
                };

                // Vector Engine uses Bearer token, Google uses API key in URL
                if (provider === 'vectorengine') {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }

                const response = await fetchWithTimeout(
                    API_URL,
                    {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(requestBody)
                    },
                    API_TIMEOUT_MS
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;

                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: { message: errorText } };
                    }

                    const errorMsg = errorData.error?.message || errorText;

                    // Check if retry is needed
                    if (response.status === 503 || response.status === 429) {
                        throw new Error(`服务暂时不可用 (${response.status}),正在重试...`);
                    }

                    throw new Error(`API 请求失败 (${response.status}): ${errorMsg}`);
                }

                // Parse response
                const result = await response.json();

                // Log the full response for debugging
                console.log('Gemini API 完整响应:', JSON.stringify(result, null, 2));

                // Extract image data from Gemini response
                // Gemini returns generated images in the response candidates
                if (!result.candidates || result.candidates.length === 0) {
                    console.error('响应中没有 candidates:', result);
                    throw new Error("API 返回的数据为空");
                }

                const candidate = result.candidates[0];
                console.log('第一个 candidate:', JSON.stringify(candidate, null, 2));

                if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                    console.error('candidate 中没有 content.parts:', candidate);
                    throw new Error("API 未返回图片数据");
                }

                // Find the image part in the response
                let imageData = null;
                for (const part of candidate.content.parts) {
                    console.log('检查 part:', JSON.stringify(part, null, 2));

                    // Check for inline_data (base64 image)
                    if (part.inline_data && part.inline_data.data) {
                        imageData = part.inline_data.data;
                        console.log('找到 inline_data 图片');
                        break;
                    }

                    // Check for inlineData (alternative format)
                    if (part.inlineData && part.inlineData.data) {
                        imageData = part.inlineData.data;
                        console.log('找到 inlineData 图片');
                        break;
                    }

                    // Check for file_data (file reference)
                    if (part.file_data && part.file_data.file_uri) {
                        console.log('找到 file_data 引用:', part.file_data.file_uri);
                        throw new Error("API 返回的是文件引用而非直接图片数据,暂不支持此格式");
                    }
                }

                if (!imageData) {
                    console.error('所有 parts 中都没有找到图片数据');
                    console.error('完整的 parts:', JSON.stringify(candidate.content.parts, null, 2));
                    throw new Error("API 响应中未找到图片数据");
                }

                console.log('成功获取生成的图片数据');

                // Convert base64 to buffer
                const imageBuffer = Buffer.from(imageData, 'base64');

                // Validate image data
                if (imageBuffer.length < 100) {
                    throw new Error("生成的图片数据无效");
                }

                // Generate filename from prompt
                const textSummary = textPrompt
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 50);

                const timestamp = Date.now();
                const fileName = `gemini-${textSummary}-${timestamp}.png`;

                // Save to temp directory
                const tempDir = os.tmpdir();
                const imagePath = path.join(tempDir, fileName);

                fs.writeFileSync(imagePath, imageBuffer);

                console.log(`图片生成成功: ${imagePath}`);

                return {
                    success: true,
                    imagePath: imagePath
                };

            } catch (error) {
                lastError = error;

                // Don't retry for certain errors
                if (attempt === MAX_RETRIES ||
                    error.message.includes("API Key") ||
                    error.message.includes("请输入") ||
                    error.message.includes("不支持")) {
                    throw error;
                }
            }
        }

        // All retries failed
        throw lastError;

    } catch (error) {
        // Only log errors that aren't API key related
        if (!error.message.includes("API Key")) {
            console.error("图片生成错误:", error);
        }

        // Return friendly error messages
        let errorMessage = error.message;

        if (error.message.includes("超时")) {
            errorMessage = "图片生成超时,请稍后重试或使用更简单的描述";
        } else if (error.message.includes("API Key")) {
            errorMessage = "Vector Engine API Key 无效或未设置";
        } else if (error.message.includes("quota") || error.message.includes("rate limit") || error.message.includes("insufficient_quota")) {
            errorMessage = "API 配额已用尽或请求过于频繁,请稍后再试";
        } else if (error.message.includes("content_policy") || error.message.includes("SAFETY")) {
            errorMessage = "您的描述违反了内容政策,请修改后重试";
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * 下载图片从 URL
 * @param {string} url - 图片 URL
 * @returns {Promise<Buffer>} 图片 Buffer
 */
async function downloadImage(url) {
    try {
        const response = await fetchWithTimeout(url, {}, API_TIMEOUT_MS);

        if (!response.ok) {
            throw new Error(`下载图片失败: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        throw new Error(`下载图片失败: ${error.message}`);
    }
}

module.exports = { generateImageMeta, generateAltText, generateImageFromText };
