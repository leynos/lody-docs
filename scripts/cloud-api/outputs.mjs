/**
 * The two ways the entry point can dispose of rendered outputs.
 *
 * `findStaleOutputs` is the `--check` path: it only reads, through an injected
 * reader, and returns the outputs whose files are absent or differ. It has no
 * writer to call. `writeOutputs` is the generate path and only writes. Neither
 * touches the file system directly.
 */

/**
 * The rendered outputs whose files are absent or differ from the rendering.
 * @param {Array<[string, string]>} outputs path and content
 * @param {(file: string) => string | undefined} readText undefined when absent
 * @returns {string[]} the stale paths, in output order
 */
export const findStaleOutputs = (outputs, readText) =>
  outputs.filter(([file, data]) => readText(file) !== data).map(([file]) => file);

/**
 * Write every rendered output.
 * @param {Array<[string, string]>} outputs path and content
 * @param {(file: string, data: string) => void} writeText
 */
export function writeOutputs(outputs, writeText) {
  for (const [file, data] of outputs) writeText(file, data);
}
