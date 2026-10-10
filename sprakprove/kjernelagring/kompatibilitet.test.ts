import { describe } from 'vitest';
import { kompatibiliteten } from '../../kjerne/tester/kompatibilitet.ts';
import { TESTBASE_URL, testbasen } from './bane.ts';

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => kompatibiliteten(testbasen));
