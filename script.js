
/*
  yarnity_nest — Storefront script

  To set up later:
  1. Set the contact email and WhatsApp number in STORE.
  2. Edit the PRODUCTS list with real product names and prices.
  3. Add photos in your images folder and set each product's image path.

  WhatsApp number format: country code + number, digits only.
  Example for India: 919876543210
*/

const STORE = {
  brandName: "yarnity_nest",
  whatsappNumber: "918726064563",
  orderWhatsappNumber: "918726064563",
  instagramUrl: "https://www.instagram.com/yarnity_nest/"
};

let imagePreviewScrollPosition = 0;
let cartItems = [];
let cartToastTimer;
let pendingConfirmation = null;
let pendingCartReturn = null;
let currentAuthUser = null;
let authSetupMessage = "";
let authStateResolved = false;
let profileEditing = false;
let currentAccountSection = "profile";
let accountOrdersLoadedFor = "";
let accountOrdersLoading = false;
let savedAccountAddresses = [];
let addressLoadedFor = "";
let addressLoadingFor = "";
let addressLoadPromise = null;
let addressEditingId = "";
let phoneVerificationId = "";
let phoneRecaptchaVerifier = null;
let firebaseAuth = initializeFirebaseAuth();

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
      updateAccountPage();
    };
    const handleAuthError = function (error) {
      authStateResolved = true;
      currentAuthUser = auth.currentUser;
      updateAccountPage();
      console.error("Firebase Authentication state listener failed.", error);
      setAuthStatus("We couldn’t check your sign-in status. Please refresh and try again.", true);
    };

    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const pageReloaded = navigationEntry?.type === "reload";
    auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      .catch(function (error) {
        console.error("Firebase could not enable persistent sign-in.", error);
        authSetupMessage = "Your sign-in may not stay active after refreshing. Check your browser’s storage settings.";
      })
      .then(function () {
        if (pageReloaded) {
          window.history.replaceState(null, "", "#home");
          return auth.signOut().catch(function (error) {
            console.error("Could not sign out after refreshing the profile page.", error);
            authStateResolved = true;
            currentAuthUser = auth.currentUser;
            updateAccountPage();
            setAuthStatus("Could not sign out after refreshing your profile. Please try again.", true);
          });
        }
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
  const accountCard = document.querySelector(".account-auth-card");
  const accountPage = document.querySelector('[data-route-view="account"]');
  const headerAccountName = document.getElementById("header-account-name");
  const headerAccount = document.getElementById("account-open");
  if (!currentAuthUser) {
    savedAccountAddresses = [];
    addressLoadedFor = "";
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
    const accountMenu = document.getElementById("account-menu");
    if (accountMenu) {
      accountMenu.hidden = true;
    }
    headerAccount?.setAttribute("aria-expanded", "false");
  }
  if (headerAccountName && headerAccount) {
    const emailName = currentAuthUser?.email?.split("@")[0];
    const displayName = currentAuthUser?.displayName || emailName || "Account";
    const firstName = displayName.trim().split(/\s+/)[0] || "Account";
    headerAccountName.textContent = firstName;
    headerAccount.setAttribute("aria-label", currentAuthUser ? `Account: ${displayName}` : "Account");
  }

  const forms = document.getElementById("account-auth-forms");
  const signedIn = document.getElementById("account-authenticated");
  const firstNameInput = document.getElementById("account-profile-first-name");
  const lastNameInput = document.getElementById("account-profile-last-name");
  const emailInput = document.getElementById("account-profile-email");
  const phoneInput = document.getElementById("account-profile-phone");
  const sidebarName = document.getElementById("account-sidebar-name");
  const avatar = document.getElementById("account-avatar");
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
    if (sidebarName) {
      sidebarName.textContent = fullName;
    }
    if (avatar) {
      avatar.textContent = fullName.charAt(0).toUpperCase();
    }
    if (heading) {
      heading.textContent = `Hello${displayName ? `, ${displayName}` : ""}!`;
    }
    if (intro) {
      intro.textContent = "You’re signed in to your account.";
    }
    if (addressLoadedFor !== currentAuthUser.uid) {
      savedAccountAddresses = [];
      renderAccountAddresses();
      loadAccountAddresses();
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
  document.querySelectorAll("[data-account-section]").forEach(function (button) {
    const isSelected = button.dataset.accountSection === section;
    button.classList.toggle("is-selected", isSelected);
    if (isSelected) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  if (section === "addresses") {
    if (currentAuthUser) {
      loadAccountAddresses();
    }
  }
  if (section === "orders" && currentAuthUser) {
    loadAccountOrders();
  }
}

function getAccountFirestore() {
  if (!window.firebase || typeof window.firebase.firestore !== "function" || !window.firebase.apps.length) {
    throw new Error("Firebase Firestore could not load. Refresh the page and try again.");
  }
  return window.firebase.firestore();
}

function setAddressStatus(message, isError) {
  const status = document.getElementById("account-addresses-status");
  if (status) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }
}

function normalizeAddress(address) {
  return {
    label: typeof address.label === "string" ? address.label : "Address",
    addressLine1: typeof address.addressLine1 === "string" ? address.addressLine1 : "",
    addressLine2: typeof address.addressLine2 === "string" ? address.addressLine2 : "",
    city: typeof address.city === "string" ? address.city : "",
    state: typeof address.state === "string" ? address.state : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode : "",
    country: typeof address.country === "string" ? address.country : "India",
    isDefault: address.isDefault === true
  };
}

function setAddressFormValues(form, address) {
  const values = address || {};
  ["label", "addressLine1", "addressLine2", "city", "state", "postalCode", "country"]
    .forEach(function (name) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement) {
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
  setAddressStatus("", false);
  form?.querySelector("input")?.focus();
}

function populateCheckoutAddress(address, onlyEmpty) {
  const form = document.getElementById("checkout-contact-form");
  if (!form || !address) {
    return;
  }
  const values = normalizeAddress(address);
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
  if (!savedAccountAddresses.length) {
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
    if (!forceRefresh) {
      return activeLoad;
    }
    await activeLoad;
    if (currentAuthUser?.uid !== user.uid) {
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
  setAddressStatus("Loading your saved addresses…", false);
  addressLoadPromise = (async function () {
    try {
      const collection = getAccountFirestore()
        .collection("users")
        .doc(user.uid)
        .collection("addresses");
      const snapshot = await collection.get();
      if (currentAuthUser?.uid !== user.uid) {
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
      if (currentAuthUser?.uid === user.uid) {
        setAddressStatus(error.message || "Your saved address couldn’t be loaded.", true);
      }
    } finally {
      if (addressLoadingFor === user.uid) {
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
  if (!user || !form || !form.reportValidity()) {
    return;
  }
  const formData = new FormData(form);
  const address = normalizeAddress({
    label: String(formData.get("label") || "").trim(),
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
  try {
    const addresses = getAccountFirestore()
      .collection("users")
      .doc(user.uid)
      .collection("addresses");
    const batch = getAccountFirestore().batch();
    if (address.isDefault) {
      savedAccountAddresses.forEach(function (savedAddress) {
        if (savedAddress.id !== addressEditingId && savedAddress.isDefault) {
          batch.set(addresses.doc(savedAddress.id), {
            label: savedAddress.label,
            addressLine1: savedAddress.addressLine1,
            addressLine2: savedAddress.addressLine2,
            city: savedAddress.city,
            state: savedAddress.state,
            postalCode: savedAddress.postalCode,
            country: savedAddress.country,
            isDefault: false,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      });
    }
    const addressRef = addressEditingId
      ? addresses.doc(addressEditingId)
      : addresses.doc();
    batch.set(addressRef, {
      ...address,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();
    if (currentAuthUser?.uid !== user.uid) {
      return;
    }
    addressLoadedFor = "";
    await loadAccountAddresses(true);
    const savedAddress = savedAccountAddresses.find(function (item) {
      return item.id === addressRef.id;
    });
    if (savedAddress && currentRoute === "payment") {
      populateCheckoutAddress(savedAddress, true);
    }
    form.reset();
    setAddressEditor(null);
    const addressList = document.getElementById("account-address-list");
    if (addressList) {
      addressList.hidden = false;
    }
    setAddressStatus("Your delivery address has been saved.", false);
  } catch (error) {
    console.error("Could not save delivery address.", error);
    setAddressStatus(error.message || "Your delivery address couldn’t be saved.", true);
  } finally {
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
        { size: "normal" }
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
    "auth/requires-recent-login": "For security, sign out and sign in again before changing this account detail.",
    "auth/too-many-requests": "Too many attempts. Wait a little while, then try again."
  };
  return messages[error.code] || "We couldn’t save your profile to Firebase. Check your connection and try again.";
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

const CATEGORIES = [
  {
    name: "Flowers",
    emoji: "🌸",
    description: "Cheerful crochet blooms that never wilt.",
    bg: "#f7dfe5",
    accent: "#d94e7c"
  },
  {
    name: "Plushies",
    emoji: "🧸",
    description: "Tiny soft friends, stitched one loop at a time.",
    bg: "#fff0bd",
    accent: "#b78338"
  },
  {
    name: "Gifts",
    emoji: "🎁",
    description: "Small handmade pieces for people you love.",
    bg: "#dfe8d8",
    accent: "#71816a"
  },
  {
    name: "Keychains",
    emoji: "🔑",
    description: "Pocket-sized crochet that clips on anywhere.",
    bg: "#dce9f2",
    accent: "#6b8fa8"
  },
  {
    name: "Bags",
    emoji: "👜",
    description: "Everyday bags with a handmade texture.",
    bg: "#f7dfe5",
    accent: "#b56f69"
  },
  {
    name: "Bag charms",
    emoji: "🍒",
    description: "Cute charms to dress up any bag.",
    bg: "#fff0bd",
    accent: "#b78338"
  },
  {
    name: "Tea Coasters",
    emoji: "☕",
    description: "Cozy touches for your cup and table.",
    bg: "#dfe8d8",
    accent: "#71816a"
  },
  {
    name: "Hair Accessories",
    emoji: "🎀",
    description: "Scrunchies, clips and bows made by hand.",
    bg: "#dce9f2",
    accent: "#6b8fa8"
  }
];

function categoryRoute(categoryName) {
  return categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Five editable placeholders for each category.
const PRODUCTS = [
  // GIFTS — 5 placeholders
  {
    name: "Gift idea 1",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "🎁",
    tag: "Gifts",
    category: "Gifts",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Gift idea 2",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "♡",
    tag: "Gifts",
    category: "Gifts",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Gift idea 3",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "✿",
    tag: "Gifts",
    category: "Gifts",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },
  {
    name: "Gift idea 4",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "❋",
    tag: "Gifts",
    category: "Gifts",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Gift idea 5",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "☆",
    tag: "Gifts",
    category: "Gifts",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },

  // BAGS — 5 placeholders
  {
    name: "Crochet bag 1",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "▱",
    tag: "Bags",
    category: "Bags",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Crochet bag 2",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "👜",
    tag: "Bags",
    category: "Bags",
    bg: "#e9d8cb",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Crochet bag 3",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "♡",
    tag: "Bags",
    category: "Bags",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Crochet bag 4",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "✿",
    tag: "Bags",
    category: "Bags",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Crochet bag 5",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "❋",
    tag: "Bags",
    category: "Bags",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },

  // BAG CHARMS & KEYCHAINS — 5 placeholders
  {
    name: "Bag charm / keychain 1",
    price: "₹300",
    description: "Add a short description for this little accessory.",
    emoji: "♡",
    tag: "Bag charms & keychains",
    category: "Bag charms",
    bg: "#e6ddec",
    accent: "#92749e",
    image: "images/KeyRing1.jpeg"
  },
  {
    name: "Bag charm / keychain 2",
    price: "₹350",
    description: "Add a short description for this little accessory.",
    emoji: "✿",
    tag: "Bag charms & keychains",
    category: "Bag charms",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: "images/Key_Ring2.jpeg"
  },
  {
    name: "Bag charm / keychain 3",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "☆",
    tag: "Bag charms & keychains",
    category: "Bag charms",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Bag charm / keychain 4",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "❋",
    tag: "Bag charms & keychains",
    category: "Bag charms",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Bag charm / keychain 5",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "☁",
    tag: "Bag charms & keychains",
    category: "Bag charms",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },

  // TEA COASTERS — 5 placeholders
  {
    name: "Tea coaster 1",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "❋",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#dce3d5",
    accent: "#71816a",
    image: "images/Tea_Coaster1.jpeg"
  },
  {
    name: "Tea coaster 2",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "✿",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Tea coaster 3",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "☼",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Tea coaster 4",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "♡",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },
  {
    name: "Tea coaster 5",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "❀",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#e9d8cb",
    accent: "#a9814f",
    image: ""
  },

  // HAIR ACCESSORIES — 5 placeholders
  {
    name: "Hair accessory 1",
    price: "₹250",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "✿",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: "images/HairItems1.jpeg"
  },
  {
    name: "Hair accessory 2",
    price: "₹200",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "❀",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#e6ddec",
    accent: "#92749e",
    image: "images/HairItems2.jpeg"
  },
  {
    name: "Hair accessory 3",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "♡",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Hair accessory 4",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "☆",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Hair accessory 5",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "❋",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  }
];

["Flowers", "Plushies", "Keychains"].forEach(function (categoryName) {
  const category = CATEGORIES.find(function (item) {
    return item.name === categoryName;
  });

  for (let index = 1; index <= 5; index += 1) {
    PRODUCTS.push({
      name: `${categoryName} idea ${index}`,
      price: "Add price",
      description: `Add a short description for this handmade ${categoryName.toLowerCase()}.`,
      emoji: category.emoji,
      tag: categoryName,
      category: categoryName,
      bg: category.bg,
      accent: category.accent,
      image: ""
    });
  }
});

PRODUCTS.forEach(function (product) {
  if (product.price === "Add price") {
    product.price = "₹400";
  }
});

function whatsappUrl(message, whatsappNumber) {
  const number = whatsappNumber.replace(/\D/g, "");

  if (!number) {
    return "";
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function setupLink(element, message, whatsappNumber) {
  const href = whatsappUrl(message, whatsappNumber || STORE.whatsappNumber);

  if (href) {
    element.href = href;
    element.target = "_blank";
    element.rel = "noreferrer";
  } else {
    element.href = "#shop";
    element.title =
      "Add your WhatsApp number in script.js to enable WhatsApp ordering";

    element.addEventListener("click", function (event) {
      event.preventDefault();
      alert(
        "WhatsApp ordering isn't connected yet. Add your number in script.js when you're ready."
      );
    });
  }
}

function updateBrand() {
  document.title = `${STORE.brandName} | Handmade Crochet`;

  [
    "brand-name",
    "footer-brand-name",
    "copyright-name"
  ].forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = STORE.brandName;
    }
  });

  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  const instagramLink = document.getElementById("instagram-link");

  if (instagramLink) {
    instagramLink.href = STORE.instagramUrl;
  }

  const generalMessage =
    `Hi ${STORE.brandName}! I'd like to know more about your crochet products.`;

  document.querySelectorAll(".order-whatsapp").forEach(function (link) {
    setupLink(link, generalMessage, STORE.orderWhatsappNumber);
  });

  [
    "story-whatsapp",
    "footer-whatsapp"
  ].forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      setupLink(element, generalMessage);
    }
  });
}

function renderCategories() {
  const grid = document.getElementById("category-grid");

  if (!grid) {
    return;
  }

  grid.innerHTML = CATEGORIES.map(function (category, index) {
    const activeClass = index === 0 ? " is-active" : "";
    const pressed = index === 0 ? "true" : "false";

    return `
      <button
        class="category-card${activeClass}"
        type="button"
        data-category="${category.name}"
        aria-pressed="${pressed}"
      >
        <span
          class="category-art"
          style="--category-bg:${category.bg};--category-accent:${category.accent}"
        >${category.emoji}</span>

        <span class="category-card-copy">
          <strong>${category.name}</strong>
          <small>${category.description}</small>
        </span>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".category-card").forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedCategory = button.dataset.category;
      const route = categoryRoute(selectedCategory);

      if (window.location.hash.slice(1) !== route) {
        window.history.pushState(null, "", `#${route}`);
      }

      renderRoute();
    });
  });
}

function renderCategoryTabs() {
  const tabs = document.getElementById("category-tabs");

  if (!tabs) {
    return;
  }

  tabs.innerHTML = CATEGORIES.map(function (category) {
    const route = categoryRoute(category.name);

    return `<a href="#${route}" data-route-link="${route}">${category.name}</a>`;
  }).join("");
}

function renderCart() {
  const count = cartItems.reduce(function (total, item) {
    return total + item.quantity;
  }, 0);
  const cartTotal = cartItems.reduce(function (total, item) {
    return total + getPriceAmount(PRODUCTS[item.productIndex]) * item.quantity;
  }, 0);
  const countElement = document.getElementById("cart-count");
  const cartButton = document.getElementById("cart-open");
  const itemsContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");
  const proceedButton = document.getElementById("cart-proceed-payment");
  const paymentButton = document.getElementById("razorpay-checkout-button");

  if (totalElement) {
    totalElement.textContent = formatRupees(cartTotal);
  }
  updatePaymentPage(cartTotal);
  if (countElement) {
    countElement.textContent = String(count);
  }
  if (cartButton) {
    cartButton.setAttribute(
      "aria-label",
      `Open cart, ${count} ${count === 1 ? "item" : "items"}`
    );
  }
  if (proceedButton) {
    proceedButton.disabled = count === 0;
  }
  if (paymentButton) {
    paymentButton.disabled = count === 0;
  }
  if (!itemsContainer) {
    return;
  }

  if (cartItems.length === 0) {
    itemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  itemsContainer.innerHTML = cartItems.map(function (item) {
    const product = PRODUCTS[item.productIndex];
    return `
      <article class="cart-item">
        <div class="cart-item-info">
          <h3>${product.name}</h3>
          <p class="cart-item-meta">${product.category} · Quantity: ${item.quantity}</p>
          <p class="cart-unit-price">Unit price: <strong>${product.price}</strong></p>
        </div>
        <div class="cart-item-side">
          <strong class="cart-item-total">${formatRupees(
            getPriceAmount(product) * item.quantity
          )}</strong>
          <button class="cart-remove" type="button" data-cart-remove="${item.productIndex}">Remove</button>
        </div>
      </article>
    `;
  }).join("");
}

function getPriceAmount(product) {
  return Number(product.price.replace(/[^\d]/g, ""));
}

function formatRupees(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getCartTotal() {
  return cartItems.reduce(function (total, item) {
    return total + getPriceAmount(PRODUCTS[item.productIndex]) * item.quantity;
  }, 0);
}

function updatePaymentPage(total) {
  const amount = total === undefined ? getCartTotal() : total;
  const amountElement = document.getElementById("payment-total");
  const orderItemsElement = document.getElementById("payment-order-items");
  const itemsTotalElement = document.getElementById("payment-items-total");
  const orderTotalElement = document.getElementById("payment-order-total");
  const emptyNotice = document.getElementById("payment-empty-message");

  if (amountElement) {
    amountElement.textContent = formatRupees(amount);
  }
  if (itemsTotalElement) {
    itemsTotalElement.textContent = formatRupees(amount);
  }
  if (orderTotalElement) {
    orderTotalElement.textContent = formatRupees(amount);
  }
  if (orderItemsElement) {
    if (cartItems.length === 0) {
      orderItemsElement.innerHTML = '<p class="payment-order-empty">Your cart is empty.</p>';
    } else {
      orderItemsElement.innerHTML = cartItems.map(function (item) {
        const product = PRODUCTS[item.productIndex];
        const imageMarkup = product.image
          ? `<img src="${product.image}" alt="">`
          : `<span aria-hidden="true">${product.emoji || "✿"}</span>`;

        return `
          <article class="payment-order-item">
            <div class="payment-order-product-art">${imageMarkup}</div>
            <div class="payment-order-product-info">
              <strong>${product.name}</strong>
              <span>${product.category} · Quantity: ${item.quantity}</span>
            </div>
            <strong class="payment-order-item-price">${formatRupees(
              getPriceAmount(product) * item.quantity
            )}</strong>
          </article>
        `;
      }).join("");
    }
  }
  if (emptyNotice) {
    emptyNotice.hidden = amount > 0;
  }
}

const PAYMENT_API_BASE = (
  window.YARNITY_PAYMENT_CONFIG &&
  window.YARNITY_PAYMENT_CONFIG.functionsBaseUrl
    ? window.YARNITY_PAYMENT_CONFIG.functionsBaseUrl
    : ""
).replace(/\/+$/, "");

async function callPaymentFunction(name, payload, forceRefreshToken) {
  if (!PAYMENT_API_BASE || PAYMENT_API_BASE.includes("YOUR_FIREBASE_PROJECT_ID")) {
    throw new Error("Online payment is not configured yet. Please contact the shop.");
  }

  const headers = { "Content-Type": "application/json" };
  const user = currentAuthUser || firebaseAuth?.currentUser;
  if (user) {
    headers.Authorization = "Bearer " + await user.getIdToken(Boolean(forceRefreshToken));
  }
  let response;
  try {
    response = await fetch(`${PAYMENT_API_BASE}/${name}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
    if (name === "getUserOrders") {
      throw new Error(
        "Order history is unavailable: deploy the getUserOrders Firebase Function and add this website’s exact origin to PUBLIC_SITE_ORIGINS."
      );
    }
    throw new Error(
      "The Firebase Functions service could not be reached. Check the deployed function URL and allowed website origins."
    );
  }
  const result = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(result.error || "The payment request could not be completed.");
  }
  if (name === "createPaymentOrder" || name === "verifyPayment") {
    accountOrdersLoadedFor = "";
  }
  return result;
}

function setPaymentStatus(message, isError) {
  const status = document.getElementById("payment-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

async function startRazorpayCheckout(event) {
  event.preventDefault();
  const form = document.getElementById("checkout-contact-form");
  const button = document.getElementById("razorpay-checkout-button");
  if (!form || !button || !form.reportValidity()) {
    return;
  }
  if (cartItems.length === 0) {
    setPaymentStatus("Your cart is empty. Add a product before paying.", true);
    return;
  }
  if (typeof window.Razorpay !== "function") {
    setPaymentStatus("Razorpay Checkout could not be loaded. Check your connection and try again.", true);
    return;
  }

  const formData = new FormData(form);
  const customer = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: {
      label: document.getElementById("checkout-saved-address-select")?.selectedOptions[0]?.textContent
        ?.replace(/\s+\(Default\)$/, "") || "Delivery",
      addressLine1: String(formData.get("addressLine1") || "").trim(),
      addressLine2: String(formData.get("addressLine2") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      postalCode: String(formData.get("postalCode") || "").trim(),
      country: String(formData.get("country") || "").trim()
    },
    notificationConsent: formData.get("notificationConsent") === "on"
  };
  const orderPayload = {
    customer: customer,
    items: cartItems.map(function (item) {
      return { productIndex: item.productIndex, quantity: item.quantity };
    })
  };

  button.disabled = true;
  setPaymentStatus("Preparing your secure payment…", false);
  try {
    const order = await callPaymentFunction("createPaymentOrder", orderPayload);
    pendingConfirmation = {
      orderId: order.orderId,
      confirmationToken: order.confirmationToken
    };
    try {
      sessionStorage.setItem("yarnityPendingConfirmation", JSON.stringify(pendingConfirmation));
    } catch (storageError) {
      console.warn("Could not save confirmation details for page refresh.", storageError);
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: "INR",
      name: STORE.brandName,
      description: "Handmade crochet order",
      order_id: order.razorpayOrderId,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone
      },
      notes: { orderReference: order.orderId },
      theme: { color: "#ad315b" },
      handler: async function (paymentResponse) {
        pendingConfirmation.payment = {
          razorpayOrderId: paymentResponse.razorpay_order_id,
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpaySignature: paymentResponse.razorpay_signature
        };
        pendingConfirmation.paymentId = paymentResponse.razorpay_payment_id;
        try {
          sessionStorage.setItem(
            "yarnityPendingConfirmation",
            JSON.stringify(pendingConfirmation)
          );
        } catch (storageError) {
          console.warn("Could not save payment verification details.", storageError);
        }
        setPaymentStatus("Verifying your payment securely…", false);
        try {
          await callPaymentFunction("verifyPayment", {
            orderId: order.orderId,
            confirmationToken: order.confirmationToken,
            ...pendingConfirmation.payment
          });
          delete pendingConfirmation.payment;
          try {
            sessionStorage.setItem(
              "yarnityPendingConfirmation",
              JSON.stringify(pendingConfirmation)
            );
          } catch (storageError) {
            console.warn("Could not update saved confirmation details.", storageError);
          }
          cartItems = [];
          renderCart();
          window.location.hash = "confirmation";
        } catch (verificationError) {
          console.error("Razorpay payment verification failed.", verificationError);
          setPaymentStatus(
            `${verificationError.message} If money was deducted, contact the shop with your Razorpay payment ID.`,
            true
          );
          window.location.hash = "confirmation";
        }
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus("Payment was not completed. You can try again when ready.", false);
          button.disabled = false;
        }
      }
    });
    checkout.on("payment.failed", function (failure) {
      console.error("Razorpay reported a failed payment.", failure.error);
      setPaymentStatus(
        failure.error && failure.error.description
          ? failure.error.description
          : "Payment failed. Please try again.",
        true
      );
      button.disabled = false;
    });
    checkout.open();
  } catch (error) {
    console.error("Could not start Razorpay checkout.", error);
    setPaymentStatus(error.message, true);
    button.disabled = false;
  }
}

async function loadOrderConfirmation() {
  const status = document.getElementById("confirmation-status");
  const details = document.getElementById("confirmation-details");
  const retryButton = document.getElementById("confirmation-retry");
  if (!status || !details) {
    return;
  }

  let confirmation = pendingConfirmation;
  if (!confirmation) {
    try {
      confirmation = JSON.parse(
        sessionStorage.getItem("yarnityPendingConfirmation") || "null"
      );
    } catch (storageError) {
      console.warn("Could not load saved confirmation details.", storageError);
    }
  }
  if (!confirmation) {
    document.getElementById("confirmation-eyebrow").textContent = "PAYMENT STATUS";
    document.getElementById("confirmation-heading").textContent = "Payment not verified";
    status.textContent = "We couldn’t find a payment to confirm. If you completed payment, please contact the shop.";
    return;
  }

  status.textContent = "Checking your verified payment…";
  if (retryButton) {
    retryButton.hidden = true;
  }
  try {
    if (confirmation.payment) {
      confirmation.paymentId = confirmation.payment.razorpayPaymentId;
      await callPaymentFunction("verifyPayment", {
        orderId: confirmation.orderId,
        confirmationToken: confirmation.confirmationToken,
        ...confirmation.payment
      });
      delete confirmation.payment;
      pendingConfirmation = confirmation;
      try {
        sessionStorage.setItem(
          "yarnityPendingConfirmation",
          JSON.stringify(confirmation)
        );
      } catch (storageError) {
        console.warn("Could not update saved confirmation details.", storageError);
      }
    }
    const result = await callPaymentFunction("getPaymentConfirmation", confirmation);
    document.getElementById("confirmation-order-id").textContent = result.orderId;
    document.getElementById("confirmation-payment-id").textContent = result.paymentId;
    document.getElementById("confirmation-total").textContent =
      formatRupees(result.totalPaise / 100);
    document.getElementById("confirmation-customer-email").textContent =
      result.customer.email;
    const items = document.getElementById("confirmation-items");
    items.replaceChildren();
    result.items.forEach(function (item) {
      const row = document.createElement("p");
      row.textContent = `${item.name} × ${item.quantity} — ${formatRupees(
        item.lineTotalPaise / 100
      )}`;
      items.appendChild(row);
    });
    details.hidden = false;
    document.getElementById("confirmation-eyebrow").textContent = "PAYMENT CONFIRMED";
    document.getElementById("confirmation-heading").textContent = "Thank you for your order!";
    status.textContent = "Your payment is confirmed. We’re sending your confirmation to your email and WhatsApp.";
  } catch (error) {
    console.error("Could not load verified order confirmation.", error);
    document.getElementById("confirmation-heading").textContent = "Payment status not confirmed";
    status.textContent = confirmation.paymentId
      ? `${error.message} If money was deducted, contact the shop with payment ID ${confirmation.paymentId}.`
      : error.message;
    if (retryButton) {
      retryButton.hidden = false;
    }
  }
}

function showCartToast(message) {
  const toast = document.getElementById("cart-toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(cartToastTimer);
  cartToastTimer = window.setTimeout(function () {
    toast.classList.remove("is-visible");
  }, 2400);
}

function renderProducts(category) {
  const grid = document.getElementById("product-grid");

  if (!grid) {
    return;
  }

  const selectedCategory = category || "Gifts";

  const filteredProducts = PRODUCTS.filter(function (product) {
    return product.category === selectedCategory;
  });

  grid.innerHTML = filteredProducts.map(function (product) {
    const media = product.image
      ? `<button class="product-photo-trigger" type="button" data-image="${product.image}" data-image-alt="${product.name}" aria-label="View larger image: ${product.name}"><img src="${product.image}" alt="" loading="lazy"></button>`
      : `<span class="product-placeholder" aria-hidden="true">${product.emoji || "✿"}</span>`;

    return `
      <article class="product-card">
        <div
          class="product-image"
          style="--product-bg:${product.bg || "#f1e5d8"};--product-accent:${product.accent || "#a66e60"}"
        >
          ${media}
          <span class="product-tag">${product.tag}</span>
        </div>

        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="product-description">${product.description}</p>

          <div class="product-bottom">
            ${product.image ? `<span class="price">${product.price}</span>` : ""}
            <div class="product-contact-links">
              <button class="product-add-to-cart" type="button" data-cart-add="${PRODUCTS.indexOf(product)}">Add to cart</button>
              <a class="order-link product-order-whatsapp" href="#" target="_blank" rel="noreferrer">Ask about this ↗</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".product-contact-links").forEach(function (links, index) {
    const product = filteredProducts[index];
    const priceDetails = product.image ? ` (${product.price})` : "";
    const message =
      `Hi ${STORE.brandName}! I'm interested in "${product.name}"${priceDetails}. Is it available?`;

    setupLink(links.querySelector(".product-order-whatsapp"), message);
  });

  grid.querySelectorAll(".product-photo-trigger").forEach(function (button) {
    button.addEventListener("click", function () {
      const dialog = document.getElementById("image-preview");
      const photo = document.getElementById("image-preview-photo");
      const caption = document.getElementById("image-preview-caption");

      if (!dialog || !photo || !caption) {
        return;
      }

      photo.src = button.dataset.image;
      photo.alt = button.dataset.imageAlt || "";
      caption.textContent = photo.alt;
      imagePreviewScrollPosition = window.scrollY;
      dialog.showModal();
    });
  });
}

const imagePreview = document.getElementById("image-preview");

imagePreview?.addEventListener("click", function (event) {
  if (event.target === this) {
    this.close();
  }
});

imagePreview?.addEventListener("close", function () {
  window.scrollTo({ top: imagePreviewScrollPosition, behavior: "instant" });
});

document.querySelector(".image-preview-close")?.addEventListener("click", function () {
  imagePreview?.close();
});

document.querySelectorAll(".favorite-toggle").forEach(function (button) {
  button.addEventListener("click", function () {
    const isFavorite = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(isFavorite));
    button.textContent = isFavorite ? "♥" : "♡";
    button.setAttribute(
      "aria-label",
      `${isFavorite ? "Remove" : "Add"} ${button.dataset.favoriteName} ${isFavorite ? "from" : "to"} favourites`
    );
  });
});

const appRoutes = ["home", "shop", "about", "order", "payment", "confirmation", "account"];
let currentRoute = "";
let currentSelectedCategory = "Flowers";

function routeFromHash() {
  const route = window.location.hash.slice(1);
  const isCategoryRoute = CATEGORIES.some(function (category) {
    return categoryRoute(category.name) === route;
  });

  return appRoutes.includes(route) || isCategoryRoute ? route : "home";
}

function renderRoute() {
  const route = routeFromHash();
  const routeChanged = route !== currentRoute;
  const routeCategory = CATEGORIES.find(function (category) {
    return categoryRoute(category.name) === route;
  });
  const selectedCategory = routeCategory
    ? routeCategory.name
    : currentSelectedCategory;
  const viewRoute = routeCategory ? "shop" : route;
  currentRoute = route;

  const shopView = document.querySelector(".shop");
  if (shopView) {
    shopView.classList.toggle("is-category-view", Boolean(routeCategory));
  }

  const categoryGrid = document.getElementById("category-grid");
  if (categoryGrid) {
    categoryGrid.hidden = Boolean(routeCategory);
  }

  const categoryViewHeading = document.getElementById("category-view-heading");
  const productNotice = document.getElementById("product-notice");
  const categoryTabs = document.getElementById("category-tabs");
  const productHeading = document.querySelector(".product-heading");
  const selectedCategoryTitle = document.getElementById("selected-category-title");
  const productGrid = document.getElementById("product-grid");
  if (categoryViewHeading) {
    categoryViewHeading.hidden = !routeCategory;
  }
  if (productNotice) {
    productNotice.hidden = !routeCategory;
  }
  if (categoryTabs) {
    categoryTabs.hidden = !routeCategory;
  }
  if (productHeading) {
    productHeading.hidden = !routeCategory;
  }
  if (productGrid) {
    productGrid.hidden = !routeCategory;
  }
  if (selectedCategoryTitle) {
    selectedCategoryTitle.textContent = selectedCategory;
  }

  document.querySelectorAll("[data-route-view]").forEach(function (view) {
    view.hidden = view.dataset.routeView !== viewRoute;
  });

  document.querySelectorAll("[data-route-link]").forEach(function (link) {
    const isActive = link.dataset.routeLink === (routeCategory ? "shop" : route);
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (routeCategory) {
    currentSelectedCategory = selectedCategory;
    const categoryName = document.getElementById("category-view-name");
    const breadcrumbName = document.getElementById("category-breadcrumb-name");
    const categoryEmoji = document.getElementById("category-view-emoji");
    const categoryDescription = document.getElementById("category-view-description");

    if (categoryName) {
      categoryName.textContent = selectedCategory;
    }
    if (breadcrumbName) {
      breadcrumbName.textContent = selectedCategory;
    }
    if (categoryEmoji) {
      categoryEmoji.textContent = routeCategory.emoji;
    }
    if (categoryDescription) {
      categoryDescription.textContent = routeCategory.description;
    }

    document.querySelectorAll(".category-card").forEach(function (card) {
      const isActive = card.dataset.category === selectedCategory;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });

    document.querySelectorAll(".category-tabs a").forEach(function (tab) {
      if (tab.dataset.routeLink === route) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });

    if (routeChanged) {
      renderProducts(selectedCategory);
    }
  } else {
    document.querySelectorAll(".category-tabs a").forEach(function (tab) {
      tab.removeAttribute("aria-current");
    });
  }

  if (routeChanged) {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (route === "confirmation") {
      loadOrderConfirmation();
    }
    if (route === "account") {
      updateAccountPage();
    }
    if (route === "payment" && currentAuthUser) {
      loadAccountAddresses();
    }
  }
}

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest("#confirmation-retry")) {
    loadOrderConfirmation();
    return;
  }

  const link = event.target.closest("[data-route-link]");

  if (
    !link ||
    (!appRoutes.includes(link.dataset.routeLink) &&
      !CATEGORIES.some(function (category) {
        return categoryRoute(category.name) === link.dataset.routeLink;
      }))
  ) {
    return;
  }

  event.preventDefault();
  const route = link.dataset.routeLink;

  if (route !== currentRoute) {
    window.history.pushState(null, "", `#${route}`);
    renderRoute();
  }
});

window.addEventListener("popstate", renderRoute);
window.addEventListener("hashchange", renderRoute);
document.addEventListener("input", function (event) {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.matches("#account-profile-email, #account-profile-phone")
  ) {
    updateProfileChangeControls();
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
  if (event.target.id === "checkout-contact-form") {
    startRazorpayCheckout(event);
  } else if (event.target.id === "account-login-form") {
    submitAccountLogin(event);
  } else if (event.target.id === "account-signup-form") {
    submitAccountSignup(event);
  } else if (event.target.id === "account-profile-form") {
    submitAccountProfile(event);
  } else if (event.target.id === "account-address-form") {
    saveAccountAddress(event);
  }
});

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
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

    const route = action === "profile" || action === "orders" ? "account" : "home";
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
    if (action === "address") {
      setAccountSection("addresses");
    }
    if (action === "wishlist") {
      document.querySelector(".home-favorites")?.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  const accountSectionButton = event.target.closest("[data-account-section]");
  if (accountSectionButton) {
    setAccountSection(accountSectionButton.dataset.accountSection);
    return;
  }
  if (event.target.closest("#account-profile-edit")) {
    setProfileEditing(true);
    document.getElementById("account-profile-first-name")?.focus();
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
    document.getElementById("account-address-form").hidden = true;
    document.getElementById("account-address-list").hidden = false;
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

  const addButton = event.target.closest("[data-cart-add]");
  if (addButton) {
    const productIndex = Number(addButton.dataset.cartAdd);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not add an unknown product to the cart.");
      return;
    }

    const signedInUser = currentAuthUser || firebaseAuth?.currentUser;
    if (!signedInUser) {
      pendingCartReturn = { route: currentRoute, productIndex: productIndex };
      const accountMessage = document.getElementById("account-dialog-message");
      if (accountMessage) {
        accountMessage.textContent = "Please log in or create an account before adding items to your cart.";
      }
      document.getElementById("account-dialog")?.showModal();
      return;
    }

    const cartItem = cartItems.find(function (item) {
      return item.productIndex === productIndex;
    });
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      cartItems.push({ productIndex: productIndex, quantity: 1 });
    }
    renderCart();
    showCartToast(`${PRODUCTS[productIndex].name} added to cart.`);
    return;
  }

  const removeButton = event.target.closest("[data-cart-remove]");
  if (removeButton) {
    const productIndex = Number(removeButton.dataset.cartRemove);
    cartItems = cartItems.filter(function (item) {
      return item.productIndex !== productIndex;
    });
    renderCart();
    return;
  }

  if (event.target.closest("#cart-open")) {
    document.getElementById("cart-dialog")?.showModal();
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
  if (event.target.closest("#cart-close")) {
    document.getElementById("cart-dialog")?.close();
    return;
  }
  if (event.target.closest("#cart-proceed-payment")) {
    if (cartItems.length === 0) {
      showCartToast("Add a product to your cart before proceeding to payment.");
      return;
    }

    document.getElementById("cart-dialog")?.close();
    window.history.pushState(null, "", "#payment");
    renderRoute();
    return;
  }

  const link = event.target.closest(".order-start-link, .order-how-it-works");
  if (!link) {
    return;
  }

  event.preventDefault();
  if (currentRoute !== "order") {
    window.history.pushState(null, "", "#order");
    renderRoute();
  }
  const targetId = link.classList.contains("order-how-it-works")
    ? "how-it-works"
    : "start-an-order";
  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// Start the storefront.
updateBrand();
renderCategories();
renderCategoryTabs();
renderProducts("Flowers");
renderCart();
if (routeFromHash() === "home" && window.location.hash.slice(1) !== "home") {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#home`
  );
}
renderRoute();
