import { describe, vi } from 'vitest';
import { kompatibiliteten } from '../../kjerne/tester/kompatibilitet.ts';
import { GRENSER, TESTBASE_URL, testbasen } from './bane.ts';

vi.setConfig(GRENSER);

describe.skipIf(!TESTBASE_URL)('mot testbasen', () => kompatibiliteten(testbasen));
