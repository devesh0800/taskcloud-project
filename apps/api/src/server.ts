import http from 'http';
import { createApp } from './app';
import { config } from './config/environment';
import { initSocketIO } from './sockets/socket.server';
import { storageService } from './storage/localStorage.service';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server, config.frontendUrl);

// Start server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 EduSync API Server is running`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health: http://localhost:${config.port}/api/v1/health`);
  console.log(`📁 Local Storage: ${storageService.getBaseUploadDir()}`);
  console.log(`🌐 CORS Frontend: ${config.frontendUrl}`);
  console.log(`=======================================================`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down EduSync API server...');
  server.close(() => {
    console.log('✅ EduSync API server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { server, app };
