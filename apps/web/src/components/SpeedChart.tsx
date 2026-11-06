
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { SpeedTestResult } from "../services/api";

interface Props {
  results: SpeedTestResult[];
  showDownload: boolean;
  showUpload: boolean;
}

export default function SpeedChart({
  results,
  showDownload,
  showUpload,
}: Props) {
  const data = results.map((item) => ({
    timestamp: Date.parse(item.timestamp),
    download: item.downloadMbps,
    upload: item.uploadMbps,
  }));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 12, left: -15, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 5"
            vertical={false}
          />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) =>
              new Date(value).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={35}
          />

          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
            unit=" Mbps"
          />

          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
            labelFormatter={(label) =>
              new Date(Number(label)).toLocaleString("es-MX")
            }
            formatter={(value, name) => [
              `${Number(value).toFixed(2)} Mbps`,
              name === "download" ? "Descarga" : "Subida",
            ]}
          />

          <Legend
            formatter={(value) =>
              value === "download" ? "Descarga" : "Subida"
            }
          />

          {showDownload && (
            <Line
              name="download"
              type="monotone"
              dataKey="download"
              stroke="var(--chart-download)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          )}

          {showUpload && (
            <Line
              name="upload"
              type="monotone"
              dataKey="upload"
              stroke="var(--chart-upload)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
