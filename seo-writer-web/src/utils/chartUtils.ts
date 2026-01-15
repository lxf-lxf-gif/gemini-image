import * as echarts from 'echarts';

export type ChartType = 'pie' | 'bar' | 'line';

export interface ChartDataItem {
    name: string;
    value: number;
}

export interface ChartConfig {
    title?: string;
    type?: ChartType;
    data?: ChartDataItem[];
}

export const dirtyJsonParse = (str: string) => {
    try {
        // 1. Remove markdown backticks and language identifiers
        let cleaned = str.replace(/```(json|echarts)?/g, '').replace(/```/g, '').trim();

        // 2. Remove comments (// or /* */) - Simple regex, might be risky for URLs but OK for JSON
        cleaned = cleaned.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

        // 3. Remove trailing commas (e.g., {"a": 1,})
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

        return JSON.parse(cleaned) as unknown;
    } catch {
        // If it's a stream, it might be partial. Try to extract valid JSON parts or return null
        return null;
    }
};

export const isChartConfig = (value: unknown): value is ChartConfig => {
    if (!value || typeof value !== 'object') return false;
    const obj = value as Record<string, unknown>;
    if (obj.title !== undefined && typeof obj.title !== 'string') return false;
    if (obj.type !== undefined && obj.type !== 'pie' && obj.type !== 'bar' && obj.type !== 'line') return false;
    if (obj.data !== undefined) {
        if (!Array.isArray(obj.data)) return false;
        for (const item of obj.data) {
            if (!item || typeof item !== 'object') return false;
            const it = item as Record<string, unknown>;
            if (typeof it.name !== 'string') return false;
            if (typeof it.value !== 'number') return false;
        }
    }
    return true;
};

export const generateEChartsOption = (parsed: ChartConfig) => {
    // Robust data mapping: Handle cases where 'name'/'value' might be missing or aliased
    // Although our prompt enforces name/value, we should be safe.
    
    const safeData = (parsed.data || []).map(item => ({
        name: String(item.name || ''),
        value: Number(item.value || 0)
    }));

    return {
        title: {
            text: parsed.title || '数据对比图',
            left: 'center',
            textStyle: {
                color: '#0f172a',
                fontSize: 16,
                fontWeight: 600
            }
        },
        tooltip: {
            trigger: parsed.type === 'pie' ? 'item' : 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            textStyle: { color: '#1e293b' },
            borderWidth: 0,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
        },
        legend: {
            orient: 'horizontal',
            bottom: '5%',
            textStyle: { color: '#334155' }
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '20%',
            containLabel: true
        },
        xAxis: parsed.type !== 'pie' ? {
            type: 'category',
            data: safeData.map((item) => item.name),
            axisLabel: { color: '#475569' },
            axisLine: { lineStyle: { color: '#cbd5e1' } }
        } : undefined,
        yAxis: parsed.type !== 'pie' ? {
            type: 'value',
            axisLabel: { color: '#475569' },
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#f1f5f9' } }
        } : undefined,
        series: [
            {
                name: parsed.title || '数值',
                type: parsed.type || 'bar',
                radius: parsed.type === 'pie' ? ['40%', '70%'] : undefined,
                center: parsed.type === 'pie' ? ['50%', '45%'] : undefined,
                data: parsed.type === 'pie'
                    ? safeData
                    : safeData.map((item) => item.value),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.2)'
                    }
                },
                itemStyle: {
                    borderRadius: parsed.type === 'bar' ? 6 : 0,
                    color: parsed.type === 'bar' ? '#0ea5e9' : undefined
                },
                lineStyle: {
                    width: 4,
                    color: '#8b5cf6'
                },
                symbol: 'circle',
                symbolSize: 8,
                areaStyle: parsed.type === 'line' ? {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(139, 92, 246, 0.2)' },
                            { offset: 1, color: 'rgba(139, 92, 246, 0)' }
                        ]
                    }
                } : undefined
            }
        ],
        color: ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'],
        backgroundColor: 'transparent',
        animation: true // Default animation
    };
};

export const chartConfigToImage = async (config: ChartConfig): Promise<string> => {
    // 1. Create a temporary container
    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '400px';
    div.style.visibility = 'hidden';
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    document.body.appendChild(div);

    try {
        const myChart = echarts.init(div);
        const option: echarts.EChartsOption = {
            ...(generateEChartsOption(config) as echarts.EChartsOption),
            animation: false
        };
        
        myChart.setOption(option);
        
        // Return base64 image
        const base64 = myChart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });
        
        myChart.dispose();
        return base64;
    } finally {
        document.body.removeChild(div);
    }
};
