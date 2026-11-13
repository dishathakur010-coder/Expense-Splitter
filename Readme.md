# Expense Splitter

A Splitwise-style app for hostel rooms and friend groups. Track shared expenses, see who owes whom, and settle up with the fewest payments.

## Features
- Register / login (JWT auth)
- Create groups and add members by email
- Add expenses with a custom payer and split
- Debt simplification using a greedy algorithm
- Settle-up flow
- Monthly summary

## Tech stack
MongoDB, Express, React (Vite), Node.js

## How debt simplification works
1. Compute each person's net balance (paid minus owed).
2. Split people into creditors (positive) and debtors (negative).
3. Repeatedly match the largest debtor with the largest creditor until all balances are zero.

## Run locally
1. Clone the repo
2. `cd server`, copy `.env.example` to `.env`, fill in your values, then `npm install` and `npm run dev`
3. `cd client`, then `npm install` and `npm run dev`
4. Open http://localhost:5173
