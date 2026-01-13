class AIService {
    private apiKey: string = "";
    private endpoint: string = "";

    initGemini(apiKey: string, _modelName: string = "", endpoint: string = "") {
        this.apiKey = apiKey;
        this.endpoint = endpoint || "https://api.vectorengine.ai";
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
        onChunk: (chunk: string) => void
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
        if (enableImages) {
            imageStrategy = `
12. **AI Image Recommendations**: You MUST plan and insert 1-3 relevant images to break up text and increase engagement.
    - Format: \`![IMAGE: Detailed visual description for AI generation](https://source.unsplash.com/1600x900/?<keywords>)\`
    - Use specific keywords in the URL querystring.
    - The alt text "IMAGE: ..." serves as a prompt for the user or an image generator.`;
        }

        const systemInstruction = `你是一位顶尖的多面手专家，担任以下核心角色：内容规划师、市场调研师、SEO写作专家、数据可视化专家。
您的目标是基于用户提供的主题，创作具有深度的、包含直观图表且经过极致 SEO 优化的 ${language} 内容。

在创作时，请务必遵循以下专业要求：
1. **深度调研与规划**：模拟市场调研师的思维，确保内容触达受众痛点，具有行业前瞻性向。
2. **结构化输出**：使用清晰的 Markdown h1-h3 标题架构，逻辑严密。
3. **数据可视化**：自动在文中合适位置插入 \`\`\`echarts\`\`\` 类型的代码块来展示数据和趋势。
4. **SEO 极致优化**：自然融入关键词，提升语义关联度。
5. **格式规范**：全篇必须严格使用 **Markdown** 格式。
6. **目标字数**：约 ${wordCount} 字。
7. **写作语气**：${tone}。
8. **写作视角**：${perspective}。
9. **搜索意图**：${searchIntent}。${linkingStrategy}
10. ${visualizationStrategy}
11. ${imageStrategy}`;

        const userPrompt = `Please write a comprehensive SEO article about: ${topic}. 
Keywords to include: ${keywords.join(", ")}.
Output language: ${language}.
Strictly use Markdown format.`;

        await this.callGeminiStream(model, systemInstruction, userPrompt, enableThinking, onChunk);
    }

    async generateContinuationStream(
        model: string,
        previousContent: string,
        language: string,
        enableThinking: boolean,
        anchorTexts: { keyword: string; url: string }[],
        onChunk: (chunk: string) => void
    ): Promise<void> {
        let linkingStrategy = "";
        if (anchorTexts && anchorTexts.length > 0) {
            linkingStrategy = `
- Ensure to apply the internal linking strategy if applicable (Use Markdown):
${anchorTexts.map(a => `  - "${a.keyword}" -> ${a.url}`).join("\n")}
- Limit to 1 link per keyword.`;
        }

        const systemInstruction = `并在内容规划师、SEO写作专家、数据可视化专家等多重专家角色的指导下，继续续写这篇 ${language} 文章。请保持一致的专业深度、行业洞察力及 **Markdown** 排版风格（包括必要的 \`\`\`echarts\`\`\` 图表块）。严禁重复已有内容。必须使用 ${language} 输出。${linkingStrategy}`;
        const userPrompt = `Existing Content (in ${language}):\n---\n${previousContent}\n---\n\nPlease continue writing the article strictly in ${language} using Markdown format:`;

        await this.callGeminiStream(model, systemInstruction, userPrompt, enableThinking, onChunk);
    }

    private async callGeminiStream(
        model: string,
        systemInstruction: string,
        userPrompt: string,
        enableThinking: boolean,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        if (!this.apiKey) throw new Error("API Key is missing. Please check your settings.");

        // Normalize endpoint
        let baseUrl = this.endpoint.replace(/\/+$/, "");
        if (!baseUrl.includes("/v1beta")) {
            baseUrl += "/v1beta";
        }

        const url = `${baseUrl}/models/${model}:streamGenerateContent?alt=sse`;

        const body = {
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
                ...(enableThinking ? {
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: 16000
                    }
                } : {})
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
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
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
