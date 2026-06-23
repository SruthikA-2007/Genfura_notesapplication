import requests, os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

r = requests.get(
    f"{url}/rest/v1/Contacts?select=*&limit=0",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "text/csv"
    }
)

print("COLUMNS FOUND IN DATABASE:")
print(r.text.strip())
