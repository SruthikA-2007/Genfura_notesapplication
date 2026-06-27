import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

app = Flask(__name__, 
            template_folder='template', 
            static_folder='static')

# Initialize Supabase Client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# --- IMPORTANT: Set your exact Supabase table name here ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/notes')
def notes():
    return render_template('notes.html')

# --- REGISTER/LOGIN USER ---

import uuid

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user in Supabase or return existing if email match."""
    try:
        data = request.json
        first_name = data.get('firstName')
        last_name = data.get('lastName')
        email = data.get('email')

        # Basic Validation
        if not first_name or not last_name or not email:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        # Create a unique session token
        session_token = str(uuid.uuid4())

        # Check if the user already exists
        existing = supabase.table('Users').select("*").eq('email', email).execute()

        if existing.data and len(existing.data) > 0:
            # Update the existing user with a new session token
            user_id = existing.data[0]['id']
            supabase.table('Users').update({"session_token": session_token}).eq('id', user_id).execute()
            
            updated_user = existing.data[0]
            updated_user['session_token'] = session_token
            return jsonify({
                "status": "success",
                "message": "User already exists",
                "data": updated_user
            }), 200

        # Insert new record
        db_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "session_token": session_token
        }
        
        insert_response = supabase.table('Users').insert(db_data).execute()
        
        return jsonify({
            "status": "success", 
            "message": "User created successfully",
            "data": insert_response.data[0]
        }), 201

    except Exception as e:
        print(f"USER API ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/users/validate', methods=['POST'])
def validate_token():
    """Check if a session token is valid and return the user details."""
    try:
        token = request.json.get('token')
        if not token:
            return jsonify({"status": "error", "message": "Token is required"}), 400

        # Query Supabase for the user associated with this token
        response = supabase.table('Users').select("*").eq('session_token', token).execute()

        if response.data and len(response.data) > 0:
            return jsonify({
                "status": "success",
                "data": response.data[0]
            }), 200
        else:
            # Token does not match any user
            return jsonify({"status": "error", "message": "Invalid token"}), 401

    except Exception as e:
        print(f"VALIDATION ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history', methods=['POST'])
def save_history():
    """Save a chat message to Supabase history linked to the user_id."""
    try:
        data = request.json
        user_id = data.get('userId')
        message = data.get('message')

        # Basic server-side validation
        if not user_id or not message:
            return jsonify({"status": "error", "message": "User ID and message are required"}), 400

        db_data = {
            "user_id": user_id,
            "message": message
        }

        # Insert record into History table
        response = supabase.table('History').insert(db_data).execute()
        
        return jsonify({"status": "success", "data": response.data}), 201
    except Exception as e:
        print(f"HISTORY SAVING ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history_all', methods=['GET'])
def get_all_history():
    """Fetch all history records for the community notes page with user names."""
    try:
        # Using Supabase join to get user details
        response = supabase.table('History').select("*, Users(first_name, last_name)").order('created_at', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history/<int:note_id>', methods=['DELETE'])
def delete_history(note_id):
    """Delete a specific history record."""
    try:
        response = supabase.table('History').delete().eq('id', note_id).execute()
        return jsonify({"status": "success", "message": "Note deleted"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history/<int:note_id>', methods=['PUT'])
def update_history(note_id):
    """Update a specific history record's message."""
    try:
        data = request.json
        new_message = data.get('message')
        if not new_message:
            return jsonify({"status": "error", "message": "Message is required"}), 400
        
        response = supabase.table('History').update({"message": new_message}).eq('id', note_id).execute()
        return jsonify({"status": "success", "message": "Note updated", "data": response.data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/collection')
def collection():
    return render_template('collection.html')

@app.route('/api/notes_grouped', methods=['GET'])
def get_notes_grouped():
    """Fetch all notes grouped by user, sorted alphabetically by name."""
    try:
        response = supabase.table('History').select("*, Users(id, first_name, last_name, email)").order('created_at', desc=True).execute()
        notes = response.data

        # Group notes by user_id
        grouped = {}
        for note in notes:
            user_info = note.get('Users') or {}
            uid = note['user_id']
            name = f"{user_info.get('first_name', 'Unknown')} {user_info.get('last_name', '')}".strip() if user_info else f"User #{uid}"
            email = user_info.get('email', '')

            if uid not in grouped:
                grouped[uid] = {
                    "user_id": uid,
                    "name": name,
                    "email": email,
                    "notes": []
                }
            grouped[uid]["notes"].append({
                "id": note['id'],
                "message": note['message'],
                "created_at": note['created_at']
            })

        # Sort users alphabetically by name
        users_list = sorted(grouped.values(), key=lambda u: u['name'].lower())
        return jsonify(users_list)
    except Exception as e:
        print(f"GROUPED NOTES ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
