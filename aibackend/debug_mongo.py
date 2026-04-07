import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = "mongodb+srv://banverseUser:Banverse26%4002@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster"

async def test():
    print("Connecting...")
    client = AsyncIOMotorClient(MONGO_URI)
    try:
        dbs = await client.list_database_names()
        print(f"Databases: {dbs}")
        db = client.get_database("test")
        count = await db.events.count_documents({})
        print(f"Events count in 'test': {count}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test())
