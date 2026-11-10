# SwiftUI Accessibility Patterns Reference

## Table of Contents

- [Core Principle](#core-principle)
- [Dynamic Type and @ScaledMetric](#dynamic-type-and-scaledmetric)
- [Accessibility Traits](#accessibility-traits)
- [Decorative Images](#decorative-images)
- [Element Grouping](#element-grouping)
- [Custom Controls](#custom-controls)
- [Summary Checklist](#summary-checklist)

## Core Principle

Prefer `Button` over `onTapGesture` for tappable elements. `Button` provides VoiceOver support, focus handling, and proper traits for free.

Reserve `onTapGesture` for cases that need tap location or tap count. When it is unavoidable, add `.accessibilityAddTraits(.isButton)` so VoiceOver announces it as a button. Keep tap targets at least 44x44 points.

## Dynamic Type and @ScaledMetric

System text styles scale with Dynamic Type automatically. Prefer built-in styles like `.largeTitle`, `.title`, `.title2`, `.title3`, `.headline`, `.subheadline`, `.body`, `.callout`, `.footnote`, `.caption`, and `.caption2` when they fit your UI:

```swift
VStack(alignment: .leading) {
    Text("Inbox")
        .font(.title2)
    Text("3 unread messages")
        .font(.body)
    Text("Updated just now")
        .font(.caption)
}
```

For custom fonts, use a Dynamic Type-aware font initializer so the text still follows the user's preferred content size:

```swift
VStack(alignment: .leading) {
    Text("Article")
        .font(.custom("SourceSerif4-Semibold", size: 28, relativeTo: .title2))
    Text("Body copy")
        .font(.custom("SourceSerif4-Regular", size: 17))
}
```

`Font.custom(_:size:relativeTo:)` lets you match a specific text style. `Font.custom(_:size:)` scales relative to the body style. Avoid fixed-size custom fonts for primary content that should respond to Dynamic Type.

For non-text numeric values like padding, spacing, and image sizes, use `@ScaledMetric`:

```swift
struct ProfileHeader: View {
    @ScaledMetric private var avatarSize = 60.0
    @ScaledMetric private var spacing = 12.0

    var body: some View {
        HStack(spacing: spacing) {
            Image("avatar")
                .resizable()
                .frame(width: avatarSize, height: avatarSize)
            Text("Username")
        }
    }
}
```

Specify a `relativeTo` text style when the value should track a specific Dynamic Type style, including for images or icons that should stay proportional to nearby text:

```swift
struct StatusRow: View {
    @ScaledMetric(relativeTo: .body) private var iconSize = 18.0

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: iconSize))
            Text("Synced")
                .font(.custom("AvenirNext-Regular", size: 17, relativeTo: .body))
        }
    }
}
```

### Reading the text size

Read `@Environment(\.dynamicTypeSize)` instead of the soft-deprecated `sizeCategory` / `ContentSizeCategory`. `DynamicTypeSize.isAccessibilitySize` selects a layout for the largest sizes:

```swift
@Environment(\.dynamicTypeSize) private var dynamicTypeSize

var body: some View {
    let layout = dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout()) : AnyLayout(HStackLayout())
    layout { icon; title }
}
```

On iOS 26+, `.font(.body.scaled(by: 1.2))` adjusts a text style's size while still following Dynamic Type. Use `.bold()` rather than `.fontWeight(.bold)` so the system picks the weight for the context, and treat `.caption2` (and, with care, `.caption`) as very small text.

## Accessibility Traits

Use `accessibilityAddTraits` and `accessibilityRemoveTraits` for state-driven traits:

```swift
Text(item.title)
    .accessibilityAddTraits(item.isSelected ? [.isSelected, .isButton] : .isButton)
```

Use `.disabled(true)` to make VoiceOver announce "Dimmed" for non-interactive elements.

## Decorative Images

Use `Image(decorative:bundle:)` when an asset image is purely visual and should not appear in the accessibility tree.

```swift
Image(decorative: "confetti")
```

This is appropriate for backgrounds, flourishes, and icons that do not add meaning beyond nearby text.

If the image conveys information, keep it accessible and provide a clear label:

```swift
Image("receipt")
    .accessibilityLabel("Receipt")
```

For non-asset images, such as SF Symbols, hide decorative content with `accessibilityHidden(true)` instead:

```swift
Image(systemName: "sparkles")
    .accessibilityHidden(true)
```

## Labels, Menus, and Voice Control

Buttons and menus with an image need a text title, because VoiceOver reads the title. Keep the visual icon-only with `.labelStyle(.iconOnly)` when needed:

```swift
Button("Add", systemImage: "plus", action: add)
Menu("Options", systemImage: "ellipsis.circle") { /* ... */ }
    .labelStyle(.iconOnly)
```

For labels that change often or are long, add `accessibilityInputLabels(["Apple"])` so Voice Control users can say a stable name (for example a button labeled "AAPL $271.68").

## Motion and Color Settings

When `@Environment(\.accessibilityReduceMotion)` is true, replace large motion animations with opacity changes. When color is the only differentiator, read `@Environment(\.accessibilityDifferentiateWithoutColor)` and add icons, patterns, or strokes.

## Element Grouping

### .combine -- Auto-join child labels

```swift
HStack {
    Image(systemName: "star.fill")
    Text("Favorites")
    Text("(\(count))")
}
.accessibilityElement(children: .combine)
```

VoiceOver reads all child labels as one element, separated by commas.

### .ignore -- Manual label for container

```swift
HStack {
    Text(item.name)
    Spacer()
    Text(item.price)
}
.accessibilityElement(children: .ignore)
.accessibilityLabel("\(item.name), \(item.price)")
```

### .contain -- Semantic grouping

```swift
HStack {
    ForEach(tabs) { tab in
        TabButton(tab: tab)
    }
}
.accessibilityElement(children: .contain)
.accessibilityLabel("Tab bar")
```

VoiceOver announces the container name when focus enters/exits.

## Custom Controls

### Adjustable controls (increment/decrement)

```swift
PageControl(selectedIndex: $selectedIndex, pageCount: pageCount)
    .accessibilityElement()
    .accessibilityValue("Page \(selectedIndex + 1) of \(pageCount)")
    .accessibilityAdjustableAction { direction in
        switch direction {
        case .increment:
            guard selectedIndex < pageCount - 1 else { break }
            selectedIndex += 1
        case .decrement:
            guard selectedIndex > 0 else { break }
            selectedIndex -= 1
        @unknown default:
            break
        }
    }
```

### Representing custom views as native controls

When a custom view should behave like a native control for accessibility:

```swift
HStack {
    Text(label)
    Toggle("", isOn: $isOn)
}
.accessibilityRepresentation {
    Toggle(label, isOn: $isOn)
}
```

### Label-content pairing

```swift
@Namespace private var ns

HStack {
    Text("Volume")
        .accessibilityLabeledPair(role: .label, id: "volume", in: ns)
    Slider(value: $volume)
        .accessibilityLabeledPair(role: .content, id: "volume", in: ns)
}
```

## Summary Checklist

- [ ] Use `Button` instead of `onTapGesture` for tappable elements
- [ ] Image-based buttons and menus carry a text title; Reduce Motion and Differentiate Without Color are honored
- [ ] Use built-in text styles or Dynamic Type-aware custom fonts for text
- [ ] Use `@ScaledMetric` for custom values that should scale with Dynamic Type
- [ ] Mark purely decorative images as decorative or hidden from accessibility
- [ ] Group related elements with `accessibilityElement(children:)`
- [ ] Provide `accessibilityLabel` when default labels are unclear
- [ ] Use `accessibilityRepresentation` for custom controls
- [ ] Use `accessibilityAdjustableAction` for increment/decrement controls
- [ ] Ensure navigation flow is logical when using VoiceOver grouping
