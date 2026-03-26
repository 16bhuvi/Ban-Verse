import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from recommendation.hybrid_engine import get_hybrid_recommendations
import os

MONGO_URI = "mongodb+srv://banverseUser:Base206%4028@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster"
STUDENT_ID = "69a508e2a65131d65a8082f7"

async def test():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database("test")
    print(f"Testing AI logic for student {STUDENT_ID} on DB 'test'")
    
    recs = await get_hybrid_recommendations(db, STUDENT_ID)
    print("\nAI RESPONSE:")
    print(recs)
    
    if "recommended_events" in recs:
        print(f"\nFound {len(recs['recommended_events'])} events.")
        for e in recs['recommended_events']:
            print(f"- {e['name']} (Score: {e['match_score']})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test())
