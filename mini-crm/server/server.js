import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---- Tiny "auth" for the 1-hour build ----
// We always use demo user id=1, OR allow overriding via x-user-id header.
function getUserId(req) {
  const header = req.header("x-user-id");
  const id = header ? Number(header) : 1;
  return Number.isFinite(id) && id > 0 ? id : 1;
}

const FREE_CONTACT_LIMIT = 5;

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function getUser(userId) {
  const { rows } = await query("SELECT id, email, plan FROM users WHERE id=$1", [
    userId,
  ]);
  return rows[0];
}

async function countContacts(userId) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS count FROM contacts WHERE user_id=$1",
    [userId]
  );
  return rows[0]?.count ?? 0;
}

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- SaaS-style "me" ----
app.get("/me", async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await getUser(userId);
    if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const contactsUsed = await countContacts(userId);
    const isFree = user.plan === "free";

    res.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      contactLimit: isFree ? FREE_CONTACT_LIMIT : null,
      contactsUsed,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ---- Mock upgrade endpoint ----
app.post("/upgrade", async (req, res) => {
  try {
    const userId = getUserId(req);
    await query("UPDATE users SET plan='pro' WHERE id=$1", [userId]);
    res.json({ plan: "pro" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ---- Accounts ----
app.get("/accounts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { rows } = await query(
      "SELECT id, name, created_at FROM accounts WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.post("/accounts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

    const { rows } = await query(
      "INSERT INTO accounts (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at",
      [userId, name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ---- Contacts ----
app.get("/contacts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const accountId = req.query.accountId ? Number(req.query.accountId) : null;

    const sql = `
      SELECT c.id, c.name, c.email, c.account_id, c.created_at,
             a.name AS account_name
      FROM contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE c.user_id = $1
      ${accountId ? "AND c.account_id = $2" : ""}
      ORDER BY c.created_at DESC
    `;

    const params = accountId ? [userId, accountId] : [userId];
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.post("/contacts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await getUser(userId);
    if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

    // Enforce plan gating on backend
    if (user.plan === "free") {
      const used = await countContacts(userId);
      if (used >= FREE_CONTACT_LIMIT) {
        return res.status(403).json({
          error: "LIMIT_REACHED",
          message: `Free plan allows up to ${FREE_CONTACT_LIMIT} contacts. Upgrade to add more.`,
        });
      }
    }

    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const accountId =
      req.body?.accountId === null || req.body?.accountId === undefined
        ? null
        : Number(req.body.accountId);

    if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });
    if (!email) return res.status(400).json({ error: "EMAIL_REQUIRED" });

    const { rows } = await query(
      `INSERT INTO contacts (user_id, account_id, name, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, account_id, created_at`,
      [userId, accountId, name, email]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.put("/contacts/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const accountId =
      req.body?.accountId === null || req.body?.accountId === undefined
        ? null
        : Number(req.body.accountId);

    if (!Number.isFinite(id)) return res.status(400).json({ error: "BAD_ID" });
    if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });
    if (!email) return res.status(400).json({ error: "EMAIL_REQUIRED" });

    const { rows } = await query(
      `UPDATE contacts
       SET name=$1, email=$2, account_id=$3
       WHERE id=$4 AND user_id=$5
       RETURNING id, name, email, account_id, created_at`,
      [name, email, accountId, id, userId]
    );

    if (!rows[0]) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.delete("/contacts/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "BAD_ID" });

    const { rowCount } = await query(
      "DELETE FROM contacts WHERE id=$1 AND user_id=$2",
      [id, userId]
    );

    if (!rowCount) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
