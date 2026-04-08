# main.py - FIXED FOR FASTAPI & BANVERSE
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from chatbot.chatbot_engine import ChatbotEngine
from database.mongodb_connector import MongoDBConnector
from recommendation.hybrid_engine import get_hybrid_recommendations
from pymongo import MongoClient
import uvicorn
import os
from dotenv import load_dotenv
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

app = FastAPI(title="Banverse AI Engine")

# MongoDB Configuration - must match Node.js/Mongoose default ("test" when no DB in URI)
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://banverseUser:Banverse26%4002@banversecluster.yph1gnu.mongodb.net/?appName=BanverseCluster")
DB_NAME = os.getenv("DB_NAME", "test")  # Mongoose uses "test" by default when no DB in URI

client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]  # Explicit — never accidentally connects to wrong database

# Use the asynchronous db for everything
chatbot_engine = ChatbotEngine()
print(f"✅ AI Backend connected to database: '{DB_NAME}'")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, you can restrict this to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to Banverse AI Backend (FastAPI)"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("user_input")
    
    if not user_input:
        raise HTTPException(status_code=400, detail="User input is required")
    
    # Dynamic Database-Driven AI Logic
    bot_response = chatbot_engine.get_response(user_input, db)

    try:
        db.chats.insert_one({
            "user_input": user_input, 
            "bot_response": bot_response
        })
    except: pass
    
    return {"bot_response": bot_response}

@app.get("/recommendations/{student_id}")
def recommendations(student_id: str):
    recs = get_hybrid_recommendations(db, student_id)
    return recs

@app.post("/log-activity")
def log_activity(studentId: str, action_type: str, item_id: str, item_type: str):
    if not studentId:
        raise HTTPException(status_code=400, detail="Student ID required")
    
    activity = {
        "studentId": studentId,
        "action": action_type,
        "itemId": item_id,
        "itemType": item_type
    }
    db.activities.insert_one(activity)
    return {"status": "Activity logged"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)