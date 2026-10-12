/* Daily Expense Tracker — Supabase-backed cloud persistence. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const keyFor = (date = new Date()) => {
    const d = new Date(date);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  };
  const pretty = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  };
  const today = keyFor();
  const emptyData = () => ({
    _settings: { totalMoney: 0 },
    _monthlyExpenses: { item: [], price: [] }
  });

  let data = emptyData();
  let selected = today;
  let currentUser = null;
  let loadedUserId = null;
  let saveTimer = null;
  let saveQueue = Promise.resolve();
  let supabaseClient = null;

  function normalize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Saved expense data has an invalid format.");
    const clean = {
      _settings: { totalMoney: Math.max(0, Number(raw._settings?.totalMoney ?? raw.totalMoney ?? 0) || 0) },
      _monthlyExpenses: { item: [], price: [] }
    };
    const monthly = raw._monthlyExpenses || {};
    (Array.isArray(monthly.item) ? monthly.item : []).forEach((name, index) => {
      const price = Number(monthly.price?.[index]);
      if (String(name).trim() && Number.isFinite(price) && price >= 0) {
        clean._monthlyExpenses.item.push(String(name).trim());
        clean._monthlyExpenses.price.push(price);
      }
    });
    for (const [key, value] of Object.entries(raw)) {
      if (key === "_settings" || key === "_monthlyExpenses" || key === "totalMoney" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== "object") continue;
      clean[key] = { item: [], price: [] };
      (Array.isArray(value.item) ? value.item : []).forEach((name, index) => {
        const price = Number(value.price?.[index]);
        if (String(name).trim() && Number.isFinite(price) && price >= 0) {
          clean[key].item.push(String(name).trim());
          clean[key].price.push(price);
        }
      });
    }
    return clean;
  }

  function status(message, isError = false) {
    const el = $("statusMessage");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "var(--red)" : "var(--muted)";
  }

  function authMessage(message, isError = false) {
    const el = $("authMessage");
    el.textContent = message;
    el.style.color = isError ? "var(--red)" : "var(--muted)";
  }

  function showAuth() {
    $("authPanel").hidden = false;
    $("container").hidden = true;
    $("signedInAs").textContent = "";
  }

  function showApp() {
    $("authPanel").hidden = true;
    $("container").hidden = false;
    $("signedInAs").textContent = currentUser?.email || "Signed in";
  }

  function monthlyTotal() {
    return (data._monthlyExpenses?.price || []).reduce((sum, price) => sum + (Number(price) || 0), 0);
  }
  function ensureDay(key) {
    if (!data[key]) data[key] = { item: [], price: [] };
    return data[key];
  }
  function dayTotal(key) {
    return (data[key]?.price || []).reduce((sum, price) => sum + (Number(price) || 0), 0);
  }
  function dateKeys() {
    return Object.keys(data).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
  }
  function spent() {
    return dateKeys().reduce((sum, key) => sum + dayTotal(key), 0) + monthlyTotal();
  }
  function remaining() {
    return Number(data._settings.totalMoney || 0) - spent();
  }
  function allowance() {
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
    return remaining() / Math.max(1, daysLeft);
  }

  function scheduleSave() {
    if (!currentUser) return;
    clearTimeout(saveTimer);
    status("Changes made — saving to your account…");
    saveTimer = setTimeout(() => { persistNow(); }, 500);
  }

  async function persistNow() {
    if (!currentUser || !supabaseClient) return false;
    clearTimeout(saveTimer);
    const userId = currentUser.id;
    const snapshot = JSON.parse(JSON.stringify(data));
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      const { error } = await supabaseClient
        .from("expense_data")
        .upsert({
          user_id: userId,
          data: snapshot,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      if (error) throw error;
    });
    try {
      await saveQueue;
      if (currentUser?.id === userId) status("All changes saved to the cloud.");
      return true;
    } catch (error) {
      if (currentUser?.id === userId) status("Cloud save failed: " + error.message + ". Check your connection and try again.", true);
      return false;
    }
  }

  async function loadCloudData(user) {
    status("Loading your expenses from the cloud…");
    try {
      const { data: row, error } = await supabaseClient
        .from("expense_data")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (currentUser?.id !== user.id) return;
      data = row?.data ? normalize(row.data) : emptyData();
      render();
      if (!row) {
        await persistNow();
      } else {
        status("Your cloud expenses are loaded.");
      }
    } catch (error) {
      status("Could not load cloud data: " + error.message + ". Check the table and Row Level Security policy.", true);
    }
  }

  async function handleSession(session) {
    const nextUser = session?.user || null;
    if (!nextUser) {
      currentUser = null;
      loadedUserId = null;
      clearTimeout(saveTimer);
      data = emptyData();
      showAuth();
      authMessage("Sign in to access your private expense data.");
      return;
    }
    currentUser = nextUser;
    showApp();
    if (loadedUserId === nextUser.id) return;
    loadedUserId = nextUser.id;
    data = emptyData();
    await loadCloudData(nextUser);
  }

  function renderMonthlyItems() {
    const box = $("monthlyItems");
    box.replaceChildren();
    const monthly = data._monthlyExpenses || { item: [], price: [] };
    if (!monthly.item.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No monthly expenses yet. Add things like haircut or clothing here.";
      box.append(empty);
    } else {
      monthly.item.forEach((name, index) => {
        const row = document.createElement("div");
        row.className = "right-item";
        const label = document.createElement("span");
        label.className = "right-item-name";
        label.textContent = name;
        const price = document.createElement("span");
        price.className = "right-item-price";
        price.textContent = money(monthly.price[index]) + " PKR";
        const remove = document.createElement("button");
        remove.className = "remove-item";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove monthly expense " + name);
        remove.addEventListener("click", () => {
          data._monthlyExpenses.item.splice(index, 1);
          data._monthlyExpenses.price.splice(index, 1);
          render();
          scheduleSave();
        });
        row.append(label, price, remove);
        box.append(row);
      });
    }
    $("monthlyTotal").textContent = money(monthlyTotal()) + " PKR";
  }

  function removeDayExpense(key, index) {
    const day = data[key];
    if (!day) return;
    day.item.splice(index, 1);
    day.price.splice(index, 1);
    render();
    scheduleSave();
  }

  function renderItems() {
    const box = $("rightItems");
    box.replaceChildren();
    const day = data[selected] || { item: [], price: [] };
    $("rightDateLabel").textContent = "Items for " + pretty(selected);
    if (!day.item.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No items for this date yet. Choose Add item to begin.";
      box.append(empty);
    } else {
      day.item.forEach((name, index) => {
        const row = document.createElement("div");
        row.className = "right-item";
        const label = document.createElement("span");
        label.className = "right-item-name";
        label.textContent = name;
        const price = document.createElement("span");
        price.className = "right-item-price";
        price.textContent = money(day.price[index]) + " PKR";
        const remove = document.createElement("button");
        remove.className = "remove-item";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + name);
        remove.addEventListener("click", () => removeDayExpense(selected, index));
        row.append(label, price, remove);
        box.append(row);
      });
    }
    $("selectedDayTotal").textContent = money(dayTotal(selected)) + " PKR";
  }

  function renderHistory() {
    const box = $("part3");
    box.replaceChildren();
    const allDates = dateKeys().sort((a, b) => b.localeCompare(a));
    $("dateCount").textContent = allDates.length + " day" + (allDates.length === 1 ? "" : "s");
    if (!allDates.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Your saved daily expenses will appear here.";
      box.append(empty);
      return;
    }
    allDates.forEach((key) => {
      const card = document.createElement("article");
      card.className = "history-day";
      const header = document.createElement("div");
      header.className = "history-day-header";
      const date = document.createElement("span");
      date.textContent = pretty(key);
      const total = document.createElement("strong");
      total.textContent = money(dayTotal(key)) + " PKR";
      header.append(date, total);
      card.append(header);
      const list = document.createElement("ul");
      list.className = "expense-list";
      data[key].item.forEach((name, index) => {
        const item = document.createElement("li");
        item.className = "expense-row";
        const label = document.createElement("span");
        label.textContent = name;
        const value = document.createElement("span");
        value.textContent = money(data[key].price[index]) + " PKR";
        const remove = document.createElement("button");
        remove.className = "remove-item";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + name + " on " + key);
        remove.addEventListener("click", () => removeDayExpense(key, index));
        item.append(label, value, remove);
        list.append(item);
      });
      card.append(list);
      const result = document.createElement("div");
      const difference = allowance() - dayTotal(key);
      result.className = "daily-result " + (difference >= 0 ? "good" : "bad");
      result.textContent = "Daily expense: " + money(dayTotal(key)) + " · Current daily allowance: " +
        money(allowance()) + " · " + (difference >= 0 ? "Under allowance by " : "Over allowance by ") + money(Math.abs(difference));
      card.append(result);
      box.append(card);
    });
  }

  function render() {
    $("totalMoney").textContent = money(data._settings.totalMoney);
    $("rem").textContent = money(remaining());
    $("allSpent").textContent = money(spent()) + " PKR";
    $("todaySpent").textContent = money(dayTotal(today)) + " PKR";
    $("perDay").textContent = money(allowance()) + " PKR";
    $("todayDateLabel").textContent = pretty(today);
    $("selectedDateLabel").textContent = pretty(selected);
    renderItems();
    renderMonthlyItems();
    renderHistory();
  }

  function addItem(event) {
    event.preventDefault();
    const name = $("exName").value.trim();
    const price = Number($("Ex").value);
    if (!name) return status("Please enter an item name.", true);
    if (!Number.isFinite(price) || price <= 0) return status("Enter a price greater than zero.", true);
    const day = ensureDay(selected);
    day.item.push(name);
    day.price.push(price);
    $("exName").value = "";
    $("Ex").value = "";
    $("itemForm").hidden = true;
    render();
    scheduleSave();
    $("exName").focus();
  }

  function addMonthlyExpense(event) {
    event.preventDefault();
    const name = $("monthlyName").value.trim();
    const price = Number($("monthlyPrice").value);
    if (!name) return status("Please enter a monthly expense name.", true);
    if (!Number.isFinite(price) || price <= 0) return status("Enter a monthly expense price greater than zero.", true);
    data._monthlyExpenses.item.push(name);
    data._monthlyExpenses.price.push(price);
    $("monthlyName").value = "";
    $("monthlyPrice").value = "";
    render();
    scheduleSave();
  }

  function saveBudget() {
    const value = $("totalAmount").value;
    const amount = Number(value);
    if (value.trim() === "" || !Number.isFinite(amount) || amount < 0) {
      return status("Enter a valid budget amount.", true);
    }
    data._settings.totalMoney = amount;
    $("totalAmount").value = "";
    render();
    scheduleSave();
  }

  function summary() {
    const total = dayTotal(selected);
    const difference = allowance() - total;
    status("Total expense for " + pretty(selected) + ": " + money(total) + " PKR · Daily allowance: " +
      money(allowance()) + " PKR · " + (difference >= 0 ? "Under allowance by " : "Over allowance by ") +
      money(Math.abs(difference)));
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabaseClient) return authMessage("Set your Project URL and publishable key in supabase-config.js first.", true);
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    $("signInBtn").disabled = true;
    $("signUpBtn").disabled = true;
    authMessage("Signing in…");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    $("signInBtn").disabled = false;
    $("signUpBtn").disabled = false;
    if (error) authMessage(error.message, true);
    else authMessage("Signed in successfully.");
  }

  async function signUp() {
    if (!supabaseClient) return authMessage("Set your Project URL and publishable key in supabase-config.js first.", true);
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!email || password.length < 6) return authMessage("Enter a valid email and a password of at least 6 characters.", true);
    $("signInBtn").disabled = true;
    $("signUpBtn").disabled = true;
    authMessage("Creating your account…");
    const { data: result, error } = await supabaseClient.auth.signUp({ email, password });
    $("signInBtn").disabled = false;
    $("signUpBtn").disabled = false;
    if (error) return authMessage(error.message, true);
    if (!result.session) {
      authMessage("Account created. Check your email to confirm the account, then sign in.");
    } else {
      authMessage("Account created. Loading your private tracker…");
    }
  }

  async function signOut() {
    const saved = await persistNow();
    if (!saved) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) status("Could not sign out: " + error.message, true);
  }

  async function resetAll() {
    if (!window.confirm("Permanently delete your budget and all expenses from your cloud account? This cannot be undone.")) return;
    data = emptyData();
    render();
    const saved = await persistNow();
    if (saved) status("Your budget and expense history have been reset in the cloud.");
  }

  function init() {
    $("authForm").addEventListener("submit", signIn);
    $("signUpBtn").addEventListener("click", signUp);
    $("signOutBtn").addEventListener("click", signOut);
    $("openItemForm").addEventListener("click", () => {
      $("itemForm").hidden = !$("itemForm").hidden;
      if (!$("itemForm").hidden) $("exName").focus();
    });
    $("itemForm").addEventListener("submit", addItem);
    $("monthlyForm").addEventListener("submit", addMonthlyExpense);
    $("totalBtn").addEventListener("click", saveBudget);
    $("total").addEventListener("click", summary);
    $("printBtn").addEventListener("click", () => window.print());
    $("expenseDate").value = today;
    $("expenseDate").addEventListener("change", (event) => {
      selected = event.target.value || today;
      render();
    });
    $("reset").addEventListener("click", resetAll);

    const config = window.APP_CONFIG || {};
    const url = String(config.SUPABASE_URL || "").trim();
    const key = String(config.SUPABASE_PUBLISHABLE_KEY || "").trim();
    const missingConfig = !url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_PUBLISHABLE_KEY");
    if (missingConfig) {
      $("configError").hidden = false;
      $("configError").textContent = "Setup required: add your Supabase Project URL and publishable key to supabase-config.js. See README.md.";
      authMessage("Supabase configuration is not complete yet.", true);
      showAuth();
      return;
    }
    if (!window.supabase?.createClient) {
      authMessage("Could not load the Supabase library. Check your internet connection and refresh.", true);
      return;
    }

    supabaseClient = window.supabase.createClient(url, key);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      // Defer database work until after Supabase finishes its auth callback.
      Promise.resolve().then(() => handleSession(session));
    });
  }

  init();
})();
