import urllib.request
import json

url = "http://127.0.0.1:8000/recommendations/69a508e2a65131d65a8082f7"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print("SUCCESS:")
        print(json.dumps(result, indent=2))
except Exception as e:
    print(f"FAILED: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
