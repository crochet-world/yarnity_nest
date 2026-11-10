const firebaseProjectId = window.YARNITY_FIREBASE_CONFIG?.projectId;

window.YARNITY_PAYMENT_CONFIG = {
  functionsBaseUrl: firebaseProjectId
    ? `https://asia-south1-${firebaseProjectId}.cloudfunctions.net`
    : ""
};
