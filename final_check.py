import requests, os, json
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

# 1. Get column names via CSV headers
r_csv = requests.get(
    f"{url}/rest/v1/Contacts?select=*&limit=0",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "text/csv"
    }
)

# 2. Get detailed schema via OpenAPI (trying to get individual properties)
r_api = requests.get(
    f"{url}/rest/v1/",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/openapi+json"
    }
)

with open("final_schema_check.txt", "w") as f:
    f.write("--- CSV HEADERS ---\n")
    f.write(r_csv.text + "\n\n")
    
    f.write("--- OPENAPI SCHEMA (Contacts) ---\n")
    try:
        schema = r_api.json()
        props = schema.get("definitions", {}).get("Contacts", {}).get("properties", {})
        f.write(json.dumps(props, indent=2) + "\n")
    except Exception as e:
        f.write(f"Error parsing OpenAPI: {str(e)}\n")

print("Schema results saved to final_schema_check.txt")
