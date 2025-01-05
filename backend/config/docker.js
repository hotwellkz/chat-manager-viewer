import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: process.env.DOCKER_HOST || 'http://localhost',
  port: process.env.DOCKER_PORT || 2375,
  timeout: 60000, // 60 секунд таймаут
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port
});

const docker = new Docker(dockerConfig);

// Проверяем подключение
docker.ping().then(() => {
  console.log('Successfully connected to Docker daemon');
}).catch(error => {
  console.error('Failed to connect to Docker daemon:', error);
});

export { docker };