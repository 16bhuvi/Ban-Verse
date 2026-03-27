from bson import ObjectId
from datetime import datetime, timezone
from recommendation.content_filter import get_club_content_score, get_event_content_score

def log_to_file(msg):
    with open("ai_debug_log.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

async def get_hybrid_recommendations(db, studentId):
    log_to_file(f"\n--- AI RECOMMENDATION REQUEST: {studentId} ---")
    
    # 1. FETCH COLLECTIONS (Robust Handling)
    collection_names = await db.list_collection_names()
    user_coll = "users" if "users" in collection_names else "Users"
    event_coll = "events" if "events" in collection_names else "Events"
    club_coll = "clubs" if "clubs" in collection_names else "Clubs"

    # Fetch Student
    student = None
    try:
        query_id = ObjectId(studentId) if isinstance(studentId, str) and len(studentId) == 24 else studentId
        student = await db[user_coll].find_one({"_id": query_id})
    except:
        student = await db[user_coll].find_one({"_id": studentId})
        
    if not student:
        log_to_file(f"CRITICAL ERROR: Student {studentId} not found in collection '{user_coll}'")
        return {"error": "Student not found"}
    
    # 2. COLLECT REAL BEHAVIORAL DATA
    user_interests = student.get('interests', [])
    if isinstance(user_interests, str): user_interests = [user_interests]
    
    joined_club_ids = student.get('joinedClubs', [])
    club_keywords = []
    if joined_club_ids:
        for cid in joined_club_ids:
            try:
                c_id = ObjectId(str(cid)) if len(str(cid)) == 24 else cid
                club_doc = await db[club_coll].find_one({"_id": c_id})
                if club_doc:
                    club_keywords.append(club_doc.get('name', ''))
                    club_keywords.append(club_doc.get('category', ''))
            except: pass

    reg_event_ids = student.get('registeredEvents', [])
    event_keywords = []
    if reg_event_ids:
        for eid in reg_event_ids:
            try:
                e_id = ObjectId(str(eid)) if len(str(eid)) == 24 else eid
                event_doc = await db[event_coll].find_one({"_id": e_id})
                if event_doc: event_keywords.append(event_doc.get('category', ''))
            except: pass

    # COMBINE FOR TRUE PERSONALIZATION
    interests = list(set([str(i).lower().strip() for i in (user_interests + club_keywords + event_keywords) if i]))
    registered = [str(rid) for rid in (reg_event_ids or [])]
    
    # 3. FETCH ONLY UPCOMING EVENTS (today and future) & MATCH
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    all_events = await db[event_coll].find({"date": {"$gte": today}}).sort("date", 1).to_list(200)
    log_to_file(f"Analyzing {len(all_events)} upcoming events (from {today.date()}) for user activity matching.")
    
    # 3. Recommendation Logic
    recs = []
    for event in all_events:
        eid = str(event['_id'])
        title = event.get('title', 'Event')

        # Skip events the user has already registered for
        if eid in registered:
            log_to_file(f"SKIPPING '{title}': User already registered.")
            continue

        # Ensure we use lowercase for matching
        low_interests = [i.lower().strip() for i in interests if i]
        
        # 3. RE-BALANCED SCORING (Single Pass Logic)
        base_score = 0.05 
        is_relevant = False
        
        event_title = event.get('title', '').lower()
        event_desc = event.get('description', '').lower()
        event_cat = event.get('category', '').lower()
        
        # Robust Club ID Extraction
        club_id_val = event.get('club')
        event_club_id_str = str(club_id_val)
        user_joined_ids = [str(cid) for cid in joined_club_ids]
        
        # KEYWORD MATCHING: Search Title, Description, and Category
        for kw in low_interests:
            if kw in event_title: 
                base_score += 0.65 # Title is the strongest signal
                is_relevant = True
            if kw in event_cat:
                base_score += 0.4
                is_relevant = True
            if kw in event_desc:
                base_score += 0.2
                is_relevant = True
        
        # CLUB BEHAVIOR LAYER: Loyalty boost if from their own club
        if event_club_id_str in user_joined_ids:
            base_score += 0.35 
            is_relevant = True
            log_to_file(f"BEHAVIORAL MATCH: Event '{title}' from joined club.")

        # FINAL CALIBRATION
        if not is_relevant:
            continue
            
        final_score = min(1.0, base_score)
        log_to_file(f"Event '{title}': Final Match Score {final_score:.2f}")
            
        # Get Club Name for Display
        club_name = "Campus Club"
        if club_id_val:
            if isinstance(club_id_val, dict):
                club_name = club_id_val.get('name', "Campus Club")
            else:
                try:
                    c_id = ObjectId(event_club_id_str) if len(event_club_id_str) == 24 else club_id_val
                    target_club = await db[club_coll].find_one({"_id": c_id})
                    if target_club: club_name = target_club.get('name', "Campus Club")
                except: pass
            
        recs.append({
            "_id": eid,
            "name": title,
            "match_score": final_score,
            "category": event.get('category', 'General'),
            "clubName": club_name
        })
        
    # --- FINAL FALLBACK: If no behavioral matches, show top upcoming events ---
    if not recs:
        log_to_file("FALLBACK: No personalized matches. Returning top upcoming events.")
        top_events = await db[event_coll].find({"date": {"$gte": today}}).sort("date", 1).to_list(10)
        for event in top_events:
            recs.append({
                "_id": str(event['_id']),
                "name": event.get('title', 'Campus Event'),
                "match_score": 0.5, # Default match
                "category": event.get('category', 'General'),
                "clubName": "Suggested for You"
            })
            
    recs.sort(key=lambda x: x['match_score'], reverse=True)
    final_recs = recs[:10]
    
    # --- PHASE 4: CLUB RECOMMENDATIONS (Precision Align) ---
    recommended_clubs = []
    all_clubs = await db[club_coll].find({"isActive": True}).to_list(100)
    
    # If no clubs found yet, get any clubs
    if not all_clubs:
        all_clubs = await db[club_coll].find().to_list(20)

    for club in all_clubs:
        club_id = str(club['_id'])
        c_name = club.get('name', '')
        c_cat = club.get('category', '').lower()
        
        c_score = 0.05
        text_blob = f"{c_name} {c_cat}".lower()
        
        # Only boost if it matches interests or behavioral history
        has_match = False
        for kw in interests:
            if kw in text_blob: 
                c_score += 0.4
                has_match = True
            
        if club_id in [str(c) for c in joined_club_ids]:
            c_score += 0.5 # High match if already a member
            has_match = True
            
        if has_match or not recs: # Fallback: always show some clubs if list is empty
            recommended_clubs.append({
                "_id": club_id,
                "name": c_name,
                "category": club.get('category', 'General'),
                "logo": club.get('logo', ''),
                "match_score": min(0.99, c_score + (0.3 if not has_match else 0))
            })
            
    if not recommended_clubs and all_clubs:
        for club in all_clubs[:6]:
             recommended_clubs.append({
                "_id": str(club['_id']),
                "name": club.get('name', ''),
                "category": club.get('category', 'General'),
                "logo": club.get('logo', ''),
                "match_score": 0.4
            })

    recommended_clubs.sort(key=lambda x: x['match_score'], reverse=True)
    
    return {
        "recommended_clubs": recommended_clubs[:6],
        "recommended_domains": interests,
        "recommended_events": final_recs
    }
