# yarnity_nest

Static storefront with a Firebase Functions backend for verified Razorpay payments and post-payment email/WhatsApp notifications.

`account.js` contains Firebase authentication and customer account features, including profile, orders, wishlist, and saved addresses. `script.js` contains the storefront and checkout behavior.

## Run the storefront locally

From the repository root, serve the files over HTTP (not `file://`):

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`.

## Payment and notification setup

The checkout uses Razorpay Orders and Checkout. The browser never decides the payable amount: `functions/catalog.js` is the server-side price source. Keep its product order and prices aligned with the `PRODUCTS` array in `script.js` whenever the catalog changes.

1. Create a Firebase project, enable billing, and create its Firestore database.
2. Install Node.js 22 and the Firebase CLI, authenticate, then select the project:

   ```powershell
   firebase login
   firebase use --add
   ```

3. Install the Cloud Function dependencies:

   ```powershell
   npm install --prefix functions
   ```

4. Configure the secrets. Each command prompts securely; never commit or paste secret values into source files:

   ```powershell
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
   ```

5. On first deployment, provide the non-secret parameters Firebase prompts for, including `RAZORPAY_KEY_ID`, `SHOP_EMAIL`, `SHOP_WHATSAPP`, `RESEND_FROM_EMAIL`, and `WHATSAPP_PHONE_NUMBER_ID`. Enter the shop email and WhatsApp destination you supplied; these destinations are not stored in the repository. `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, and `WHATSAPP_GRAPH_API_VERSION` have defaults that you can change. `functions/.env.yarnitynest` supplies `PUBLIC_SITE_ORIGINS` for the configured Firebase project. Keep each storefront origin exact (including scheme and port) and update that file when domains or local ports change.
6. Deploy the Firestore rules and functions:

   ```powershell
   firebase deploy --only firestore:rules,functions
   ```

7. `payment-config.js` derives the Functions URL from the `projectId` in `auth-config.js`; keep both Firebase configurations pointed at the same project. The function region is `asia-south1`.
8. Enable automatic payment capture in Razorpay. In the Razorpay Dashboard, add a webhook at `https://asia-south1-YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/razorpayWebhook`, use the same webhook secret configured above, and enable the `payment.captured` event.
9. Configure Resend with a verified sender address for `RESEND_FROM_EMAIL`.
10. Configure Meta WhatsApp Cloud API with a phone-number ID and access token. Create and approve the template named by `WHATSAPP_TEMPLATE_NAME` in `WHATSAPP_TEMPLATE_LANGUAGE` with five body placeholders, in this order: recipient name, order reference, paid amount, customer name, item summary. Business-initiated confirmations require an approved template.
11. Deploy the updated storefront over HTTPS. The configured website origin must exactly match `PUBLIC_SITE_ORIGINS`.

The confirmation route appears only after the backend validates Razorpay’s signature and confirms the captured payment with Razorpay. Email and WhatsApp deliveries run from a Firestore-triggered function and retry on provider errors. Check Firebase Functions logs and the Resend/Meta dashboards if a notification is delayed.

## Account sign-in setup

The Account page provides Firebase Email/Password registration and login:

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.
2. In **Project settings → Your apps**, register a Firebase Web app and copy its web configuration.
3. Replace the placeholder values in `auth-config.js` with the Web app’s `apiKey`, `authDomain`, `projectId`, and `appId`. This configuration is intended for browser use; never put service-account keys or other private credentials in it.
4. Add the deployed storefront domain to **Authentication → Settings → Authorized domains**.

Until these steps are completed, the Account page explains that authentication is not configured and does not pretend a login or registration succeeded.

Signed-in customers are automatically signed out after five minutes without keyboard, pointer, touch, scroll, or wheel activity. Activity in another tab does not extend this page’s timer.

Signed-in customers can add, edit, and delete multiple delivery addresses in **Manage Addresses**, including a recipient name, address type, and optional mobile number, then choose a saved address at checkout. For Indian addresses, entering a six-digit PIN code looks up and fills City and State; both fields remain editable. Address documents are scoped to the owning Firebase UID by `firestore.rules`; deploy the updated Firestore rules and Functions before using saved addresses at checkout. The previous single default address is still recognized and remains editable.

Wishlist items are saved to the signed-in customer’s `users/{uid}/wishlist` collection and cached locally per account so they remain available after signing out and back in on the same browser. Deploy the updated Firestore rules to enable account-wide synchronization across devices.

Signed-in customers can upload a JPG, PNG, or WebP profile picture from My Profile. The browser resizes images to at most 512 pixels per side and compresses them before upload. Enable Firebase Storage and create its default bucket for the project configured in `auth-config.js`, then deploy the owner-scoped Storage rules to that same project with `firebase deploy --only storage --project yarnitynest` (replace the project ID if `auth-config.js` points elsewhere). Profile images are stored under the signed-in user’s folder; Storage rules limit uploads to the two profile-picture slots and allow only the owning account to access them. A `storage/unauthorized` error means the rules need to be deployed; `storage/bucket-not-found` means Storage or its bucket is not set up for the configured project.

## Customer order history

The My Orders section calls the authenticated `getUserOrders` Cloud Function; Firestore order documents remain unavailable to direct browser reads. New checkout orders are associated with the signed-in Firebase UID. Older orders without a UID are matched only after the account email is verified; the My Orders page can send the verification email. Deploy the Functions backend after updating it so the order-history endpoint and authenticated checkout are available.

If My Orders reports that the order-history service is unavailable, deploy the updated Functions to the same Firebase project configured in `auth-config.js` and set `PUBLIC_SITE_ORIGINS` to the exact storefront origin (including scheme and port for local development). The deployed function must include the `getUserOrders` endpoint.

## Product prices

The browser catalog in `script.js` is used for display. `functions/catalog.js` independently defines trusted product names and prices used to calculate server-side payment totals. Update both lists together; client-submitted prices and totals are intentionally ignored.
