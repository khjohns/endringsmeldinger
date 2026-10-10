import { describe } from 'vitest';
import { regelendringen } from '../../kjerne/tester/regelendring.ts';
import { TESTBASE_URL, testbasen } from './bane.ts';

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => regelendringen(testbasen));
