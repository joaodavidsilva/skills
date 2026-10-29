# Recording an Instruments Trace

Use this reference when the user asks to record a new trace: attach to a
running app, launch one fresh, or capture a specific session of actions they
perform interactively.

`xctrace` must be on PATH. Run `xcrun xctrace version`; if it fails, stop and
ask the user to install the Xcode command line tools.

The bundled `scripts/record_trace.py` wraps `xctrace record` with:

- The **SwiftUI** template by default (override with `--template`).
- **Manual stop** via Ctrl+C, a stop-file, or `--time-limit`.
- JSON discovery for devices and templates.
- Normal Python exit codes so an agent can orchestrate.
- Redacted command logging for values passed through `--env`.
- An explicit acknowledgement gate for system-wide recordings.

Done when a `.trace` bundle exists at the `--output` path and the script has
printed `trace written: <path>`.

## Privacy and consent

Prefer `--attach` or `--launch`, which limits collection to the app being
diagnosed. A system-wide recording can capture activity and metadata from
unrelated applications. Before using `--all-processes`, explain that scope to
the user and obtain their explicit approval. Then pass
`--allow-system-wide-recording` to record that acknowledgement in the command.

Values passed through `--env KEY=VALUE` are forwarded to `xctrace`, but the
wrapper redacts each value from its displayed command. Prefer a safer launch
configuration for secrets, because other local process-inspection tools may
still expose process arguments.

## Typical flows

Each recipe writes into a private directory: `dir=$(mktemp -d)` once per
session, then reuse `"$dir"`.

### A) Attach to a running app on a connected device

```bash
dir=$(mktemp -d)
python3 scripts/record_trace.py \
  --device "Pol's iPhone" \
  --attach "Helm" \
  --output "$dir/helm-session.trace"
```

Leave it running while the user exercises the app. Stop with **Ctrl+C**.

### B) Launch an app and record from the first frame

```bash
dir=$(mktemp -d)
python3 scripts/record_trace.py \
  --device "<UDID>" \
  --launch "/path/to/App.app" \
  --output "$dir/launch.trace"
```

Useful for diagnosing cold-start hitches and view-creation cost.

### C) Agent-driven: start in background, stop via stop-file

When you (the agent) run non-interactively, e.g. via
`Bash run_in_background`, use a stop-file to end the recording cleanly:

```bash
dir=$(mktemp -d)
echo "stop-file: $dir/stop"   # later tool calls may not share $dir; reuse this printed path literally

# Start recording (background)
python3 scripts/record_trace.py \
  --attach Helm --stop-file "$dir/stop" \
  --output "$dir/session.trace" &

# ...user does their thing...

# Stop cleanly (from another shell or tool call, with the printed path)
touch /path/printed/above/stop
```

The script polls every 0.5s for the stop-file, sends SIGINT to xctrace
when it appears, and waits up to 60s for the trace to finalise.

### D) Time-boxed recording

```bash
dir=$(mktemp -d)
python3 scripts/record_trace.py \
  --attach Helm --time-limit 30s --output "$dir/30s.trace"
```

xctrace stops itself at the limit.

## Discovery helpers

```bash
# List every connected device, simulator, and the host (JSON).
python3 scripts/record_trace.py --list-devices

# List all Instruments templates (JSON with a flat list + by-section map).
python3 scripts/record_trace.py --list-templates
```

Device entries have `kind` (`devices`, `devices offline`, `simulators`),
`name`, `os`, `udid`. Offline devices are known but unplugged or unpaired;
the user must plug them in before recording.

## Picking a template

> **Hard rule: use the `SwiftUI` template only on a real device (a physical
> iOS/iPadOS device or the host Mac). On the iOS Simulator it fails: xctrace
> reports "Hitches is not supported on this platform" and the saved trace
> cannot be exported ("run data is missing"), so `analyze_trace.py` errors
> out (observed with Xcode 27.1 and an iOS 27 Simulator).** If the chosen
> UDID falls under the `simulators` kind from `--list-devices`, switch to
> `Time Profiler`. It records the Time Profiler lane normally; the
> `hitches`, `swiftui`, and `swiftui-causes` lanes are absent from the trace
> and carry a "not in trace" note.

Decision flow:

| Target                                       | Template to pass     |
|----------------------------------------------|----------------------|
| Physical iOS/iPadOS device (connected)       | `SwiftUI` (default)  |
| Host Mac (macOS app, `--all-processes`, etc.)| `SwiftUI` (default)  |
| iOS / iPadOS / watchOS / tvOS Simulator      | `Time Profiler`      |

Confirm the target kind with `--list-devices` before starting a
recording: entries under `simulators` take Time Profiler; entries under
`devices` (both connected devices and the host Mac) support the SwiftUI
template. Entries under `devices offline` need the user to
connect/unlock/trust the device before recording.

For ad-hoc hang hunting on a real device, `Time Profiler` or
`Animation Hitches` alone may be enough.

For an explicitly approved system-wide recording:

```bash
dir=$(mktemp -d)
python3 scripts/record_trace.py \
  --all-processes --allow-system-wide-recording \
  --time-limit 30s --output "$dir/system-wide.trace"
```

## Chaining into analysis

The recording script prints `trace written: <path>` on exit. Feed that
path straight into `analyze_trace.py`:

```bash
dir=$(mktemp -d)
TRACE=$(python3 scripts/record_trace.py \
    --attach Helm --stop-file "$dir/stop" --output "$dir/session.trace" \
    2>&1 | awk '/trace written:/ {print $NF}')
python3 scripts/analyze_trace.py --trace "$TRACE" --json-only
```

If the user wanted a specific scope, combine with `--list-logs` /
`--list-signposts` / `--window` from `reference/TRACE-ANALYSIS.md`.

## Failure modes to handle

- **Device offline**: `--list-devices` shows it in `devices offline`.
  Ask the user to connect/unlock the device and retry.
- **Output path exists**: the script refuses to overwrite. Pick a new
  `--output` or delete the existing bundle.
- **App not running (for `--attach`)**: xctrace exits with an error;
  fall back to `--launch` or tell the user to open the app first.
- **Signing / trust on device**: iOS requires a development build
  signed with the user's team. If xctrace returns a signing error, point
  the user to trust the developer profile on the device.
