export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const [{ startCrons }, { startWorkers }] = await Promise.all([
      import('./server/crons'),
      import('./server/workers'),
    ]);

    startWorkers();
    startCrons();
  }
}
