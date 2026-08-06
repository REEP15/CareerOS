import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase configuration (same as Next.js)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const appWorker = express();
appWorker.use(express.json());

// Health check
appWorker.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /collect - Execute job collection
appWorker.post('/collect', async (req, res) => {
  try {
    const { uid, missionFilter } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Import collector services from worker directory
    const { collectors } = await import('./services/collector/registry.ts');
    const { saveCollectedJobs } = await import('./services/collector/save.ts');
    const { dedupeJobs } = await import('./services/collector/normalize.ts');

    const collectedGroups = await Promise.all(collectors.map((collector) => collector.collect()));
    let mergedJobs = collectedGroups.flat();

    // Apply mission filtering if provided by Next.js
    if (missionFilter && missionFilter.activeMissions && missionFilter.activeMissions.length > 0) {
      mergedJobs = mergedJobs.filter((job) =>
        missionFilter.activeMissions.some((mission) => {
          if (mission.sources.length > 0 && !mission.sources.some((s) => s.toLowerCase() === job.source.toLowerCase())) {
            return false;
          }

          const text = `${job.title} ${job.description}`.toLowerCase();

          if (mission.keywords.length > 0 && !mission.keywords.some((k) => text.includes(k.toLowerCase()))) {
            return false;
          }

          if (mission.excludedKeywords.some((k) => text.includes(k.toLowerCase()))) {
            return false;
          }

          if (mission.locations.length > 0) {
            const jobLocation = job.location.toLowerCase();
            const locationMatch = mission.locations.some((loc) => jobLocation.includes(loc.toLowerCase()));

            if (!locationMatch && !(mission.remote && jobLocation.includes("remote"))) {
              return false;
            }
          }

          return true;
        }),
      );
    }

    const { jobs: uniqueJobs } = dedupeJobs(mergedJobs);
    const result = await saveCollectedJobs(uid, uniqueJobs);

    res.json({
      success: true,
      collectors: collectors.length,
      jobsFound: mergedJobs.length,
      added: result.added,
      duplicates: result.skipped + (mergedJobs.length - uniqueJobs.length),
      missionFiltered: missionFilter && missionFilter.activeMissions.length > 0,
    });
  } catch (error) {
    console.error('Collection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Job collection failed',
    });
  }
});

// POST /apply - Execute application automation
appWorker.post('/apply', async (req, res) => {
  try {
    const { uid, jobId } = req.body;
    
    if (!uid || !jobId) {
      return res.status(400).json({ success: false, error: 'User ID and Job ID required' });
    }

    // Import automation service from worker directory
    const { AutomationService } = await import('./services/apply/automation-service.ts');

    const service = new AutomationService(
      {
        userId: uid,
        jobId,
        runId: `run_${Date.now()}`,
        requestUserConfirmation: async () => {
          throw new Error('Confirmation path is not configured in worker.');
        },
        isAborted: () => false,
        getResumeProfile: async () => {
          throw new Error('Resume profile loader is not configured in worker.');
        },
        generateResumePDF: async () => {
          throw new Error('Resume PDF generator is not configured in worker.');
        },
        generateCoverLetterPDF: async () => {
          throw new Error('Cover letter PDF generator is not configured in worker.');
        },
      },
      {
        userId: uid,
        jobId,
      },
    );

    const result = await service.run();

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Automation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Application automation failed',
    });
  }
});

// GET /status/:id - Get automation status
appWorker.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = String(req.query.uid || '');

    if (!uid) {
      return res.status(400).json({ success: false, error: 'User ID required as uid query parameter' });
    }

    const service = await createAutomationService(uid, 'unknown', id);
    const status = await service.getStatus(id);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status',
    });
  }
});

// POST /confirm - Placeholder confirmation endpoint
appWorker.post('/confirm', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Confirmation endpoint is not implemented in the worker service yet.',
  });
});

const createAutomationService = async (uid, jobId, runId) => {
  const { AutomationService } = await import('./services/apply/automation-service.ts');

  return new AutomationService(
    {
      userId: uid,
      jobId,
      runId,
      requestUserConfirmation: async () => {
        throw new Error('Confirmation path is not configured in worker.');
      },
      isAborted: () => false,
      getResumeProfile: async () => {
        throw new Error('Resume profile loader is not configured in worker.');
      },
      generateResumePDF: async () => {
        throw new Error('Resume PDF generator is not configured in worker.');
      },
      generateCoverLetterPDF: async () => {
        throw new Error('Resume cover letter PDF generator is not configured in worker.');
      },
    },
    {
      userId: uid,
      jobId,
    },
  );
};

// POST /pause - Pause automation
appWorker.post('/pause', async (req, res) => {
  try {
    const { uid, jobId, runId } = req.body;
    
    if (!uid || !jobId || !runId) {
      return res.status(400).json({ success: false, error: 'User ID, Job ID, and runId are required' });
    }

    const service = await createAutomationService(uid, jobId, runId);
    const result = await service.pause('user_requested');

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Pause error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause automation',
    });
  }
});

// POST /resume - Resume automation
appWorker.post('/resume', async (req, res) => {
  try {
    const { uid, jobId, runId } = req.body;
    
    if (!uid || !jobId) {
      return res.status(400).json({ success: false, error: 'User ID and Job ID required' });
    }

    const service = await createAutomationService(uid, jobId, runId || `run_${Date.now()}`);
    const result = await service.resume(runId || '');

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Resume error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resume automation',
    });
  }
});

// POST /cancel - Cancel automation
appWorker.post('/cancel', async (req, res) => {
  try {
    const { uid, jobId, runId } = req.body;
    
    if (!uid || !jobId) {
      return res.status(400).json({ success: false, error: 'User ID and Job ID required' });
    }

    const service = await createAutomationService(uid, jobId, runId || `run_${Date.now()}`);
    const result = await service.cancel();

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel automation',
    });
  }
});

const PORT = process.env.PORT || 3001;
appWorker.listen(PORT, () => {
  console.log(`CareerOS Worker running on port ${PORT}`);
});
