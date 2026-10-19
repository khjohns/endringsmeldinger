import { describe, vi } from 'vitest';
import { bufferen } from '../../kjerne/tester/bufferprove.ts';
import { GRENSER, TESTBASE_URL, testbasen } from './bane.ts';

vi.setConfig(GRENSER);

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => bufferen(testbasen));
