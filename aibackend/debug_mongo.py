import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

MONGO_URI = "mongodb+srv://banverseUser:Banverse26%4002@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster"

async def test():
    print("Connecting...")
    client = AsyncIOMotorClient(MONGO_URI)
    try:
        db = client.get_database("test")
        event = await db.events.find_one({}, sort=[("date", -1)])
        if event:
            print(f"Latest event: {event.get('title')} | Date: {event.get('date')} | Type: {type(event.get('date'))}")
            # Compare with today_naive
            today_naive = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            print(f"Today Naive: {today_naive}")
            print(f"Is event >= today? {event.get('date') >= today_naive if event.get('date') else 'N/A'}")
        else:
            print("No events found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test())
