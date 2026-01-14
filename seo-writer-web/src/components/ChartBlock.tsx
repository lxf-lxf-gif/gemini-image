import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { dirtyJsonParse, isChartConfig, generateEChartsOption } from '../utils/chartUtils';

interface ChartProps {
    config: string;
}

const ChartBlock: React.FC<ChartProps> = ({ config }) => {
    const [stableConfig, setStableConfig] = useState(config);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStableConfig(config);
        }, 500);
        return () => clearTimeout(timer);
    }, [config]);

    const parsed = useMemo(() => {
        const raw = dirtyJsonParse(stableConfig);
        return isChartConfig(raw) ? raw : null;
    }, [stableConfig]);

    const option = useMemo(() => {
        if (!parsed) return null;
        try {
            return generateEChartsOption(parsed);
        } catch {
            return null;
        }
    }, [parsed]);

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

    if (!option) {
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
};

export default ChartBlock;
