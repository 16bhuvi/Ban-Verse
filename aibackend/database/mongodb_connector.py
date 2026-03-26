# mongodb_connector.py
from pymongo import MongoClient

class MongoDBConnector:
    def __init__(self, uri="mongodb://localhost:27017", db_name="event_management"):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]

    def save_chat(self, user_input, bot_response):
        chats_collection = self.db["chats"]
        chat_entry = {"user_input": user_input, "bot_response": bot_response}
        chats_collection.insert_one(chat_entry)

    def get_chats(self):
        chats_collection = self.db["chats"]
        return list(chats_collection.find())

# Example usage
if __name__ == "__main__":
    connector = MongoDBConnector()
    connector.save_chat("Hello", "Hi there!")
    print(connector.get_chats())