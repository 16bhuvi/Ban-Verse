# main.py - FIXED FOR FASTAPI & BANVERSE
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from chatbot.chatbot_engine import ChatbotEngine
from database.mongodb_connector import MongoDBConnector
from recommendation.hybrid_engine import get_hybrid_recommendations
from motor.motor_asyncio import AsyncIOMotorClient
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Banverse AI Engine")

# MongoDB Configuration - Ensure we match the Node.js backend exactly
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://banverseUser:Base206%4028@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster")
# We will dynamically find the database name if event_management is empty
DB_NAME = "test" 

client = AsyncIOMotorClient(MONGO_URI)
try:
    db = client.get_default_database()
    if db is None:
        db = client["test"]
except Exception as e:
    db = client["test"]

# Use the asynchronous db for everything
chatbot_engine = ChatbotEngine()
print(f"📡 AI Backend connected to database: {db.name}")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, you can restrict this to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Banverse AI Backend (FastAPI)"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("user_input")
    
    if not user_input:
        raise HTTPException(status_code=400, detail="User input is required")
    
    # Dynamic Database-Driven AI Logic
    bot_response = await chatbot_engine.get_response(user_input, db)

    # Save to history (Asynchronous)
    try:
        await db.chats.insert_one({
            "user_input": user_input, 
            "bot_response": bot_response
        })
    except: pass
    
    return {"bot_response": bot_response}

@app.get("/recommendations/{student_id}")
async def recommendations(student_id: str):
    recs = await get_hybrid_recommendations(db, student_id)
    return recs

@app.post("/log-activity")
async def log_activity(studentId: str, action_type: str, item_id: str, item_type: str):
    if not studentId:
        raise HTTPException(status_code=400, detail="Student ID required")
    
    activity = {
        "studentId": studentId,
        "action": action_type,
        "itemId": item_id,
        "itemType": item_type
    }
    await db.activities.insert_one(activity)
    return {"status": "Activity logged"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)