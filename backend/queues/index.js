import Queue from 'bull';
import { processOpenAIRequest } from './processors/openaiProcessor.js';
import { processFileGeneration } from './processors/fileProcessor.js';
import { processDockerOperations } from './processors/dockerProcessor.js';

// Создаем очереди для разных операций
export const openaiQueue = new Queue('openai-processing', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost'
  }
});

export const fileQueue = new Queue('file-processing', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost'
  }
});

export const dockerQueue = new Queue('docker-operations', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost'
  }
});

// Настраиваем обработчики для каждой очереди
openaiQueue.process(processOpenAIRequest);
fileQueue.process(processFileGeneration);
dockerQueue.process(processDockerOperations);

// Обработка ошибок
const queues = [openaiQueue, fileQueue, dockerQueue];

queues.forEach(queue => {
  queue.on('error', (error) => {
    console.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    console.error(`Job ${job.id} in ${queue.name} failed:`, error);
  });

  queue.on('completed', (job) => {
    console.log(`Job ${job.id} in ${queue.name} completed successfully`);
  });
});