const express = require("express");
const Group = require("../models/Group");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// create a group
router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        const group = await Group.create({
            name,
            members: [req.userId],
            createdBy: req.userId,
        });
        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// list my groups
router.get("/", async (req, res) => {
    try {
        const groups = await Group.find({ members: req.userId });
        res.json(groups);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// get one group with member details
router.get("/:id", async (req, res) => {
    try {
        const group = await Group.findById(req.params.id).populate(
            "members",
            "name email"
        );
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m._id.toString() === req.userId);
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// add a member by email
router.post("/:id/members", async (req, res) => {
    try {
        const { email } = req.body;

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (!group.members.map((m) => m.toString()).includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No user with that email" });

        if (group.members.map((m) => m.toString()).includes(user._id.toString())) {
            return res.status(400).json({ message: "Already a member" });
        }

        group.members.push(user._id);
        await group.save();

        res.json({ message: "Member added" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;