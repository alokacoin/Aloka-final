import { connectDB } from './config/db.js';
import app from './app.js';
import { startNewsFetchJob } from './jobs/newsFetchJob.js';

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  const   newsFetchJob = await startNewsFetchJob();

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing server.`);
    newsFetchJob?.stop();
    server.close((error) => {
      if (error) {
        console.error('Server shutdown failed:', error);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
