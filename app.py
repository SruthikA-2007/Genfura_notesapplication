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
TABLE_NAME = 'Contacts'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index.html')
def index_alias():
    return render_template('index.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/contact.html')
def contact_alias():
    return render_template('contact.html')

@app.route('/notes')
def notes():
    return render_template('notes.html')

# --- CRUD API ENDPOINTS ---

@app.route('/api/contact', methods=['GET'])
def get_contacts():
    """Fetch all records from Supabase."""
    try:
        response = supabase.table(TABLE_NAME).select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"GET ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/contact', methods=['POST'])
def create_contact():
    """Create a new record in Supabase."""
    try:
        data = request.json
        print(f"POST data received: {data}")
        db_data = {
            "firstName": data.get('firstName'),
            "lastName": data.get('lastName'),
            "Age": int(data.get('age')) if data.get('age') else None,
            "Gender": data.get('gender'),
            "mobileNumber": data.get('mobile'),
            "emailAddress": data.get('email'),
            "Address": data.get('address'),
            "Description": data.get('message')
        }
        print(f"Inserting into '{TABLE_NAME}': {db_data}")
        response = supabase.table(TABLE_NAME).insert(db_data).execute()
        print(f"INSERT response: {response.data}")
        return jsonify({"status": "success", "data": response.data}), 201
    except Exception as e:
        print(f"POST ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/contact/<int:record_id>', methods=['PUT'])
def update_contact(record_id):
    """Update an existing record in Supabase."""
    try:
        data = request.json
        db_data = {
            "firstName": data.get('firstName'),
            "lastName": data.get('lastName'),
            "Age": int(data.get('age')) if data.get('age') else None,
            "Gender": data.get('gender'),
            "mobileNumber": data.get('mobile'),
            "emailAddress": data.get('email'),
            "Address": data.get('address'),
            "Description": data.get('message')
        }
        response = supabase.table(TABLE_NAME).update(db_data).eq('Id', record_id).execute()
        return jsonify({"status": "success", "data": response.data})
    except Exception as e:
        print(f"PUT ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/contact/<int:record_id>', methods=['DELETE'])
def delete_contact(record_id):
    """Delete a record from Supabase."""
    try:
        response = supabase.table(TABLE_NAME).delete().eq('Id', record_id).execute()
        return jsonify({"status": "success", "message": "Record deleted"})
    except Exception as e:
        print(f"DELETE ERROR: {repr(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

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
    """Fetch all history records for the community notes page."""
    try:
        response = supabase.table('History').select("*").order('created_at', desc=True).execute()
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
