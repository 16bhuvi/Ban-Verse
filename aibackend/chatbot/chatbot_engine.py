import traceback
import re

def log_to_file(msg):
    with open("ai_debug_log.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# --- Helper: calculate score ---
def _title_match_score(inp, title):
    title_lower = title.lower().strip()
    inp_lower = inp.lower().strip()
    if not title_lower: return 0.0
    if title_lower in inp_lower: return 1.0
    title_words = [w for w in title_lower.split() if len(w) >= 3]
    if not title_words: return 0.0
    matched = sum(1 for w in title_words if w in inp_lower)
    return matched / len(title_words)

class ChatbotEngine:
    def __init__(self):
        # We are moving away from generative LLMs to ensure 100% stability and prevent hallucinations.
        log_to_file("✅ Banverse AI Assistant (Stability Mode) Active")
        self.chatbot = None 

    async def get_response(self, user_input, db):
        try:
            inp = user_input.lower().strip()
            collection_names = await db.list_collection_names()
            club_coll = "clubs" if "clubs" in collection_names else "Clubs"
            event_coll = "events" if "events" in collection_names else "Events"
            
            # Fetch data for dynamic answers
            events = await db[event_coll].find().to_list(100)
            clubs = await db[club_coll].find().to_list(100)

            # --- INTENT: PAST EVENTS ---
            if "past" in inp:
                return (
                    "Looking for memories? 🎞️\n\n"
                    "You can find all our previous campus activities in the **'Past Events'** tab! "
                    "It's a great way to see what our clubs have achieved so far. Check it out to see event galleries and details! 🏆"
                )

            # --- ROBUST INTENT: LISTING ASSETS (Events/Clubs) ---
            if any(w in inp for w in ["list", "show", "tell me all", "see all", "give me all", "fetch"]):
                # 1. Handle Club-Specific Event Filtering (e.g., "events of Marketing Club")
                if "event" in inp and any(c.get('name', '').lower() in inp for c in clubs):
                    target_club = None
                    for c in clubs:
                         if c.get('name', '').lower() in inp:
                            target_club = c
                            break
                    
                    if target_club:
                        cid = str(target_club['_id'])
                        club_events = [e for e in events if str(e.get('club', '')) == cid]
                        if club_events:
                            res = f"Here are the upcoming events specifically for **{target_club.get('name')}**:\n\n"
                            res += "\n".join(f"• **{e.get('title')}**" for e in club_events[:5])
                            res += "\n\nCheck the 'Events' tab to register and earn 20 AP! 🚀"
                            return res
                        return f"The **{target_club.get('name')}** club doesn't have any upcoming events scheduled. Stay tuned! 🌟"

                # 2. General Event Listing
                if "event" in inp:
                    if events:
                        count = min(3, len(events))
                        res = f"I've found some exciting events for you: {', '.join(e.get('title') for e in events[:count])}. Head to 'Events' tab to see everything! 🗓️"
                        return res
                    return "The event feed is currently quiet, but keep an eye out for updates! 🌟"
                elif "club" in inp:
                    if clubs:
                        res = f"We have {len(clubs)} amazing clubs! Some highlights: {', '.join(c.get('name') for c in clubs[:3])}. Want to find your tribe? 🛡️"
                        return res
                    return "Our club directory is updating. Check back soon for more! ✨"

            # --- INTENT: ACTIVITY POINTS (AP) ---
            if any(w in inp for w in ["activity point", "ap", "points"]):
                return (
                    "**Activity Points (AP)** are a measure of your campus engagement! 💎\n\n"
                    "• **Joining a Club**: +10 AP\n"
                    "• **Registering for an Event**: +20 AP\n\n"
                    "Collecting points helps you stand out and builds your professional profile. Keep participating and grow your score! 🚀"
                )

            # --- INTENT: EVENT DISCOVERY ---
            if "event" in inp and any(w in inp for w in ["recommend", "attend", "should", "best", "which"]):
                if events:
                    e = events[0]
                    return (
                        f"I've got a great recommendation! 🌟\n\n"
                        f"You should check out **'{e.get('title')}'**. It's a fantastic {e.get('category')} activity. "
                        "Plus, you'll earn 20 AP for participating! Head to 'Events' to join. 🚀"
                    )
                return "Our calendar is currently clear. But it's a great time to explore Clubs! 🗓️"

            # --- INTENT: CLUB DISCOVERY ---
            if "club" in inp:
                if any(w in inp for w in ["where", "find", "location"]):
                    return "You can find all our amazing clubs in the **'Explore Clubs'** tab on your sidebar! 🛡️✨"
                if any(w in inp for w in ["choose", "recommend", "best", "which"]):
                    if clubs:
                        c = clubs[0]
                        return f"I highly recommend the **'{c.get('name')}'** club! They match the current student interests perfectly. Check 'Explore Clubs' for more! 💪"

            # --- INTENT: PLATFORM INFO ---
            if any(k in inp for k in ["banverse", "platform", "how do", "features"]):
                return (
                    "**Banverse** is your ultimate campus companion! 🎓\n\n"
                    "• **Discover Events**: From workshops to fests.\n"
                    "• **Join Clubs**: Find your community and grow.\n"
                    "• **AI Recommendations**: Smart suggestions for YOU.\n"
                    "• **Earn AP**: Get rewarded for being active!\n\n"
                    "What can I help you explore today? 🚀"
                )

            # --- GREETINGS & GRATITUDE ---
            if any(w in inp for w in ["hi", "hello", "hey", "who are you", "help"]):
                return "Hi! I'm **BanBot**, your campus guide. I help you find events, join clubs, and track your AP points. How can I assist you today? 👋🎓"

            if any(w in inp for w in ["thank", "thanks", "thx"]):
                return "You're very welcome! I'm always here to help you grow your campus journey. Let me know if there's anything else you need! 😊🚀"

            # --- UNIVERSAL SAFE FALLBACK ---
            return (
                "I'm here to help you navigate your campus life at Banasthali! 🎓\n\n"
                "I can help you with:\n"
                "• Finding **Events** (including Past Events)\n"
                "• Discovering **Clubs**\n"
                "• Explaining **Activity Points (AP)**\n\n"
                "What would you like to know about? 😊"
            )

        except Exception as e:
            log_to_file(f"❌ BANBOT ERROR: {str(e)}")
            return "Hi! I'm BanBot, your campus guide. Ask me about our clubs or events! 🌱"