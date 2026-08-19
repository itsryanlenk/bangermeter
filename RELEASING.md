# Releasing

## Steps

1. Bump the version in **`extension/manifest.json`** and **`extension/weights.js`**. They
   must match; `check-versions.js` fails the build otherwise. The Chrome Web Store will
   not accept a second upload at an existing version number, so a correction to a live
   release is always a bump, never a re-upload.

2. Rebuild the userscript, which restates the extension version:

   ```
   pwsh store-assets/make-userscript.ps1
   ```

3. Add a `WHAT'S NEW IN <version>` block to `store-assets/store-description.txt`, above
   the previous one.

4. Run the tests:

   ```
   node extension/run-tests.js
   ```

5. Build. This runs the version check, refuses a dirty or behind-upstream tree, writes
   provenance beside the zip, and reads the artifact back to confirm it matches the repo:

   ```
   pwsh store-assets/make-package.ps1
   ```

6. **Immediately before uploading**, re-verify. This is the step that matters — see below.

   ```
   node store-assets/package-guard.js --verify dist/bangermeter-<version>.zip
   ```

7. Upload `dist/bangermeter-<version>.zip` and paste the new `WHAT'S NEW` block into the
   listing description.

8. Once the store accepts it, tag:

   ```
   git tag v<version> && git push origin v<version>
   ```

## Why step 6 exists

v0.9.4 went to the store telling users that For You hard-filters **670** accounts reported
to Brazil's Electoral Court. The real number is 665.

The correction was committed at 15:02 on 16 Aug. The zip was built at 15:02 on 16 Aug,
from the tree as it stood a moment earlier. It was uploaded three days later without being
rebuilt, and nothing in the pipeline ever compared the artifact to the repository again —
`check-versions.js` only compares repo files to each other, and a zip is not one of them.

The tree was clean the whole time. A dirty-tree check would not have caught this. The only
thing that catches it is reading the artifact back and asking whether it still matches
HEAD, which is what `--verify` does.

Answering "which commit is actually live?" afterwards required diffing against an
installed copy of the extension pulled out of a Chrome profile directory. Each package now
carries a `.build.json` recording its source commit, so that question costs one file read.

## Escape hatch

`make-package.ps1 --allow-dirty` builds from uncommitted changes, for a throwaway local
zip. Never upload one — it contains code that exists in no commit, and its provenance
stamp records a commit that does not describe it.
