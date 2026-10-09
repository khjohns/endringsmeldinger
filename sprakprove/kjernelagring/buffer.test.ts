import { describe } from 'vitest';
import { bufferen } from '../../kjerne/tester/bufferprove.ts';
import { TESTBASE_URL, testbasen } from './bane.ts';

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => bufferen(testbasen));
