#!/usr/bin/env bash
# invariant: exit 1 on any broken repo invariant (prose em-dashes, openai.yaml sync,
# uppercase reference/*.md filenames, case-exact relative markdown links, bucket/README/docs sync).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

bash "$REPO/scripts/check-prose.sh"

python3 - <<'PY'
import glob, os, re, sys

errors = []

def fail(msg):
    errors.append(msg)

# 1. Skill invocation sync: SKILL.md <-> agents/openai.yaml
skill_modes = {}
for sk in sorted(glob.glob("skills/*/*/SKILL.md")):
    skill_dir = os.path.dirname(sk)
    _, bucket, name = skill_dir.split("/")
    with open(sk, encoding="utf-8") as f:
        text = f.read()
    m = re.match(r"^---\n(.*?)\n---", text, flags=re.S)
    fm = m.group(1) if m else ""
    dmi = "disable-model-invocation: true" in fm
    skill_modes[name] = (bucket, dmi)

    yaml_path = os.path.join(skill_dir, "agents", "openai.yaml")
    if not os.path.exists(yaml_path):
        fail(f"{skill_dir}: missing agents/openai.yaml")
    else:
        with open(yaml_path, encoding="utf-8") as yf:
            ytext = yf.read()
        yaml_false = "allow_implicit_invocation: false" in ytext
        if dmi != yaml_false:
            fail(f"{skill_dir}: disable-model-invocation={dmi} in SKILL.md != allow_implicit_invocation: false ({yaml_false}) in agents/openai.yaml")

# 2. No Skill tool call to a user-invoked skill
for sk in sorted(glob.glob("skills/*/*/SKILL.md")):
    with open(sk, encoding="utf-8") as f:
        text = f.read()
    for m in re.finditer(r"Skill tool[^\n.]*", text):
        line = m.group(0)
        for sname, (_, is_user) in skill_modes.items():
            if is_user and re.search(rf"['\"`]{re.escape(sname)}['\"`]", line):
                fail(f"{sk}: calls user-invoked skill '{sname}' via Skill tool: {line}")

# 3. Uppercase filenames under skills/**/reference/
for rf in sorted(glob.glob("skills/**/reference/*", recursive=True)):
    if os.path.isfile(rf):
        stem, _ = os.path.splitext(os.path.basename(rf))
        if stem != stem.upper():
            fail(f"{rf}: reference file stem must be UPPERCASE")

# 4. Bucket README.md, top-level README.md, and docs/<bucket>/<skill>.md sync
with open("README.md", encoding="utf-8") as f:
    top_readme = f.read()

for bucket in sorted(os.listdir("skills")):
    bdir = os.path.join("skills", bucket)
    if not os.path.isdir(bdir):
        continue
    b_readme_path = os.path.join(bdir, "README.md")
    if not os.path.exists(b_readme_path):
        fail(f"{bdir}: missing README.md")
        continue
    with open(b_readme_path, encoding="utf-8") as f:
        b_readme = f.read()

    for sk in sorted(glob.glob(f"skills/{bucket}/*/SKILL.md")):
        name = sk.split("/")[2]
        if f"./{name}/SKILL.md" not in b_readme:
            fail(f"{b_readme_path}: missing link ./{name}/SKILL.md")
        doc_path = f"docs/{bucket}/{name}.md"
        if bucket in ("engineering", "productivity"):
            if f"./skills/{bucket}/{name}/SKILL.md" not in top_readme:
                fail(f"README.md: missing promoted skill ./skills/{bucket}/{name}/SKILL.md")
            if not os.path.exists(doc_path):
                fail(f"{doc_path}: missing docs page for promoted skill {bucket}/{name}")
        else:
            if f"/{name}/SKILL.md" in top_readme:
                fail(f"README.md: non-promoted skill {bucket}/{name} must not appear in top-level README.md")
            for db in ("engineering", "productivity", "in-progress", "misc", "deprecated"):
                if os.path.exists(f"docs/{db}/{name}.md"):
                    fail(f"docs/{db}/{name}.md: non-promoted skill {bucket}/{name} must not have a docs page")

# 5. Case-exact relative markdown links & no stale upstream URLs
def exists_case_exact(path):
    cur = "/"
    for part in os.path.abspath(path).strip("/").split("/"):
        try:
            entries = os.listdir(cur)
        except OSError:
            return False
        if part not in entries:
            return False
        cur = os.path.join(cur, part)
    return True

for mf in sorted(glob.glob("**/*.md", recursive=True)):
    with open(mf, encoding="utf-8") as f:
        content = f.read()
    if re.search(r"aihero\.dev|matt[- ]?pocock", content, flags=re.I):
        fail(f"{mf}: contains stale upstream reference (aihero.dev or matt-pocock)")
    stripped = re.sub(r"```.*?```", "", content, flags=re.S)
    stripped = re.sub(r"`[^`\n]+`", "", stripped)
    for m in re.finditer(r"\[([^\]]*)\]\(([^)]*)\)", stripped):
        label, target = m.group(1), m.group(2).strip()
        if not target:
            fail(f"{mf}: empty markdown link [{label}]()")
            continue
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        target_path = target.split("#")[0]
        if not target_path:
            continue
        resolved = os.path.normpath(os.path.join(os.path.dirname(mf), target_path))
        if not exists_case_exact(resolved):
            fail(f"{mf}: broken or case-mismatched link [{label}]({target})")

if errors:
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    print(f"\ncheck-repo: FAIL ({len(errors)} issues)", file=sys.stderr)
    sys.exit(1)

print("check-repo: PASS")
PY
