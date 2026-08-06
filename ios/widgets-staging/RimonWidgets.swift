//
//  RimonWidgets.swift — iPhone Home Screen widgets for Brachas with Rimon.
//
//  Two widgets, both reading shared state the app writes through the
//  WidgetBridge Capacitor plugin into the App Group container:
//    · StreakWidget — the 🔥 streak with a 7-day strip
//    · BrachaTodayWidget — "Have you said your bracha today?" flips to a ✓
//
//  STAGED: this file is not in the Xcode project yet — see
//  README-WIDGETS-SETUP.md in this folder for the one-time target setup.
//

import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.shancoh.brachaswithrimon"

// ---------------------------------------------------------------- shared state
struct RimonState {
    var streak: Int = 0
    var streakBest: Int = 0
    var totalBrachos: Int = 0
    var brachosToday: Int = 0
    var blessedToday: Bool = false
    var week: [Bool] = Array(repeating: false, count: 7) // oldest → today
    var updatedDay: String = "" // YYYY-MM-DD local, as the app wrote it

    static func load() -> RimonState {
        var s = RimonState()
        guard let d = UserDefaults(suiteName: APP_GROUP) else { return s }
        s.streak = d.integer(forKey: "streak")
        s.streakBest = d.integer(forKey: "streakBest")
        s.totalBrachos = d.integer(forKey: "totalBrachos")
        s.brachosToday = d.integer(forKey: "brachosToday")
        s.blessedToday = d.bool(forKey: "blessedToday")
        s.updatedDay = d.string(forKey: "updatedDay") ?? ""
        if let w = d.array(forKey: "week") as? [Bool], w.count == 7 { s.week = w }
        // day rollover without the app opening: "today ✓" must expire at midnight
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        if s.updatedDay != fmt.string(from: Date()) {
            s.blessedToday = false
            s.brachosToday = 0
        }
        return s
    }
}

// palette (Editorial Luxury, light + dark aware)
private extension Color {
    static let cream = Color(red: 0.980, green: 0.969, blue: 0.914)
    static let creamDark = Color(red: 0.110, green: 0.086, blue: 0.067)
    static let espresso = Color(red: 0.169, green: 0.129, blue: 0.102)
    static let espressoInkDark = Color(red: 0.949, green: 0.914, blue: 0.847)
    static let gold = Color(red: 0.659, green: 0.494, blue: 0.184)
    static let rimonRed = Color(red: 0.631, green: 0.200, blue: 0.153)
    static let sage = Color(red: 0.490, green: 0.545, blue: 0.455)
}

private struct WidgetChrome<Content: View>: View {
    @Environment(\.colorScheme) var scheme
    let content: Content
    init(@ViewBuilder _ content: () -> Content) { self.content = content() }
    var ink: Color { scheme == .dark ? .espressoInkDark : .espresso }
    var body: some View {
        content
            .containerBackground(for: .widget) {
                scheme == .dark ? Color.creamDark : Color.cream
            }
    }
}

// ------------------------------------------------------------------ timeline
struct RimonEntry: TimelineEntry {
    let date: Date
    let state: RimonState
}

struct RimonProvider: TimelineProvider {
    func placeholder(in _: Context) -> RimonEntry {
        var s = RimonState(); s.streak = 7; s.brachosToday = 3; s.blessedToday = true
        s.week = [true, true, false, true, true, true, true]
        return RimonEntry(date: Date(), state: s)
    }
    func getSnapshot(in _: Context, completion: @escaping (RimonEntry) -> Void) {
        completion(RimonEntry(date: Date(), state: RimonState.load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<RimonEntry>) -> Void) {
        let entry = RimonEntry(date: Date(), state: RimonState.load())
        // refresh at the next midnight so "today" flips honestly, and hourly
        // in between in case the system throttles
        let cal = Calendar.current
        let midnight = cal.nextDate(after: Date(), matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
        let hourly = Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(min(midnight, hourly))))
    }
}

// ------------------------------------------------------------- streak widget
struct StreakWidgetView: View {
    @Environment(\.colorScheme) var scheme
    let entry: RimonEntry
    var ink: Color { scheme == .dark ? .espressoInkDark : .espresso }
    var body: some View {
        WidgetChrome {
            VStack(alignment: .leading, spacing: 6) {
                Text("STREAK")
                    .font(.system(size: 9, weight: .bold))
                    .kerning(1.6)
                    .foregroundStyle(Color.gold)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(entry.state.streak)")
                        .font(.system(size: 34, weight: .black, design: .serif))
                        .foregroundStyle(Color.rimonRed)
                    Text("🔥").font(.system(size: 16))
                    Spacer()
                }
                HStack(spacing: 3) {
                    ForEach(0..<7, id: \.self) { i in
                        Capsule()
                            .fill(entry.state.week[i] ? Color.gold : ink.opacity(0.12))
                            .frame(height: 5)
                    }
                }
                Text("best \(entry.state.streakBest) · \(entry.state.totalBrachos) brachos")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(ink.opacity(0.65))
            }
        }
    }
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RimonStreakWidget", provider: RimonProvider()) {
            StreakWidgetView(entry: $0)
        }
        .configurationDisplayName("Bracha streak")
        .description("Your streak and the last seven days, at a glance.")
        .supportedFamilies([.systemSmall])
    }
}

// -------------------------------------------------------- bracha-today widget
struct BrachaTodayView: View {
    @Environment(\.colorScheme) var scheme
    let entry: RimonEntry
    var ink: Color { scheme == .dark ? .espressoInkDark : .espresso }
    var body: some View {
        WidgetChrome {
            VStack(alignment: .leading, spacing: 7) {
                Text("TODAY")
                    .font(.system(size: 9, weight: .bold))
                    .kerning(1.6)
                    .foregroundStyle(Color.gold)
                if entry.state.blessedToday {
                    Text("Bracha said ✓")
                        .font(.system(size: 15, weight: .bold, design: .serif))
                        .foregroundStyle(Color.sage)
                    Text(entry.state.brachosToday > 0
                        ? "\(entry.state.brachosToday) today — beautiful."
                        : "Beautiful. Keep going.")
                        .font(.system(size: 11))
                        .foregroundStyle(ink.opacity(0.7))
                } else {
                    Text("Have you said your bracha today?")
                        .font(.system(size: 14, weight: .bold, design: .serif))
                        .foregroundStyle(ink)
                        .minimumScaleFactor(0.8)
                    Text("Your streak is waiting 🍎")
                        .font(.system(size: 11))
                        .foregroundStyle(ink.opacity(0.7))
                }
                Spacer(minLength: 0)
            }
        }
    }
}

struct BrachaTodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RimonBrachaTodayWidget", provider: RimonProvider()) {
            BrachaTodayView(entry: $0)
        }
        .configurationDisplayName("Bracha reminder")
        .description("A gentle nudge until today's bracha is said.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct RimonWidgetBundle: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        BrachaTodayWidget()
    }
}
