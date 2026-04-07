import sys
sys.path.append('.')
from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017/')
db = client['banverse']

club = db.clubs.find_one({'name': 'build cv'})
if not club:
    print("Club not found")
    sys.exit(0)

members = list(db.clubmembers.find({'clubId': club['_id']}))
for m in members:
    user = db.users.find_one({'_id': m['userId']})
    role = db.clubroles.find_one({'_id': m.get('roleId')}) if m.get('roleId') else None
    
    print({
        'user': user['fullName'] if user else 'Unknown',
        'membershipType': m.get('membershipType'),
        'role': m.get('role'),
        'customTitle': m.get('customTitle'),
        'roleId': str(m.get('roleId')),
        'permissions': role['permissions'] if role else None
    })
