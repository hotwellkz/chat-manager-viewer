import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface ContainerMetricsProps {
  containerId: string;
}

export const ContainerMetrics = ({ containerId }: ContainerMetricsProps) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['container-metrics', containerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('container_metrics')
        .select('*')
        .eq('container_id', containerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Обновляем каждые 5 секунд
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Загрузка метрик...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const cpuPercentage = Math.round(metrics.cpu_usage);
  const memoryPercentage = Math.round((metrics.memory_usage / metrics.memory_limit) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Метрики контейнера</CardTitle>
        <CardDescription>Обновляется каждые 5 секунд</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span>CPU</span>
            <span>{cpuPercentage}%</span>
          </div>
          <Progress value={cpuPercentage} />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span>Память</span>
            <span>{memoryPercentage}%</span>
          </div>
          <Progress value={memoryPercentage} />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Ошибки:</span>
          <span>{metrics.error_count}</span>
        </div>
      </CardContent>
    </Card>
  );
};