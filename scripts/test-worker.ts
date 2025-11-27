import { qstashClient } from '../lib/upstash';

async function testWorker() {
  console.log('Testing QStash publish...');
  
  // Mock data - replace with a real project ID if you have one, or ensure the worker handles invalid IDs gracefully
  const projectId = 'test-project-id'; 
  const jobId = 'test-job-id';
  
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const workerUrl = `${appUrl}/api/workers/advice`;
    
    console.log(`Publishing to ${workerUrl}...`);

    const res = await qstashClient.publishJSON({
      url: workerUrl,
      body: {
        projectId,
        jobId,
        projectName: 'Test Project',
      },
    });

    console.log('QStash publish result:', res);
  } catch (error) {
    console.error('Failed to publish to QStash:', error);
  }
}

testWorker();
