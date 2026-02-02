
"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
    views: {
        label: "Views",
        color: "hsl(var(--chart-1))",
    },
    likes: {
        label: "Likes",
        color: "hsl(var(--chart-2))"
    }
} satisfies ChartConfig;

interface StatsGrowthChartProps {
    data: {
        date: string;
        views: number;
        likes: number;
    }[]
}

export function StatsGrowthChart({ data }: StatsGrowthChartProps) {
    // If no data, use some mock data or empty state
    const displayData = data.length > 0 ? data : [
        { date: "Mon", views: 0, likes: 0 },
        { date: "Tue", views: 0, likes: 0 },
        { date: "Wed", views: 0, likes: 0 },
    ];

    return (
        <Card className="flex flex-col w-full h-full min-h-[400px]">
            <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>
                    Views and engagement over time
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <ChartContainer config={chartConfig} className="max-h-[350px] w-full">
                    <AreaChart
                        accessibilityLayer
                        data={displayData}
                        margin={{
                            left: 12,
                            right: 12,
                            top: 12,
                            bottom: 12
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Area
                            dataKey="views"
                            type="natural"
                            fill="var(--color-views)"
                            fillOpacity={0.4}
                            stroke="var(--color-views)"
                            stackId="a"
                        />
                        <Area
                            dataKey="likes"
                            type="natural"
                            fill="var(--color-likes)"
                            fillOpacity={0.4}
                            stroke="var(--color-likes)"
                            stackId="b"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
