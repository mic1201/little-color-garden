import Capacitor
import GoogleMobileAds
import UIKit

@objc(PaperTestAdsPlugin)
final class PaperTestAdsPlugin: CAPPlugin, CAPBridgedPlugin, FullScreenContentDelegate, NativeAdLoaderDelegate, BannerViewDelegate {
    let identifier = "PaperTestAdsPlugin"
    let jsName = "PaperTestAds"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "preparePaperAd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showPaperAd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadDrawingAd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "positionDrawingAd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideDrawingAd", returnType: CAPPluginReturnPromise),
    ]

    private let testAdUnitID = "ca-app-pub-3940256099942544/4411468910"
    private enum DrawingAdFormat: String {
        case native, banner
    }

    private let drawingAdUnitID = "ca-app-pub-3940256099942544/3986624511"
    private let drawingBannerUnitID = "ca-app-pub-3940256099942544/2934735716"
    private let store: DrawingStorePlugin
    @MainActor private var cachedAd: (ad: InterstitialAd, loadedAt: TimeInterval)?
    @MainActor private var presentingAd: InterstitialAd?
    @MainActor private var loading = false
    @MainActor private var startup: Task<Void, Never>?
    @MainActor private var drawingLoader: AdLoader?
    @MainActor private var drawingRequest: CAPPluginCall?
    @MainActor private var drawingTimeout: Task<Void, Never>?
    @MainActor private var drawingBanner: BannerView?
    @MainActor private var drawingView: UIView?

    init(store: DrawingStorePlugin) {
        self.store = store
        super.init()
    }

    @objc func preparePaperAd(_ call: CAPPluginCall) {
        call.resolve()
        Task { @MainActor in await prepareInterstitial() }
    }

    @objc func showPaperAd(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard UIApplication.shared.applicationState == .active,
                  presentingAd == nil, await store.allowsPaperTestAds(),
                  presentingAd == nil,
                  let presenter = bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil,
                  presenter.presentedViewController == nil,
                  UIApplication.shared.applicationState == .active else {
                call.resolve(["status": "skipped"])
                return
            }
            guard let ad = readyInterstitial() else {
                call.resolve(["status": "skipped"])
                await prepareInterstitial()
                return
            }
            cachedAd = nil
            presentingAd = ad
            ad.fullScreenContentDelegate = self
            ad.present(from: presenter)
            call.resolve(["status": "requested"])
        }
    }

    @MainActor private func readyInterstitial() -> InterstitialAd? {
        guard let cachedAd else { return nil }
        guard ProcessInfo.processInfo.systemUptime - cachedAd.loadedAt < 55 * 60 else {
            self.cachedAd = nil
            return nil
        }
        return cachedAd.ad
    }

    @MainActor private func prepareInterstitial() async {
        guard UIApplication.shared.applicationState != .background, !loading,
              presentingAd == nil, readyInterstitial() == nil else { return }
        loading = true
        defer { loading = false }
        guard await store.allowsPaperTestAds(), UIApplication.shared.applicationState != .background else { return }

        await startAds()
        guard await store.allowsPaperTestAds(),
              UIApplication.shared.applicationState != .background else { return }

        do {
            let ad = try await InterstitialAd.load(with: testAdUnitID, request: Request())
            guard await store.allowsPaperTestAds() else { return }
            cachedAd = (ad, ProcessInfo.processInfo.systemUptime)
            NSLog("LCGAdMobTest: Google test interstitial loaded")
        } catch {
            NSLog("LCGAdMobTest: Google test interstitial load failed: %@", error.localizedDescription)
        }
    }

    @MainActor private func startAds() async {
        if startup == nil {
            startup = Task { @MainActor in
                MobileAds.shared.requestConfiguration.ageRestrictedTreatment = .child
                MobileAds.shared.requestConfiguration.maxAdContentRating = .general
                _ = await MobileAds.shared.start()
            }
        }
        await startup?.value
    }

    @objc func loadDrawingAd(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let format = DrawingAdFormat(rawValue: call.getString("format") ?? "native") else {
                call.resolve(["status": "unavailable"])
                return
            }
            removeDrawingAd()
            drawingRequest = call
            scheduleDrawingTimeout()
            guard UIApplication.shared.applicationState != .background,
                  await store.allowsDrawingTestAds() else {
                if drawingRequest === call { removeDrawingAd() }
                return
            }
            guard drawingRequest === call else { return }
            await startAds()
            guard drawingRequest === call else { return }
            guard UIApplication.shared.applicationState != .background,
                  let controller = bridge?.viewController else {
                removeDrawingAd()
                return
            }
            switch format {
            case .native:
                let loader = AdLoader(adUnitID: drawingAdUnitID, rootViewController: controller,
                                      adTypes: [.native], options: nil)
                drawingLoader = loader
                loader.delegate = self
                loader.load(Request())
            case .banner:
                let banner = BannerView(adSize: AdSizeBanner)
                banner.adUnitID = drawingBannerUnitID
                banner.rootViewController = controller
                banner.delegate = self
                drawingBanner = banner
                banner.load(Request())
            }
        }
    }

    @MainActor private func scheduleDrawingTimeout() {
        drawingTimeout = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 15_000_000_000)
            if !Task.isCancelled { self?.removeDrawingAd() }
        }
    }

    @objc func positionDrawingAd(_ call: CAPPluginCall) {
        Task { @MainActor in
            defer { call.resolve() }
            guard let adView = drawingView, let webView = bridge?.webView, let host = webView.superview else { return }
            func point(_ name: String) -> CGFloat { CGFloat(call.getDouble(name) ?? 0) }
            let viewportWidth = point("viewportWidth")
            let width = point("width")
            let height = point("height")
            guard width > 0, height > 0, viewportWidth > 0,
                  UIApplication.shared.applicationState != .background else {
                adView.isHidden = true
                return
            }
            let scale = webView.bounds.width / viewportWidth
            let slot = CGRect(x: point("x") * scale, y: point("y") * scale,
                              width: width * scale, height: height * scale)
            var bounds = slot
            if let banner = adView as? BannerView {
                let size = banner.adSize.size
                guard size.width <= slot.width, size.height <= slot.height else {
                    adView.isHidden = true
                    return
                }
                bounds = CGRect(x: slot.midX - size.width / 2, y: slot.midY - size.height / 2,
                                width: size.width, height: size.height)
            }
            adView.frame = webView.convert(bounds, to: host)
            if adView.superview !== host { host.insertSubview(adView, aboveSubview: webView) }
            adView.isHidden = false
        }
    }

    @objc func hideDrawingAd(_ call: CAPPluginCall) {
        Task { @MainActor in
            removeDrawingAd()
            call.resolve()
        }
    }

    @MainActor private func removeDrawingAd() {
        drawingTimeout?.cancel()
        drawingTimeout = nil
        drawingLoader?.delegate = nil
        drawingLoader = nil
        drawingBanner?.delegate = nil
        drawingBanner = nil
        drawingRequest?.resolve(["status": "unavailable"])
        drawingRequest = nil
        drawingView?.removeFromSuperview()
        drawingView = nil
    }

    @MainActor private func finishDrawingLoad(_ adView: UIView, for call: CAPPluginCall,
                                              format: DrawingAdFormat) async {
        guard drawingRequest === call else { return }
        guard await store.allowsDrawingTestAds(), UIApplication.shared.applicationState != .background else {
            if drawingRequest === call { removeDrawingAd() }
            return
        }
        guard drawingRequest === call else { return }
        drawingView = adView
        drawingTimeout?.cancel()
        drawingTimeout = nil
        drawingRequest = nil
        call.resolve(["status": "loaded"])
        NSLog("LCGAdMobTest: Google above-board %@ test ad loaded", format.rawValue)
    }

    @MainActor func adLoader(_ adLoader: AdLoader, didReceive nativeAd: NativeAd) {
        guard adLoader === drawingLoader, let call = drawingRequest else { return }
        Task { @MainActor in
            await finishDrawingLoad(makeDrawingCard(nativeAd), for: call, format: .native)
        }
    }

    @MainActor func adLoader(_ adLoader: AdLoader, didFailToReceiveAdWithError error: Error) {
        guard adLoader === drawingLoader, drawingRequest != nil else { return }
        NSLog("LCGAdMobTest: Google above-board native test ad load failed: %@", error.localizedDescription)
        removeDrawingAd()
    }

    @MainActor func bannerViewDidReceiveAd(_ bannerView: BannerView) {
        guard bannerView === drawingBanner, let call = drawingRequest else { return }
        Task { @MainActor in
            await finishDrawingLoad(bannerView, for: call, format: .banner)
        }
    }

    @MainActor func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
        guard bannerView === drawingBanner, drawingRequest != nil else { return }
        NSLog("LCGAdMobTest: Google above-board banner test ad load failed: %@", error.localizedDescription)
        removeDrawingAd()
    }

    @MainActor private func makeDrawingCard(_ ad: NativeAd) -> NativeAdView {
        let card = NativeAdView()
        card.backgroundColor = UIColor(red: 0.97, green: 0.96, blue: 0.92, alpha: 1)
        card.layer.cornerRadius = 14
        card.clipsToBounds = true

        func label(_ text: String?, size: CGFloat, lines: Int = 1, bold: Bool = false) -> UILabel {
            let label = UILabel()
            label.text = text
            label.font = .systemFont(ofSize: size, weight: bold ? .semibold : .regular)
            label.textColor = UIColor(red: 0.16, green: 0.22, blue: 0.21, alpha: 1)
            label.numberOfLines = lines
            label.isHidden = text?.isEmpty != false
            return label
        }

        let badge = label("廣告 · Google 測試", size: 10, bold: true)
        let headline = label(ad.headline, size: 14, bold: true)
        let body = label(ad.body, size: 11)
        let action = label(ad.callToAction, size: 12, lines: 2, bold: true)
        action.textColor = UIColor(red: 0.04, green: 0.33, blue: 0.29, alpha: 1)
        action.textAlignment = .center
        action.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)

        let media = MediaView()
        media.mediaContent = ad.mediaContent
        media.contentMode = .scaleAspectFit
        let icon = UIImageView(image: ad.icon?.image)
        icon.contentMode = .scaleAspectFit
        let title = UIStackView(arrangedSubviews: [headline])
        title.alignment = .center
        title.spacing = 5
        if ad.icon != nil {
            title.insertArrangedSubview(icon, at: 0)
            NSLayoutConstraint.activate([
                icon.widthAnchor.constraint(equalToConstant: 16),
                icon.heightAnchor.constraint(equalToConstant: 16),
            ])
        }
        let copy = UIStackView(arrangedSubviews: [badge, title, body])
        copy.axis = .vertical
        copy.spacing = 2
        let row = UIStackView(arrangedSubviews: [media, copy, action])
        row.alignment = .center
        row.spacing = 8
        row.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(row)
        NSLayoutConstraint.activate([
            row.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 8),
            row.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -10),
            row.centerYAnchor.constraint(equalTo: card.centerYAnchor),
            media.widthAnchor.constraint(equalToConstant: 50),
            media.heightAnchor.constraint(equalToConstant: 50),
            action.widthAnchor.constraint(lessThanOrEqualToConstant: 90),
        ])
        card.headlineView = headline
        card.bodyView = body
        card.callToActionView = action
        card.mediaView = media
        if ad.icon != nil { card.iconView = icon }
        card.nativeAd = ad
        return card
    }

    @MainActor func adWillPresentFullScreenContent(_ ad: FullScreenPresentingAd) {
        NSLog("LCGAdMobTest: Google test interstitial shown after switching paper")
    }

    @MainActor func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        reloadAfterPresentation()
    }

    @MainActor func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        NSLog("LCGAdMobTest: Google test interstitial show failed: %@", error.localizedDescription)
        reloadAfterPresentation()
    }

    @MainActor private func reloadAfterPresentation() {
        presentingAd = nil
        Task { @MainActor in await prepareInterstitial() }
    }
}
