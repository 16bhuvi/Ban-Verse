from transformers import pipeline
import traceback

def log_to_file(msg):
    with open("ai_debug_log.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# --- Helper: calculate how well a user query matches a title ---
def _title_match_score(inp, title):
    """
    Returns a float 0-1 indicating how well `inp` matches `title`.
    Full-title substring match = 1.0
    Otherwise, fraction of significant title words found in input.
    """
    title_lower = title.lower().strip()
    inp_lower = inp.lower().strip()

    if not title_lower:
        return 0.0

    # Full title match (substring)
    if title_lower in inp_lower:
        return 1.0

    # Word-level match: only count significant words (>= 3 chars)
    title_words = [w for w in title_lower.split() if len(w) >= 3]
    if not title_words:
        return 0.0

    matched = sum(1 for w in title_words if w in inp_lower)
    return matched / len(title_words)


class ChatbotEngine:
    def __init__(self):
        # Initializing the LLM with repetition prevention
        self.chatbot = pipeline("text-generation", model="distilgpt2")
        log_to_file("✅ Chatbot Engine Initialized")
        
        self.platform_context = """
        BANVERSE PLATFORM INFO:
        - PURPOSE: Digital campus hub for Banasthali events & clubs.
        - GAMIFICATION (Points): 10 pts (Join Club), 20 pts (Register Event), 100+ pts (Milestones). 
        - AI RECOMMENDATION: Works on behavioral logic (matching user interests + joined clubs).
        - CLUBS: Aero Club, Tech Hub, Music Society, Dance Club, E-Cell.
        - NAVIGATION: 'Dashboard' for overview, 'Events' for registrations.
        - BENEFITS: Build a digital activity resume, get verified certificates.
        """

    async def get_response(self, user_input, db):
        log_to_file(f"--- CHAT REQUEST: '{user_input}' ---")
        try:
            inp = user_input.lower().strip()
            collection_names = await db.list_collection_names()
            club_coll = "clubs" if "clubs" in collection_names else "Clubs"
            event_coll = "events" if "events" in collection_names else "Events"

            # Fetch data once
            events = await db[event_coll].find().to_list(200)
            clubs = await db[club_coll].find().to_list(100)
            log_to_file(f"Loaded {len(events)} events and {len(clubs)} clubs from DB.")

            # ============================================================
            # STAGE 0: DETECT INTENT — is the user asking about clubs in
            #          general, or about a specific event / club?
            # ============================================================
            club_keywords = ["club", "clubs", "society", "societies", "organization",
                             "all club", "list club", "every club", "which club",
                             "tell me about the clubs", "what clubs", "show clubs"]
            event_keywords = ["event", "events", "all event", "list event",
                              "upcoming event", "what event", "show event"]

            is_club_general = any(k in inp for k in club_keywords)
            is_event_general = any(k in inp for k in event_keywords)

            # --- STAGE 1: GENERAL CLUB LISTING ---
            if is_club_general:
                # First check if the user is asking about a SPECIFIC club by name
                best_club = None
                best_score = 0.0
                for c in clubs:
                    score = _title_match_score(inp, c.get('name', ''))
                    if score > best_score:
                        best_score = score
                        best_club = c

                if best_club and best_score >= 0.5:
                    log_to_file(f"SPECIFIC CLUB MATCH: '{best_club.get('name')}' (score={best_score:.2f})")
                    return (f"'{best_club.get('name')}' is one of our most active "
                            f"{best_club.get('category', 'Groups')}. They focus on "
                            f"{best_club.get('description', 'growth and student life')}. "
                            f"You can join them in the 'Explore Clubs' section for 10 AP!")

                # General club listing
                if clubs:
                    log_to_file(f"LISTING ALL {len(clubs)} clubs.")
                    narrative = "Our campus is home to a vibrant ecosystem of student societies! Currently, you can explore:\n\n"
                    for c in clubs:
                        narrative += (f"• **{c.get('name', 'Unknown')}** — "
                                      f"A {c.get('category', 'General')} hub focused on "
                                      f"{c.get('description', 'empowering students')}.\n")
                    narrative += "\nWhich one of these sparks your interest? Joining one instantly personalizes your AI feed! ✨"
                    return narrative
                return "Our digital campus is currently undergoing a reorganization. Check back soon for the latest club rosters!"

            # --- STAGE 2: GENERAL EVENT LISTING ---
            if is_event_general:
                # Check for a specific event first
                best_event = None
                best_score = 0.0
                for e in events:
                    score = _title_match_score(inp, e.get('title', ''))
                    if score > best_score:
                        best_score = score
                        best_event = e

                if best_event and best_score >= 0.5:
                    log_to_file(f"SPECIFIC EVENT MATCH: '{best_event.get('title')}' (score={best_score:.2f})")
                    dt = best_event.get('date', 'Upcoming')
                    return (f"The '{best_event.get('title')}' is a "
                            f"{best_event.get('category', 'Activity')} event scheduled for {dt}. "
                            f"{best_event.get('description', 'It aims to empower students.')} "
                            f"You can register in the 'Events' section to earn 20 AP!")

                # General event listing
                if events:
                    log_to_file(f"LISTING ALL {len(events)} events.")
                    narrative = "Here are the current events on Banverse:\n\n"
                    for e in events:
                        dt = e.get('date', 'TBA')
                        narrative += (f"• **{e.get('title', 'Untitled')}** ({e.get('category', 'General')}) — "
                                      f"{e.get('description', 'A campus event')} | Date: {dt}\n")
                    narrative += "\nYou can register for any of these in the 'Events' section to earn 20 AP! 🎯"
                    return narrative
                return "There are no upcoming events at the moment. Check back soon!"

            # ============================================================
            # STAGE 3: SPECIFIC EVENT / CLUB SEARCH BY NAME
            #          (user didn't use general keywords, but may be
            #           asking about a specific item by name)
            # ============================================================

            # Score all events
            best_event = None
            best_event_score = 0.0
            for e in events:
                score = _title_match_score(inp, e.get('title', ''))
                if score > best_event_score:
                    best_event_score = score
                    best_event = e

            # Score all clubs
            best_club = None
            best_club_score = 0.0
            for c in clubs:
                score = _title_match_score(inp, c.get('name', ''))
                if score > best_club_score:
                    best_club_score = score
                    best_club = c

            # Pick the better match (threshold >= 0.5 = at least half the words matched)
            MATCH_THRESHOLD = 0.5

            if best_event_score >= MATCH_THRESHOLD and best_event_score >= best_club_score:
                log_to_file(f"MATCH FOUND: Event '{best_event.get('title')}' (score={best_event_score:.2f})")
                dt = best_event.get('date', 'Upcoming')
                return (f"The '{best_event.get('title')}' is a "
                        f"{best_event.get('category', 'Activity')} event scheduled for {dt}. "
                        f"{best_event.get('description', 'It aims to empower students.')} "
                        f"You can find it and register in the 'Events' section to earn 20 AP!")

            if best_club_score >= MATCH_THRESHOLD:
                log_to_file(f"MATCH FOUND: Club '{best_club.get('name')}' (score={best_club_score:.2f})")
                return (f"'{best_club.get('name')}' is one of our most active "
                        f"{best_club.get('category', 'Groups')}. They focus on "
                        f"{best_club.get('description', 'growth and student life')}. "
                        f"You can join them in the 'Explore Clubs' section for 10 AP!")

            # ============================================================
            # STAGE 4: PROFESSIONAL GREETINGS & FAQ
            # ============================================================
            if any(w in inp for w in ["hello", "hi ", "hey", "greetings"]):
                return ("Greetings! I'm BanBot, your dedicated Banasthali campus assistant. "
                        "I can help you discover clubs, events, and earn activity points. "
                        "How can I assist your campus journey today? 🎓")
            
            if any(w in inp for w in ["point", "score", "game", "pts", "ap "]):
                return ("Activity Points (AP) represent your professional 'on-campus' footprint. "
                        "Every club you join (10 AP) and workshop you attend (20 AP) builds your "
                        "verified Activity Resume, which is a key asset for your future placements.")

            if any(w in inp for w in ["certificate", "resume", "cv", "placement", "career"]):
                return ("Banverse is designed to build your professional edge. Every club membership "
                        "and event completion generates a verified digital record. You can download "
                        "your unified 'Activity Resume' from your Profile to showcase to recruiters! 📄")

            if any(w in inp for w in ["what is banverse", "about banverse", "describe banverse",
                                       "what is this", "intro"]):
                return ("Banverse is Banasthali's digital home for student engagement. It's an "
                        "AI-integrated ecosystem where your behavior—the clubs you join and the events "
                        "you attend—dynamically builds your professional portfolio and activity resume.")
            
            # ============================================================
            # STAGE 5: LLM FALLBACK FOR OTHER QUERIES
            # ============================================================
            prompt = f"Student: {user_input}\nContext: {self.platform_context}\nAnswer:"
            response = self.chatbot(
                prompt, max_new_tokens=40, repetition_penalty=1.8, 
                truncation=True, pad_token_id=50256
            )
            
            res = response[0]['generated_text'].split("Answer:")[-1].strip()
            if "Student:" in res: res = res.split("Student:")[0].strip()
            if "." in res: res = res.split(".")[0] + "."
            
            return res if len(res) > 5 else ("I'm connected to the Banasthali database and ready to help "
                                              "you navigate campus life. Ask me anything about our clubs or events!")
        except Exception as e:
            log_to_file(f"❌ CHATBOT ERROR: {str(e)}\n{traceback.format_exc()}")
            return "I am the Banverse Assistant. You can join clubs, register for events, and earn points right here on the platform!"