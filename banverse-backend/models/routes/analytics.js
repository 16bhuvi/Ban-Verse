const express = require("express");
const router = express.Router();
const Event = require("../Event");
const Club = require("../Club");
const User = require("../User");
const ClubMember = require("../ClubMember");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

console.log("📊 Analytics router loading...");

router.get("/ping", (req, res) => res.json({ status: "Analytics router is alive" }));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/advanced
// ─────────────────────────────────────────────────────────────────────────────
router.get("/advanced", authenticate, async (req, res) => {
    try {
        const { role, userId } = req.user;
        let query = {};
        let clubContext = null;

        // If not admin, restrict to user's club
        if (role !== "admin") {
            const club = await Club.findOne({
                $or: [{ leaderId: userId }, { leader: userId }]
            });
            if (!club) {
                // Check if they are a core member who might have access
                const membership = await ClubMember.findOne({ userId, membershipType: "Core Member" });
                if (!membership) return res.status(403).json({ error: "Access denied" });
                query.club = membership.clubId;
                clubContext = await Club.findById(membership.clubId);
            } else {
                query.club = club._id;
                clubContext = club;
            }
        }

        const events = await Event.find(query)
            .populate("club", "_id name category")
            .lean();

        if (events.length === 0) {
            return res.json({
                bestEvents: [],
                bestTime: "No data",
                lowPerforming: [],
                recommendations: ["Organize your first event to see insights!"]
            });
        }

        // 1. WHICH EVENTS PERFORMED BEST AND WHY
        const processedEvents = events.map(e => ({
            id: e._id,
            title: e.title,
            category: e.category,
            clubName: e.club?.name || "Unknown",
            registrations: e.participants.length,
            attendance: e.attendedParticipants.length,
            attendanceRate: e.participants.length > 0 ? (e.attendedParticipants.length / e.participants.length) * 100 : 0,
            score: (e.participants.length * 0.4) + ((e.participants.length > 0 ? e.attendedParticipants.length / e.participants.length : 0) * 60)
        }));

        const bestEvents = [...processedEvents]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(e => ({
                ...e,
                reason: e.attendanceRate > 80 ? "High conversion from registration to attendance." : "Massive student interest and registrations."
            }));

        // 2. BEST TIME TO ORGANIZE EVENTS
        const timeFrequency = {};
        const dayFrequency = {};
        
        events.forEach(e => {
            if (e.participants.length > 5) { // Only count successful events
                const time = e.time || "Unknown";
                timeFrequency[time] = (timeFrequency[time] || 0) + e.participants.length;
                
                if (e.date) {
                    const day = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
                    dayFrequency[day] = (dayFrequency[day] || 0) + e.participants.length;
                }
            }
        });

        const bestTime = Object.entries(timeFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "Evening (4 PM - 6 PM)";
        const bestDay = Object.entries(dayFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "Friday";

        // 3. LOW-PERFORMING AREAS
        const categoryStats = {};
        events.forEach(e => {
            const cat = e.category || "General";
            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, reg: 0, att: 0 };
            categoryStats[cat].count++;
            categoryStats[cat].reg += e.participants.length;
            categoryStats[cat].att += e.attendedParticipants.length;
        });

        const lowPerforming = Object.entries(categoryStats)
            .map(([name, stats]) => ({
                name,
                avgReg: stats.reg / stats.count,
                avgAttRate: stats.reg > 0 ? (stats.att / stats.reg) * 100 : 0
            }))
            .filter(c => c.avgReg < 10 || c.avgAttRate < 40)
            .map(c => ({
                ...c,
                suggestion: c.avgReg < 10 ? "Improve marketing and poster design." : "Send multiple reminders before the event."
            }));

        // 4. RECOMMENDATIONS
        const recommendations = [];
        if (bestEvents.length > 0) {
            recommendations.push(`Focus more on ${bestEvents[0].category} events as they show maximum engagement.`);
        }
        recommendations.push(`The most active time for students is ${bestTime} on ${bestDay}s.`);
        
        const avgAttendanceRate = processedEvents.reduce((acc, curr) => acc + curr.attendanceRate, 0) / processedEvents.length;
        if (avgAttendanceRate < 50) {
            recommendations.push("Implement a 'Certificate of Attendance' to boost the conversion rate from registration to actual turnout.");
        } else {
            recommendations.push("Your attendance rate is healthy. Try scaling up event capacity for popular categories.");
        }
        
        if (role === "admin") {
            const clubEngagement = {};
            events.forEach(e => {
                const clubId = e.club?._id?.toString() || "unknown";
                if (!clubEngagement[clubId]) clubEngagement[clubId] = { name: e.club?.name || "Unknown", points: 0 };
                clubEngagement[clubId].points += e.participants.length;
            });
            const topClub = Object.values(clubEngagement).sort((a, b) => b.points - a.points)[0];
            if (topClub) recommendations.push(`${topClub.name} is currently the most active club. Consider featuring them in the newsletter.`);
        }

        // REDUNDANCY CHECK: Ensure we always have at least 3 high-value recommendations
        if (recommendations.length < 3) {
            recommendations.push("Launch a 'Newbie Spotlight' to encourage freshers to join their first club and get 10 AP.");
        }
        if (recommendations.length < 3) {
            recommendations.push("Host more cross-department events to break silos and increase platform-wide engagement scores.");
        }

        res.json({
            bestEvents,
            bestTime: `${bestTime} on ${bestDay}s`,
            lowPerforming,
            recommendations,
            summary: {
                totalEvents: events.length,
                avgAttendanceRate: Math.round(avgAttendanceRate || 0) + "%",
                topCategory: Object.entries(categoryStats).sort((a, b) => b[1].reg - a[1].reg)[0]?.[0] || "N/A"
            }
        });

    } catch (error) {
        console.error("Advanced analytics error:", error);
        res.status(500).json({ error: "Failed to generate insights" });
    }
});

module.exports = router;
