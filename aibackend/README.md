# Banverse AI Recommendation Backend

This is a separate AI-powered recommendation service for the Banverse platform. It uses a Hybrid Recommendation approach combining Content-Based Filtering, Collaborative Filtering, and Student Behavior Tracking.

## Features
- **Hybrid Engine**: Combines content similarity (40%), collaborative filtering (35%), and user behavior (25%).
- **Content-Based Filtering**: Matches student interests with club domains and event categories.
- **Collaborative Filtering**: Finds students with similar interest patterns and recommends things they liked.
- **Behavior Tracking**: Real-time logging of user interactions (clicks, joins, views) to refine recommendations.
- **FastAPI**: High-performance Python backend.

## Structure
- `main.py`: FastAPI application and endpoints.
- `recommendation/`: Core recommendation logic.
  - `hybrid_engine.py`: The aggregator.
  - `content_filter.py`: Jaccard similarity and keywords.
  - `collaborative_filter.py`: User-user filtering.
  - `behavior_tracker.py`: Interaction logging.
- `database/`: MongoDB connection management.

## Setup
1. Install Python 3.9+
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn main:app --port 8000 --reload
   ```

## API Endpoints
- `GET /recommendations/{studentId}`: Get top 5 clubs and events.
- `POST /log-activity`: Track student behavior.
