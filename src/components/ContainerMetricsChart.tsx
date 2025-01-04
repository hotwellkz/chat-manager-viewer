import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface MetricsChartProps {
  containerId: string;
}

interface MetricDataPoint {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  memory_limit: number;
  error_count: number;
}

export const ContainerMetricsChart = ({ containerId }: MetricsChartProps) => {
  const { data: metricsHistory, isLoading } = useQuery({
    queryKey: ['container-metrics-history', containerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('container_metrics')
        .select('*')
        .eq('container_id', containerId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as MetricDataPoint[];
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Загрузка графиков...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!metricsHistory || metricsHistory.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>История метрик контейнера</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={metricsHistory}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="created_at" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cpu_usage"
                name="CPU (%)"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="memory_usage"
                name="Память (MB)"
                stroke="#82ca9d"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="error_count"
                name="Ошибки"
                stroke="#ff7300"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};