class AIService {
    private provider: "proxy" = "proxy";
    private proxyToken: string = "";
    private proxyEndpoint: string = "";

    initGemini(options: { provider: "proxy"; proxyToken?: string; proxyEndpoint?: string }) {
        this.provider = options.provider;
        this.proxyToken = (options.proxyToken || "").trim();
        this.proxyEndpoint = (options.proxyEndpoint || "").trim();
    }

    async generateSEOContentStream(
        model: string,
        topic: string,
        keywords: string[],
        tone: string,
        perspective: string,
        searchIntent: string,
        wordCount: number,
        language: string,
        enableThinking: boolean,
        enableImages: boolean,
        anchorTexts: { keyword: string; url: string }[],
        memories: string[],
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        let linkingStrategy = "";
        if (anchorTexts && anchorTexts.length > 0) {
            linkingStrategy = `
10. **Internal Linking Strategy**: Automatically link high-value keywords to their respective URLs in the text. 
    - Use Markdown format [Keyword](URL).
    - Mappings to apply:
${anchorTexts.map(a => `      - "${a.keyword}" -> ${a.url}`).join("\n")}
    - Constraint: Limit to 1 link per specific keyword. Do not over-link. Ensure links feel natural within the context.`;
        }

        const visualizationStrategy = `
11. **Data Visualization (ECharts)**: When discussing data, trends, or comparisons, you MUST insert an interactive chart using a specific Markdown code block format:
    \`\`\`echarts
    {
      "title": "Chart Title",
      "type": "pie" | "bar" | "line",
      "data": [
        {"name": "2023", "value": 450},
        {"name": "2024", "value": 720}
      ]
    }
    \`\`\`
    - Ensure the JSON is valid.
    - Pie charts use "name" and "value".
    - Bar/Line charts use "name" for X-axis and "value" for Y-axis.
    - Choose the most appropriate chart type for the data.`;

        let imageStrategy = "";
        // Removed LLM-based image planning in favor of client-side deterministic insertion
        // if (enableImages) { ... }

        const systemInstruction = `你是一位顶尖的多面手专家，担任以下核心角色：内容规划师、市场调研师、SEO写作专家、数据可视化专家。
您的目标是基于用户提供的主题，创作具有深度的、包含直观图表且经过极致 SEO 优化的 ${language} 内容。

在创作时，请务必遵循以下专业要求：
1. 深度调研与规划：模拟市场调研师的思维，确保内容触达受众痛点，具有行业前瞻性向。
2. 结构化输出：使用清晰的 Markdown h1-h3 标题架构，逻辑严密。
3. 数据可视化：自动在文中合适位置插入 \`\`\`echarts\`\`\` 类型的代码块来展示数据和趋势。
4. 表格展示：当涉及对比、参数列表或结构化数据时，请务必使用 Markdown 表格进行清晰展示。
5. SEO 极致优化：自然融入关键词，提升语义关联度。
6. 格式规范：全篇必须严格使用 Markdown 格式。不要出现多余的星号或无意义的符号。
7. 目标字数：约 ${wordCount} 字。
8. 写作语气：${tone}。
9. 写作视角：${perspective}。
10. 搜索意图：${searchIntent}。${linkingStrategy}
${visualizationStrategy}

${memories.length > 0 ? `\nIMPORTANT - USER MEMORIES & PREFERENCES (Must Follow):\n${memories.map(m => `- ${m}`).join('\n')}` : ''}`;

        const userPrompt = `Please write a comprehensive SEO article about: ${topic}. 
Keywords to include: ${keywords.join(", ")}.
Output language: ${language}.
Strictly use Markdown format.`;

        await this.callGeminiStream(model, systemInstruction, userPrompt, enableThinking, onChunk, signal);
    }

    async generateContinuationStream(
        model: string,
        previousContent: string,
        language: string,
        enableThinking: boolean,
        anchorTexts: { keyword: string; url: string }[],
        memories: string[],
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        let linkingStrategy = "";
        if (anchorTexts && anchorTexts.length > 0) {
            linkingStrategy = `
- Ensure to apply the internal linking strategy if applicable (Use Markdown):
${anchorTexts.map(a => `  - "${a.keyword}" -> ${a.url}`).join("\n")}
- Limit to 1 link per keyword.`;
        }

        const systemInstruction = `并在内容规划师、SEO写作专家、数据可视化专家等多重专家角色的指导下，继续续写这篇 ${language} 文章。请保持一致的专业深度、行业洞察力及 **Markdown** 排版风格（包括必要的 \`\`\`echarts\`\`\` 图表块）。严禁重复已有内容。必须使用 ${language} 输出。${linkingStrategy}${memories.length > 0 ? `\n\nUSER MEMORIES & PREFERENCES:\n${memories.map(m => `- ${m}`).join('\n')}` : ''}`;
        const userPrompt = `Existing Content (in ${language}):\n---\n${previousContent}\n---\n\nPlease continue writing the article strictly in ${language} using Markdown format:`;

        await this.callGeminiStream(model, systemInstruction, userPrompt, enableThinking, onChunk, signal);
    }

    async generateImage(prompt: string, model: string = "gemini-2.5-flash-image", aspectRatio: string = "16:9"): Promise<string> {
        // if (!this.proxyToken) throw new Error("Proxy token is missing.");

        const endpoint = (this.proxyEndpoint || "https://api.vectorengine.ai").replace(/\/+$/, "");
        const baseUrl = endpoint.includes("/v1beta") ? endpoint : `${endpoint}/v1beta`;

        // Check if using Imagen model (which uses :predict endpoint and different payload)
        const isImagen = model.toLowerCase().includes('imagen');
        
        let urlObj: URL;
        let body: any;

        if (isImagen) {
            // Imagen Model Logic
            urlObj = new URL(`${baseUrl}/models/${model}:predict`);
            body = {
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    aspectRatio: aspectRatio,
                    sampleCount: 1
                }
            };
        } else {
            // Standard Gemini Logic (generateContent)
            // Append aspect ratio to prompt as Gemini doesn't support it in config for standard generation
            const enhancedPrompt = `${prompt}\n\nAspect Ratio: ${aspectRatio}`;
            
            urlObj = new URL(`${baseUrl}/models/${model}:generateContent`);
            body = {
                contents: [
                    {
                        parts: [{ text: enhancedPrompt }]
                    }
                ]
            };
        }

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${this.proxyToken}`
        };
        if (this.proxyToken) {
            headers["Authorization"] = `Bearer ${this.proxyToken}`;
        }

        const response = await fetch(urlObj.toString(), {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Image Gen Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Try to find image data in various possible paths
        // 1. Standard Gemini generateContent response (iterate all parts)
        let base64Data: string | undefined;
        
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData?.data) {
                base64Data = part.inlineData.data;
                break;
            }
        }
        
        // 2. Fallback: Sometimes it might be text if image generation failed/refused
        if (!base64Data && parts.length > 0 && parts[0].text) {
            const text = parts[0].text;
            console.warn("API returned text instead of image:", text);
            // Check if it's a refusal
            if (text.toLowerCase().includes("cannot") || text.toLowerCase().includes("unable to")) {
                 throw new Error(`Image generation refused: "${text.substring(0, 100)}..."`);
            }
            // If it's just chatty text ("Here is your image") but no image data found in loop above, then image is truly missing.
        }

        // 3. Fallback: Imagen style (predictions/images)
        if (!base64Data) {
            base64Data = data.predictions?.[0]?.bytesBase64Encoded || data.images?.[0]?.bytesBase64Encoded;
        }

        if (!base64Data) {
            console.error("Full API Response:", JSON.stringify(data, null, 2));
            throw new Error("No image data returned from API. Check console for full response.");
        }
        
        return `data:image/jpeg;base64,${base64Data}`;
    }

    private async callGeminiStream(
        model: string,
        systemInstruction: string,
        userPrompt: string,
        enableThinking: boolean,
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        // if (!this.proxyToken) throw new Error("Proxy token is missing. Please check your settings.");

        const endpoint = (this.proxyEndpoint || "https://api.vectorengine.ai").replace(/\/+$/, "");
        
        // Detect OpenAI models
        const isOpenAI = model.startsWith("gpt") || model.startsWith("o1");

        let urlObj: URL;
        let body: any;

        if (isOpenAI) {
            // OpenAI Compatible Logic
            // Use /v1/chat/completions. If user endpoint has /v1beta (Gemini default), strip it or just rely on user input.
            // Assumption: User providing an OpenAI model implies the endpoint supports OpenAI format OR is a multi-protocol gateway.
            // Let's normalize the base URL for OpenAI.
            let baseUrl = endpoint;
            if (baseUrl.endsWith("/v1beta")) {
                baseUrl = baseUrl.replace(/\/v1beta$/, "/v1");
            } else if (!baseUrl.endsWith("/v1")) {
                 baseUrl = `${baseUrl}/v1`;
            }
            
            urlObj = new URL(`${baseUrl}/chat/completions`);
            
            body = {
                model: model,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: userPrompt }
                ],
                stream: true,
                temperature: 0.7,
                top_p: 0.95
            };
        } else {
            // Gemini Logic
            const baseUrl = endpoint.includes("/v1beta") ? endpoint : `${endpoint}/v1beta`;
            urlObj = new URL(`${baseUrl}/models/${model}:streamGenerateContent`);
            urlObj.searchParams.set("alt", "sse");

            // Only add thinkingConfig if the model supports it (usually has 'thinking' in name)
            const supportsThinking = model.includes("thinking");
            
            body = {
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    ...(enableThinking && supportsThinking ? {
                        thinkingConfig: {
                            includeThoughts: true,
                            thinkingBudget: 16000
                        }
                    } : {})
                }
            };
        }

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${this.proxyToken}`,
            // "X-API-Key": this.proxyToken,
            // "x-goog-api-key": this.proxyToken
        };
        if (this.proxyToken) {
            headers["Authorization"] = `Bearer ${this.proxyToken}`;
            headers["X-API-Key"] = this.proxyToken;
            headers["x-goog-api-key"] = this.proxyToken;
        }

        const response = await fetch(urlObj.toString(), {
            method: "POST",
            headers,
            signal,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                throw new Error(
                    errorData.error?.message ||
                    "401 Unauthorized：代理/中转鉴权失败，请检查 Proxy Token 与 Endpoint 是否匹配、是否有权限。"
                );
            }
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const jsonStr = line.replace("data: ", "").trim();
                    if (jsonStr === "[DONE]") continue;

                    try {
                        const data = JSON.parse(jsonStr);
                        let text = "";
                        
                        if (isOpenAI) {
                            // OpenAI Stream Format
                            text = data.choices?.[0]?.delta?.content || "";
                        } else {
                            // Gemini Stream Format
                            text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        }
                        
                        if (text) {
                            onChunk(text);
                        }
                    } catch (e) {
                        console.error("Error parsing SSE chunk:", e);
                    }
                }
            }
        }
    }
}

export const aiService = new AIService();
