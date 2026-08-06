//
//  WidgetBridgePlugin.swift — Capacitor plugin the web app calls after every
//  progress change; writes the widget state into the App Group container and
//  asks WidgetKit to refresh. STAGED — see README-WIDGETS-SETUP.md.
//
import Foundation
import Capacitor
import WidgetKit

private let APP_GROUP = "group.com.shancoh.brachaswithrimon"

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {
    @objc func sync(_ call: CAPPluginCall) {
        guard let d = UserDefaults(suiteName: APP_GROUP) else {
            call.reject("app group unavailable — check entitlements")
            return
        }
        d.set(call.getInt("streak") ?? 0, forKey: "streak")
        d.set(call.getInt("streakBest") ?? 0, forKey: "streakBest")
        d.set(call.getInt("totalBrachos") ?? 0, forKey: "totalBrachos")
        d.set(call.getInt("brachosToday") ?? 0, forKey: "brachosToday")
        d.set(call.getBool("blessedToday") ?? false, forKey: "blessedToday")
        d.set(call.getString("updatedDay") ?? "", forKey: "updatedDay")
        if let week = call.getArray("week", Bool.self) { d.set(week, forKey: "week") }
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
