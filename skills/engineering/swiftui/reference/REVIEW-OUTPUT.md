# Review output format

Reached from `SKILL.md` when the task is a review. Report genuine problems only: each finding is a real violation of a rule in the Topic Router references or the Correctness Checklist.

## Format

Organize findings by file, and list only files that have findings. For each finding:

1. State the file and relevant line(s).
2. Name the rule violated (for example, "Use `foregroundStyle()` instead of `foregroundColor()`").
3. Show a brief before/after code fix.

End with a prioritized summary of the most impactful changes to make first, each tagged with its topic and severity (high, medium, low). Done when every finding appears under its file and the summary orders them by impact.

## Example

**ContentView.swift**

Line 12: Use `foregroundStyle()` instead of `foregroundColor()`.

```swift
// Before
Text("Hello").foregroundColor(.red)

// After
Text("Hello").foregroundStyle(.red)
```

Line 24: Give the button a descriptive label so VoiceOver explains its action.

```swift
// Before
Button(action: addUser) {
    Image(systemName: "plus")
}

// After
Button("Add User", systemImage: "plus", action: addUser)
```

Line 31: Bind to the property directly instead of `Binding(get:set:)` in the view body, and move the setter's side effect into `onChange()`.

```swift
// Before
TextField("Username", text: Binding(
    get: { model.username },
    set: { newValue in model.username = newValue; model.save() }
))

// After
TextField("Username", text: $model.username)
    .onChange(of: model.username) {
        model.save()
    }
```

`onChange()` saves after any change to the username, including programmatic ones, and equal-value assignments do not trigger a save.

**Summary**

1. Accessibility (high): the add button needs an "Add User" label, because the symbol's default label does not say what will be added.
2. Deprecated API (medium): `foregroundColor()` on line 12 should be `foregroundStyle()`.
3. Data flow (medium): the manual binding on line 31 is fragile and harder to maintain.
