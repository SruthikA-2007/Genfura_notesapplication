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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
