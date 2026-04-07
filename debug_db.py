import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = "mongodb+srv://banverseUser:Base206%4028@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster"

async def debug_data():
    client = AsyncIOMotorClient(MONGO_URI)
    
    # Check all DBs
    dbs = await client.list_database_names()
    print(f"AVAILABLE_DBS: {dbs}")
    
    for db_name in dbs:
        if db_name in ["admin", "local", "config"]: continue
        db = client.get_database(db_name)
        
        # Check users
        users = await db.users.find().to_list(10)
        print(f"\n--- DB: {db_name} ---")
        print(f"USERS_COUNT: {await db.users.count_documents({})}")
        for u in users:
            print(f"USER: {u.get('fullName')} (ID: {u.get('_id')}), Interests: {u.get('interests')}")
            
        # Check events
        events = await db.events.find().to_list(10)
        print(f"EVENTS_COUNT: {await db.events.count_documents({})}")
        for e in events:
            print(f"EVENT: {e.get('title')}, CAT: {e.get('category')}, DOMAIN: {e.get('domain')}")

    client.close()
if __name__ == "__main__":
    asyncio.run(debug_data())
