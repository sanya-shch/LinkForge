import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsSummary } from "../../api/client";

const GRID_COLOR = "#2a3038";
const AXIS_COLOR = "#565f6b";
const LINE_COLOR = "#4fd1c5";
const BAR_COLOR = "#4fd1c5";

const tooltipStyle = {
  background: "#1b2027",
  border: "1px solid #2a3038",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "JetBrains Mono, monospace",
};

export function AnalyticsCharts({ summary }: { summary: AnalyticsSummary }) {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-tile__label">Total clicks</div>
          <div className="stat-tile__value">{summary.totalClicks}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Human</div>
          <div className="stat-tile__value stat-tile__value--live">{summary.humanClicks}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Bot</div>
          <div className="stat-tile__value stat-tile__value--warn">{summary.botClicks}</div>
        </div>
      </div>

      {summary.byDay.length > 0 && (
        <div className="card chart-card">
          <div className="chart-card__title">Clicks over time</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={summary.byDay}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                stroke={AXIS_COLOR}
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
              />
              <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: LINE_COLOR }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {summary.byCountry.length > 0 && (
          <div className="card chart-card" style={{ flex: 1, minWidth: 260 }}>
            <div className="chart-card__title">By country</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={summary.byCountry.slice(0, 8)}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="country"
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                />
                <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {summary.byBrowser.length > 0 && (
          <div className="card chart-card" style={{ flex: 1, minWidth: 260 }}>
            <div className="chart-card__title">By browser</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={summary.byBrowser.slice(0, 8)}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="browser"
                  stroke={AXIS_COLOR}
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                />
                <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
