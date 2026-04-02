from bson import ObjectId
from datetime import datetime, timezone
import random

def log_to_file(msg):
    with open("ai_debug_log.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

async def get_hybrid_recommendations(db, studentId):
    log_to_file(f"\n--- BANVERSE INTELLIGENT HYBRID ENGINE: {studentId} ---")
    
    collection_names = await db.list_collection_names()
    user_coll = "users" if "users" in collection_names else "Users"
    event_coll = "events" if "events" in collection_names else "Events"
    club_coll = "clubs" if "clubs" in collection_names else "Clubs"

    # 1. FETCH BASE DATA
    student = await db[user_coll].find_one({"_id": ObjectId(studentId) if len(str(studentId)) == 24 else studentId})
    if not student: return {"error": "Student not found"}
    
    user_interests = [i.lower() for i in (student.get('interests', []) or [])]
    joined_club_ids = [str(cid) for cid in (student.get('joinedClubs', []) or [])]
    reg_event_ids = [str(eid) for eid in (student.get('registeredEvents', []) or [])]

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    upcoming_events = await db[event_coll].find({"date": {"$gte": today}}).to_list(100)
    
    # Analyze Popularity (Trending)
    sorted_by_popularity = sorted(upcoming_events, key=lambda x: len(x.get('participants', [])), reverse=True)
    trending_ids = [str(e['_id']) for e in sorted_by_popularity[:5]]

    scored_events = []
    
    for event in upcoming_events:
        eid = str(event['_id'])
        if eid in reg_event_ids: continue
        
        title = event.get('title', '')
        cat = event.get('category', '').lower()
        desc = event.get('description', '').lower()
        club_id = str(event.get('club', ''))
        is_sponsored = event.get('isSponsored', False)
        
        # Scoring Logic (Internal weights)
        score = 0.0
        reasons = []
        tags = []

        # Interest match (Highest priority)
        matched_kws = [k for k in user_interests if (k in title.lower() or k in cat or k in desc)]
        if matched_kws:
            score += 5.5
            reasons.append(f"Direct match for your interest in {matched_kws[0].capitalize()}.")
        
        # Behavior match (High priority)
        if club_id in joined_club_ids:
            score += 3.0
            reasons.append("Hosted by a club you've joined.")
            tags.append("Recommended")

        # Popularity match (Medium priority)
        if eid in trending_ids:
            score += 1.5
            reasons.append("High student engagement—currently trending!")
            tags.append("Trending")

        # Recency match (Medium priority)
        days_to_go = (event['date'].replace(tzinfo=timezone.utc) - today).days
        if days_to_go <= 2:
            score += 1.0
            reasons.append("Happening very soon—don't miss out!")
            tags.append("New")

        # Sponsored boost (Slight increase)
        if is_sponsored:
            score += 0.5
            tags.append("Sponsored")

        # Map to 1-10
        final_score = min(10.0, round(score, 1))
        
        # Category diversity check (Discovery logic)
        is_discovery = len(matched_kws) == 0 and score > 2.0
        if is_discovery:
            tags.append("Explore")
            reasons.append("Great way to explore outside your usual interests.")

        # FILTERING RULE: Score must be >= 4.0
        if final_score < 4.0 and not (eid in trending_ids): continue

        scored_events.append({
            "_id": eid,
            "name": title,
            "score": final_score,
            "tags": tags[:3] or ["New"],
            "reasons": reasons[:2] if reasons else ["A fresh activity on Banverse!"],
            "category": event.get('category', 'General'),
            "is_discovery": is_discovery,
            "is_trending": eid in trending_ids
        })

    # --- STRATEGIC SELECTION (Exactly 5 Events) ---
    high_match = [e for e in scored_events if e['score'] >= 7.0 and not e['is_discovery']]
    trending = [e for e in scored_events if e['is_trending']]
    discovery = [e for e in scored_events if e['is_discovery']]

    selection = []
    # 2-3 High Match
    selection.extend(sorted(high_match, key=lambda x: x['score'], reverse=True)[:3])
    # 1 Trending (avoiding duplicates)
    for t in sorted(trending, key=lambda x: x['score'], reverse=True):
        if not any(s['_id'] == t['_id'] for s in selection):
            selection.append(t)
            break
    # 1 Discovery (avoiding duplicates)
    for d in sorted(discovery, key=lambda x: x['score'], reverse=True):
        if not any(s['_id'] == d['_id'] for s in selection):
            selection.append(d)
            break
            
    # Final cleanup if selection is short
    if len(selection) < 5:
        remaining = [e for e in scored_events if not any(s['_id'] == e['_id'] for s in selection)]
        selection.extend(sorted(remaining, key=lambda x: x['score'], reverse=True)[:5-len(selection)])

    # Format output for the intelligent response
    formatted_recs = selection[:5]
    for r in formatted_recs:
        r['priority_score'] = r['score'] # Maintain compatibility
        r['reason'] = f"Reasons:\n- {r['reasons'][0]}" + (f"\n- {r['reasons'][1]}" if len(r['reasons']) > 1 else "")

    # Club Recommendations (High-Impact Filtering)
    user_dept = str(student.get('department', '') or student.get('domain', '')).lower()
    club_recs = []
    all_clubs = await db[club_coll].find({"isActive": True}).to_list(100)
    
    for club in all_clubs:
        cid = str(club['_id'])
        if cid in joined_club_ids: continue
        
        c_name = club.get('name', '').lower()
        c_cat = club.get('category', '').lower()
        
        score = 3.5 # Lower fallback to trigger filtering
        reason = "Expand your horizons with this popular society!"

        # Domain/Department Match
        if user_dept and (user_dept in c_cat or user_dept in c_name):
            score = 9.0
            reason = f"Highly popular among students in your {user_dept.upper()} domain!"
        
        # Interest Match
        elif any(i in c_cat or i in c_name for i in user_interests):
            matched = [i for i in user_interests if (i in c_cat or i in c_name)][0]
            score = 8.5
            reason = f"Perfectly aligns with your interest in {matched.capitalize()}."
        
        # FILTERING RULE: Strictly only show if score > 4.0 (matches domain or interest)
        if score <= 4.0: continue

        club_recs.append({
            "_id": cid,
            "name": club.get('name'),
            "category": club.get('category', 'General'),
            "priority_score": score,
            "reason": reason
        })
    club_recs.sort(key=lambda x: x['priority_score'], reverse=True)

    return {
        "recommended_events": formatted_recs,
        "recommended_clubs": club_recs[:6],
        "message": "Welcome back! Here's your personalized campus guide for today. 🎓",
        "recommended_domains": user_interests
    }
