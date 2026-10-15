import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area
} from 'recharts';
import { SecondPoint, ThemeId } from '../types';
import { THEMES } from '../constants';

interface WpmChartProps {
  data: SecondPoint[];
  theme?: ThemeId;
  isLive?: boolean;
  height?: number;
  showAverage?: boolean;
  showRaw?: boolean;
  showErrors?: boolean;
  currentSecond?: number;
}

export const WpmChart: React.FC<WpmChartProps> = ({
  data,
  theme = 'velocity-amber',
  isLive = false,
  height = 200,
  showAverage = true,
  showRaw = true,
  showErrors = true,
  currentSecond
}) => {
  const activeTheme = THEMES[theme] || THEMES['velocity-amber'];

  // If live and no data points yet, supply a zero starter point so graph structure renders gracefully
  const displayData = data.length > 0 
    ? data 
    : [{ second: 0, wpm: 0, rawWpm: 0, errors: 0, accuracy: 100, burst: 0 }];

  // Compute maximum WPM for Y-axis domain
  const maxWpm = Math.max(
    ...displayData.map(d => Math.max(d.wpm || 0, d.rawWpm || 0)),
    40
  );
  const yDomainMax = Math.ceil((maxWpm + 10) / 10) * 10;

  // Compute average WPM
  const validPoints = displayData.filter(d => d.wpm > 0);
  const avgWpm = validPoints.length > 0
    ? Math.round(validPoints.reduce((acc, curr) => acc + curr.wpm, 0) / validPoints.length)
    : 0;

  // Total errors count
  const totalErrors = displayData.reduce((acc, d) => acc + (d.errors || 0), 0);

  // Latest active point
  const latestPoint = displayData[displayData.length - 1];

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string; payload: SecondPoint }>; label?: string | number }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div 
          className="px-3 py-2 rounded-md shadow-2xl border text-xs font-mono"
          style={{
            backgroundColor: `${activeTheme.subtle}f0`,
            borderColor: `${activeTheme.primary}40`,
            color: activeTheme.active,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="font-bold border-b pb-1 mb-1.5 flex justify-between gap-4" style={{ borderColor: `${activeTheme.text}30` }}>
            <span style={{ color: activeTheme.text }}>Time:</span>
            <span style={{ color: activeTheme.primary }}>{label}s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: activeTheme.primary }}>WPM:</span>
            <span className="font-bold">{point.wpm}</span>
          </div>
          {showRaw && (
            <div className="flex justify-between gap-4">
              <span style={{ color: activeTheme.text }}>Raw WPM:</span>
              <span>{point.rawWpm}</span>
            </div>
          )}
          {point.accuracy !== undefined && (
            <div className="flex justify-between gap-4">
              <span style={{ color: activeTheme.active }}>Accuracy:</span>
              <span>{point.accuracy}%</span>
            </div>
          )}
          {point.errors > 0 && (
            <div className="flex justify-between gap-4 mt-1 pt-1 border-t" style={{ borderColor: `${activeTheme.text}20` }}>
              <span style={{ color: activeTheme.error }}>Errors:</span>
              <span className="font-bold" style={{ color: activeTheme.error }}>{point.errors}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Error Dots rendering
  const renderErrorDot = (props: { cx?: number; cy?: number; payload?: SecondPoint; index?: number }) => {
    const { cx, cy, payload, index } = props;
    if (!cx || !cy || !payload || !payload.errors || payload.errors <= 0) {
      return null;
    }
    return (
      <g key={`error-dot-${index}`}>
        <circle cx={cx} cy={cy} r={5} fill={activeTheme.error} fillOpacity={0.8} />
        <text 
          x={cx} 
          y={cy - 8} 
          fill={activeTheme.error} 
          fontSize={10} 
          fontFamily="JetBrains Mono, monospace" 
          fontWeight="bold" 
          textAnchor="middle"
        >
          ✕{payload.errors > 1 ? payload.errors : ''}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full flex flex-col font-mono select-none">
      {/* Real-time status header for live test */}
      {isLive && (
        <div className="flex items-center justify-between px-2 mb-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span 
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: activeTheme.primary }}
                />
                <span 
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: activeTheme.primary }}
                />
              </span>
              <span className="uppercase tracking-wider font-semibold" style={{ color: activeTheme.primary }}>
                LIVE WPM GRAPH
              </span>
            </div>
            <span style={{ color: activeTheme.text }}>
              {currentSecond !== undefined ? `${currentSecond}s` : `${displayData.length}s`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: activeTheme.chartLine }} />
              <span style={{ color: activeTheme.text }}>wpm:</span>
              <span className="font-bold text-sm" style={{ color: activeTheme.primary }}>
                {latestPoint?.wpm || 0}
              </span>
            </span>

            {showRaw && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: activeTheme.chartRaw }} />
                <span style={{ color: activeTheme.text }}>raw:</span>
                <span style={{ color: activeTheme.text }}>
                  {latestPoint?.rawWpm || 0}
                </span>
              </span>
            )}

            {totalErrors > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.error }} />
                <span style={{ color: activeTheme.error }}>errors: {totalErrors}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chart container */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ top: 12, right: 16, left: -20, bottom: 4 }}
          >
            <defs>
              <linearGradient id="liveWpmGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeTheme.chartLine} stopOpacity={0.25} />
                <stop offset="95%" stopColor={activeTheme.chartLine} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke={`${activeTheme.text}20`}
              vertical={false}
            />

            <XAxis
              dataKey="second"
              stroke={activeTheme.text}
              tickLine={false}
              axisLine={{ stroke: `${activeTheme.text}30` }}
              tick={{ fontSize: 11, fill: activeTheme.text, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}`}
              domain={[1, 'auto']}
            />

            <YAxis
              stroke={activeTheme.text}
              domain={[0, yDomainMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: activeTheme.text, fontFamily: 'monospace' }}
              tickCount={5}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Average Reference Line */}
            {showAverage && avgWpm > 0 && (
              <ReferenceLine
                y={avgWpm}
                stroke={activeTheme.primary}
                strokeDasharray="3 3"
                strokeOpacity={0.4}
                label={!isLive ? {
                  value: `avg: ${avgWpm}`,
                  position: 'insideTopRight',
                  fill: activeTheme.text,
                  fontSize: 10,
                  fontFamily: 'monospace'
                } : undefined}
              />
            )}

            {/* Raw WPM Line */}
            {showRaw && (
              <Line
                type="monotone"
                dataKey="rawWpm"
                stroke={activeTheme.chartRaw}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                dot={false}
                isAnimationActive={!isLive}
                name="Raw WPM"
              />
            )}

            {/* Net WPM Line */}
            <Line
              type="monotone"
              dataKey="wpm"
              stroke={activeTheme.chartLine}
              strokeWidth={3}
              dot={showErrors ? renderErrorDot : false}
              activeDot={{
                r: 5,
                fill: activeTheme.chartLine,
                stroke: activeTheme.bg,
                strokeWidth: 2
              }}
              isAnimationActive={!isLive}
              name="WPM"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below graph when on result view */}
      {!isLive && (
        <div className="flex items-center justify-center gap-6 mt-3 text-xs" style={{ color: activeTheme.text }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: activeTheme.chartLine }} />
            <span>wpm</span>
          </div>
          {showRaw && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: activeTheme.chartRaw }} />
              <span>raw</span>
            </div>
          )}
          {showErrors && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTheme.error }} />
              <span>errors</span>
            </div>
          )}
          {avgWpm > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 border-t border-dashed" style={{ borderColor: activeTheme.primary }} />
              <span>avg ({avgWpm})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
