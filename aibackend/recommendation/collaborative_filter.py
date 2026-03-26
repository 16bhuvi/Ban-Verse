from bson import ObjectId
from recommendation.content_filter import calculate_jaccard_similarity

async def get_similar_students(db, studentId, student_interests, top_n=10):
    """
    Find students with similar interests to the current student.
    Uses Jaccard similarity on interest sets.
    """
    all_students = await db.users.find({"_id": {"$ne": ObjectId(studentId)}}).to_list(100)
    
    similarities = []
    for other in all_students:
        other_interests = other.get('interests', [])
        sim = calculate_jaccard_similarity(student_interests, other_interests)
        if sim > 0:
            similarities.append((other["_id"], sim, other.get('joinedClubs', []), other.get('registeredEvents', [])))
    
    # Sort by similarity
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_n]

async def get_collaborative_scores(db, studentId, student_interests):
    """
    Calculate collaborative scores for clubs and events based on similar students.
    Returns:
    {
       "clubs": {clubId: score, ...},
       "events": {eventId: score, ...}
    }
    """
    similar_students = await get_similar_students(db, studentId, student_interests)
    
    club_counts = {}
    event_counts = {}
    
    for other_id, similarity, joined_clubs, registered_events in similar_students:
        # Increase score for items from more similar users
        for clubId in joined_clubs:
            clubId_str = str(clubId)
            club_counts[clubId_str] = club_counts.get(clubId_str, 0) + similarity
            
        for eventId in registered_events:
            eventId_str = str(eventId)
            event_counts[eventId_str] = event_counts.get(eventId_str, 0) + similarity
            
    # Normalize scores (simple max-score normalization)
    def normalize(counts_dict):
        if not counts_dict: return {}
        max_val = max(counts_dict.values())
        return {k: v / max_val for k, v in counts_dict.items()}
    
    return {
        "clubs": normalize(club_counts),
        "events": normalize(event_counts)
    }
