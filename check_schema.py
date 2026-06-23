import requests, os, json
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}

# We know "firstName" exists from the hint. Let's probe with camelCase names.
# Try inserting with just firstName to find next required column
test_data = {"firstName": "test"}
results = []

for i in range(12):
    r = requests.post(f"{url}/rest/v1/Contacts", headers=headers, json=test_data)
    resp = r.json()
    
    if r.status_code == 201:
        results.append(f"SUCCESS with: {json.dumps(test_data)}")
        if isinstance(resp, list) and resp:
            results.append(f"All columns returned: {list(resp[0].keys())}")
            results.append(f"Full row: {json.dumps(resp[0], indent=2)}")
            # Clean up
            row_id = resp[0].get("id")
            if row_id:
                requests.delete(f"{url}/rest/v1/Contacts?id=eq.{row_id}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
                results.append(f"Deleted test row id={row_id}")
        break
    else:
        msg = resp.get("message", "")
        hint = resp.get("hint", "")
        code = resp.get("code", "")
        results.append(f"Error: code={code}, message={msg}, hint={hint}")
        
        if "not-null constraint" in msg:
            col = msg.split('"')[1]
            results.append(f"  -> Required column found: {col}")
            test_data[col] = "test"
        elif "PGRST204" in code:
            results.append(f"  -> Column not found in schema")
            break
        else:
            break

with open("schema_output.txt", "w") as f:
    for line in results:
        f.write(line + "\n")

print("Done - check schema_output.txt")
