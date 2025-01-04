import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AlertCircle, Cpu, HardDrive } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface ContainerMetricsProps {
  containerId: string;
}

interface Metrics {
  cpu_usage: number;
  memory_usage: number;
  memory_limit: number;
  error_count: number;
}

export const ContainerMetrics = ({ containerId }: ContainerMetricsProps) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('container_metrics')
          .select('*')
          .eq('container_id', containerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setMetrics(data);

        // Показываем предупреждение если высокая нагрузка
        if (data.cpu_usage > 80 || data.memory_usage > data.memory_limit * 0.9) {
          toast({
            variant: "destructive",
            title: "Внимание",
            description: "Высокая нагрузка на контейнер",
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    // Получаем метрики каждые 30 секунд
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, [containerId]);

  if (!metrics) return null;

  const memoryPercentage = (metrics.memory_usage / metrics.memory_limit) * 100;

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span className="text-sm font-medium">CPU</span>
            <span className="ml-auto text-sm">{metrics.cpu_usage.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.cpu_usage} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="text-sm font-medium">Память</span>
            <span className="ml-auto text-sm">
              {Math.round(metrics.memory_usage)}MB / {Math.round(metrics.memory_limit)}MB
            </span>
          </div>
          <Progress value={memoryPercentage} className="h-2" />
        </div>

        {metrics.error_count > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Обнаружено {metrics.error_count} ошибок
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};