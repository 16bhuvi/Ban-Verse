def calculate_jaccard_similarity(set1, set2):
    if not set1 or not set2:
        return 0.0
    s1 = set(map(str.lower, set1))
    s2 = set(map(str.lower, set2))
    intersection = len(s1.intersection(s2))
    union = len(s1.union(s2))
    return intersection / union if union > 0 else 0.0

async def get_club_content_score(student_interests, club):
    """
    Score a club based on its name, domains and description with category boosting.
    """
    student_interests_lower = [i.lower() for i in student_interests if i]
    club_category = club.get('category', '').lower()
    
    club_terms = {club_category}
    for domain in club.get('domains', []):
        name = domain.get('name', '').lower() if isinstance(domain, dict) else str(domain).lower()
        club_terms.add(name)
    
    match_count = 0
    description = club.get('description', '').lower()
    
    for interest in student_interests_lower:
        if interest in club_terms or interest in description:
            match_count += 1
            
    category_boost = 0
    if any(interest in club_category or club_category in interest for interest in student_interests_lower):
        category_boost = 0.5
        
    tag_similarity = calculate_jaccard_similarity(student_interests_lower, club_terms)
    keyword_score = match_count / len(student_interests_lower) if student_interests_lower else 0
    
    base_score = (tag_similarity * 0.5) + (keyword_score * 0.5)
    return min(1.0, base_score + category_boost)

async def get_event_content_score(student_interests, event):
    """
    Score an event based on how well it matches the student's interests.
    Only recommends events that are genuinely relevant.
    """
    if not student_interests:
        return 0.0

    # Normalize interests: filter empty strings, split compound words
    if isinstance(student_interests, str):
        student_interests = [student_interests]

    interest_keywords = set()
    for item in student_interests:
        if not item or not item.strip():
            continue
        parts = item.lower().replace(',', ' ').replace('/', ' ').split()
        for word in parts:
            if len(word) >= 2:
                interest_keywords.add(word)
        # Also store full phrase if short (e.g. "machine learning")
        if 0 < len(item.split()) <= 3:
            interest_keywords.add(item.lower().strip())

    if not interest_keywords:
        return 0.0

    event_category = event.get('category', '').lower()
    event_domain   = event.get('domain', '').lower()
    title          = event.get('title', '').lower()
    description    = event.get('description', '').lower()
    event_text     = f"{event_category} {event_domain} {title} {description}"

    # --- SEMANTIC / TOPIC MATCH ---
    matches = [kw for kw in interest_keywords if kw in event_text]
    keyword_score = len(matches) / len(interest_keywords) if interest_keywords else 0

    final_score = keyword_score

    # Bonus if an interest keyword directly appears in the title
    if any(kw in title for kw in interest_keywords):
        final_score += 0.4

    return min(1.0, final_score)
