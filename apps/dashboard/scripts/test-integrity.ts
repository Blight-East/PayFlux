import { RiskIntelligence } from '../src/lib/risk-infra';
import { ProjectionLedger } from '../src/lib/projection-ledger';

// Set EVIDENCE_SECRET for HMAC since we're running locally. Use the same key.
process.env.EVIDENCE_SECRET = 'test-secret';
process.env.UPSTASH_REDIS_REST_URL = 'https://casual-dane-45218.upstash.io'; // Note: The user's env has real redis, but since I can't read .env.local easily without dotenv, maybe I should just use `import 'dotenv/config'`
