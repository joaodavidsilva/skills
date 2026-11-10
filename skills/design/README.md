# Design

UI, motion, and visual craft.

## User-invoked

Reachable only when you type them (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).

- **[break-ui](./break-ui/SKILL.md)**: Stress-test a UI component with realistic worst-case data behind a dev-only toggle and report what breaks.
- **[improve-animations](./improve-animations/SKILL.md)**: Audit a codebase's animations or hunt for motion opportunities, then write self-contained implementation plans.

## Model-invoked

Model- or user-reachable (rich trigger phrasing so the model can reach for them).

- **[interface-polish](./interface-polish/SKILL.md)**: Tune the small details that make an interface feel better: animation, typography, surfaces, hover states, hit areas, icons, and optical alignment.
- **[animate-expo](./animate-expo/SKILL.md)**: Build React Native and Expo animations, gestures, sheets, screen transitions, and haptics on the UI thread with Reanimated 4, Gesture Handler, Expo Router, and `expo-haptics`.
- **[animation-vocabulary](./animation-vocabulary/SKILL.md)**: Reverse-lookup a motion effect's exact term from a visual or feel description when you ask "what's it called when...".
- **[swiftui](./swiftui/SKILL.md)**: SwiftUI correctness and performance (state, composition, lists, navigation, animation, Liquid Glass, SDK 27 APIs), Swift concurrency safety and Swift 6+ migration, Swift Testing and XCTest migration, Xcode build-time optimization, plus Instruments trace recording and analysis.
- **[beautify-readme](./beautify-readme/SKILL.md)**: Redesign READMEs or create standalone README visual assets (pure SVG heroes, diagrams, section headers, hybrid cutouts, opt-in GIF motion).
- **[imagegen-gemini](./imagegen-gemini/SKILL.md)**: Generate or edit raster images with Gemini (photos, illustrations, textures, mockups, and chroma-keyed transparent cutouts).
