/**
 * Unit tests for `scripts/cloud-api/outputs.mjs`: the read-only staleness
 * check reports absent and differing files, and the writer writes each output.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findStaleOutputs, writeOutputs } from '../scripts/cloud-api/outputs.mjs';

describe('outputs', () => {
  it('reports absent and differing outputs as stale', () => {
    const disk = new Map([
      ['same', 'x'],
      ['different', 'old'],
    ]);
    const stale = findStaleOutputs(
      [
        ['same', 'x'],
        ['different', 'new'],
        ['absent', 'y'],
      ],
      (file) => disk.get(file),
    );
    assert.deepEqual(stale, ['different', 'absent']);
  });

  it('writes every output', () => {
    /** @type {Array<[string, string]>} */
    const written = [];
    writeOutputs(
      [
        ['a', '1'],
        ['b', '2'],
      ],
      (file, data) => written.push([file, data]),
    );
    assert.deepEqual(written, [
      ['a', '1'],
      ['b', '2'],
    ]);
  });
});
