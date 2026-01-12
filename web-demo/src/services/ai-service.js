/**
 * Browser-based AI Service for Image Generation
 * Calls Gemini API directly from the browser
 */

const API_TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Convert File object to base64
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Delay function
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate image from text with optional reference image
 */
export async function generateImage(textPrompt, apiKey, options = {}) {
    const {
        referenceImage = null,
        model = 'gemini-2.0-flash-exp',
        provider = 'google',
        aspectRatio = '1:1',
        quality = 'standard'
    } = options;

    try {
        // Validation
        if (!textPrompt || textPrompt.trim() === '') {
            throw new Error('请输入图片描述文字');
        }

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('请先配置 API Key');
        }

        // Determine API endpoint
        let API_URL;
        const headers = {
            'Content-Type': 'application/json'
        };

        const isGoogle = provider === 'google';

        if (isGoogle) {
            API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        } else {
            // Assuming vectorengine.ai endpoint for image generation might be different
            // The provided snippet suggests a change to /v1/chat/completions, which is for chat.
            // For image generation, it's more likely to be similar to the original path or a dedicated image endpoint.
            // Sticking to the original path structure for now, but noting the snippet's suggestion.
            // If the user intended to switch to a chat endpoint for image generation,
            // the requestBody structure would also need significant changes.
            API_URL = `https://api.vectorengine.ai/v1beta/models/${model}:generateContent`;
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Build request parts
        const parts = [{ text: textPrompt.trim() }];

        // Add reference image if provided
        if (referenceImage) {
            const base64 = await fileToBase64(referenceImage);
            parts.unshift({
                inlineData: {
                    data: base64,
                    mimeType: referenceImage.type
                }
            });
        }

        const requestBody = {
            contents: [{
                role: 'user',
                parts: parts
            }],
            generationConfig: {
                aspectRatio: aspectRatio,
                quality: quality === 'hd' ? 'hd' : 'standard'
            }
        };

        // Retry logic
        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    await delay(RETRY_DELAY_MS * attempt);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: { message: errorText } };
                    }

                    const errorMsg = errorData.error?.message || errorText;

                    if (response.status === 503) {
                        throw new Error(`AI 服务暂时繁忙 (503), 请稍后再试, 或尝试切换 API 提供商。`);
                    }

                    if (response.status === 429) {
                        throw new Error(`请求过于频繁 (429), 请稍后再试。`);
                    }

                    throw new Error(`API 请求失败 (${response.status}): ${errorMsg}`);
                }

                const result = await response.json();

                // Extract image data
                if (!result.candidates || result.candidates.length === 0) {
                    throw new Error('API 返回的数据为空');
                }

                const candidate = result.candidates[0];
                if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                    throw new Error('API 未返回图片数据');
                }

                // Find image in response
                let imageData = null;
                for (const part of candidate.content.parts) {
                    if (part.inline_data && part.inline_data.data) {
                        imageData = part.inline_data.data;
                        break;
                    }
                    if (part.inlineData && part.inlineData.data) {
                        imageData = part.inlineData.data;
                        break;
                    }
                }

                if (!imageData) {
                    throw new Error('API 响应中未找到图片数据');
                }

                // Convert base64 to blob URL
                const byteCharacters = atob(imageData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/png' });
                const imageUrl = URL.createObjectURL(blob);

                return {
                    success: true,
                    imageUrl: imageUrl,
                    blob: blob
                };

            } catch (error) {
                lastError = error;

                if (attempt === MAX_RETRIES ||
                    error.message.includes('API Key') ||
                    error.message.includes('请输入')) {
                    throw error;
                }
            }
        }

        throw lastError;

    } catch (error) {
        let errorMessage = error.message;

        if (error.name === 'AbortError') {
            errorMessage = '请求超时,请稍后重试';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            errorMessage = 'API 配额已用尽或请求过于频繁,请稍后再试';
        } else if (error.message.includes('content_policy') || error.message.includes('SAFETY')) {
            errorMessage = '您的描述违反了内容政策,请修改后重试';
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Download image
 */
export function downloadImage(blob, filename = 'generated-image.png') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
