const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const auth = require("../middleware/auth");
const { computeNet, simplifyDebts } = require("../utils/balances");

const router = express.Router();

router.use(auth);

router.get("/group/:groupId", async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId).populate(
            "members",
            "name email"
        );
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberIds = group.members.map((m) => m._id.toString());
        if (!memberIds.includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        const expenses = await Expense.find({ group: group._id });
        const settlementsDone = await Settlement.find({ group: group._id });

        const net = computeNet(expenses, memberIds, settlementsDone);
        const transfers = simplifyDebts(net);

        const people = {};
        group.members.forEach((m) => {
            people[m._id.toString()] = { id: m._id, name: m.name };
        });

        const balances = memberIds.map((id) => ({
            user: people[id],
            balance: net[id],
        }));

        const settlements = transfers.map((t) => ({
            from: people[t.from],
            to: people[t.to],
            amount: t.amount,
        }));

        res.json({ balances, settlements });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;