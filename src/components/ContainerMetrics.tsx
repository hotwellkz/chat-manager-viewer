import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AlertCircle, Cpu, HardDrive, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { cn } from "@/lib/utils";

interface ContainerMetricsProps {
  containerId: string;
}

interface Metrics {
  cpu_usage: number;
  memory_usage: number;
  memory_limit: number;
  error_count: number;
  error_type?: string;
  error_severity?: 'warning' | 'error' | 'critical';
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

        if (data.cpu_usage > 80) {
          toast({
            variant: "destructive",
            title: "Высокая загрузка CPU",
            description: `Текущая загрузка CPU: ${data.cpu_usage.toFixed(1)}%`,
          });
        }

        if (data.memory_usage > data.memory_limit * 0.9) {
          toast({
            variant: "destructive",
            title: "Критический уровень памяти",
            description: "Контейнер близок к пределу использования памяти",
          });
        }

        if (data.error_severity === 'critical') {
          toast({
            variant: "destructive",
            title: "Критическая ошибка",
            description: data.error_type || "Обнаружена критическая ошибка",
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, [containerId, toast]);

  if (!metrics) return null;

  const memoryPercentage = (metrics.memory_usage / metrics.memory_limit) * 100;
  const getProgressColor = (value: number) => {
    if (value > 90) return 'bg-red-500';
    if (value > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span className="text-sm font-medium">CPU</span>
            <span className={`ml-auto text-sm ${metrics.cpu_usage > 80 ? 'text-red-500' : ''}`}>
              {metrics.cpu_usage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={metrics.cpu_usage} 
            className={cn("h-2", getProgressColor(metrics.cpu_usage))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="text-sm font-medium">Память</span>
            <span className={`ml-auto text-sm ${memoryPercentage > 90 ? 'text-red-500' : ''}`}>
              {Math.round(metrics.memory_usage)}MB / {Math.round(metrics.memory_limit)}MB
            </span>
          </div>
          <Progress 
            value={memoryPercentage} 
            className={cn("h-2", getProgressColor(memoryPercentage))}
          />
        </div>

        {metrics.error_count > 0 && (
          <Alert variant={metrics.error_severity === 'critical' ? 'destructive' : 'default'}>
            {metrics.error_severity === 'critical' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              Обнаружено {metrics.error_count} ошибок
              {metrics.error_type && ` (${metrics.error_type})`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};