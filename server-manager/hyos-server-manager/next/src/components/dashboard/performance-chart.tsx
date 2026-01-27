"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useServerStatus } from "@/lib/services/server";

interface DataPoint {
  time: string;
  memory: number;
}

const chartConfig = {
  memory: {
    label: "Memory Usage",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function PerformanceChart() {
  const { data: status } = useServerStatus();
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (status?.memory) {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const memoryMB = status.memory.used / (1024 * 1024);

      setData((prev) => {
        const newData = [
          ...prev,
          {
            time: timeLabel,
            memory: Math.round(memoryMB),
          },
        ];
        // Keep only last 20 data points
        return newData.slice(-20);
      });
    }
  }, [status?.memory]);

  const noData = data.length === 0 && !status?.memory;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {noData ? (
          <div className="flex h-[300px] w-full items-center justify-center text-sm text-foreground-muted">
            No data
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                label={{ value: "MB", angle: -90, position: "insideLeft" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="var(--color-memory)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
