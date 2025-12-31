import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || "Request failed";
    const err = new Error(msg);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

function Banner({ me, onUpgrade }) {
  const used = me?.contactsUsed ?? 0;
  const limit = me?.contactLimit;

  return (
    <div style={styles.banner}>
      <div>
        <div style={{ fontWeight: 700 }}>Mini CRM</div>
        <div style={{ opacity: 0.8, fontSize: 14 }}>
          Signed in as {me?.email} • Plan:{" "}
          <b>{me?.plan?.toUpperCase() || "…"}</b>
          {limit ? (
            <>
              {" "}
              • Contacts: <b>{used}</b>/<b>{limit}</b>
            </>
          ) : (
            <>
              {" "}
              • Contacts: <b>{used}</b> (unlimited)
            </>
          )}
        </div>
      </div>

      {me?.plan === "free" && (
        <button onClick={onUpgrade} style={styles.primaryBtn}>
          Upgrade to Pro
        </button>
      )}
    </div>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <div style={styles.tabs}>
      <button
        onClick={() => setTab("contacts")}
        style={tab === "contacts" ? styles.tabActive : styles.tab}
      >
        Contacts
      </button>
      <button
        onClick={() => setTab("accounts")}
        style={tab === "accounts" ? styles.tabActive : styles.tab}
      >
        Accounts
      </button>
    </div>
  );
}

function AccountsView({ accounts, onCreate }) {
  const [name, setName] = useState("");

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Accounts</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name);
          setName("");
        }}
        style={styles.row}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New account name"
          style={styles.input}
        />
        <button style={styles.btn}>Add</button>
      </form>

      <div style={{ marginTop: 12 }}>
        {accounts.length === 0 ? (
          <div style={styles.muted}>No accounts yet.</div>
        ) : (
          <ul style={styles.list}>
            {accounts.map((a) => (
              <li key={a.id} style={styles.listItem}>
                {a.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContactsView({ accounts, contacts, onCreate, onDelete, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");

  const accountOptions = useMemo(() => accounts, [accounts]);

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Contacts</h2>

      {error ? (
        <div style={styles.errorBox}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({
            name,
            email,
            accountId: accountId ? Number(accountId) : null,
          });
          setName("");
          setEmail("");
          setAccountId("");
        }}
        style={{ display: "grid", gap: 8 }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          style={styles.input}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={styles.input}
        />

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={styles.input}
        >
          <option value="">(No account)</option>
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <button style={styles.primaryBtn}>Add Contact</button>
      </form>

      <div style={{ marginTop: 12 }}>
        {contacts.length === 0 ? (
          <div style={styles.muted}>No contacts yet.</div>
        ) : (
          <ul style={styles.list}>
            {contacts.map((c) => (
              <li key={c.id} style={styles.contactRow}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={styles.muted}>
                    {c.email}
                    {c.account_name ? ` • ${c.account_name}` : ""}
                  </div>
                </div>
                <button style={styles.dangerBtn} onClick={() => onDelete(c.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("contacts");
  const [me, setMe] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  async function loadAll() {
    const [m, a, c] = await Promise.all([
      api("/me"),
      api("/accounts"),
      api("/contacts"),
    ]);
    setMe(m);
    setAccounts(a);
    setContacts(c);
  }

  useEffect(() => {
    loadAll().catch((e) => setErrMsg(e.message));
  }, []);

  async function upgrade() {
    setErrMsg("");
    try {
      await api("/upgrade", { method: "POST" });
      await loadAll();
    } catch (e) {
      setErrMsg(e.message);
    }
  }

  async function createAccount(name) {
    setErrMsg("");
    try {
      await api("/accounts", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadAll();
    } catch (e) {
      setErrMsg(e.message);
    }
  }

  async function createContact(payload) {
    setErrMsg("");
    try {
      await api("/contacts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadAll();
    } catch (e) {
      setErrMsg(e.message);
    }
  }

  async function deleteContact(id) {
    setErrMsg("");
    try {
      await api(`/contacts/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setErrMsg(e.message);
    }
  }

  return (
    <div style={styles.page}>
      <Banner me={me} onUpgrade={upgrade} />
      <div style={styles.container}>
        <Tabs tab={tab} setTab={setTab} />

        {tab === "contacts" ? (
          <ContactsView
            accounts={accounts}
            contacts={contacts}
            onCreate={createContact}
            onDelete={deleteContact}
            error={errMsg}
          />
        ) : (
          <AccountsView accounts={accounts} onCreate={createAccount} />
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
    background: "#0b1020",
    minHeight: "100vh",
    color: "white",
  },
  container: {
    maxWidth: 920,
    margin: "0 auto",
    padding: 16,
  },
  banner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 16px",
    background: "rgba(255,255,255,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tabs: { display: "flex", gap: 8, margin: "16px 0" },
  tab: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
  },
  tabActive: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.20)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
  },
  h2: { margin: 0, marginBottom: 12 },
  row: { display: "flex", gap: 8 },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    width: "100%",
  },
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(120,120,255,0.25)",
    color: "white",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 700,
  },
  dangerBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,100,100,0.35)",
    background: "rgba(255,0,0,0.12)",
    color: "white",
    cursor: "pointer",
  },
  list: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 },
  listItem: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
  },
  contactRow: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  muted: { opacity: 0.75, fontSize: 14 },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    border: "1px solid rgba(255,120,120,0.35)",
    background: "rgba(255,0,0,0.12)",
  },
};
