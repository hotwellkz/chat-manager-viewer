import { Badge } from "@/components/ui/badge";

interface ContainerStatusBadgeProps {
  status: string;
}

export const ContainerStatusBadge = ({ status }: ContainerStatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'creating':
      case 'starting':
        return 'bg-yellow-500';
      case 'warning':
        return 'bg-orange-500';
      case 'stopping':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Запущен';
      case 'creating':
        return 'Создается';
      case 'starting':
        return 'Запускается';
      case 'error':
        return 'Ошибка';
      case 'stopping':
        return 'Останавливается';
      case 'initializing':
        return 'Инициализация';
      default:
        return 'Ожидание';
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {getStatusText(status)}
    </Badge>
  );
};