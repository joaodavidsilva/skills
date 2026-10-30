// Merges a project's previous package.json into the template's, in place.
// Run from the project root after the template was copied over it:
//   BACKUP_DIR=<dir holding the old package.json> node scripts/merge-package.cjs
// The template's scripts and editor dependencies win; unrelated old entries
// survive; the Next.js packages of the previous editor are dropped.
const fs = require("fs");
const path = require("path");

const OBSOLETE = /^(next|eslint-config-next|@next\/.+)$/;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function without(deps) {
  return Object.fromEntries(Object.entries(deps || {}).filter(([name]) => !OBSOLETE.test(name)));
}

const oldPkg = readJson(path.join(process.env.BACKUP_DIR || "", "package.json"));
const templatePkg = readJson("package.json");

if (oldPkg && templatePkg) {
  const merged = {
    ...oldPkg,
    ...templatePkg,
    scripts: { ...(oldPkg.scripts || {}), ...(templatePkg.scripts || {}) },
    dependencies: { ...without(oldPkg.dependencies), ...templatePkg.dependencies },
    devDependencies: { ...without(oldPkg.devDependencies), ...templatePkg.devDependencies },
  };
  fs.writeFileSync("package.json", JSON.stringify(merged, null, 2) + "\n");
  console.log("package.json merged");
} else {
  console.log("Nothing to merge: missing old or template package.json");
}
