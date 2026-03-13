import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console.log and console.error to capture output
const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Fresh import each test
let logger;
beforeEach(async () => {
  logSpy.mockClear();
  errorSpy.mockClear();
  // Dynamic import to get fresh module state
  logger = await import('../../lib/logger.mjs');
  logger.setLogLevel('debug');
});

afterEach(() => {
  logSpy.mockClear();
  errorSpy.mockClear();
});

describe('logger', () => {
  describe('log levels', () => {
    it('should log debug messages when level is debug', () => {
      logger.debug('test debug');
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(logSpy.mock.calls[0][0]).toContain('test debug');
    });

    it('should log info messages', () => {
      logger.info('test info');
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain('[INFO]');
    });

    it('should log warn messages to stderr', () => {
      logger.warn('test warn');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('[WARN]');
    });

    it('should log error messages to stderr', () => {
      logger.error('test error');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('should suppress debug when level is info', () => {
      logger.setLogLevel('info');
      logger.debug('hidden');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should suppress info and debug when level is warn', () => {
      logger.setLogLevel('warn');
      logger.debug('hidden');
      logger.info('hidden');
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      logger.warn('visible');
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('log with data', () => {
    it('should log objects as JSON', () => {
      logger.info('data test', { foo: 'bar' });
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][1]).toBe('{"foo":"bar"}');
    });

    it('should log strings as-is', () => {
      logger.info('data test', 'plain string');
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][1]).toBe('plain string');
    });
  });

  describe('progress', () => {
    it('should emit [PROGRESS] JSON line', () => {
      const progress = { stage: 'scrape', target_id: 42, site_id: 'test', status: 'start' };
      logger.progress(progress);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0];
      expect(output).toMatch(/^\[PROGRESS\] /);
      const parsed = JSON.parse(output.replace('[PROGRESS] ', ''));
      expect(parsed.stage).toBe('scrape');
      expect(parsed.target_id).toBe(42);
      expect(parsed.status).toBe('start');
    });

    it('should include optional detail field', () => {
      logger.progress({ stage: 'qa', status: 'error', detail: 'timeout' });
      const output = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(output.replace('[PROGRESS] ', ''));
      expect(parsed.detail).toBe('timeout');
    });
  });

  describe('summary', () => {
    it('should emit [SUMMARY] JSON line', () => {
      const summary = { total: 5, succeeded: 3, failed: 1, skipped: 1 };
      logger.summary(summary);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0];
      expect(output).toMatch(/^\[SUMMARY\] /);
      const parsed = JSON.parse(output.replace('[SUMMARY] ', ''));
      expect(parsed.total).toBe(5);
      expect(parsed.succeeded).toBe(3);
      expect(parsed.failed).toBe(1);
      expect(parsed.skipped).toBe(1);
    });
  });

  describe('timestamp', () => {
    it('should include ISO timestamp in log messages', () => {
      logger.info('timestamp test');
      const output = logSpy.mock.calls[0][0];
      // Match ISO 8601 format
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
