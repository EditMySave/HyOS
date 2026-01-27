"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  players: number;
}

const chartConfig = {
  players: {
    label: "Players",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PlayerCountChart() {
  const { data: status } = useServerStatus();
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (status !== undefined) {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      setData((prev) => {
        const newData = [
          ...prev,
          {
            time: timeLabel,
            players: status?.playerCount ?? 0,
          },
        ];
        // Keep only last 20 data points
        return newData.slice(-20);
      });
    }
  }, [status]);

  const noData = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Count</CardTitle>
      </CardHeader>
      <CardContent>
        {noData ? (
          <div className="flex h-[300px] w-full items-center justify-center text-sm text-foreground-muted">
            No data
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="fillPlayers" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-players)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-players)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="players"
                stroke="var(--color-players)"
                fill="url(#fillPlayers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
