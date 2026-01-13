import React from 'react';
import ReactECharts from 'echarts-for-react';

interface ChartProps {
    config: string;
}

const dirtyJsonParse = (str: string) => {
    try {
        // Clean markdown backticks if present
        let cleaned = str.replace(/```(json|echarts)?/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        // If it's a stream, it might be partial. Try to extract valid JSON parts or return null
        return null;
    }
};

const ChartBlock: React.FC<ChartProps> = ({ config }) => {
    const parsed = dirtyJsonParse(config);

    if (!parsed) {
        return (
            <div style={{
                margin: '24px 0',
                padding: '30px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                color: '#64748b'
            }}>
                <div className="animate-pulse">📊 正在绘制交互式数据图表...</div>
            </div>
        );
    }

    try {
        const option = {
            title: {
                text: parsed.title || '数据对比图',
                left: 'center',
                textStyle: {
                    color: '#0f172a', // High contrast
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
                textStyle: { color: '#334155' } // High contrast
            },
            grid: {
                left: '5%',
                right: '5%',
                bottom: '20%',
                containLabel: true
            },
            xAxis: parsed.type !== 'pie' ? {
                type: 'category',
                data: (parsed.data || []).map((item: any) => item.name),
                axisLabel: { color: '#475569' }, // High contrast
                axisLine: { lineStyle: { color: '#cbd5e1' } }
            } : undefined,
            yAxis: parsed.type !== 'pie' ? {
                type: 'value',
                axisLabel: { color: '#475569' }, // High contrast
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
                        ? (parsed.data || [])
                        : (parsed.data || []).map((item: any) => item.value),
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
            backgroundColor: 'transparent'
        };

        return (
            <div style={{
                margin: '32px 0',
                padding: '24px',
                background: '#ffffff', // High contrast
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
                height: '420px',
                width: '100%',
                overflow: 'hidden'
            }}>
                <ReactECharts
                    option={option}
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    lazyUpdate={true}
                />
            </div>
        );
    } catch (error) {
        console.error('Failed to render EChart:', error);
        return (
            <div style={{
                padding: '20px',
                color: '#dc2626',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                fontSize: '0.85rem'
            }}>
                ⚠️ 图表内容解析失败，请检查数据格式。
            </div>
        );
    }
};

export default ChartBlock;
