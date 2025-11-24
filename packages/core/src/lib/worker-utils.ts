export type PeriodicRunner = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
};

export function createPeriodicRunner(task: () => Promise<void>, intervalMs: number): PeriodicRunner {
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let running = false;

  return {
    async start() {
      if (running) return;
      running = true;
      // run immediately
      try {
        await task();
      } catch (err) {
        // swallow here; individual tasks should log
        // but we don't want to crash the runner
        // eslint-disable-next-line no-console
        console.error('Periodic task error (initial run):', err);
      }
      intervalId = setInterval(() => {
        task().catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Periodic task error:', err);
        });
      }, intervalMs);
    },

    async stop() {
      running = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    },

    isRunning() {
      return running;
    },
  };
}

export function installGracefulShutdown(stopFn: () => Promise<void>) {
  const shutdown = async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('\n🛑 Graceful shutdown requested...');
      await stopFn();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error during shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
