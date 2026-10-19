import { describe, vi } from 'vitest';
import { regelendringen } from '../../kjerne/tester/regelendring.ts';
import { GRENSER, TESTBASE_URL, testbasen } from './bane.ts';

vi.setConfig(GRENSER);

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => regelendringen(testbasen));
