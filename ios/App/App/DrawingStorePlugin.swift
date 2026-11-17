import Capacitor
import StoreKit
import UIKit

@objc(DrawingStorePlugin)
final class DrawingStorePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "DrawingStorePlugin"
    let jsName = "DrawingStore"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    private enum Entitlement: String {
        case unknown, purchased, notPurchased, pending
    }

    private let productID = "remove_ads"
    private var updates: Task<Void, Never>?
    private var foregroundObserver: NSObjectProtocol?
    @MainActor private var hasPendingPurchase = false
    @MainActor private var storeActionInProgress = false

    override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                switch result {
                case .verified(let transaction) where transaction.productID == self.productID:
                    self.hasPendingPurchase = false
                    self.publish(await self.currentEntitlement())
                    await transaction.finish()
                case .unverified(let transaction, _) where transaction.productID == self.productID:
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
    }

    deinit {
        updates?.cancel()
        if let foregroundObserver { NotificationCenter.default.removeObserver(foregroundObserver) }
    }

    @objc func getState(_ call: CAPPluginCall) {
        Task { @MainActor in
            let product = try? await loadProduct()
            let entitlement = await currentEntitlement()
            var data: [String: Any] = ["entitlement": entitlement.rawValue]
            if let product { data["price"] = product.displayPrice }
            if product == nil && entitlement != .purchased { data["status"] = "unavailable" }
            call.resolve(data)
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !storeActionInProgress else { return complete(call, status: "unavailable") }
            storeActionInProgress = true
            defer { storeActionInProgress = false }

            guard !hasPendingPurchase else { return complete(call, entitlement: .pending) }
            if await currentEntitlement() == .purchased { return complete(call, entitlement: .purchased) }
            guard let product = try? await loadProduct() else { return complete(call, status: "unavailable") }
            guard UIApplication.shared.applicationState == .active else { return complete(call, status: "cancelled") }

            do {
                switch try await product.purchase() {
                case .success(.verified(let transaction)) where transaction.productID == productID
                    && transaction.revocationDate == nil:
                    hasPendingPurchase = false
                    publish(.purchased)
                    complete(call, entitlement: .purchased)
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

    @MainActor private func currentEntitlement() async -> Entitlement {
        var unverified = false
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction) where transaction.productID == productID && transaction.revocationDate == nil:
                return .purchased
            case .unverified(let transaction, _) where transaction.productID == productID:
                unverified = true
            default:
                break
            }
        }
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
