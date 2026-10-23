import app from '../.open-next/worker.js';
import release from '../.open-next/dashboard-staging-release.json';
import { stagingWorker } from '../lib/server/dashboardStaging.mjs';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from '../.open-next/worker.js';
export default stagingWorker(app, release);
