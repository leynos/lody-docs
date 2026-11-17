/**
 * Verification that the generator's inputs are exactly the pinned Lody commit.
 *
 * `verifyProvenance` takes an injected Git runner, a file-system view and the
 * bytes the source index read, and returns the revision with a list of
 * problems instead of throwing, so that the caller decides how to fail. It
 * refuses a checkout at another revision; any read or indexable file that git
 * status reports as modified, staged, untracked, ignored, deleted or renamed;
 * the assume-unchanged and skip-worktree flags, which hide edits from git
 * status; symbolic links; files absent from the pinned revision; and any file
 * whose bytes, hashed here as a Git blob with no filter or line-ending
 * conversion, differ from the pinned blob. That last comparison uses the bytes
 * that were parsed and hashed, not a second read.
 */
import crypto from 'node:crypto';
import path from 'node:path';

/** Git's object id for a blob with these exact bytes. @param {Buffer} bytes */
export const blobId = (bytes) =>
  crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

/**
 * @typedef {object} FileSystemView
 * @property {(file: string) => boolean} exists whether a path exists, without following a link
 * @property {(file: string) => string} realpath the path with every link resolved
 */

/**
 * Verify the checkout against the pinned revision.
 * @param {object} input
 * @param {string} input.root the checkout
 * @param {string} input.pinned the revision the authored inputs cite
 * @param {(args: string[]) => string} input.git runs git in the checkout, with literal pathspecs
 * @param {FileSystemView} input.fileSystem
 * @param {(file: string) => Buffer} input.read the bytes the generator read, by absolute path
 * @param {Iterable<string>} input.readFiles checkout-relative files parsed or cited
 * @param {string[]} input.indexRoots
 * @param {(file: string) => boolean} input.indexable whether the index parses a file
 * @returns {{ revision: string, problems: string[], message?: string }}
 */
export function verifyProvenance({
  root,
  pinned: pin,
  git,
  fileSystem,
  read,
  readFiles,
  indexRoots,
  indexable,
}) {
  const revision = git(['rev-parse', 'HEAD']).trim();
  // The authored inputs cite one commit; never combine them with another.
  if (revision !== pin)
    return {
      revision,
      problems: [],
      message: `Lody checkout ${root} is at ${revision}, but docs/cloud-api/http.json pins ${pin}`,
    };
  const files = new Set(readFiles);
  /** @param {string} file */
  const indexed = (file) =>
    files.has(file) || (indexable(file) && indexRoots.some((dir) => file.startsWith(`${dir}/`)));
  const scope = ['--', ...indexRoots, ...files];
  /** @type {string[]} */
  const problems = [];
  // The index folders are queried as a whole, so that files missing from the
  // working tree are reported too.
  const status = git([
    ...['status', '--porcelain=v1', '-z', '--ignored', '--untracked-files=all'],
    ...scope,
  ]).split('\0');
  for (let i = 0; i < status.length; i++) {
    const entry = status[i];
    if (!entry) continue;
    const paths = [entry.slice(3)];
    // A rename or copy is followed by its source path.
    if (/[RC]/.test(entry.slice(0, 2))) paths.push(status[++i]);
    if (paths.some(indexed)) problems.push(paths.length > 1 ? `${entry} <- ${paths[1]}` : entry);
  }
  // Git status trusts the index, and the assume-unchanged and skip-worktree
  // flags hide a tracked file's edits from it; filters and line-ending
  // conversion can also make changed bytes look clean to Git.
  for (const entry of git(['ls-files', '-v', '-z', ...scope]).split('\0')) {
    const [tag, file] = [entry[0], entry.slice(2)];
    if (entry && indexed(file) && (tag === 'S' || tag !== tag.toUpperCase()))
      problems.push(`${tag} ${file} (assume-unchanged or skip-worktree)`);
  }
  const blobs = new Map(
    git(['ls-tree', '-r', '-z', revision, ...scope])
      .split('\0')
      .map((entry) => entry.match(/^(\d+) (\w+) ([0-9a-f]+)\t(.*)$/s))
      .filter((match) => match !== null && indexed(match[4]))
      .map((match) => {
        const [, mode, type, blob, file] = /** @type {RegExpMatchArray} */ (match);
        return [file, { mode, type, blob }];
      }),
  );
  const realRoot = fileSystem.realpath(root);
  const checked = new Set(files);
  for (const file of blobs.keys())
    if (fileSystem.exists(path.join(root, file))) checked.add(file);
    else problems.push(`${file} (missing from the working tree)`);
  for (const file of [...checked].sort()) {
    const entry = blobs.get(file);
    const absolute = path.join(root, file);
    if (entry?.type !== 'blob') problems.push(`${file} (not a file at ${revision})`);
    else if (
      entry.mode === '120000' ||
      path.relative(realRoot, fileSystem.realpath(absolute)) !== file
    )
      // The generator would read the bytes behind the link, not the link itself.
      problems.push(`${file} (symbolic link, refused)`);
    else if (blobId(read(absolute)) !== entry.blob)
      problems.push(
        `${file} (bytes read differ from ${revision}; filters and line-ending conversion are not applied)`,
      );
  }
  const unique = [...new Set(problems)];
  return unique.length
    ? {
        revision,
        problems: unique,
        message: `Source files differ from ${revision} in ${root}:\n${unique.join('\n')}`,
      }
    : { revision, problems: [] };
}
