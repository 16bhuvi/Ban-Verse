from transformers import pipeline
import traceback

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
        try:
            # Try loading with local-first preference to avoid hub timeouts
            self.chatbot = pipeline("text-generation", model="distilgpt2")
            log_to_file("✅ BanBot AI (distilgpt2) Loaded Successfully")
        except Exception as e:
            log_to_file(f"⚠️ BanBot AI load failed (Internet/Timeout): {str(e)}")
            self.chatbot = None # Fallback to rule-based logic only
        
        self.platform_context = """
        BANBOT INFO (Banasthali's AI Guide):
        - ROLE: Smart, friendly, simple, and motivating campus guide.
        - GOALS: Discover events, get reminders, explore clubs, answer activity queries.
        - GAMIFICATION: Join Club (+10 AP), Register Event (+20 AP).
        - ADVICE: Always be encouraging and keep answers concise (short).
        """

    async def get_response(self, user_input, db):
        log_to_file(f"--- BANBOT REQUEST: '{user_input}' ---")
        try:
            inp = user_input.lower().strip()
            collection_names = await db.list_collection_names()
            club_coll = "clubs" if "clubs" in collection_names else "Clubs"
            event_coll = "events" if "events" in collection_names else "Events"

            events = await db[event_coll].find().to_list(100)
            clubs = await db[club_coll].find().to_list(100)

            # --- INTENT: REMINDERS ---
            if any(w in inp for w in ["remind", "reminder", "notify"]):
                # Look for a specific event to 'remind' about
                best_e = None
                best_s = 0.0
                for e in events:
                    s = _title_match_score(inp, e.get('title', ''))
                    if s > best_s: 
                        best_s = s
                        best_e = e
                
                if best_e and best_s >= 0.5:
                    return (f"Sure! I'll remind you about '{best_e.get('title')}'. "
                            f"It's happening on {best_e.get('date', 'TBA')}. "
                            f"Check your 'Events' tab for the full schedule! ⏰")
                return ("I'd love to help! Just tell me the event name, or you can "
                        "set notifications in the Events section. Keep shining! ✨")

            # --- INTENT: DISCOVER EVENTS TODAY/SOON ---
            if any(w in inp for w in ["discover", "attend", "what event", "today", "show me events"]):
                if events:
                    count = min(3, len(events))
                    res = f"Exciting things are happening! Here are {count} events you'll love:\n"
                    for e in events[:count]:
                        res += f"• **{e.get('title')}** ({e.get('date', 'TBA')})\n"
                    res += "\nCheck the 'Events' page to join and earn 20 AP! 🚀"
                    return res
                return "No events today, but it's a great day to visit the 'Clubs' section! 🌟"

            # --- INTENT: EXPLORE CLUBS ---
            if any(w in inp for w in ["join", "explore club", "which club", "what club", "list club"]):
                # Check for specific club
                best_c = None
                best_s = 0.0
                for c in clubs:
                    s = _title_match_score(inp, c.get('name', ''))
                    if s > best_s:
                        best_s = s
                        best_c = c
                
                if best_c and best_s >= 0.5:
                    return (f"Awesome choice! '{best_c.get('name')}' is a fantastic "
                            f"{best_c.get('category')} club. Go to 'Explore Clubs' to join "
                            f"and start your journey! 🤝")

                if clubs:
                    res = "Finding your tribe is key! Check out these amazing clubs:\n"
                    for c in clubs[:3]:
                        res += f"• **{c.get('name')}** ({c.get('category')})\n"
                    res += "\nGo to 'Explore Clubs' to join for 10 AP! You've got this! 💪"
                    return res
                return "The club list is updating! Try checking the 'Dashboard' soon. 🌈"

            # --- GENERAL GREETING ---
            if any(w in inp for w in ["hi", "hello", "hey", "greetings", "banbot"]):
                return ("Hi there! I'm **BanBot**, your friendly campus guide. "
                        "I can help you find events, join clubs, or answer campus queries. "
                        "What shall we explore today? 🎓")

            # --- MATCH SPECIFIC ITEM ---
            best_e = None; best_es = 0.0
            for e in events:
                s = _title_match_score(inp, e.get('title', ''))
                if s > best_es: best_es = s; best_e = e

            best_c = None; best_cs = 0.0
            for c in clubs:
                s = _title_match_score(inp, c.get('name', ''))
                if s > best_cs: best_cs = s; best_c = c

            if max(best_es, best_cs) >= 0.5:
                if best_es >= best_cs:
                    return (f"'{best_e.get('title')}' is a {best_e.get('category')} event "
                            f"on {best_e.get('date', 'TBA')}. Great for your portfolio! "
                            f"Register in 'Events' and earn 20 AP. 💎")
                else:
                    return (f"'{best_c.get('name')}' is an active {best_c.get('category')} club. "
                            f"Joining it will help you grow! Head to 'Explore Clubs' for 10 AP. 🚀")

            # --- LLM FALLBACK ---
            if self.chatbot:
                prompt = f"Student: {user_input}\nContext: {self.platform_context}\nAnswer (short & friendly):"
                response = self.chatbot(prompt, max_new_tokens=35, repetition_penalty=1.8, truncation=True)
                res = response[0]['generated_text'].split("Answer (short & friendly):")[-1].strip()
            else:
                res = "I'm still optimizing my knowledge base for you! Try asking about 'clubs', 'events', or say 'hi'! 😊"

            # Clean up trailing content
            if "." in res: res = res.split(".")[0] + "."
            
            return res if len(res) > 5 else ("I'm here to help you navigate campus life! Ask me about "
                                              "our clubs or events, or just say 'hi'! 😊")

        except Exception as e:
            log_to_file(f"❌ BANBOT ERROR: {str(e)}\n{traceback.format_exc()}")
            return "I'm BanBot, your campus guide! You can join clubs and register for events right here. Let's grow together! 🌱"