# Expense Splitter

A Splitwise-style web app for hostel rooms and friend groups. Members add shared expenses, the app works out who owes whom, reduces the number of payments needed using a greedy algorithm, and tracks settle-ups and monthly spending.

Built with the **MERN** stack (MongoDB, Express, React, Node.js).

---

## Table of Contents

1. [Screenshots](#screenshots)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [System Design](#system-design)
5. [Project Structure](#project-structure)
6. [Database Design](#database-design)
7. [How It Works](#how-it-works)
8. [Debt Simplification Algorithm](#debt-simplification-algorithm)
9. [API Reference](#api-reference)
10. [Frontend Overview](#frontend-overview)
11. [Setup and Run Locally](#setup-and-run-locally)
12. [Environment Variables](#environment-variables)
13. [Design Decisions and Limitations](#design-decisions-and-limitations)
14. [Future Improvements](#future-improvements)

---

## Screenshots

### Login / Register
![Login](screenshots/login.png)

### Your groups
![Groups](screenshots/groups.png)

### Members, balances and who pays whom
![Balances](screenshots/balances.png)

### Add expense and expense list
![Expenses](screenshots/expenses.png)

### Monthly summary
![Summary](screenshots/summary.png)

---

## Features

- **Authentication:** register and log in with email and password. Passwords are hashed, and sessions use JWT tokens.
- **Groups:** create a group (for example "Room 204") and add members by email.
- **Expenses:** record who paid, how much, and who the cost is split between (equal split).
- **Live balances:** see how much each person is owed or owes.
- **Debt simplification:** a greedy algorithm reduces the list of debts to a small set of direct payments.
- **Settle-up:** mark a suggested payment as paid, and balances update immediately.
- **Monthly summary:** total spent, biggest expense, and what each person paid versus their share, for any month.
- **Access control:** only group members can view or change a group's data.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (Vite), React Router, Axios | UI, routing, API calls |
| Backend | Node.js, Express | REST API |
| Database | MongoDB Atlas, Mongoose | Data storage and schemas |
| Auth | bcryptjs, jsonwebtoken | Password hashing, login tokens |
| Dev tools | nodemon, dotenv, cors | Auto restart, config, cross-origin requests |

---

## System Design

### High-level architecture

```mermaid
flowchart LR
    A[React Client<br/>Vite, port 5173] -->|HTTP + JWT| B[Express API<br/>port 5000]
    B -->|Mongoose| C[(MongoDB Atlas)]
```

The app is a standard three-tier setup:

1. **Client (React):** renders pages, keeps the JWT in `localStorage`, and attaches it to every request through an Axios interceptor.
2. **Server (Express):** validates the token, checks permissions, applies the business logic (splits, balances, simplification), and talks to the database.
3. **Database (MongoDB Atlas):** stores users, groups, expenses and settlements.

### Request flow

```mermaid
sequenceDiagram
    participant U as User (React)
    participant M as Auth Middleware
    participant R as Route Handler
    participant D as MongoDB

    U->>M: Request with Authorization: Bearer token
    M->>M: Verify JWT, read user id
    M->>R: req.userId set, continue
    R->>D: Query or update data
    D-->>R: Result
    R-->>U: JSON response
```

Every route except register and login passes through the auth middleware. A missing or invalid token returns `401`.

### Backend layering

```
Routes (HTTP handling, validation, permission checks)
   |
   +-- Utils (pure business logic: balance math, debt simplification)
   |
   +-- Models (Mongoose schemas, database access)
```

The balance and simplification logic lives in `utils/balances.js` as pure functions with no database code, so it is easy to test and reason about on its own.

---

## Project Structure

```
Expense-Splitter/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── api.js              # Axios instance, attaches JWT to requests
│       ├── main.jsx            # App entry, BrowserRouter
│       ├── App.jsx             # Routes and private-route guard
│       ├── index.css           # Styles
│       └── pages/
│           ├── Login.jsx       # Login and register
│           ├── Groups.jsx      # List and create groups
│           └── GroupPage.jsx   # Members, expenses, balances, settle-up, summary
│
├── screenshots/                # Images used in this README
│
├── server/                     # Express backend
│   ├── index.js                # App setup, route mounting, DB connection
│   ├── middleware/
│   │   └── auth.js             # JWT verification
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   └── Settlement.js
│   ├── routes/
│   │   ├── auth.js             # Register, login
│   │   ├── groups.js           # Groups and members
│   │   ├── expenses.js         # Expenses
│   │   ├── balances.js         # Balances and suggested payments
│   │   ├── settlements.js      # Recorded payments
│   │   └── summary.js          # Monthly summary
│   ├── utils/
│   │   └── balances.js         # computeNet, simplifyDebts
│   └── .env.example
│
└── README.md
```

---

## Database Design

### Collections and relationships

```mermaid
erDiagram
    USER ||--o{ GROUP : "is member of"
    GROUP ||--o{ EXPENSE : contains
    GROUP ||--o{ SETTLEMENT : contains
    USER ||--o{ EXPENSE : "pays"
    USER ||--o{ SETTLEMENT : "pays or receives"

    USER {
        ObjectId _id
        string name
        string email
        string password
    }
    GROUP {
        ObjectId _id
        string name
        ObjectId[] members
        ObjectId createdBy
    }
    EXPENSE {
        ObjectId _id
        ObjectId group
        string description
        number amount
        ObjectId paidBy
        object[] splits
    }
    SETTLEMENT {
        ObjectId _id
        ObjectId group
        ObjectId from
        ObjectId to
        number amount
    }
```

### Schemas

**User**

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | required, unique |
| password | String | required, stored as a bcrypt hash |

**Group**

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| members | [ObjectId -> User] | everyone in the group, including the creator |
| createdBy | ObjectId -> User | |
| createdAt, updatedAt | Date | automatic timestamps |

**Expense**

| Field | Type | Notes |
|---|---|---|
| group | ObjectId -> Group | required |
| description | String | required |
| amount | Number | total amount paid |
| paidBy | ObjectId -> User | who paid |
| splits | [{ user, amount }] | each person's share, saved at creation |
| createdAt, updatedAt | Date | automatic timestamps |

**Settlement**

| Field | Type | Notes |
|---|---|---|
| group | ObjectId -> Group | required |
| from | ObjectId -> User | who paid back |
| to | ObjectId -> User | who received the money |
| amount | Number | |
| createdAt, updatedAt | Date | automatic timestamps |

### Why splits are stored on each expense

Each expense saves the exact amount each person owes at the time it was created. This keeps old expenses accurate even if group membership changes later, and it makes unequal splits possible in the future without changing the schema.

### Why balances are not stored

Balances are **calculated on demand** from expenses and settlements, not stored as a field. This avoids the balance drifting out of sync with the real data. Deleting an expense or settlement automatically corrects every balance.

---

## How It Works

### 1. Authentication

1. **Register:** the password is hashed with bcrypt (10 salt rounds) and the user is saved. The plain password is never stored.
2. **Login:** the server finds the user by email and compares the password with the stored hash. On success it signs a JWT containing the user id, valid for 7 days.
3. **Protected routes:** the client sends `Authorization: Bearer <token>`. The middleware verifies the signature and puts the user id on `req.userId`.
4. **Same error for both failures:** wrong email and wrong password return the same message, so the API does not reveal which emails are registered.

### 2. Groups and permissions

- Creating a group adds the creator as the first member.
- Adding a member looks the user up by email, so the person must already be registered.
- Every group, expense, balance, settlement and summary route checks that `req.userId` is in the group's `members`. Otherwise it returns `403`.

### 3. Adding an expense (equal split)

Input: group, description, amount, who paid, and who it is split between.

1. Validate the amount and confirm the payer and everyone in the split are group members.
2. Compute each share: `floor(total / people * 100) / 100` (rounded **down** to 2 decimals).
3. Add any leftover paise to the first person so the shares add up to exactly the total.
4. Save the expense with the `splits` array.

Example: Rs 100 split three ways gives shares of 33.33, 33.33 and 33.34. The total is exactly 100.00.

### 4. Calculating balances

For each member, the **net balance** is:

```
net = (total they paid) - (total of their shares) + (settlements they paid) - (settlements they received)
```

- Positive net: the group owes this person money.
- Negative net: this person owes the group.
- The net balances of all members always add up to 0.

Money values are rounded to 2 decimals after every operation to avoid floating-point drift.

### 5. Settle-up

When someone taps **Mark paid** on a suggested payment, a `Settlement` record is created. The next balance calculation includes it:

- The payer's net goes **up** by the amount (their debt shrinks).
- The receiver's net goes **down** by the amount (they are owed less).

When everyone's net is 0, the app shows "All settled up".

### 6. Monthly summary

For a chosen month (`YYYY-MM`), the server fetches expenses created between the first day of that month and the first day of the next, then returns:

- Total spent and number of expenses
- The biggest expense
- Per person: amount paid, share owed, and the difference

The summary covers that month's expenses only. It does not include settlements, so it can differ from the live balances.

---

## Debt Simplification Algorithm

### The problem

If everyone tracked debts pairwise, a group of friends would end up with many small payments, including chains like A owes B and B owes C. Simplification reduces these to fewer direct payments.

### The approach

1. **Compute each person's net balance** (see above).
2. **Split people into two lists:** creditors (net > 0) and debtors (net < 0).
3. **Sort both lists** by amount, largest first.
4. **Match greedily:** take the largest debtor and the largest creditor. The debtor pays `min(debt, credit)` to the creditor. Reduce both amounts. Whoever reaches 0 is removed.
5. **Repeat** until both lists are empty.

### Worked example

Before simplifying: A owes B Rs 100, and B owes C Rs 100.

| Person | Net balance |
|---|---|
| A | -100 |
| B | 0 |
| C | +100 |

B's debts cancel out. The algorithm matches A (debtor) with C (creditor):

```
A pays C Rs 100
```

One payment replaces two.

### Larger example

| Person | Net |
|---|---|
| A | +500 |
| B | -100 |
| C | -400 |

```
Debtors:   C (400), B (100)
Creditors: A (500)

Step 1: C pays A 400   -> C settled, A still owed 100
Step 2: B pays A 100   -> B settled, A settled
```

### Complexity

- Computing nets: O(E x S), where E is the number of expenses and S the number of people per split.
- Sorting: O(n log n) for n members.
- Matching: O(n), because each step settles at least one person.

### Correctness and limits

- Every payment settles at least one person, so a group of n people needs **at most n - 1 payments**.
- Everyone ends at exactly 0, so the result is always a correct settlement.
- Finding the **absolute minimum** number of payments is NP-hard in general (it relates to the subset-sum problem). The greedy approach is not guaranteed to be the minimum in every case, but it is fast, simple and very good in practice for small groups.

The code is in `server/utils/balances.js`, in the functions `computeNet` and `simplifyDebts`.

---

## API Reference

Base URL: `http://localhost:5000/api`

All routes except register and login require the header `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `name, email, password` | Create an account |
| POST | `/auth/login` | `email, password` | Returns `token` and `user` |

### Groups

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/groups` | `name` | Create a group |
| GET | `/groups` | | List groups you belong to |
| GET | `/groups/:id` | | One group with member names |
| POST | `/groups/:id/members` | `email` | Add a registered user |

### Expenses

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/expenses` | `groupId, description, amount, paidBy, splitAmong` | Add an expense. `paidBy` defaults to you. `splitAmong` defaults to all members. |
| GET | `/expenses/group/:groupId` | | List a group's expenses, newest first |
| DELETE | `/expenses/:id` | | Delete an expense |

### Balances

| Method | Endpoint | Description |
|---|---|---|
| GET | `/balances/group/:groupId` | Returns `balances` (net per person) and `settlements` (suggested payments) |

### Settlements

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/settlements` | `groupId, from, to, amount` | Record a payment |
| GET | `/settlements/group/:groupId` | | Payment history |
| DELETE | `/settlements/:id` | | Remove a payment |

### Summary

| Method | Endpoint | Description |
|---|---|---|
| GET | `/summary/group/:groupId?month=2026-11` | Monthly summary. `month` defaults to the current month. |

### Example responses

`POST /auth/login`
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "6af6...", "name": "Angel", "email": "a@test.com" }
}
```

`GET /balances/group/:groupId`
```json
{
  "balances": [
    { "user": { "id": "6af6...", "name": "Angel" }, "balance": 200 },
    { "user": { "id": "6af7...", "name": "Friend" }, "balance": -200 }
  ],
  "settlements": [
    {
      "from": { "id": "6af7...", "name": "Friend" },
      "to": { "id": "6af6...", "name": "Angel" },
      "amount": 200
    }
  ]
}
```

### Status codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Invalid input (bad amount, duplicate email, wrong credentials) |
| 401 | Missing or invalid token |
| 403 | Not a member of the group |
| 404 | Group, user or record not found |
| 500 | Server error |

---

## Frontend Overview

| Page | Route | What it does |
|---|---|---|
| Login | `/login` | Toggle between login and register. Saves the token and user in `localStorage`. |
| Groups | `/` | Lists your groups, creates new ones, logout. |
| Group page | `/groups/:id` | Members, balances with "Mark paid" buttons, add expense form, expense list, monthly summary. |

How the pieces connect:

- **`api.js`** creates one Axios instance. A request interceptor reads the token from `localStorage` and adds the `Authorization` header to every call.
- **`App.jsx`** wraps private pages in a `Private` component that redirects to `/login` when there is no token.
- **`GroupPage.jsx`** loads the group, expenses and balances in parallel with `Promise.all`, and reloads them after any change so the screen always matches the server.

---

## Setup and Run Locally

### Prerequisites

- Node.js 18 or newer
- A free MongoDB Atlas cluster (or a local MongoDB)

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/expense-splitter.git
cd expense-splitter
```

### 2. Backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and fill in your values (see below), then:

```bash
npm run dev
```

You should see `DB connected` and `Server on port 5000`.

### 3. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

### MongoDB Atlas notes

- Create a database user and keep the password simple (letters and numbers).
- Under **Network Access**, allow your IP address. For local development, `0.0.0.0/0` allows any IP.
- Put the database name in the connection string, before the `?`.

---

## Environment Variables

Create `server/.env`:

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/expense-splitter?retryWrites=true&w=majority` |
| `PORT` | Port for the API | `5000` |
| `JWT_SECRET` | Secret used to sign tokens | a long random string |

`.env` is listed in `.gitignore` and must never be committed.

---

## Design Decisions and Limitations

**Decisions**

- **Balances are derived, not stored.** This keeps one source of truth and removes a whole class of sync bugs.
- **Splits are stored per expense.** This keeps history accurate and allows future split types.
- **Pure functions for the math.** The algorithm has no database dependency.
- **Rounding handled explicitly.** Shares are rounded down and the leftover goes to one person so totals always match.
- **Membership checks on every group route.** Users cannot read or change another group's data.

**Current limitations**

- Equal splits only.
- Adding a member requires them to already have an account.
- Greedy simplification is not guaranteed to give the absolute minimum number of payments.
- The monthly summary ignores settlements.
- Expenses cannot be edited, only deleted and re-added.
- Anyone in a group can delete any expense in it.
- No rate limiting or input sanitization beyond basic checks.
- Tokens are stored in `localStorage`, which is simple but exposed to XSS. A production app would use httpOnly cookies.
- The API URL in `client/src/api.js` is hardcoded to `localhost:5000`.

---

## Future Improvements

- Unequal and percentage-based splits
- Edit expenses
- Expense categories and charts in the monthly summary
- Invite members by link
- Multiple currencies
- Automated tests for `computeNet` and `simplifyDebts`
- Deployment (Render for the API, Vercel for the client) with the API URL moved to an environment variable
- Rebuild of the backend in Spring Boot (Java)
