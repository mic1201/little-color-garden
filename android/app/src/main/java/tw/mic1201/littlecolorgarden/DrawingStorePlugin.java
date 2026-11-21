package tw.mic1201.littlecolorgarden;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

@CapacitorPlugin(name = "DrawingStore")
public final class DrawingStorePlugin extends Plugin {
    private static final String PRODUCT_ID = "remove_interstitial_ads";
    private static final String LEGACY_PRODUCT_ID = "remove_ads";
    private static final String LEGACY_PURCHASED = "legacyPurchased";
    private static final String UNKNOWN = "unknown";
    private static final String PURCHASED = "purchased";
    private static final String NOT_PURCHASED = "notPurchased";
    private static final String PENDING = "pending";
    private static final String UNAVAILABLE = "unavailable";
    private static final String CANCELLED = "cancelled";
    private static final String VERIFIED_ENTITLEMENT = "verified_removal";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<Consumer<Boolean>> connectionWaiters = new ArrayList<>();
    private final Set<String> acknowledgingTokens = new HashSet<>();
    private PublicKey publicKey;
    private SharedPreferences savedPurchases;
    private BillingClient billing;
    private boolean connecting;
    private boolean destroyed;
    private PluginCall checkout;
    private String currentEntitlement = UNKNOWN;
    private int entitlementRevision;
    private Runnable stopAds;
    private final Runnable checkoutTimeout = () -> finishCheckout(UNAVAILABLE);

    @Override
    public void load() {
        savedPurchases = getContext().getSharedPreferences("drawing_store", Context.MODE_PRIVATE);
        String saved = savedPurchases.getString(VERIFIED_ENTITLEMENT, UNKNOWN);
        if (ownsRemoval(saved)) currentEntitlement = saved;
        try {
            String key = getContext().getString(R.string.play_billing_public_key);
            if (key.trim().isEmpty()) return;
            publicKey = KeyFactory.getInstance("RSA").generatePublic(
                new X509EncodedKeySpec(Base64.decode(key, Base64.DEFAULT))
            );
        } catch (GeneralSecurityException | IllegalArgumentException invalidKey) {
            return;
        }
        billing = BillingClient.newBuilder(getContext())
            .setListener((result, purchases) -> main.post(() -> onPurchasesUpdated(result, purchases)))
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    @Override
    protected void handleOnResume() {
        main.post(() -> connect(ready -> {
            if (ready) refreshEntitlement(ignored -> {});
        }));
    }

    @Override
    protected void handleOnDestroy() {
        main.post(() -> {
            destroyed = true;
            finishCheckout(UNAVAILABLE);
            finishConnection(false);
            if (billing != null) billing.endConnection();
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        main.post(() -> connect(ready -> {
            if (!ready) {
                call.resolve(response(currentEntitlement, ownsRemoval(currentEntitlement) ? null : UNAVAILABLE));
                return;
            }
            refreshEntitlement(entitlement -> {
                if (ownsRemoval(currentEntitlement)) {
                    call.resolve(response(currentEntitlement, null));
                    return;
                }
                findProduct((product, offer) -> {
                    JSObject result = response(entitlement, offer == null ? UNAVAILABLE : null);
                    if (offer != null) result.put("price", offer.getFormattedPrice());
                    call.resolve(result);
                });
            });
        }));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        main.post(() -> {
            if (checkout != null) {
                call.resolve(response(null, UNAVAILABLE));
                return;
            }
            checkout = call;
            main.postDelayed(checkoutTimeout, 180_000);
            connect(ready -> {
                if (checkout != call) return;
                if (!ready) {
                    finishCheckout(UNAVAILABLE);
                    return;
                }
                refreshEntitlement(entitlement -> {
                    if (checkout != call) return;
                    if (!NOT_PURCHASED.equals(entitlement)) {
                        finishCheckout(UNKNOWN.equals(entitlement) ? UNAVAILABLE : entitlement);
                        return;
                    }
                    findProduct((product, offer) -> launchCheckout(call, product, offer));
                });
            });
        });
    }

    @PluginMethod
    public void restore(PluginCall call) {
        main.post(() -> connect(ready -> {
            if (ready) {
                refreshEntitlement(state -> call.resolve(response(state, UNKNOWN.equals(state) ? UNAVAILABLE : null)));
            } else {
                call.resolve(response(null, UNAVAILABLE));
            }
        }));
    }

    void checkInterstitialAdEligibility(boolean allowWhenStoreUnavailable, Consumer<Boolean> callback) {
        connect(ready -> {
            if (!ready) {
                callback.accept(allowWhenStoreUnavailable && !blocksInterstitialAds());
                return;
            }
            refreshEntitlement(state -> callback.accept(
                NOT_PURCHASED.equals(state) ||
                (allowWhenStoreUnavailable && UNKNOWN.equals(state) && !blocksInterstitialAds())
            ));
        });
    }

    boolean blocksInterstitialAds() {
        return ownsRemoval(currentEntitlement) || PENDING.equals(currentEntitlement);
    }

    void checkDrawingTestAdEligibility(boolean simulateUnpurchased, Consumer<Boolean> callback) {
        connect(ready -> {
            if (!ready) {
                callback.accept(simulateUnpurchased && UNKNOWN.equals(currentEntitlement));
                return;
            }
            refreshEntitlement(state -> callback.accept(!LEGACY_PURCHASED.equals(state)
                && !LEGACY_PURCHASED.equals(currentEntitlement)
                && (!UNKNOWN.equals(state) || (simulateUnpurchased && UNKNOWN.equals(currentEntitlement)))));
        });
    }

    boolean blocksBannerAds() {
        return LEGACY_PURCHASED.equals(currentEntitlement);
    }

    private static boolean ownsRemoval(String state) {
        return PURCHASED.equals(state) || LEGACY_PURCHASED.equals(state);
    }

    void onAdsBlocked(Runnable listener) {
        stopAds = listener;
    }

    private void connect(Consumer<Boolean> callback) {
        if (destroyed || billing == null) {
            callback.accept(false);
            return;
        }
        if (billing.isReady()) {
            callback.accept(true);
            return;
        }
        connectionWaiters.add(callback);
        if (connecting) return;
        connecting = true;
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                main.post(() -> finishConnection(!destroyed && isOk(result)));
            }

            @Override public void onBillingServiceDisconnected() {
                main.post(() -> finishConnection(false));
            }
        });
    }

    private void finishConnection(boolean ready) {
        connecting = false;
        List<Consumer<Boolean>> callbacks = new ArrayList<>(connectionWaiters);
        connectionWaiters.clear();
        callbacks.forEach(callback -> callback.accept(ready));
    }

    private void refreshEntitlement(Consumer<String> callback) {
        int revisionAtRequest = entitlementRevision;
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP).build();
        billing.queryPurchasesAsync(params, (result, purchases) -> main.post(() -> {
            if (destroyed || !isOk(result)) {
                callback.accept(UNKNOWN);
                return;
            }
            if (revisionAtRequest == entitlementRevision) {
                String state = entitlementFrom(purchases);
                if (UNKNOWN.equals(state)) {
                    callback.accept(UNKNOWN);
                    return;
                }
                publish(state);
            }
            callback.accept(currentEntitlement);
        }));
    }

    private String entitlementFrom(List<Purchase> purchases) {
        boolean purchased = false;
        boolean unverified = false;
        boolean pending = false;
        for (Purchase purchase : purchases) {
            boolean legacy = purchase.getProducts().contains(LEGACY_PRODUCT_ID);
            if (!legacy && !purchase.getProducts().contains(PRODUCT_ID)) continue;
            if (!verify(purchase)) {
                unverified = true;
                continue;
            }
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                acknowledge(purchase);
                if (legacy) return LEGACY_PURCHASED;
                purchased = true;
            }
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
        }
        if (purchased) return PURCHASED;
        if (unverified) return UNKNOWN;
        return pending ? PENDING : NOT_PURCHASED;
    }

    private boolean verify(Purchase purchase) {
        if (!getContext().getPackageName().equals(purchase.getPackageName())) return false;
        try {
            Signature signature = Signature.getInstance("SHA1withRSA");
            signature.initVerify(publicKey);
            signature.update(purchase.getOriginalJson().getBytes(StandardCharsets.UTF_8));
            return signature.verify(Base64.decode(purchase.getSignature(), Base64.DEFAULT));
        } catch (GeneralSecurityException | IllegalArgumentException invalidSignature) {
            return false;
        }
    }

    private void acknowledge(Purchase purchase) {
        String token = purchase.getPurchaseToken();
        if (purchase.isAcknowledged() || !acknowledgingTokens.add(token)) return;
        billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build(),
            result -> main.post(() -> acknowledgingTokens.remove(token)));
    }

    private interface ProductCallback {
        void complete(ProductDetails product, ProductDetails.OneTimePurchaseOfferDetails offer);
    }

    private void findProduct(ProductCallback callback) {
        QueryProductDetailsParams.Product request = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build();
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(request)).build(),
            (result, products) -> main.post(() -> {
                if (!destroyed && isOk(result)) {
                    for (ProductDetails product : products.getProductDetailsList()) {
                        if (!PRODUCT_ID.equals(product.getProductId())) continue;
                        List<ProductDetails.OneTimePurchaseOfferDetails> offers = product.getOneTimePurchaseOfferDetailsList();
                        if (offers == null || offers.isEmpty()) {
                            offers = Collections.singletonList(product.getOneTimePurchaseOfferDetails());
                        }
                        for (ProductDetails.OneTimePurchaseOfferDetails offer : offers) {
                            if (offer != null && (offer.getOfferId() == null || offer.getOfferId().isEmpty())
                                    && offer.getRentalDetails() == null && offer.getPreorderDetails() == null) {
                                callback.complete(product, offer);
                                return;
                            }
                        }
                    }
                }
                callback.complete(null, null);
            }));
    }

    private void launchCheckout(PluginCall call, ProductDetails product, ProductDetails.OneTimePurchaseOfferDetails offer) {
        if (checkout != call || destroyed) return;
        if (product == null || offer == null || !getActivity().hasWindowFocus()) {
            finishCheckout(UNAVAILABLE);
            return;
        }
        BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(product);
        String offerToken = offer.getOfferToken();
        if (offerToken != null && !offerToken.isEmpty()) item.setOfferToken(offerToken);
        BillingResult result = billing.launchBillingFlow(getActivity(),
            BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).build());
        if (!isOk(result)) onPurchasesUpdated(result, null);
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (destroyed) return;
        if (isOk(result) && purchases != null) {
            String state = entitlementFrom(purchases);
            if (ownsRemoval(state) || PENDING.equals(state)) {
                if (!LEGACY_PURCHASED.equals(currentEntitlement) || LEGACY_PURCHASED.equals(state)) publish(state);
            }
            finishCheckout(NOT_PURCHASED.equals(state) || UNKNOWN.equals(state) ? UNAVAILABLE : state);
        } else if (result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            refreshEntitlement(state -> finishCheckout(UNKNOWN.equals(state) ? UNAVAILABLE : state));
        } else {
            finishCheckout(result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED ? CANCELLED : UNAVAILABLE);
        }
    }

    private void publish(String state) {
        entitlementRevision++;
        if (state.equals(currentEntitlement)) return;
        currentEntitlement = state;
        SharedPreferences.Editor edits = savedPurchases.edit();
        if (ownsRemoval(state)) edits.putString(VERIFIED_ENTITLEMENT, state);
        else edits.remove(VERIFIED_ENTITLEMENT);
        edits.apply();
        if (stopAds != null && blocksInterstitialAds()) stopAds.run();
        notifyListeners("entitlementChanged", response(state, null));
    }

    private void finishCheckout(String result) {
        if (checkout == null) return;
        PluginCall call = checkout;
        checkout = null;
        main.removeCallbacks(checkoutTimeout);
        boolean state = ownsRemoval(result) || PENDING.equals(result) || NOT_PURCHASED.equals(result);
        call.resolve(response(state ? result : null, state ? null : result));
    }

    private static JSObject response(String entitlement, String status) {
        JSObject result = new JSObject();
        if (entitlement != null) result.put("entitlement", entitlement);
        if (status != null) result.put("status", status);
        return result;
    }

    private static boolean isOk(BillingResult result) {
        return result.getResponseCode() == BillingClient.BillingResponseCode.OK;
    }
}
