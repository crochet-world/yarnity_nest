/* Account, profile, orders, wishlist, and saved-address behavior. */
let wishlistProductIndices = new Set();
let wishlistRemovedProductIndices = new Set();
let wishlistLoadedFor = "";
let wishlistLoadPromises = new Map();
let wishlistWritesInFlight = new Set();
let wishlistWriteQueues = new Map();
let wishlistCategoryFilter = "All";
let wishlistSortOrder = "recent";
let currentAuthUser = null;
let authSetupMessage = "";
let authStateResolved = false;
let profileEditing = false;
let currentAccountSection = "profile";
let accountOrdersLoadedFor = "";
let accountOrdersLoading = false;
let savedAccountAddresses = [];
let addressLoadedFor = "";
let addressCacheLoadedFor = "";
let addressLoadingFor = "";
let addressLoadPromise = null;
let addressLoadSequence = 0;
let addressEditingId = "";
let addressPinLookupTimer = null;
let addressPinLookupController = null;
let addressPinLookupSequence = 0;
let phoneVerificationId = "";
let phoneRecaptchaVerifier = null;
let firebaseAuth = null;
const ACCOUNT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let accountIdleTimeoutId = null;
let accountLastActivityAt = 0;

function startAccountModule() {
  firebaseAuth = initializeFirebaseAuth();
  ["pointerdown", "keydown", "mousemove", "scroll", "touchstart", "wheel"].forEach(function (eventName) {
    document.addEventListener(eventName, recordAccountActivity, { passive: true });
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && currentAuthUser) {
      scheduleAccountIdleSignOut();
    }
  });
}

function clearAccountIdleSignOut() {
  if (accountIdleTimeoutId !== null) {
    window.clearTimeout(accountIdleTimeoutId);
    accountIdleTimeoutId = null;
  }
  accountLastActivityAt = 0;
}

function recordAccountActivity() {
  if (!currentAuthUser) {
    return;
  }
  accountLastActivityAt = Date.now();
  scheduleAccountIdleSignOut();
}

function scheduleAccountIdleSignOut() {
  if (!currentAuthUser) {
    clearAccountIdleSignOut();
    return;
  }
  if (!accountLastActivityAt) {
    accountLastActivityAt = Date.now();
  }
  if (accountIdleTimeoutId !== null) {
    window.clearTimeout(accountIdleTimeoutId);
  }
  const uid = currentAuthUser.uid;
  const remainingMs = Math.max(
    0,
    ACCOUNT_IDLE_TIMEOUT_MS - (Date.now() - accountLastActivityAt)
  );
  accountIdleTimeoutId = window.setTimeout(function () {
    accountIdleTimeoutId = null;
    if (!currentAuthUser || currentAuthUser.uid !== uid) {
      return;
    }
    const timeUntilSignOut = ACCOUNT_IDLE_TIMEOUT_MS - (Date.now() - accountLastActivityAt);
    if (timeUntilSignOut > 0) {
      scheduleAccountIdleSignOut();
      return;
    }
    firebaseAuth.signOut().then(function () {
      setAuthStatus("You were signed out after 5 minutes of inactivity.", false);
    }).catch(function (error) {
      console.error("Automatic sign-out after inactivity failed.", error);
      setAuthStatus("Automatic sign-out failed. Check your connection and sign out manually.", true);
      accountIdleTimeoutId = window.setTimeout(scheduleAccountIdleSignOut, 60 * 1000);
    });
  }, remainingMs);
}

function isFirebaseAuthConfigured() {
  const config = window.YARNITY_FIREBASE_CONFIG;
  return Boolean(
    config &&
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId &&
    !Object.keys(config).some(function (key) {
      return String(config[key]).startsWith("YOUR_");
    })
  );
}

function initializeFirebaseAuth() {
  if (!window.firebase || typeof window.firebase.auth !== "function") {
    console.error("Firebase Authentication SDK did not load.");
    authSetupMessage = "Firebase Authentication couldn’t load. Check your internet connection and refresh.";
    authStateResolved = true;
    return null;
  }
  if (!isFirebaseAuthConfigured()) {
    authSetupMessage = "Sign-in setup is incomplete. Add your Firebase web app config and enable Email/Password sign-in to continue.";
    authStateResolved = true;
    return null;
  }

  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(window.YARNITY_FIREBASE_CONFIG);
    }
    const auth = window.firebase.auth();
    const handleAuthStateChanged = function (user) {
      currentAuthUser = user;
      authStateResolved = true;
      if (user) {
        accountLastActivityAt = Date.now();
        scheduleAccountIdleSignOut();
      } else {
        clearAccountIdleSignOut();
      }
      updateAccountPage();
    };
    const handleAuthError = function (error) {
      authStateResolved = true;
      currentAuthUser = auth.currentUser;
      updateAccountPage();
      console.error("Firebase Authentication state listener failed.", error);
      setAuthStatus("We couldn’t check your sign-in status. Please refresh and try again.", true);
    };

    auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      .catch(function (error) {
        console.error("Firebase could not enable persistent sign-in.", error);
        authSetupMessage = "Your sign-in may not stay active after refreshing. Check your browser’s storage settings.";
      })
      .then(function () {
        auth.onAuthStateChanged(handleAuthStateChanged, handleAuthError);
      })
      .catch(function (error) {
        console.error("Firebase Authentication could not start.", error);
        authStateResolved = true;
        currentAuthUser = auth.currentUser;
        updateAccountPage();
        setAuthStatus("We couldn’t restore your account. Check your connection and refresh.", true);
      });
    return auth;
  } catch (error) {
    authStateResolved = true;
    console.error("Firebase Authentication could not be initialized.", error);
    authSetupMessage = "Firebase Authentication couldn’t be initialized. Check your Firebase web app config.";
    return null;
  }
}

function setAuthStatus(message, isError) {
  const status = document.getElementById("account-auth-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function updateAccountPage() {
  const authenticatedUid = currentAuthUser?.uid || "";
  if (cartUserId !== authenticatedUid) {
    cartUserId = authenticatedUid;
    cartItems = authenticatedUid ? loadCartItems(authenticatedUid) : [];
    renderCart();
  }
  const accountCard = document.querySelector(".account-auth-card");
  const accountPage = document.querySelector('[data-route-view="account"]');
  const headerAccountName = document.getElementById("header-account-name");
  const headerAccount = document.getElementById("account-open");
  if (!currentAuthUser) {
    savedAccountAddresses = [];
    addressLoadedFor = "";
    addressCacheLoadedFor = "";
    addressLoadSequence += 1;
    addressLoadingFor = "";
    addressEditingId = "";
    addressLoadPromise = null;
    const addressForm = document.getElementById("account-address-form");
    if (addressForm) {
      addressForm.hidden = true;
    }
    const addressList = document.getElementById("account-address-list");
    if (addressList) {
      addressList.hidden = false;
    }
    renderAccountAddresses();
    wishlistProductIndices = new Set();
    wishlistRemovedProductIndices = new Set();
    wishlistLoadedFor = "";
    renderAccountWishlist();
    const accountMenu = document.getElementById("account-menu");
    if (accountMenu) {
      accountMenu.hidden = true;
    }
    headerAccount?.setAttribute("aria-expanded", "false");
  }
  if (headerAccountName && headerAccount) {
    if (!currentAuthUser) {
      headerAccountName.textContent = "Hello, sign in";
      headerAccount.setAttribute("aria-label", "Hello, sign in");
    } else {
      const emailName = currentAuthUser.email?.split("@")[0];
      const displayName = currentAuthUser.displayName || emailName || "Account";
      const firstName = displayName.trim().split(/\s+/)[0] || "Account";
      headerAccountName.textContent = firstName;
      headerAccount.setAttribute("aria-label", `Account: ${displayName}`);
    }
  }

  const forms = document.getElementById("account-auth-forms");
  const signedIn = document.getElementById("account-authenticated");
  const firstNameInput = document.getElementById("account-profile-first-name");
  const lastNameInput = document.getElementById("account-profile-last-name");
  const emailInput = document.getElementById("account-profile-email");
  const phoneInput = document.getElementById("account-profile-phone");
  const profileName = document.getElementById("account-profile-display-name");
  const profileEmail = document.getElementById("account-profile-display-email");
  const profileAvatarInitial = document.getElementById("account-profile-avatar-initial");
  const profileAvatarImage = document.getElementById("account-profile-avatar-image");
  const heading = document.getElementById("account-page-heading");
  const intro = document.querySelector(".account-auth-intro");
  if (accountPage) {
    accountPage.setAttribute(
      "aria-labelledby",
      currentAuthUser ? "account-profile-heading" : "account-page-heading"
    );
  }
  if (accountCard) {
    accountCard.classList.toggle("is-authenticated", Boolean(currentAuthUser));
  }
  document.querySelectorAll(".account-auth-card > .eyebrow, .account-auth-card > #account-page-heading, .account-auth-card > .account-auth-intro, .account-auth-card > #account-auth-status").forEach(function (element) {
    element.hidden = Boolean(currentAuthUser);
  });
  if (!forms || !signedIn) {
    return;
  }

  forms.hidden = Boolean(currentAuthUser) || !authStateResolved;
  signedIn.hidden = !currentAuthUser;
  if (currentAuthUser) {
    const displayName = currentAuthUser.displayName || "";
    const fallbackName = currentAuthUser.email?.split("@")[0] || "Account";
    const fullName = displayName || fallbackName;
    const nameParts = fullName.trim().split(/\s+/);
    if (firstNameInput && !profileEditing) {
      firstNameInput.value = nameParts[0] || "";
    }
    if (lastNameInput && !profileEditing) {
      lastNameInput.value = nameParts.slice(1).join(" ");
    }
    if (emailInput && !profileEditing) {
      emailInput.value = currentAuthUser.email || "";
    }
    if (phoneInput && !profileEditing) {
      phoneInput.value = currentAuthUser.phoneNumber || "";
    }
    if (profileName) {
      profileName.textContent = fullName;
    }
    if (profileEmail) {
      profileEmail.textContent = currentAuthUser.email || "";
    }
    if (profileAvatarInitial) {
      profileAvatarInitial.textContent = fullName.charAt(0).toUpperCase();
    }
    if (profileAvatarImage) {
      const photoURL = currentAuthUser.photoURL || "";
      if (profileAvatarImage.getAttribute("src") !== photoURL) {
        if (photoURL) {
          profileAvatarImage.setAttribute("src", photoURL);
        } else {
          profileAvatarImage.removeAttribute("src");
        }
      }
      profileAvatarImage.hidden = !photoURL;
      if (profileAvatarInitial) {
        profileAvatarInitial.hidden = Boolean(photoURL);
      }
      profileAvatarImage.onerror = function () {
        profileAvatarImage.hidden = true;
        if (profileAvatarInitial) {
          profileAvatarInitial.hidden = false;
        }
        console.error("Firebase profile picture could not be loaded.");
      };
    }
    if (heading) {
      heading.textContent = `Hello${displayName ? `, ${displayName}` : ""}!`;
    }
    if (intro) {
      intro.textContent = "You’re signed in to your account.";
    }
    if (addressLoadedFor !== currentAuthUser.uid) {
      const cachedAddresses = readAccountAddressCache(currentAuthUser.uid);
      savedAccountAddresses = cachedAddresses || [];
      addressCacheLoadedFor = cachedAddresses ? currentAuthUser.uid : "";
      renderAccountAddresses();
      loadAccountAddresses(true);
    }
    if (wishlistLoadedFor !== currentAuthUser.uid) {
      if (wishlistLoadedFor && wishlistLoadedFor !== currentAuthUser.uid) {
        wishlistProductIndices = new Set();
      }
      wishlistLoadedFor = "";
      renderAccountWishlist();
      loadAccountWishlist();
    }
    setAccountSection(currentAccountSection);
    setAuthStatus("", false);
  } else {
    profileEditing = false;
    if (heading) {
      heading.textContent = "Welcome back";
    }
    if (intro) {
      intro.textContent = "Sign in to your account, or create one to get started.";
    }
    if (!authStateResolved) {
      setAuthStatus("Checking your account…", false);
    } else if (!firebaseAuth) {
      setAuthStatus(authSetupMessage, true);
    }
  }
}

function setProfileEditing(isEditing) {
  profileEditing = isEditing;
  document.querySelectorAll(
    "#account-profile-first-name, #account-profile-last-name, #account-profile-email, #account-profile-phone"
  ).forEach(function (input) {
    input.readOnly = !isEditing;
  });
  const actions = document.getElementById("account-profile-actions");
  const editButton = document.getElementById("account-profile-edit");
  if (actions) {
    actions.hidden = !isEditing;
  }
  if (editButton) {
    editButton.hidden = isEditing;
  }
  updateProfileChangeControls();
}

function updateProfileChangeControls() {
  const emailInput = document.getElementById("account-profile-email");
  const phoneInput = document.getElementById("account-profile-phone");
  const reauth = document.getElementById("account-profile-reauth");
  const phoneVerification = document.getElementById("account-phone-verification");
  const hint = document.getElementById("account-profile-hint");
  const emailChanged = Boolean(
    profileEditing &&
    currentAuthUser &&
    emailInput &&
    emailInput.value.trim().toLowerCase() !== (currentAuthUser.email || "").toLowerCase()
  );
  const phoneChanged = Boolean(
    profileEditing &&
    currentAuthUser &&
    phoneInput &&
    phoneInput.value.trim() !== (currentAuthUser.phoneNumber || "")
  );
  if (reauth) {
    reauth.hidden = !emailChanged && !phoneChanged;
  }
  if (phoneVerification) {
    phoneVerification.hidden = !phoneChanged;
  }
  if (hint) {
    hint.hidden = !emailChanged && !phoneChanged;
  }
}

function setAccountSection(section) {
  currentAccountSection = section;
  document.querySelectorAll("[data-account-panel]").forEach(function (panel) {
    panel.hidden = panel.dataset.accountPanel !== section;
  });
  if (section === "addresses") {
    if (currentAuthUser) {
      loadAccountAddresses();
    }
  }
  if (section === "orders" && currentAuthUser) {
    loadAccountOrders();
  }
  if (section === "wishlist") {
    renderAccountWishlist();
  }
}

function getAccountFirestore() {
  if (!window.firebase || typeof window.firebase.firestore !== "function" || !window.firebase.apps.length) {
    throw new Error("Firebase Firestore could not load. Refresh the page and try again.");
  }
  return window.firebase.firestore();
}

function setWishlistStatus(message, isError) {
  const status = document.getElementById("account-wishlist-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function getWishlistCacheKey(uid) {
  return `yarnity-nest-wishlist:${uid}`;
}

function readWishlistCache(uid) {
  try {
    const stored = window.localStorage.getItem(getWishlistCacheKey(uid));
    if (!stored) {
      return { productIndices: new Set(), removedProductIndices: new Set() };
    }
    const savedWishlist = JSON.parse(stored);
    if (Array.isArray(savedWishlist)) {
      return {
        productIndices: new Set(savedWishlist.filter(isValidWishlistProductIndex)),
        removedProductIndices: new Set()
      };
    }
    if (!savedWishlist || !Array.isArray(savedWishlist.productIndices) ||
      !Array.isArray(savedWishlist.removedProductIndices)) {
      throw new Error("Saved wishlist data is invalid.");
    }
    return {
      productIndices: new Set(savedWishlist.productIndices.filter(isValidWishlistProductIndex)),
      removedProductIndices: new Set(savedWishlist.removedProductIndices.filter(isValidWishlistProductIndex))
    };
  } catch (error) {
    console.error("Could not read the local wishlist cache.", error);
    setWishlistStatus("Your saved wishlist could not be read from this device.", true);
    return { productIndices: new Set(), removedProductIndices: new Set() };
  }
}

function isValidWishlistProductIndex(productIndex) {
  return Number.isInteger(productIndex) &&
    productIndex >= 0 &&
    productIndex < PRODUCTS.length;
}

function persistWishlistCache(uid, productIndices, removedProductIndices) {
  try {
    window.localStorage.setItem(
      getWishlistCacheKey(uid),
      JSON.stringify({
        productIndices: Array.from(productIndices || wishlistProductIndices),
        removedProductIndices: Array.from(removedProductIndices || wishlistRemovedProductIndices)
      })
    );
    return true;
  } catch (error) {
    console.error("Could not save the local wishlist cache.", error);
    setWishlistStatus("Your wishlist is saved to your account, but couldn’t be cached on this device.", true);
    return false;
  }
}

async function loadAccountWishlist() {
  const user = currentAuthUser;
  if (!user || wishlistLoadedFor === user.uid) {
    return;
  }
  const existingLoad = wishlistLoadPromises.get(user.uid);
  if (existingLoad) {
    return existingLoad;
  }
  const cachedWishlist = readWishlistCache(user.uid);
  const cachedVisibleProducts = Array.from(cachedWishlist.productIndices).filter(function (productIndex) {
    return !cachedWishlist.removedProductIndices.has(productIndex);
  });
  if (currentAuthUser?.uid === user.uid &&
    (cachedWishlist.productIndices.size || cachedWishlist.removedProductIndices.size)) {
    wishlistProductIndices = new Set(cachedWishlist.productIndices);
    wishlistRemovedProductIndices = new Set(cachedWishlist.removedProductIndices);
    renderAccountWishlist();
  }
  setWishlistStatus(cachedVisibleProducts.length ? "" : "Loading your wishlist…", false);
  const loadPromise = (async function () {
    try {
      const snapshot = await getAccountFirestore()
        .collection("users")
        .doc(user.uid)
        .collection("wishlist")
        .get();
      if (currentAuthUser?.uid !== user.uid) {
        return;
      }
      const remoteWishlist = new Set(snapshot.docs.map(function (document) {
        const productIndex = document.data().productIndex;
        return Number.isInteger(productIndex) &&
          productIndex >= 0 &&
          productIndex < PRODUCTS.length &&
          document.id === String(productIndex)
          ? productIndex
          : null;
      }).filter(function (productIndex) {
        return productIndex !== null;
      }));
      const latestCachedWishlist = readWishlistCache(user.uid);
      wishlistRemovedProductIndices = new Set([
        ...latestCachedWishlist.removedProductIndices,
        ...wishlistRemovedProductIndices
      ]);
      wishlistProductIndices = new Set([
        ...latestCachedWishlist.productIndices,
        ...wishlistProductIndices,
        ...remoteWishlist
      ]);
      wishlistRemovedProductIndices.forEach(function (productIndex) {
        wishlistProductIndices.delete(productIndex);
      });
      wishlistLoadedFor = user.uid;
      renderAccountWishlist();
      const cacheSaved = persistWishlistCache(
        user.uid,
        wishlistProductIndices,
        wishlistRemovedProductIndices
      );
      if (cacheSaved && currentAuthUser?.uid === user.uid) {
        setWishlistStatus("", false);
      }
      const itemsToSync = Array.from(cachedWishlist.productIndices).filter(function (productIndex) {
        return !remoteWishlist.has(productIndex);
      });
      if (itemsToSync.length) {
        try {
          await Promise.all(itemsToSync.map(function (productIndex) {
            return writeWishlistProduct(user, productIndex, true);
          }));
        } catch (error) {
          console.error("Could not sync locally cached wishlist items.", error);
          if (currentAuthUser?.uid === user.uid) {
            setWishlistStatus("Your wishlist is restored on this device, but some items couldn’t sync to your account.", true);
          }
          return;
        }
      }
      const removalsToSync = Array.from(wishlistRemovedProductIndices);
      if (removalsToSync.length) {
        const syncResults = await Promise.allSettled(removalsToSync.map(function (productIndex) {
          return writeWishlistProduct(user, productIndex, false);
        }));
        syncResults.forEach(function (result, index) {
          if (result.status === "fulfilled") {
            wishlistRemovedProductIndices.delete(removalsToSync[index]);
          } else {
            console.error("Could not sync a locally removed wishlist item.", result.reason);
          }
        });
        persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
      }
    } catch (error) {
      console.error("Could not load the saved wishlist.", error);
      if (currentAuthUser?.uid === user.uid) {
        setWishlistStatus(error.message || "Your wishlist couldn’t be loaded.", true);
      }
      return false;
    } finally {
      if (currentAuthUser?.uid === user.uid &&
        wishlistLoadedFor === user.uid &&
        document.getElementById("account-wishlist-status")?.textContent === "Loading your wishlist…") {
        setWishlistStatus("", false);
      }
      wishlistLoadPromises.delete(user.uid);
    }
  })();
  wishlistLoadPromises.set(user.uid, loadPromise);
  return loadPromise;
}

async function writeWishlistProduct(user, productIndex, shouldSave) {
  const wishlist = getAccountFirestore()
    .collection("users")
    .doc(user.uid)
    .collection("wishlist");
  const productRef = wishlist.doc(String(productIndex));
  if (shouldSave) {
    await productRef.set({
      productIndex: productIndex,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await productRef.delete();
  }
}

function queueWishlistProductWrite(user, productIndex, shouldSave) {
  const operationKey = wishlistOperationKey(user, productIndex);
  const previousWrite = wishlistWriteQueues.get(operationKey) || Promise.resolve();
  const queuedWrite = previousWrite.catch(function () {}).then(function () {
    return writeWishlistProduct(user, productIndex, shouldSave);
  });
  wishlistWriteQueues.set(operationKey, queuedWrite);
  wishlistWritesInFlight.add(operationKey);
  const clearOperation = function () {
    if (wishlistWriteQueues.get(operationKey) === queuedWrite) {
      wishlistWriteQueues.delete(operationKey);
      wishlistWritesInFlight.delete(operationKey);
      renderAccountWishlist();
      renderCart();
    }
  };
  queuedWrite.then(clearOperation, clearOperation);
  return queuedWrite;
}

function wishlistOperationKey(user, productIndex) {
  return `${user.uid}:${productIndex}`;
}

async function removeAccountWishlistProduct(productIndex) {
  const user = currentAuthUser;
  const product = PRODUCTS[productIndex];
  if (!user || !product || !wishlistProductIndices.has(productIndex)) {
    return;
  }
  wishlistProductIndices.delete(productIndex);
  wishlistRemovedProductIndices.add(productIndex);
  renderAccountWishlist();
  renderCart();
  persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
  try {
    await queueWishlistProductWrite(user, productIndex, false);
    if (currentAuthUser?.uid === user.uid) {
      wishlistRemovedProductIndices.delete(productIndex);
      persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
      setWishlistStatus(`${product.name} removed from your wishlist.`, false);
    }
  } catch (error) {
    console.error("Could not remove the saved wishlist item.", error);
    if (currentAuthUser?.uid === user.uid) {
      setWishlistStatus("Removed on this device. We couldn’t sync the removal to your account.", true);
    }
  } finally {
    renderAccountWishlist();
    renderCart();
  }
}

async function toggleCartWishlistProduct(productIndex) {
  const user = currentAuthUser || firebaseAuth?.currentUser;
  const product = PRODUCTS[productIndex];
  if (!user || !product) {
    showCartToast("Sign in to save items to your wishlist.");
    return;
  }
  const operationKey = wishlistOperationKey(user, productIndex);
  if (wishlistWritesInFlight.has(operationKey)) {
    return;
  }
  wishlistWritesInFlight.add(operationKey);
  if (wishlistLoadedFor !== user.uid) {
    const cachedWishlist = readWishlistCache(user.uid);
    wishlistProductIndices = new Set([
      ...cachedWishlist.productIndices,
      ...wishlistProductIndices
    ]);
    wishlistRemovedProductIndices = new Set([
      ...cachedWishlist.removedProductIndices,
      ...wishlistRemovedProductIndices
    ]);
    wishlistRemovedProductIndices.forEach(function (removedProductIndex) {
      wishlistProductIndices.delete(removedProductIndex);
    });
  }
  const wasInWishlist = wishlistProductIndices.has(productIndex);
  if (wasInWishlist) {
    wishlistProductIndices.delete(productIndex);
    wishlistRemovedProductIndices.add(productIndex);
  } else {
    wishlistProductIndices.add(productIndex);
    wishlistRemovedProductIndices.delete(productIndex);
    cartItems = cartItems.filter(function (item) {
      return item.productIndex !== productIndex;
    });
  }
  renderCart();
  renderAccountWishlist();
  persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
  showCartToast(
    `${product.name} ${wasInWishlist ? "removed from" : "added to"} your wishlist.`
  );
  if (wishlistLoadedFor !== user.uid) {
    loadAccountWishlist();
  }
  try {
    await queueWishlistProductWrite(user, productIndex, !wasInWishlist);
    if (currentAuthUser?.uid === user.uid) {
      if (wasInWishlist && wishlistRemovedProductIndices.has(productIndex)) {
        wishlistRemovedProductIndices.delete(productIndex);
      }
      persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
      setWishlistStatus("", false);
    }
  } catch (error) {
    console.error("Could not update the saved wishlist.", error);
    if (currentAuthUser?.uid === user.uid) {
      persistWishlistCache(user.uid, wishlistProductIndices, wishlistRemovedProductIndices);
      setWishlistStatus(error.message || "Your wishlist couldn’t be updated.", true);
      showCartToast("Updated on this device, but couldn’t sync to your account.");
    }
  } finally {
    renderCart();
    renderAccountWishlist();
  }
}

function setAddressStatus(message, isError) {
  const status = document.getElementById("account-addresses-status");
  if (status) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }
}

function setAddressPinStatus(message, isError) {
  const status = document.getElementById("account-address-pin-status");
  if (status) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }
}

function scheduleAddressPinLookup() {
  const postalCodeInput = document.getElementById("account-address-postal-code");
  const countryInput = document.getElementById("account-address-country");
  const postalCode = postalCodeInput?.value.trim() || "";
  addressPinLookupSequence += 1;
  const sequence = addressPinLookupSequence;
  window.clearTimeout(addressPinLookupTimer);
  addressPinLookupController?.abort();
  addressPinLookupController = null;
  if (!postalCode || countryInput?.value.trim().toLowerCase() !== "india" ||
    !/^\d{6}$/.test(postalCode)) {
    setAddressPinStatus("", false);
    return;
  }
  setAddressPinStatus("Looking up PIN code…", false);
  addressPinLookupTimer = window.setTimeout(async function () {
    const controller = new AbortController();
    addressPinLookupController = controller;
    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${encodeURIComponent(postalCode)}`,
        { signal: controller.signal }
      );
      if (!response.ok) {
        throw new Error("The PIN code service is unavailable.");
      }
      const result = await response.json();
      const postOffices = Array.isArray(result) && result[0]?.Status === "Success"
        ? result[0].PostOffice
        : null;
      if (!Array.isArray(postOffices) || !postOffices.length) {
        throw new Error("No post office was found for this PIN code.");
      }
      if (sequence !== addressPinLookupSequence) {
        return;
      }
      const cityInput = document.getElementById("account-address-city");
      const stateInput = document.getElementById("account-address-state");
      const firstPostOffice = postOffices[0];
      const city = firstPostOffice.District || firstPostOffice.Block || "";
      const state = firstPostOffice.State || "";
      if (!city || !state) {
        throw new Error("City and State details were unavailable for this PIN code.");
      }
      cityInput.value = city;
      stateInput.value = state;
      setAddressPinStatus("", false);
    } catch (error) {
      if (error.name === "AbortError" || sequence !== addressPinLookupSequence) {
        return;
      }
      console.error("Could not look up address details for the PIN code.", error);
      setAddressPinStatus(`${error.message} Enter City and State manually.`, true);
    } finally {
      if (sequence === addressPinLookupSequence) {
        addressPinLookupController = null;
      }
    }
  }, 350);
}

function normalizeAddress(address) {
  return {
    label: typeof address.label === "string" ? address.label : "Address",
    fullName: typeof address.fullName === "string" ? address.fullName : "",
    phone: typeof address.phone === "string" ? address.phone : "",
    addressLine1: typeof address.addressLine1 === "string" ? address.addressLine1 : "",
    addressLine2: typeof address.addressLine2 === "string" ? address.addressLine2 : "",
    city: typeof address.city === "string" ? address.city : "",
    state: typeof address.state === "string" ? address.state : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode : "",
    country: typeof address.country === "string" ? address.country : "India",
    isDefault: address.isDefault === true
  };
}

function getAccountAddressCacheKey(uid) {
  return `yarnity-nest-addresses:${uid}`;
}

function readAccountAddressCache(uid) {
  try {
    const stored = window.sessionStorage.getItem(getAccountAddressCacheKey(uid));
    if (stored === null) {
      return null;
    }
    const addresses = JSON.parse(stored);
    if (!Array.isArray(addresses)) {
      throw new Error("Saved address cache has an invalid format.");
    }
    return addresses.filter(function (address) {
      return address && typeof address.id === "string" && address.id.length > 0;
    }).map(function (address) {
      return { id: address.id, ...normalizeAddress(address) };
    }).sort(function (left, right) {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }
      return left.label.localeCompare(right.label);
    });
  } catch (error) {
    console.warn("Could not read the saved-address session cache.", error);
    return null;
  }
}

function persistAccountAddressCache(uid) {
  try {
    window.sessionStorage.setItem(
      getAccountAddressCacheKey(uid),
      JSON.stringify(savedAccountAddresses)
    );
    addressCacheLoadedFor = uid;
  } catch (error) {
    console.warn("Could not cache saved addresses for this browser session.", error);
  }
}

function setAddressFormValues(form, address) {
  const values = address || {};
  ["label", "fullName", "phone", "addressLine1", "addressLine2", "city", "state", "postalCode", "country"]
    .forEach(function (name) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
      if (input instanceof HTMLSelectElement && values[name] &&
        !Array.from(input.options).some(function (option) {
          return option.value === values[name];
        })) {
        input.add(new Option(values[name], values[name]));
      }
      input.value = values[name] || "";
    }
  });
  const defaultInput = form.elements.namedItem("isDefault");
  if (defaultInput instanceof HTMLInputElement) {
    defaultInput.checked = values.isDefault === true || savedAccountAddresses.length === 0;
  }
}

function setAddressEditor(address) {
  addressEditingId = address ? address.id : "";
  const form = document.getElementById("account-address-form");
  const list = document.getElementById("account-address-list");
  const heading = document.getElementById("account-address-form-heading");
  const toggleButton = document.getElementById("account-addresses-add");
  if (form) {
    form.hidden = false;
    setAddressFormValues(form, address ? { ...address, id: undefined } : {
      label: "",
      country: "India",
      isDefault: savedAccountAddresses.length === 0
    });
  }
  if (list) {
    list.hidden = true;
  }
  if (heading) {
    heading.textContent = address ? "Edit delivery address" : "Add delivery address";
  }
  if (toggleButton) {
    toggleButton.textContent = "View saved addresses";
  }
  setAddressStatus("", false);
  form?.querySelector("input")?.focus();
}

function populateCheckoutAddress(address, onlyEmpty) {
  const form = document.getElementById("checkout-contact-form");
  if (!form || !address) {
    return;
  }
  const values = normalizeAddress(address);
  const nameInput = form.elements.namedItem("name");
  if (nameInput instanceof HTMLInputElement && (!onlyEmpty || !nameInput.value.trim())) {
    nameInput.value = values.fullName;
  }
  Object.keys(values).forEach(function (name) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement && (!onlyEmpty || !input.value.trim())) {
      input.value = values[name];
    }
  });
}

function renderAccountAddresses() {
  const list = document.getElementById("account-address-list");
  const form = document.getElementById("account-address-form");
  if (!list) {
    return;
  }
  list.replaceChildren();
  savedAccountAddresses.forEach(function (address) {
    const card = document.createElement("article");
    card.className = "account-address-card";
    const header = document.createElement("div");
    header.className = "account-address-card-heading";
    const title = document.createElement("h3");
    title.textContent = address.label;
    header.append(title);
    if (address.isDefault) {
      const badge = document.createElement("span");
      badge.className = "account-address-default-badge";
      badge.textContent = "Default";
      header.append(badge);
    }
    const details = document.createElement("p");
    details.textContent = [
      address.fullName,
      address.phone ? `Mobile: ${address.phone}` : "",
      address.addressLine1,
      address.addressLine2,
      [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
      address.country
    ].filter(Boolean).join("\n");
    details.style.whiteSpace = "pre-line";
    const actions = document.createElement("div");
    actions.className = "account-address-card-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "account-edit-button";
    edit.dataset.addressEdit = address.id;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "account-edit-button account-address-delete";
    remove.dataset.addressDelete = address.id;
    remove.textContent = "Delete";
    actions.append(edit, remove);
    card.append(header, details, actions);
    list.append(card);
  });
  if (
    !savedAccountAddresses.length &&
    currentAuthUser &&
    addressLoadedFor === currentAuthUser.uid &&
    addressLoadingFor !== currentAuthUser.uid
  ) {
    const empty = document.createElement("p");
    empty.className = "account-address-empty";
    empty.textContent = "You haven’t saved any delivery addresses yet.";
    list.append(empty);
  }
  list.hidden = Boolean(form && !form.hidden);

  const picker = document.getElementById("checkout-saved-address-picker");
  const select = document.getElementById("checkout-saved-address-select");
  if (picker && select) {
    const previousSelection = select.value;
    select.replaceChildren();
    savedAccountAddresses.forEach(function (address) {
      const option = document.createElement("option");
      option.value = address.id;
      option.textContent = `${address.label}${address.isDefault ? " (Default)" : ""}`;
      select.append(option);
    });
    const defaultAddress = savedAccountAddresses.find(function (address) {
      return address.isDefault;
    });
    const selectedAddress = savedAccountAddresses.find(function (address) {
      return address.id === previousSelection;
    });
    select.value = selectedAddress
      ? selectedAddress.id
      : defaultAddress
        ? defaultAddress.id
        : (savedAccountAddresses[0]?.id || "");
    picker.hidden = !currentAuthUser || savedAccountAddresses.length === 0;
  }
}

async function loadAccountAddresses(forceRefresh) {
  const user = currentAuthUser;
  if (!user) {
    return;
  }
  if (addressLoadingFor === user.uid) {
    const activeLoad = addressLoadPromise;
    await activeLoad;
    if (currentAuthUser?.uid !== user.uid) {
      return;
    }
    if (!forceRefresh || addressLoadedFor === user.uid) {
      return;
    }
    return loadAccountAddresses(true);
  }
  if (!forceRefresh && addressLoadedFor === user.uid) {
    renderAccountAddresses();
    if (currentRoute === "payment") {
      const defaultAddress = savedAccountAddresses.find(function (address) {
        return address.isDefault;
      }) || savedAccountAddresses[0];
      if (defaultAddress) {
        populateCheckoutAddress(defaultAddress, true);
      }
    }
    return;
  }
  addressLoadingFor = user.uid;
  const sequence = ++addressLoadSequence;
  if (addressLoadedFor !== user.uid && addressCacheLoadedFor === user.uid) {
    setAddressStatus("Showing saved addresses while we refresh them…", false);
  } else if (addressLoadedFor !== user.uid) {
    setAddressStatus("Loading your saved addresses…", false);
  } else {
    setAddressStatus(
      `${savedAccountAddresses.length} saved ${savedAccountAddresses.length === 1 ? "address" : "addresses"}.`,
      false
    );
  }
  addressLoadPromise = (async function () {
    try {
      const collection = getAccountFirestore()
        .collection("users")
        .doc(user.uid)
        .collection("addresses");
      const snapshot = await collection.get();
      if (currentAuthUser?.uid !== user.uid || sequence !== addressLoadSequence) {
        return;
      }
      savedAccountAddresses = snapshot.docs.map(function (document) {
        const address = normalizeAddress(document.data());
        if (document.id === "default" && address.label === "Address") {
          address.label = "Home";
        }
        if (document.id === "default" && document.data().isDefault !== true) {
          address.isDefault = true;
        }
        return { id: document.id, ...address };
      }).sort(function (left, right) {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }
        return left.label.localeCompare(right.label);
      });
      addressLoadedFor = user.uid;
      persistAccountAddressCache(user.uid);
      renderAccountAddresses();
      setAddressStatus(
        savedAccountAddresses.length
          ? `${savedAccountAddresses.length} saved ${savedAccountAddresses.length === 1 ? "address" : "addresses"}.`
          : "No saved delivery addresses yet.",
        false
      );
      if (currentRoute === "payment") {
        const defaultAddress = savedAccountAddresses.find(function (address) {
          return address.isDefault;
        }) || savedAccountAddresses[0];
        if (defaultAddress) {
          populateCheckoutAddress(defaultAddress, true);
        }
      }
    } catch (error) {
      console.error("Could not load saved delivery address.", error);
      if (currentAuthUser?.uid === user.uid && sequence === addressLoadSequence) {
        setAddressStatus(
          addressCacheLoadedFor === user.uid
            ? `Couldn’t refresh saved addresses. Showing the saved copy from this browser. ${error.message || ""}`.trim()
            : error.message || "Your saved address couldn’t be loaded.",
          true
        );
      }
    } finally {
      if (addressLoadingFor === user.uid && sequence === addressLoadSequence) {
        addressLoadingFor = "";
        addressLoadPromise = null;
      }
    }
  })();
  return addressLoadPromise;
}

async function saveAccountAddress(event) {
  event.preventDefault();
  const user = currentAuthUser;
  const form = document.getElementById("account-address-form");
  const saveButton = form?.querySelector('button[type="submit"]');
  if (!form) {
    return;
  }
  if (!user) {
    setAddressStatus("Sign in to save a delivery address.", true);
    return;
  }
  const addressTypeInput = form.elements.namedItem("label");
  if (addressTypeInput instanceof HTMLSelectElement && !addressTypeInput.value) {
    setAddressStatus("Select a type of address before saving.", true);
    addressTypeInput.focus();
    return;
  }
  if (!form.reportValidity()) {
    setAddressStatus("Please complete the required fields and choose a type of address.", true);
    return;
  }
  const formData = new FormData(form);
  const address = normalizeAddress({
    label: String(formData.get("label") || "").trim(),
    fullName: String(formData.get("fullName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    addressLine1: String(formData.get("addressLine1") || "").trim(),
    addressLine2: String(formData.get("addressLine2") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    state: String(formData.get("state") || "").trim(),
    postalCode: String(formData.get("postalCode") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    isDefault: formData.get("isDefault") === "on" ||
      savedAccountAddresses.some(function (savedAddress) {
        return savedAddress.id === addressEditingId && savedAddress.isDefault;
      })
  });
  saveButton.disabled = true;
  setAddressStatus("Saving your delivery address…", false);
  const savePendingTimer = window.setTimeout(function () {
    setAddressStatus(
      "Still waiting for Firebase to confirm the save. Check your internet connection and deployed Firestore rules.",
      false
    );
  }, 12000);
  const previousAddresses = savedAccountAddresses;
  const previousAddressLoadedFor = addressLoadedFor;
  const previousEditingId = addressEditingId;
  let addressSaved = false;
  try {
    const addresses = getAccountFirestore()
      .collection("users")
      .doc(user.uid)
      .collection("addresses");
    const addressRef = addressEditingId
      ? addresses.doc(addressEditingId)
      : addresses.doc();
    const previousDefaultAddresses = address.isDefault
      ? savedAccountAddresses.filter(function (savedAddress) {
        return savedAddress.id !== addressEditingId && savedAddress.isDefault;
      })
      : [];
    await addressRef.set({
      ...address,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    addressSaved = true;
    if (currentAuthUser?.uid !== user.uid) {
      return;
    }
    const savedAddress = { id: addressRef.id, ...address };
    savedAccountAddresses = savedAccountAddresses
      .filter(function (item) {
        return item.id !== addressRef.id;
      })
      .map(function (item) {
        return address.isDefault ? { ...item, isDefault: false } : item;
      });
    savedAccountAddresses.push(savedAddress);
    savedAccountAddresses.sort(function (left, right) {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }
      return left.label.localeCompare(right.label);
    });
    persistAccountAddressCache(user.uid);
    addressLoadSequence += 1;
    addressLoadingFor = "";
    addressLoadPromise = null;
    addressLoadedFor = user.uid;
    renderAccountAddresses();
    if (savedAddress && currentRoute === "payment") {
      populateCheckoutAddress(savedAddress, true);
    }
    form.reset();
    addressEditingId = "";
    form.hidden = true;
    const addressList = document.getElementById("account-address-list");
    if (addressList) {
      addressList.hidden = false;
    }
    const heading = document.getElementById("account-address-form-heading");
    const toggleButton = document.getElementById("account-addresses-add");
    if (heading) {
      heading.textContent = "Add delivery address";
    }
    if (toggleButton) {
      toggleButton.textContent = "Add address";
    }
    setAddressStatus("Your delivery address has been saved.", false);
    if (previousDefaultAddresses.length) {
      try {
        const batch = getAccountFirestore().batch();
        previousDefaultAddresses.forEach(function (savedAddress) {
          const previousAddress = normalizeAddress(savedAddress);
          const update = {
            ...previousAddress,
            isDefault: false,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          };
          if (!update.fullName) {
            delete update.fullName;
          }
          batch.set(addresses.doc(savedAddress.id), update);
        });
        await batch.commit();
      } catch (error) {
        console.error("Address saved, but the previous default could not be updated.", error);
        if (currentAuthUser?.uid === user.uid) {
          setAddressStatus(
            "Address saved, but the previous default could not be updated. Check that the latest Firestore rules are deployed.",
            true
          );
        }
      }
    }
  } catch (error) {
    console.error("Could not save delivery address.", error);
    if (currentAuthUser?.uid === user.uid && !addressSaved) {
      savedAccountAddresses = previousAddresses;
      addressLoadedFor = previousAddressLoadedFor;
      renderAccountAddresses();
      const previousAddress = previousAddresses.find(function (item) {
        return item.id === previousEditingId;
      });
      setAddressEditor(previousAddress || null);
      setAddressFormValues(form, address);
      addressEditingId = previousEditingId;
      setAddressStatus(
        error.code === "permission-denied"
          ? "Firebase denied this save. Deploy the latest Firestore rules to allow multiple saved addresses."
          : error.message || "Your delivery address couldn’t be saved.",
        true
      );
    } else if (currentAuthUser?.uid === user.uid) {
      setAddressStatus("Address saved, but the address list could not be refreshed.", true);
    }
  } finally {
    window.clearTimeout(savePendingTimer);
    saveButton.disabled = false;
  }
}

async function deleteAccountAddress(addressId) {
  if (!currentAuthUser || !addressId) {
    return;
  }
  if (!window.confirm("Delete this saved delivery address?")) {
    return;
  }
  try {
    const addresses = getAccountFirestore()
      .collection("users")
      .doc(currentAuthUser.uid)
      .collection("addresses");
    const batch = getAccountFirestore().batch();
    const addressToDelete = savedAccountAddresses.find(function (address) {
      return address.id === addressId;
    });
    if (addressToDelete?.isDefault && savedAccountAddresses.length > 1) {
      const replacement = savedAccountAddresses.find(function (address) {
        return address.id !== addressId;
      });
      batch.update(addresses.doc(replacement.id), {
        isDefault: true,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    batch.delete(addresses.doc(addressId));
    await batch.commit();
    await loadAccountAddresses(true);
    setAddressStatus("The delivery address has been deleted.", false);
  } catch (error) {
    console.error("Could not delete saved delivery address.", error);
    setAddressStatus(error.message || "The delivery address couldn’t be deleted.", true);
  }
}

function setAccountOrdersStatus(message, isError) {
  const status = document.getElementById("account-orders-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function renderAccountOrders(orders) {
  const list = document.getElementById("account-orders-list");
  if (!list) {
    return;
  }
  list.replaceChildren();
  orders.forEach(function (order) {
    const card = document.createElement("article");
    card.className = "account-order-card";

    const heading = document.createElement("div");
    heading.className = "account-order-heading";
    const title = document.createElement("div");
    const orderId = document.createElement("h3");
    orderId.textContent = `Order ${order.orderId}`;
    const date = document.createElement("p");
    date.textContent = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-IN")
      : "Date unavailable";
    title.append(orderId, date);
    const badge = document.createElement("span");
    const isPaid = order.status === "paid";
    badge.className = `account-order-status${isPaid ? " is-paid" : ""}`;
    badge.textContent = isPaid ? "Paid" : order.status === "created" ? "Payment pending" : "Order update pending";
    heading.append(title, badge);
    card.append(heading);

    const items = document.createElement("ul");
    items.className = "account-order-items";
    (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
      const row = document.createElement("li");
      const itemName = document.createElement("span");
      itemName.textContent = `${item.name || "Item"} × ${item.quantity || 1}`;
      const itemPrice = document.createElement("strong");
      itemPrice.textContent = formatRupees(Number(item.lineTotalPaise || 0) / 100);
      row.append(itemName, itemPrice);
      items.append(row);
    });
    card.append(items);

    const total = document.createElement("p");
    total.className = "account-order-total";
    total.textContent = `Total: ${formatRupees(Number(order.totalPaise || 0) / 100)}`;
    card.append(total);
    list.append(card);
  });
}

async function loadAccountOrders(forceRefresh) {
  const user = currentAuthUser;
  if (!user || accountOrdersLoading) {
    return;
  }
  if (!forceRefresh && accountOrdersLoadedFor === user.uid) {
    return;
  }

  accountOrdersLoading = true;
  setAccountOrdersStatus("Loading your orders…", false);
  const list = document.getElementById("account-orders-list");
  if (list) {
    list.replaceChildren();
  }
  try {
    const result = await callPaymentFunction("getUserOrders", {}, true);
    if (currentAuthUser?.uid !== user.uid) {
      return;
    }
    const orders = Array.isArray(result.orders) ? result.orders : [];
    renderAccountOrders(orders);
    accountOrdersLoadedFor = user.uid;
    setAccountOrdersStatus(
      orders.length
        ? `Showing ${orders.length} ${orders.length === 1 ? "order" : "orders"}.`
        : "You haven’t placed any orders yet.",
      false
    );
    const verificationNote = document.getElementById("account-orders-verification-note");
    if (verificationNote) {
      verificationNote.hidden = Boolean(user.emailVerified);
    }
  } catch (error) {
    console.error("Could not load customer orders.", error);
    if (currentAuthUser?.uid === user.uid) {
      setAccountOrdersStatus(error.message || "Your orders couldn’t be loaded. Please try again.", true);
    }
  } finally {
    accountOrdersLoading = false;
    if (currentAuthUser && currentAuthUser.uid !== user.uid && currentAccountSection === "orders") {
      loadAccountOrders();
    }
  }
}

async function reauthenticateForProfileChange(password) {
  if (!currentAuthUser || !currentAuthUser.email || !password) {
    throw new Error("Enter your current password to change your email or mobile number.");
  }
  const credential = window.firebase.auth.EmailAuthProvider.credential(
    currentAuthUser.email,
    password
  );
  await currentAuthUser.reauthenticateWithCredential(credential);
}

async function sendProfilePhoneCode() {
  const phoneInput = document.getElementById("account-profile-phone");
  const status = document.getElementById("account-profile-status");
  const phone = phoneInput.value.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    if (status) {
      status.textContent = "Enter a valid phone number in international format, such as +919876543210.";
      status.classList.add("is-error");
    }
    return;
  }
  if (!firebaseAuth || !currentAuthUser) {
    if (status) {
      status.textContent = "Sign in again before changing your mobile number.";
      status.classList.add("is-error");
    }
    return;
  }

  const sendButton = document.getElementById("account-phone-send-code");
  sendButton.disabled = true;
  if (status) {
    status.textContent = "Preparing phone verification…";
    status.classList.remove("is-error");
  }
  try {
    if (!phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier = new window.firebase.auth.RecaptchaVerifier(
        "account-phone-recaptcha",
        { size: "invisible" }
      );
      await phoneRecaptchaVerifier.render();
    }
    const provider = new window.firebase.auth.PhoneAuthProvider();
    phoneVerificationId = await provider.verifyPhoneNumber(phone, phoneRecaptchaVerifier);
    document.getElementById("account-phone-code").hidden = false;
    document.getElementById("account-phone-confirm").hidden = false;
    if (status) {
      status.textContent = "Verification code sent. Enter the code received by SMS.";
    }
  } catch (error) {
    console.error("Firebase mobile verification code could not be sent.", error);
    if (status) {
      status.textContent = authErrorMessage(error);
      status.classList.add("is-error");
    }
    if (phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier.clear();
      phoneRecaptchaVerifier = null;
    }
  } finally {
    sendButton.disabled = false;
  }
}

async function confirmProfilePhoneCode() {
  const codeInput = document.getElementById("account-phone-code");
  const passwordInput = document.getElementById("account-profile-password");
  const phoneInput = document.getElementById("account-profile-phone");
  const status = document.getElementById("account-profile-status");
  const confirmButton = document.getElementById("account-phone-confirm");
  if (!phoneVerificationId || !codeInput.value.trim()) {
    status.textContent = "Enter the SMS verification code first.";
    status.classList.add("is-error");
    return;
  }

  confirmButton.disabled = true;
  status.textContent = "Verifying your mobile number…";
  status.classList.remove("is-error");
  try {
    await reauthenticateForProfileChange(passwordInput.value);
    const credential = window.firebase.auth.PhoneAuthProvider.credential(
      phoneVerificationId,
      codeInput.value.trim()
    );
    await currentAuthUser.updatePhoneNumber(credential);
    await currentAuthUser.reload();
    currentAuthUser = firebaseAuth.currentUser || currentAuthUser;
    if (currentAuthUser.phoneNumber !== phoneInput.value.trim()) {
      throw new Error("Firebase did not return the verified mobile number.");
    }
    phoneVerificationId = "";
    phoneInput.value = currentAuthUser.phoneNumber || "";
    status.textContent = "Your mobile number has been verified and updated.";
    status.classList.remove("is-error");
    codeInput.value = "";
    codeInput.hidden = true;
    confirmButton.hidden = true;
    document.getElementById("account-profile-password").value = "";
    updateProfileChangeControls();
    if (phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier.clear();
      phoneRecaptchaVerifier = null;
    }
  } catch (error) {
    console.error("Firebase mobile number update failed.", error);
    status.textContent = error.message && !error.code
      ? error.message
      : authErrorMessage(error);
    status.classList.add("is-error");
  } finally {
    confirmButton.disabled = false;
  }
}

function setAuthMode(mode) {
  const signupMode = mode === "signup";
  const loginForm = document.getElementById("account-login-form");
  const signupForm = document.getElementById("account-signup-form");
  const heading = document.getElementById("account-page-heading");
  if (loginForm) {
    loginForm.hidden = signupMode;
  }
  if (signupForm) {
    signupForm.hidden = !signupMode;
  }
  if (heading && !currentAuthUser) {
    heading.textContent = signupMode ? "Create your account" : "Welcome back";
  }
  setAuthStatus(firebaseAuth ? "" : authSetupMessage, !firebaseAuth);
}

function authErrorMessage(error) {
  const messages = {
    "auth/api-key-not-valid": "The Firebase API key in auth-config.js is invalid. Check it in Firebase Project settings.",
    "auth/app-not-authorized": "This website isn’t authorized for this Firebase project. Add its domain to Firebase Authentication’s authorized domains.",
    "auth/auth-domain-config-required": "Firebase Authentication needs a valid authDomain in auth-config.js.",
    "auth/configuration-not-found": "Firebase Authentication isn’t configured for this project. Enable Email/Password sign-in in Firebase Console.",
    "auth/email-already-in-use": "An account already uses this email. Try logging in instead.",
    "auth/invalid-api-key": "The Firebase API key in auth-config.js is invalid. Check it in Firebase Project settings.",
    "auth/invalid-credential": "Email or password is incorrect. Check your details and try again.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed": "Email and password sign-in is not enabled in Firebase yet.",
    "auth/invalid-phone-number": "Enter a valid phone number in international format.",
    "auth/invalid-verification-code": "That SMS code is incorrect. Check it and try again.",
    "auth/code-expired": "That SMS code has expired. Request a new code and try again.",
    "auth/captcha-check-failed": "Phone verification could not confirm this browser. Refresh and try again.",
    "auth/credential-already-in-use": "That phone number is already linked to another account.",
    "auth/requires-recent-login": "For security, sign out and sign in again before changing this account detail.",
    "auth/too-many-requests": "Too many attempts. Wait a little while, then try again.",
    "auth/unauthorized-domain": "This website’s domain isn’t authorized in Firebase. Add it under Authentication → Settings → Authorized domains.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/user-disabled": "This account has been disabled. Contact the shop for help.",
    "auth/user-not-found": "No account was found for this email. Create an account first."
  };
  return messages[error.code] || "Sign-in couldn’t be completed. Please try again.";
}

function profileUpdateErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "That email address is already linked to another account.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The current password is incorrect. Check it and try again.",
    "auth/invalid-login-credentials": "The current password is incorrect. Check it and try again.",
    "auth/wrong-password": "The current password is incorrect. Check it and try again.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/configuration-not-found": "Email/Password sign-in isn’t enabled for this Firebase project. Enable it in Firebase Console under Authentication → Sign-in method.",
    "auth/operation-not-allowed": "Email/Password sign-in isn’t enabled for this Firebase project. Enable it in Firebase Console under Authentication → Sign-in method.",
    "auth/requires-recent-login": "For security, sign out and sign in again before changing this account detail.",
    "auth/too-many-requests": "Too many attempts. Wait a little while, then try again."
  };
  return messages[error.code] || "We couldn’t update your account. Check your connection and try again.";
}

function profilePhotoErrorMessage(error) {
  const messages = {
    "storage/bucket-not-found": "The Firebase Storage bucket wasn’t found. Create/enable Storage for the yarnitynest project and verify storageBucket in auth-config.js.",
    "storage/no-default-bucket": "No Storage bucket is configured. Set storageBucket in auth-config.js to the bucket shown in Firebase Console → Storage.",
    "storage/project-not-found": "The Firebase project for Storage wasn’t found. Verify auth-config.js points to the correct project.",
    "storage/object-not-found": "The uploaded profile picture could not be found. Please try again.",
    "storage/unauthorized": "Firebase Storage rejected this upload. In the yarnitynest project, deploy the latest rules with: firebase deploy --only storage --project yarnitynest",
    "storage/unauthenticated": "Your sign-in expired before the picture could be uploaded. Sign in again and retry.",
    "storage/quota-exceeded": "This Firebase Storage bucket has exceeded its quota. Check the project’s Storage usage and billing.",
    "storage/retry-limit-exceeded": "The upload couldn’t finish because the connection was interrupted. Check your connection and try again.",
    "storage/unknown": "Firebase Storage couldn’t complete the upload. Check that Storage is enabled, the configured bucket is correct, and the latest Storage rules are deployed.",
    "profile-photo/timeout": error.message
  };
  return messages[error.code] || `We couldn’t upload your profile picture (${error.code || "unknown Firebase error"}). Check Firebase Storage setup and try again.`;
}

async function optimizeAccountProfilePhoto(file) {
  let imageBitmap;
  try {
    imageBitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image couldn’t be opened. Try a different JPG, PNG, or WebP file.");
  }
  const maxDimension = 512;
  const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imageBitmap.width * scale));
  canvas.height = Math.max(1, Math.round(imageBitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    imageBitmap.close();
    throw new Error("Your browser couldn’t prepare the profile picture. Try another image.");
  }
  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  imageBitmap.close();

  const createBlob = function (type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Your browser couldn’t compress the profile picture. Try another image."));
        }
      }, type, quality);
    });
  };
  let optimizedFile = await createBlob("image/webp", 0.8);
  if (optimizedFile.type !== "image/webp") {
    const jpegCanvas = document.createElement("canvas");
    jpegCanvas.width = canvas.width;
    jpegCanvas.height = canvas.height;
    const jpegContext = jpegCanvas.getContext("2d");
    if (!jpegContext) {
      throw new Error("Your browser couldn’t prepare the profile picture. Try another image.");
    }
    jpegContext.fillStyle = "#ffffff";
    jpegContext.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
    jpegContext.drawImage(canvas, 0, 0);
    optimizedFile = await new Promise(function (resolve, reject) {
      jpegCanvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Your browser couldn’t compress the profile picture. Try another image."));
        }
      }, "image/jpeg", 0.82);
    });
  }
  if (optimizedFile.size < file.size) {
    return optimizedFile;
  }
  return file;
}

async function uploadAccountProfilePhoto(file) {
  const status = document.getElementById("account-profile-photo-status");
  const progressBar = document.getElementById("account-profile-photo-progress");
  const progressFill = progressBar.querySelector("span");
  const fileInput = document.getElementById("account-profile-photo-input");
  const uploadButton = document.querySelector(".account-profile-photo-button");
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!file) {
    return;
  }
  if (!allowedTypes.includes(file.type)) {
    status.textContent = "Choose a JPG, PNG, or WebP image.";
    status.classList.add("is-error");
    fileInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    status.textContent = "Choose an image smaller than 5 MB.";
    status.classList.add("is-error");
    fileInput.value = "";
    return;
  }
  if (!currentAuthUser) {
    status.textContent = "Sign in to upload a profile picture.";
    status.classList.add("is-error");
    fileInput.value = "";
    return;
  }
  if (!window.firebase || typeof window.firebase.storage !== "function") {
    status.textContent = "Firebase Storage SDK couldn’t load. Check your connection and refresh the page.";
    status.classList.add("is-error");
    fileInput.value = "";
    return;
  }

  uploadButton.setAttribute("aria-disabled", "true");
  fileInput.disabled = true;
  uploadButton.textContent = "Preparing…";
  status.textContent = "Optimizing your profile picture…";
  status.classList.remove("is-error");
  try {
    const optimizedFile = await optimizeAccountProfilePhoto(file);
    const uploadSize = (optimizedFile.size / 1024).toFixed(0);
    uploadButton.textContent = "Uploading…";
    progressBar.hidden = false;
    progressBar.classList.add("is-indeterminate");
    progressFill.style.width = "35%";
    progressBar.removeAttribute("aria-valuenow");
    progressBar.setAttribute("aria-valuetext", `Uploading ${uploadSize} kilobytes`);
    status.textContent = `Connecting to Firebase Storage (${uploadSize} KB)…`;
    const storage = window.firebase.storage();
    const uploadingUid = currentAuthUser.uid;
    const currentPhotoURL = currentAuthUser.photoURL || "";
    const nextSlot = currentPhotoURL.includes("profile-picture-1") ? "2" : "1";
    const photoRef = storage.ref()
      .child(`users/${uploadingUid}/profile/profile-picture-${nextSlot}`);
    const uploadTask = photoRef.put(optimizedFile, {
      contentType: optimizedFile.type || file.type,
      cacheControl: "private,max-age=3600"
    });
    const snapshot = await new Promise(function (resolve, reject) {
      let settled = false;
      let unsubscribe = function () {};
      let waitingTimer = window.setTimeout(function () {
        status.textContent = "Still connecting to Firebase Storage. Check that Storage is enabled and its rules are deployed.";
      }, 10000);
      let timeoutTimer = window.setTimeout(function () {
        if (settled) {
          return;
        }
        settled = true;
        unsubscribe();
        uploadTask.cancel();
        const error = new Error(
          "Firebase Storage did not respond. Check your connection, confirm Storage is enabled for yarnitynest, and deploy its rules."
        );
        error.code = "profile-photo/timeout";
        reject(error);
      }, 45000);
      const finish = function (callback, value) {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(waitingTimer);
        window.clearTimeout(timeoutTimer);
        unsubscribe();
        callback(value);
      };
      unsubscribe = uploadTask.on("state_changed", function (progress) {
        window.clearTimeout(waitingTimer);
        status.textContent = `Uploading optimized picture (${uploadSize} KB)…`;
        const percentage = progress.totalBytes
          ? Math.round((progress.bytesTransferred / progress.totalBytes) * 100)
          : 0;
        if (progress.bytesTransferred > 0) {
          progressBar.classList.remove("is-indeterminate");
          progressFill.style.width = `${percentage}%`;
          progressBar.setAttribute("aria-valuenow", String(percentage));
          progressBar.setAttribute("aria-valuetext", `${percentage}% uploaded`);
          status.textContent = `Uploading optimized picture (${uploadSize} KB)… ${percentage}%`;
        }
      }, function (error) {
        finish(reject, error);
      }, function () {
        progressBar.classList.remove("is-indeterminate");
        progressFill.style.width = "100%";
        progressBar.setAttribute("aria-valuenow", "100");
        progressBar.setAttribute("aria-valuetext", "Upload complete");
        status.textContent = "Saving your profile picture…";
        finish(resolve, uploadTask.snapshot);
      });
    });
    const photoURL = await snapshot.ref.getDownloadURL();
    if (!currentAuthUser || currentAuthUser.uid !== uploadingUid) {
      throw new Error("Your session changed during upload. Sign in again and retry.");
    }
    await currentAuthUser.updateProfile({ photoURL });
    currentAuthUser = firebaseAuth.currentUser || currentAuthUser;
    updateAccountPage();
    status.textContent = "Your profile picture has been updated.";
  } catch (error) {
    console.error("Firebase profile picture upload failed.", error);
    status.textContent = error.message && !error.code
      ? error.message
      : profilePhotoErrorMessage(error);
    status.classList.add("is-error");
  } finally {
    uploadButton.removeAttribute("aria-disabled");
    fileInput.disabled = false;
    uploadButton.textContent = "Update photo";
    fileInput.value = "";
    progressBar.hidden = true;
    progressBar.classList.remove("is-indeterminate");
    progressFill.style.width = "0%";
    progressBar.removeAttribute("aria-valuenow");
  }
}

function completeAccountSignIn(user) {
  currentAuthUser = user;
  updateAccountPage();
  const returnToCart = pendingCartReturn;
  pendingCartReturn = null;
  const returnRoute = returnToCart ? returnToCart.route : "home";
  window.history.replaceState(null, "", `#${returnRoute}`);
  renderRoute();
  if (returnToCart) {
    requestAnimationFrame(function () {
      const addButton = document.querySelector(`[data-cart-add="${returnToCart.productIndex}"]`);
      if (addButton) {
        addButton.scrollIntoView({ behavior: "smooth", block: "center" });
        addButton.focus({ preventScroll: true });
      } else {
        console.error("Could not return to the product that was selected before sign-in.");
      }
    });
  }
}

async function submitAccountProfile(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById("account-profile-status");
  if (!currentAuthUser || !form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const firstName = String(formData.get("firstName")).trim();
  const lastName = String(formData.get("lastName")).trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const newEmail = String(formData.get("email")).trim();
  const currentPassword = String(formData.get("currentPassword"));
  const emailChanged = newEmail !== (currentAuthUser.email || "");
  const phoneChanged = String(formData.get("phone")).trim() !== (currentAuthUser.phoneNumber || "");
  if (!name) {
    return;
  }
  if (phoneChanged) {
    if (status) {
      status.textContent = "Verify the new mobile number with the SMS code before saving your profile.";
      status.classList.add("is-error");
    }
    return;
  }
  if (emailChanged && !currentPassword) {
    if (status) {
      status.textContent = "Enter your current password before changing your sign-in email.";
      status.classList.add("is-error");
    }
    return;
  }

  submitButton.disabled = true;
  if (status) {
    status.textContent = "Saving your profile…";
    status.classList.remove("is-error");
  }
  try {
    if (emailChanged) {
      await reauthenticateForProfileChange(currentPassword);
      await currentAuthUser.updateEmail(newEmail);
      await currentAuthUser.sendEmailVerification();
    }
    await currentAuthUser.updateProfile({ displayName: name });
    await currentAuthUser.reload();
    currentAuthUser = firebaseAuth.currentUser || currentAuthUser;
    if (
      currentAuthUser.displayName !== name ||
      currentAuthUser.email !== newEmail
    ) {
      throw new Error("Firebase did not return the updated profile values.");
    }
    setProfileEditing(false);
    updateAccountPage();
    if (status) {
      status.textContent = emailChanged
        ? "Your name was saved. A verification email was sent to your new address."
        : "Your profile information has been saved.";
    }
  } catch (error) {
    console.error("Firebase account profile update failed.", error);
    if (status) {
      status.textContent = error.message && !error.code
        ? error.message
        : profileUpdateErrorMessage(error);
      status.classList.add("is-error");
    }
  } finally {
    submitButton.disabled = false;
  }
}

async function submitAccountPasswordChange(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById("account-password-status");
  const formData = new FormData(form);
  const currentPassword = String(formData.get("currentPassword"));
  const newPassword = String(formData.get("newPassword"));
  const confirmPassword = String(formData.get("confirmPassword"));
  if (!currentAuthUser || !form.reportValidity()) {
    return;
  }
  if (newPassword !== confirmPassword) {
    status.textContent = "The new passwords don’t match. Check them and try again.";
    status.classList.add("is-error");
    return;
  }

  submitButton.disabled = true;
  status.textContent = "Updating your password…";
  status.classList.remove("is-error");
  try {
    await reauthenticateForProfileChange(currentPassword);
    await currentAuthUser.updatePassword(newPassword);
    form.reset();
    form.hidden = true;
    const toggle = document.getElementById("account-password-toggle");
    toggle.textContent = "Change password";
    toggle.setAttribute("aria-expanded", "false");
    status.textContent = "Your password has been updated.";
  } catch (error) {
    console.error("Firebase account password update failed.", error);
    status.textContent = error.message && !error.code
      ? error.message
      : profileUpdateErrorMessage(error);
    status.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
  }
}

async function submitAccountLogin(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (!firebaseAuth) {
    setAuthStatus(
      "Firebase Authentication isn’t configured. Add the Firebase web app config and enable Email/Password sign-in.",
      true
    );
    return;
  }
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  submitButton.disabled = true;
  setAuthStatus("Signing you in…", false);
  try {
    const credential = await firebaseAuth.signInWithEmailAndPassword(
      String(formData.get("email")).trim(),
      String(formData.get("password"))
    );
    completeAccountSignIn(credential.user);
  } catch (error) {
    console.error("Firebase email/password login failed.", error);
    setAuthStatus(authErrorMessage(error), true);
  } finally {
    submitButton.disabled = false;
  }
}

async function submitAccountSignup(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  if (!firebaseAuth) {
    setAuthStatus(
      "Firebase Authentication isn’t configured. Add the Firebase web app config and enable Email/Password sign-in.",
      true
    );
    return;
  }
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const name = String(formData.get("name")).trim();
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword"));
  if (password !== confirmPassword) {
    setAuthStatus("Passwords don’t match. Please check and try again.", true);
    return;
  }

  submitButton.disabled = true;
  setAuthStatus("Creating your account…", false);
  try {
    const credential = await firebaseAuth.createUserWithEmailAndPassword(
      String(formData.get("email")).trim(),
      password
    );
    await credential.user.updateProfile({ displayName: name });
    completeAccountSignIn(credential.user);
  } catch (error) {
    console.error("Firebase account registration failed.", error);
    setAuthStatus(authErrorMessage(error), true);
  } finally {
    submitButton.disabled = false;
  }
}

function moveWishlistProductToCart(productIndex) {
 const product = PRODUCTS[productIndex];
 if (!product || !wishlistProductIndices.has(productIndex)) {
   return false;
 }
 const cartItem = cartItems.find(function (item) {
   return item.productIndex === productIndex;
 });
 if (cartItem && cartItem.quantity >= MAX_CART_ITEM_QUANTITY) {
   return false;
 }
 if (cartItem) {
   cartItem.quantity += 1;
 } else {
   cartItems.push({ productIndex: productIndex, quantity: 1 });
 }
 renderCart();
 removeAccountWishlistProduct(productIndex);
 return true;
}

function renderAccountWishlist() {
  const list = document.getElementById("account-wishlist-list");
  const empty = document.getElementById("account-wishlist-empty");
  const summary = document.getElementById("account-wishlist-summary");
  const filters = document.getElementById("account-wishlist-filters");
  const sortSelect = document.getElementById("account-wishlist-sort");
  const addAllButton = document.getElementById("account-wishlist-add-all");
  if (!list || !empty) {
    return;
  }
  const productOrder = Array.from(wishlistProductIndices);
  const products = productOrder
    .map(function (productIndex, recentOrder) {
      return {
        productIndex: productIndex,
        product: PRODUCTS[productIndex],
        recentOrder: recentOrder
      };
    })
    .filter(function (item) {
      return Boolean(item.product);
    });
  const categories = ["All", ...new Set(products.map(function (item) {
    return item.product.category;
  }))];
  if (!categories.includes(wishlistCategoryFilter)) {
    wishlistCategoryFilter = "All";
  }
  if (filters) {
    filters.replaceChildren();
    categories.forEach(function (category) {
      const filter = document.createElement("button");
      filter.type = "button";
      filter.className = `account-wishlist-filter${category === wishlistCategoryFilter ? " is-active" : ""}`;
      filter.dataset.wishlistCategory = category;
      filter.setAttribute("aria-pressed", String(category === wishlistCategoryFilter));
      filter.textContent = category;
      filters.append(filter);
    });
  }
  if (sortSelect) {
    sortSelect.value = wishlistSortOrder;
  }
  const total = products.reduce(function (sum, item) {
    return sum + getPriceAmount(item.product);
  }, 0);
  if (summary) {
    summary.textContent = `${products.length} saved ${products.length === 1 ? "piece" : "pieces"} · worth ${formatRupees(total)} together`;
  }
  if (addAllButton) {
    addAllButton.disabled = products.length === 0;
  }
  const visibleProducts = products.filter(function (item) {
    return wishlistCategoryFilter === "All" ||
      item.product.category === wishlistCategoryFilter;
  });
  visibleProducts.sort(function (left, right) {
    if (wishlistSortOrder === "price-low") {
      return getPriceAmount(left.product) - getPriceAmount(right.product);
    }
    if (wishlistSortOrder === "price-high") {
      return getPriceAmount(right.product) - getPriceAmount(left.product);
    }
    if (wishlistSortOrder === "name") {
      return left.product.name.localeCompare(right.product.name);
    }
    return right.recentOrder - left.recentOrder;
  });
  list.replaceChildren();
  empty.hidden = products.length > 0 || !currentAuthUser || wishlistLoadedFor !== currentAuthUser.uid;
  if (products.length && !visibleProducts.length) {
    const filteredEmpty = document.createElement("p");
    filteredEmpty.className = "account-wishlist-filter-empty";
    filteredEmpty.textContent = "No saved items in this category.";
    list.append(filteredEmpty);
  }
  visibleProducts.forEach(function (item) {
    const card = document.createElement("article");
    card.className = "account-wishlist-item";
    const art = document.createElement("div");
    art.className = "account-wishlist-art";
    art.style.setProperty("--wishlist-item-bg", item.product.bg || "#f1e5d8");
    art.style.setProperty("--wishlist-item-accent", item.product.accent || "#a66e60");
    if (item.product.image) {
      const image = document.createElement("img");
      image.src = item.product.image;
      image.alt = item.product.name;
      image.loading = "lazy";
      art.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "account-wishlist-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = item.product.emoji || "✿";
      art.append(placeholder);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "account-wishlist-remove";
    remove.dataset.wishlistRemove = String(item.productIndex);
    remove.setAttribute("aria-label", `Remove ${item.product.name} from wishlist`);
    remove.textContent = "♥";
    art.append(remove);

    const details = document.createElement("div");
    details.className = "account-wishlist-details";
    const category = document.createElement("p");
    category.textContent = item.product.category;
    const name = document.createElement("h3");
    name.textContent = item.product.name;
    const price = document.createElement("strong");
    price.textContent = item.product.price;
    details.append(category, name, price);

    const moveToCart = document.createElement("button");
    moveToCart.type = "button";
    moveToCart.className = "button account-wishlist-move";
    moveToCart.dataset.wishlistAddCart = String(item.productIndex);
    moveToCart.textContent = "Move to cart";
    card.append(art, details, moveToCart);
    list.append(card);
  });
}

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const passwordVisibilityButton = event.target.closest(".account-password-visibility");
  if (passwordVisibilityButton) {
    const passwordInput = document.getElementById(passwordVisibilityButton.getAttribute("aria-controls"));
    if (passwordInput instanceof HTMLInputElement) {
      const shouldShowPassword = passwordInput.type === "password";
      passwordInput.type = shouldShowPassword ? "text" : "password";
      passwordVisibilityButton.setAttribute("aria-pressed", String(shouldShowPassword));
      passwordVisibilityButton.setAttribute(
        "aria-label",
        shouldShowPassword ? "Hide password" : "Show password"
      );
      passwordVisibilityButton.querySelector("span").textContent = shouldShowPassword ? "Hide" : "Show";
    }
    return;
  }

  const accountMenu = document.getElementById("account-menu");
  const accountButton = document.getElementById("account-open");
  if (
    accountMenu &&
    !accountMenu.hidden &&
    !event.target.closest("#account-menu, #account-open")
  ) {
    accountMenu.hidden = true;
    accountButton?.setAttribute("aria-expanded", "false");
  }

  const accountMenuItem = event.target.closest("[data-account-menu-action]");
  if (accountMenuItem) {
    const action = accountMenuItem.dataset.accountMenuAction;
    if (accountMenu) {
      accountMenu.hidden = true;
    }
    accountButton?.setAttribute("aria-expanded", "false");

    if (action === "signout") {
      if (firebaseAuth) {
        firebaseAuth.signOut().catch(function (error) {
          console.error("Firebase sign-out failed.", error);
          setAuthStatus("We couldn’t sign you out. Please try again.", true);
        });
      }
      return;
    }

    if (action === "address") {
      if (currentRoute !== "account") {
        window.history.pushState(null, "", "#account");
        renderRoute();
      }
      setAccountSection("addresses");
      return;
    }

    const route = ["profile", "orders", "wishlist"].includes(action) ? "account" : "home";
    if (route !== currentRoute) {
      window.history.pushState(null, "", `#${route}`);
      renderRoute();
    }
    if (action === "profile") {
      setAccountSection("profile");
    }
    if (action === "orders") {
      setAccountSection("orders");
    }
    if (action === "wishlist") {
      setAccountSection("wishlist");
    }
    if (action === "address") {
      setAccountSection("addresses");
    }
    if (action === "wishlist") {
      document.querySelector(".home-favorites")?.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  const wishlistFilterButton = event.target.closest("[data-wishlist-category]");
  if (wishlistFilterButton) {
    wishlistCategoryFilter = wishlistFilterButton.dataset.wishlistCategory;
    renderAccountWishlist();
    return;
  }
  const wishlistMoveButton = event.target.closest("[data-wishlist-add-cart]");
  if (wishlistMoveButton) {
    const productIndex = Number(wishlistMoveButton.dataset.wishlistAddCart);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not move an unknown product from the wishlist.");
      return;
    }
    if (moveWishlistProductToCart(productIndex)) {
      showCartToast(`${PRODUCTS[productIndex].name} moved to your cart.`);
    } else {
      setWishlistStatus("This item has reached the maximum cart quantity.", true);
    }
    return;
  }
  if (event.target.closest("#account-wishlist-add-all")) {
    let movedCount = 0;
    let skippedCount = 0;
    Array.from(wishlistProductIndices).forEach(function (productIndex) {
      if (moveWishlistProductToCart(productIndex)) {
        movedCount += 1;
      } else {
        skippedCount += 1;
      }
    });
    if (movedCount) {
      showCartToast(`${movedCount} ${movedCount === 1 ? "item" : "items"} added to your cart.`);
    }
    if (skippedCount) {
      setWishlistStatus(
        `${skippedCount} item${skippedCount === 1 ? "" : "s"} could not be added because the cart quantity limit was reached.`,
        true
      );
    }
    return;
  }
  const wishlistRemoveButton = event.target.closest("[data-wishlist-remove]");
  if (wishlistRemoveButton) {
    const productIndex = Number(wishlistRemoveButton.dataset.wishlistRemove);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not remove an unknown product from the wishlist.");
      return;
    }
    removeAccountWishlistProduct(productIndex);
    return;
  }
  if (event.target.closest("#account-profile-edit")) {
    setProfileEditing(true);
    document.getElementById("account-profile-first-name")?.focus();
    return;
  }
  if (event.target.closest("#account-password-toggle")) {
    const form = document.getElementById("account-password-form");
    const toggle = document.getElementById("account-password-toggle");
    const isOpening = form.hidden;
    form.hidden = !isOpening;
    toggle.textContent = isOpening ? "Cancel password change" : "Change password";
    toggle.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) {
      const status = document.getElementById("account-password-status");
      status.textContent = "";
      status.classList.remove("is-error");
      document.getElementById("account-password-current")?.focus();
    } else {
      form.reset();
      const status = document.getElementById("account-password-status");
      status.textContent = "";
      status.classList.remove("is-error");
    }
    return;
  }
  if (event.target.closest("#account-password-cancel")) {
    const form = document.getElementById("account-password-form");
    const toggle = document.getElementById("account-password-toggle");
    form.reset();
    form.hidden = true;
    toggle.textContent = "Change password";
    toggle.setAttribute("aria-expanded", "false");
    const status = document.getElementById("account-password-status");
    status.textContent = "";
    status.classList.remove("is-error");
    return;
  }
  if (event.target.closest("#account-profile-cancel")) {
    setProfileEditing(false);
    updateAccountPage();
    const status = document.getElementById("account-profile-status");
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
    return;
  }
  if (event.target.closest("#account-orders-refresh")) {
    accountOrdersLoadedFor = "";
    loadAccountOrders(true);
    return;
  }
  if (event.target.closest("#account-orders-verify-email")) {
    if (!currentAuthUser) {
      return;
    }
    currentAuthUser.sendEmailVerification().then(function () {
      setAccountOrdersStatus("Verification email sent. Verify your address, then refresh your orders.", false);
    }).catch(function (error) {
      console.error("Could not send account email verification.", error);
      setAccountOrdersStatus("We couldn’t send the verification email. Please try again.", true);
    });
    return;
  }
  if (event.target.closest("#account-addresses-add")) {
    if (!currentAuthUser) {
      return;
    }
    const form = document.getElementById("account-address-form");
    const list = document.getElementById("account-address-list");
    const toggleButton = document.getElementById("account-addresses-add");
    if (form && !form.hidden) {
      addressEditingId = "";
      form.reset();
      form.hidden = true;
      if (list) {
        list.hidden = false;
      }
      if (toggleButton) {
        toggleButton.textContent = "Add address";
      }
      setAddressStatus("", false);
      return;
    }
    setAddressEditor(null);
    return;
  }
  const addressEditButton = event.target.closest("[data-address-edit]");
  if (addressEditButton) {
    const address = savedAccountAddresses.find(function (item) {
      return item.id === addressEditButton.dataset.addressEdit;
    });
    if (address) {
      setAddressEditor(address);
    }
    return;
  }
  const addressDeleteButton = event.target.closest("[data-address-delete]");
  if (addressDeleteButton) {
    deleteAccountAddress(addressDeleteButton.dataset.addressDelete);
    return;
  }
  if (event.target.closest("#account-address-cancel")) {
    addressEditingId = "";
    const form = document.getElementById("account-address-form");
    const toggleButton = document.getElementById("account-addresses-add");
    if (form) {
      form.reset();
      form.hidden = true;
    }
    document.getElementById("account-address-list").hidden = false;
    if (toggleButton) {
      toggleButton.textContent = "Add address";
    }
    setAddressStatus("", false);
    return;
  }
  if (event.target.closest("#checkout-use-saved-address")) {
    if (!currentAuthUser) {
      setPaymentStatus("Sign in to use your saved delivery address.", true);
      return;
    }
    loadAccountAddresses().then(function () {
      if (addressLoadedFor !== currentAuthUser?.uid) {
        setPaymentStatus("Could not load saved addresses. Open Manage Addresses and try again.", true);
        return;
      }
      const selectedId = document.getElementById("checkout-saved-address-select")?.value;
      const selectedAddress = savedAccountAddresses.find(function (address) {
        return address.id === selectedId;
      });
      if (selectedAddress) {
        populateCheckoutAddress(selectedAddress, false);
        setPaymentStatus("Saved delivery address added.", false);
      } else {
        setPaymentStatus("No saved address found. Add one in Manage Addresses.", true);
      }
    }).catch(function (error) {
      setPaymentStatus(error.message || "Your saved address couldn’t be loaded.", true);
    });
    return;
  }
  if (event.target.closest("#account-phone-send-code")) {
    sendProfilePhoneCode();
    return;
  }
  if (event.target.closest("#account-phone-confirm")) {
    confirmProfilePhoneCode();
    return;
  }

  const authModeButton = event.target.closest("[data-auth-mode]");
  if (authModeButton) {
    setAuthMode(authModeButton.dataset.authMode);
    return;
  }
  const authSubmitButton = event.target.closest(
    "#account-login-form button[type='submit'], #account-signup-form button[type='submit']"
  );
  if (authSubmitButton) {
    const form = authSubmitButton.closest("form");
    if (form && !form.checkValidity()) {
      setAuthStatus("Please complete all required fields with valid information.", true);
      form.reportValidity();
    }
    return;
  }
  if (event.target.closest("#account-signout")) {
    if (!firebaseAuth) {
      setAuthStatus("Firebase Authentication isn’t configured.", true);
      return;
    }
    firebaseAuth.signOut().catch(function (error) {
      console.error("Firebase sign-out failed.", error);
      setAuthStatus("We couldn’t sign you out. Please try again.", true);
    });
    return;
  }
  if (event.target.closest("#account-open")) {
    if (currentAuthUser) {
      const menu = document.getElementById("account-menu");
      if (menu) {
        menu.hidden = !menu.hidden;
        event.target.closest("#account-open").setAttribute("aria-expanded", String(!menu.hidden));
      }
    } else {
      document.getElementById("account-dialog")?.showModal();
    }
    return;
  }
  if (event.target.closest("#account-close")) {
    pendingCartReturn = null;
    document.getElementById("account-dialog")?.close();
    return;
  }
  if (event.target.closest("#account-login")) {
    document.getElementById("account-dialog")?.close();
    setAuthMode("login");
    window.history.pushState(null, "", "#account");
    renderRoute();
    return;
  }

  const wishlistButton = event.target.closest("[data-cart-wishlist]");
  if (wishlistButton) {
    const productIndex = Number(wishlistButton.dataset.cartWishlist);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not add an unknown product to the wishlist.");
      return;
    }
    toggleCartWishlistProduct(productIndex);
    return;
  }

});
document.addEventListener("input", function (event) {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.matches("#account-profile-email, #account-profile-phone")
  ) {
    updateProfileChangeControls();
  } else if (
    event.target instanceof HTMLInputElement &&
    event.target.matches("#account-address-postal-code, #account-address-country")
  ) {
    scheduleAddressPinLookup();
  }
});
document.addEventListener("change", function (event) {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.id === "account-profile-photo-input"
  ) {
    uploadAccountProfilePhoto(event.target.files?.[0]);
  } else if (
    event.target instanceof HTMLSelectElement &&
    event.target.id === "account-wishlist-sort"
  ) {
    wishlistSortOrder = event.target.value;
    renderAccountWishlist();
  }
});
document.getElementById("account-dialog")?.addEventListener("cancel", function () {
  pendingCartReturn = null;
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const menu = document.getElementById("account-menu");
    const accountButton = document.getElementById("account-open");
    if (menu && !menu.hidden) {
      menu.hidden = true;
      accountButton?.setAttribute("aria-expanded", "false");
      accountButton?.focus();
    }
  }
});

document.addEventListener("submit", function (event) {
  if (!(event.target instanceof HTMLFormElement)) {
    return;
  }
  if (event.target.id === "account-login-form") {
    submitAccountLogin(event);
  } else if (event.target.id === "account-signup-form") {
    submitAccountSignup(event);
  } else if (event.target.id === "account-profile-form") {
    submitAccountProfile(event);
  } else if (event.target.id === "account-password-form") {
    submitAccountPasswordChange(event);
  } else if (event.target.id === "account-address-form") {
    saveAccountAddress(event);
  }
});
