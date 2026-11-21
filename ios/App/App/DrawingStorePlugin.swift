import Capacitor
import StoreKit
import UIKit

@objc(DrawingStorePlugin)
final class DrawingStorePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "DrawingStorePlugin"
    let jsName = "DrawingStore"
    let pluginMethods: [CAPPluginMethod] = {
        var methods: [CAPPluginMethod] = [
            CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "getBoardAccess", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "authorizeParent", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "configureParentPIN", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "lockParent", returnType: CAPPluginReturnPromise),
        ]
        #if IOS_ADMOB_TEST
        methods.append(CAPPluginMethod(name: "setInterstitialTestMode", returnType: CAPPluginReturnPromise))
        #endif
        return methods
    }()

    private enum Entitlement: String {
        case unknown, purchased, legacyPurchased, notPurchased, pending

        var isOwned: Bool { self == .purchased || self == .legacyPurchased }
    }

    #if IOS_ADMOB_TEST
    private let productID = "remove_interstitial_ads"
    private let legacyProductID = "remove_ads"
    #else
    private let productID = "unlock_all_boards"
    #endif
    private var updates: Task<Void, Never>?
    private var foregroundObserver: NSObjectProtocol?
    private var backgroundObserver: NSObjectProtocol?
    @MainActor private lazy var parentAuthorization = ParentPurchaseAuthorization()
    @MainActor private var hasPendingPurchase = false
    @MainActor private var storeActionInProgress = false

    #if IOS_ADMOB_TEST
    private enum InterstitialTestMode: String {
        case store, shown, removed
    }

    @MainActor private var interstitialTestMode: InterstitialTestMode = .store
    #endif

    override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                switch result {
                case .verified(let transaction) where self.isStoreProduct(transaction.productID):
                    self.hasPendingPurchase = false
                    self.publish(await self.currentEntitlement())
                    await transaction.finish()
                case .unverified(let transaction, _) where self.isStoreProduct(transaction.productID):
                    self.publish(.unknown)
                default:
                    break
                }
            }
        }
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.publish(await self.currentEntitlement())
            }
        }
        backgroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in self?.parentAuthorization.lock() }
        }
    }

    deinit {
        updates?.cancel()
        if let foregroundObserver { NotificationCenter.default.removeObserver(foregroundObserver) }
        if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) }
    }

    @objc func authorizeParent(_ call: CAPPluginCall) {
        Task { @MainActor in
            let result = await parentAuthorization.authorize(from: bridge?.viewController)
            call.resolve(result)
        }
    }

    @objc func configureParentPIN(_ call: CAPPluginCall) {
        Task { @MainActor in
            let result = await parentAuthorization.configure(remove: call.getBool("remove") ?? false, from: bridge?.viewController)
            call.resolve(result)
        }
    }

    @objc func lockParent(_ call: CAPPluginCall) {
        Task { @MainActor in
            parentAuthorization.lock()
            call.resolve()
        }
    }

    @objc func getBoardAccess(_ call: CAPPluginCall) {
        Task { @MainActor in
            complete(call, entitlement: await currentEntitlement())
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        Task { @MainActor in
            let product = try? await loadProduct()
            let entitlement = await currentEntitlement()
            var data: [String: Any] = ["entitlement": entitlement.rawValue]
            if let product { data["price"] = product.displayPrice }
            #if IOS_ADMOB_TEST
            data["interstitialTestMode"] = interstitialTestMode.rawValue
            #endif
            if product == nil && !entitlement.isOwned { data["status"] = "unavailable" }
            call.resolve(data)
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let parentSession = parentAuthorization.currentSession else { return complete(call, status: "cancelled") }
            guard !storeActionInProgress else { return complete(call, status: "unavailable") }
            storeActionInProgress = true
            defer { storeActionInProgress = false }

            guard !hasPendingPurchase else { return complete(call, entitlement: .pending) }
            let entitlement = await currentEntitlement()
            if entitlement.isOwned { return complete(call, entitlement: entitlement) }
            guard let product = try? await loadProduct() else { return complete(call, status: "unavailable") }
            guard parentAuthorization.currentSession == parentSession else { return complete(call, status: "cancelled") }

            do {
                switch try await product.purchase() {
                case .success(.verified(let transaction)) where transaction.productID == productID
                    && transaction.revocationDate == nil:
                    hasPendingPurchase = false
                    let entitlement = await currentEntitlement()
                    publish(entitlement)
                    complete(call, entitlement: entitlement)
                    await transaction.finish()
                case .pending:
                    hasPendingPurchase = true
                    complete(call, entitlement: .pending)
                case .userCancelled:
                    complete(call, status: "cancelled")
                default:
                    complete(call, status: "unavailable")
                }
            } catch {
                complete(call, status: "unavailable")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard parentAuthorization.currentSession != nil else { return complete(call, status: "cancelled") }
            guard !storeActionInProgress else { return complete(call, status: "unavailable") }
            storeActionInProgress = true
            defer { storeActionInProgress = false }

            do {
                try await AppStore.sync()
                let entitlement = await currentEntitlement()
                publish(entitlement)
                complete(call, entitlement: entitlement)
            } catch StoreKitError.userCancelled {
                complete(call, status: "cancelled")
            } catch {
                complete(call, status: "unavailable")
            }
        }
    }

    private func loadProduct() async throws -> Product? {
        try await Product.products(for: [productID]).first { $0.id == productID && $0.type == .nonConsumable }
    }

    #if IOS_ADMOB_TEST
    @objc func setInterstitialTestMode(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard parentAuthorization.currentSession != nil, !storeActionInProgress else {
                return complete(call, status: "cancelled")
            }
            guard let value = call.getString("mode"), let mode = InterstitialTestMode(rawValue: value) else {
                return complete(call, status: "unavailable")
            }
            interstitialTestMode = mode
            call.resolve(["interstitialTestMode": mode.rawValue])
        }
    }

    @MainActor func allowsPaperTestAds() async -> Bool {
        guard !storeActionInProgress else { return false }
        if interstitialTestMode != .store { return interstitialTestMode == .shown }
        let entitlement = await currentEntitlement()
        guard !storeActionInProgress else { return false }
        switch interstitialTestMode {
        case .store: return entitlement == .notPurchased
        case .shown: return true
        case .removed: return false
        }
    }

    @MainActor func allowsDrawingTestAds() async -> Bool {
        let entitlement = await currentEntitlement()
        return entitlement != .legacyPurchased && entitlement != .unknown
    }
    #endif

    private func isStoreProduct(_ id: String) -> Bool {
        #if IOS_ADMOB_TEST
        return id == productID || id == legacyProductID
        #else
        return id == productID
        #endif
    }

    @MainActor private func currentEntitlement() async -> Entitlement {
        var purchased = false
        var unverified = false
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction) where isStoreProduct(transaction.productID) && transaction.revocationDate == nil:
                #if IOS_ADMOB_TEST
                if transaction.productID == legacyProductID { return .legacyPurchased }
                #endif
                purchased = true
            case .unverified(let transaction, _) where isStoreProduct(transaction.productID):
                unverified = true
            default:
                break
            }
        }
        if purchased { return .purchased }
        if unverified { return .unknown }
        return hasPendingPurchase ? .pending : .notPurchased
    }

    @MainActor private func publish(_ entitlement: Entitlement) {
        notifyListeners("entitlementChanged", data: ["entitlement": entitlement.rawValue])
    }

    @MainActor private func complete(_ call: CAPPluginCall, entitlement: Entitlement? = nil, status: String? = nil) {
        var data: [String: Any] = [:]
        if let entitlement { data["entitlement"] = entitlement.rawValue }
        if let status { data["status"] = status }
        call.resolve(data)
    }
}
