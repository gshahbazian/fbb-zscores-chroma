import { memo, useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { SCORE_CATEGORIES, type PlayerProfile } from "../types";

type RadarSeries = {
  key: string;
  label: string;
  zscores: PlayerProfile["zscores"];
};

type ZScoreRadarProps = {
  series: RadarSeries[];
};

const RADAR_DOMAIN: [number, number] = [-4, 4];
const SERIES_COLORS = ["#6366f1", "#22d3ee", "#f97316", "#fbbf24"];

function ZScoreRadarComponent({ series }: ZScoreRadarProps) {
  const data = useMemo(() => {
    return SCORE_CATEGORIES.map((category) => {
      const entry: Record<string, string | number> = { category };
      series.forEach((item) => {
        entry[item.key] = item.zscores[category] ?? 0;
      });
      return entry;
    });
  }, [series]);

  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart outerRadius="70%" data={data} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        <PolarGrid stroke="rgba(148, 163, 184, 0.25)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
        <PolarRadiusAxis
          angle={90}
          domain={RADAR_DOMAIN}
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickCount={5}
          axisLine={false}
        />
        {series.map((item, index) => {
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          return (
            <Radar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              dot={false}
            />
          );
        })}
        <Legend wrapperStyle={{ color: "#e2e8f0" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export const ZScoreRadar = memo(ZScoreRadarComponent);
