from bson import ObjectId
from datetime import datetime, timezone

def log_to_file(msg):
    with open("ai_debug_log.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")

async def get_hybrid_recommendations(db, studentId):
    log_to_file(f"\n--- BANVERSE HYBRID ENGINE: {studentId} ---")

    collection_names = await db.list_collection_names()
    user_coll = "users" if "users" in collection_names else "Users"
    event_coll = "events" if "events" in collection_names else "Events"
    club_coll = "clubs" if "clubs" in collection_names else "Clubs"
    log_to_file(f"Collections found: {collection_names}")

    # 1. FETCH STUDENT
    try:
        oid = ObjectId(studentId) if len(str(studentId)) == 24 else studentId
        student = await db[user_coll].find_one({"_id": oid})
    except Exception as e:
        log_to_file(f"ObjectId error: {e}")
        student = await db[user_coll].find_one({"_id": studentId})

    if not student:
        log_to_file("Student not found")
        return {"error": "Student not found"}

    user_interests = [i.lower() for i in (student.get('interests', []) or [])]
    joined_club_ids = [str(cid) for cid in (student.get('joinedClubs', []) or [])]
    reg_event_ids = [str(eid) for eid in (student.get('registeredEvents', []) or [])]
    log_to_file(f"Student: {student.get('fullName')}, interests: {user_interests}")

    # CRITICAL FIX: MongoDB stores dates as NAIVE UTC datetimes.
    # Using timezone-aware datetime caused $gte comparison to silently fail → 0 events returned.
    # Must use datetime.utcnow() (naive) for MongoDB date comparisons.
    today_naive = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    upcoming_events = await db[event_coll].find({"date": {"$gte": today_naive}}).to_list(100)
    log_to_file(f"Upcoming events (naive UTC compare): {len(upcoming_events)}")

    # Fallback: if no upcoming events, show most recent events anyway
    if not upcoming_events:
        upcoming_events = await db[event_coll].find({}).sort("date", -1).limit(20).to_list(20)
        log_to_file(f"Fallback recent events: {len(upcoming_events)}")

    # Popularity ranking
    sorted_by_pop = sorted(upcoming_events, key=lambda x: len(x.get('participants', [])), reverse=True)
    trending_ids = {str(e['_id']) for e in sorted_by_pop[:5]}

    scored_events = []

    for event in upcoming_events:
        eid = str(event['_id'])
        if eid in reg_event_ids:
            continue

        title = (event.get('title', '') or '').lower()
        cat = (event.get('category', '') or '').lower()
        desc = (event.get('description', '') or '').lower()
        club_id = str(event.get('club', ''))

        score = 1.0  # Base score — every event gets a chance
        reasons = []
        tags = []

        # Interest match
        matched_kws = [k for k in user_interests if k in title or k in cat or k in desc]
        if matched_kws:
            score += 5.5
            reasons.append(f"Direct match for your interest in {matched_kws[0].capitalize()}.")

        # Club behavior
        if club_id in joined_club_ids:
            score += 3.0
            reasons.append("Hosted by a club you've joined.")
            tags.append("Recommended")

        # Trending
        if eid in trending_ids:
            score += 1.5
            reasons.append("High student engagement—currently trending!")
            tags.append("Trending")

        # Recency (handle both naive and timezone-aware dates from DB)
        event_date = event.get('date')
        if event_date:
            try:
                if hasattr(event_date, 'tzinfo') and event_date.tzinfo is not None:
                    event_date = event_date.replace(tzinfo=None)
                days_to_go = (event_date - today_naive).days
                if 0 <= days_to_go <= 3:
                    score += 1.0
                    reasons.append("Happening very soon—don't miss out!")
                    tags.append("New")
            except Exception:
                pass

        if event.get('isSponsored'):
            score += 0.5
            tags.append("Sponsored")

        final_score = min(10.0, round(score, 1))
        is_discovery = len(matched_kws) == 0 and club_id not in joined_club_ids

        if is_discovery:
            tags.append("Explore")
            if not reasons:
                reasons.append("Great way to explore outside your usual interests.")

        scored_events.append({
            "_id": eid,
            "name": event.get('title', 'Unnamed Event'),
            "score": final_score,
            "tags": (tags[:3] or ["New"]),
            "reasons": reasons[:2] if reasons else ["A fresh activity on Banverse!"],
            "category": event.get('category', 'General'),
            "is_discovery": is_discovery,
            "is_trending": eid in trending_ids
        })

    log_to_file(f"Scored events: {len(scored_events)}")

    # Strategic selection (up to 5 events)
    high_match = [e for e in scored_events if e['score'] >= 5.0 and not e['is_discovery']]
    trending_list = [e for e in scored_events if e['is_trending']]
    discovery_list = [e for e in scored_events if e['is_discovery']]

    selection = []
    selection.extend(sorted(high_match, key=lambda x: x['score'], reverse=True)[:3])

    for t in sorted(trending_list, key=lambda x: x['score'], reverse=True):
        if not any(s['_id'] == t['_id'] for s in selection):
            selection.append(t)
            break

    for d in sorted(discovery_list, key=lambda x: x['score'], reverse=True):
        if not any(s['_id'] == d['_id'] for s in selection):
            selection.append(d)
            break

    if len(selection) < 5:
        remaining = [e for e in scored_events if not any(s['_id'] == e['_id'] for s in selection)]
        selection.extend(sorted(remaining, key=lambda x: x['score'], reverse=True)[:5 - len(selection)])

    formatted_recs = selection[:5]
    for r in formatted_recs:
        r['priority_score'] = r['score']
        r['match_score'] = r['score']  # Fixed: Match script expects this
        r['reason'] = f"Reasons:\n- {r['reasons'][0]}" + (
            f"\n- {r['reasons'][1]}" if len(r['reasons']) > 1 else ""
        )

    # Club Recommendations
    user_dept = (student.get('department', '') or student.get('domain', '') or '').lower()
    all_clubs = await db[club_coll].find({"isActive": True}).to_list(100)
    log_to_file(f"Active clubs: {len(all_clubs)}")

    club_recs = []
    for club in all_clubs:
        cid = str(club['_id'])
        if cid in joined_club_ids:
            continue

        c_name = (club.get('name', '') or '').lower()
        c_cat = (club.get('category', '') or '').lower()

        score = 3.5
        reason = "Expand your horizons with this popular society!"

        if user_dept and (user_dept in c_cat or user_dept in c_name):
            score = 9.0
            reason = f"Highly popular among students in your {user_dept.upper()} domain!"
        elif any(i in c_cat or i in c_name for i in user_interests):
            matched = next(i for i in user_interests if i in c_cat or i in c_name)
            score = 8.5
            reason = f"Perfectly aligns with your interest in {matched.capitalize()}."

        club_recs.append({
            "_id": cid,
            "name": club.get('name', 'Unknown Club'),
            "category": club.get('category', 'General'),
            "priority_score": score,
            "reason": reason
        })

    club_recs.sort(key=lambda x: x['priority_score'], reverse=True)
    log_to_file(f"Returning {len(formatted_recs)} events, {len(club_recs[:6])} clubs")

    return {
        "recommended_events": formatted_recs,
        "recommended_clubs": club_recs[:6],
        "message": "Welcome back! Here's your personalized campus guide for today. 🎓",
        "recommended_domains": user_interests
    }
