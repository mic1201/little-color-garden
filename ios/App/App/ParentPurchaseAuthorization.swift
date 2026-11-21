import Foundation
import LocalAuthentication
import Security
import UIKit

@MainActor
final class ParentPurchaseAuthorization {
    private struct PINRecord: Codable {
        let pin: String
        var failedAttempts = 0
        var lockedUntil: Date?
    }

    private enum KeychainError: Error {
        case unavailable
    }

    private let keychainItem: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "tw.mic1201.littlecolorgarden.parent",
        kSecAttrAccount as String: "purchase-pin",
    ]
    private var context: LAContext?
    private var pinPrompt: (alert: UIAlertController, result: CheckedContinuation<String?, Never>)?
    private var session: UUID?
    private var expiresAt: TimeInterval = 0

    var currentSession: UUID? {
        guard UIApplication.shared.applicationState == .active,
              ProcessInfo.processInfo.systemUptime < expiresAt else { return nil }
        return session
    }

    func lock() {
        session = nil
        context?.invalidate()
        context = nil
        if let alert = pinPrompt?.alert {
            alert.dismiss(animated: false)
            finishPINPrompt(alert, value: nil)
        }
    }

    func authorize(from presenter: UIViewController?) async -> [String: Any] {
        guard UIApplication.shared.applicationState == .active, context == nil, pinPrompt == nil else {
            return ["status": "cancelled"]
        }
        session = nil
        do {
            if var record = try loadPIN() {
                if let lockedUntil = record.lockedUntil {
                    guard lockedUntil <= Date() else { return ["status": "locked"] }
                    record.lockedUntil = nil
                    record.failedAttempts = 0
                }
                guard let pin = await requestPIN(from: presenter, title: "家長驗證", creating: false),
                      UIApplication.shared.applicationState == .active else { return ["status": "cancelled"] }
                guard pin == record.pin else {
                    record.failedAttempts += 1
                    if record.failedAttempts >= 5 { record.lockedUntil = Date().addingTimeInterval(60) }
                    try savePIN(record)
                    return ["status": record.lockedUntil == nil ? "invalidPIN" : "locked"]
                }
                try savePIN(PINRecord(pin: pin))
                return grant(hasPIN: true)
            }
            return await authenticateDevice()
        } catch {
            return ["status": "unavailable"]
        }
    }

    func configure(remove: Bool, from presenter: UIViewController?) async -> [String: Any] {
        guard let authorizedSession = currentSession, pinPrompt == nil else { return ["status": "cancelled"] }
        do {
            if remove {
                let result = SecItemDelete(keychainItem as CFDictionary)
                guard result == errSecSuccess || result == errSecItemNotFound else {
                    throw KeychainError.unavailable
                }
            } else {
                let title = try loadPIN() == nil ? "設定家長 PIN" : "更改家長 PIN"
                guard let pin = await requestPIN(from: presenter, title: title, creating: true),
                      currentSession == authorizedSession else { return ["status": "cancelled"] }
                try savePIN(PINRecord(pin: pin))
            }
            return ["status": "saved", "hasPIN": !remove]
        } catch {
            return ["status": "unavailable"]
        }
    }

    private func requestPIN(from presenter: UIViewController?, title: String, creating: Bool) async -> String? {
        guard let presenter, presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil else { return nil }
        let message = creating
            ? "請輸入並確認只有家長知道的 6 位數 PIN。設定後，這台裝置會用 PIN 開啟購買選項。"
            : "請輸入家長設定的 6 位數 PIN。"
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        let placeholders = creating ? ["新家長 PIN", "再次輸入新 PIN"] : ["家長 PIN"]
        for placeholder in placeholders {
            alert.addTextField { field in
                field.placeholder = placeholder
                field.accessibilityLabel = placeholder
                field.keyboardType = .numberPad
                field.isSecureTextEntry = true
            }
        }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { [weak self, weak alert] _ in
            self?.finishPINPrompt(alert, value: nil)
        })
        let submit = UIAlertAction(title: creating ? "儲存 PIN" : "驗證", style: .default) { [weak self, weak alert] _ in
            self?.finishPINPrompt(alert, value: alert?.textFields?.first?.text)
        }
        submit.isEnabled = false
        alert.addAction(submit)
        for field in alert.textFields ?? [] {
            field.addAction(UIAction { [weak alert, weak submit] _ in
                let values = alert?.textFields?.compactMap(\.text) ?? []
                guard let first = values.first else { return }
                submit?.isEnabled = values.count == placeholders.count && Self.validPIN(first)
                    && values.allSatisfy { $0 == first }
            }, for: .editingChanged)
        }

        return await withCheckedContinuation { result in
            pinPrompt = (alert, result)
            presenter.present(alert, animated: true)
        }
    }

    private func finishPINPrompt(_ alert: UIAlertController?, value: String?) {
        guard let prompt = pinPrompt, prompt.alert === alert else { return }
        pinPrompt = nil
        prompt.alert.textFields?.forEach { $0.text = nil }
        prompt.result.resume(returning: value)
    }

    private func authenticateDevice() async -> [String: Any] {
        let challenge = LAContext()
        challenge.localizedCancelTitle = "取消"
        var error: NSError?
        guard challenge.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return ["status": Self.deviceErrorStatus(error)]
        }

        context = challenge
        defer {
            if context === challenge { context = nil }
        }
        do {
            let verified = try await challenge.evaluatePolicy(
                .deviceOwnerAuthentication, localizedReason: "請由家長驗證後開啟購買選項。"
            )
            guard verified, context === challenge, UIApplication.shared.applicationState != .background else {
                return ["status": "cancelled"]
            }
            return grant(hasPIN: false)
        } catch {
            return ["status": Self.deviceErrorStatus(error as NSError)]
        }
    }

    private func grant(hasPIN: Bool) -> [String: Any] {
        session = UUID()
        expiresAt = ProcessInfo.processInfo.systemUptime + 120
        return ["status": "authorized", "hasPIN": hasPIN]
    }

    private static func deviceErrorStatus(_ error: NSError?) -> String {
        guard let error, error.domain == LAError.errorDomain else { return "unavailable" }
        switch LAError.Code(rawValue: error.code) {
        case .userCancel, .appCancel, .systemCancel, .invalidContext:
            return "cancelled"
        case .passcodeNotSet:
            return "passcodeNotSet"
        default:
            return "unavailable"
        }
    }

    private static func validPIN(_ pin: String) -> Bool {
        pin.utf8.count == 6 && pin.utf8.allSatisfy { (48...57).contains($0) }
    }

    private func loadPIN() throws -> PINRecord? {
        var query = keychainItem
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let result = SecItemCopyMatching(query as CFDictionary, &item)
        if result == errSecItemNotFound { return nil }
        guard result == errSecSuccess, let data = item as? Data else { throw KeychainError.unavailable }
        return try JSONDecoder().decode(PINRecord.self, from: data)
    }

    private func savePIN(_ record: PINRecord) throws {
        let data = try JSONEncoder().encode(record)
        let attributes = [kSecValueData as String: data]
        let result = SecItemUpdate(keychainItem as CFDictionary, attributes as CFDictionary)
        if result == errSecSuccess { return }
        guard result == errSecItemNotFound else { throw KeychainError.unavailable }

        var item = keychainItem
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw KeychainError.unavailable }
    }
}
