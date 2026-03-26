from datetime import datetime
from bson import ObjectId
from database.mongodb_connector import get_database

async def log_behavior(studentId, action_type, item_id, item_type, metadata=None):
    """
    Log student behavior for recommendations.
    action_type: 'click', 'view', 'join', 'attend'
    item_type: 'club', 'event', 'domain'
    """
    db = get_database()
    behavior_entry = {
        "studentId": ObjectId(studentId),
        "actionType": action_type,
        "itemId": ObjectId(item_id) if isinstance(item_id, str) and len(item_id) == 24 else item_id,
        "itemType": item_type,
        "timestamp": datetime.utcnow(),
        "metadata": metadata or {}
    }
    await db.behaviors.insert_one(behavior_entry)

async def get_student_behaviors(studentId):
    db = get_database()
    behaviors = await db.behaviors.find({"studentId": ObjectId(studentId)}).to_list(100)
    return behaviors
