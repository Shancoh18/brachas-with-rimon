//  Capacitor plugin registration — STAGED, see README-WIDGETS-SETUP.md.
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
  CAP_PLUGIN_METHOD(sync, CAPPluginReturnPromise);
)
