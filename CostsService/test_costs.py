import requests

BASE_URL = "http://localhost:3003/api"

def print_result(test_name, response):
    print(f"\n{'='*50}")
    print(f"TEST: {test_name}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print(f"{'='*50}")

print("\n--- TESTING POST /api/add ---\n")

# Test 1 - valid cost item (no date, server uses current time)
print_result(
    "Add valid cost item",
    requests.post(f"{BASE_URL}/add", json={
        "userid": 123123,
        "description": "milk",
        "category": "food",
        "sum": 10
    })
)

# Test 2 - missing required field
print_result(
    "Missing field (no description)",
    requests.post(f"{BASE_URL}/add", json={
        "userid": 123123,
        "category": "food",
        "sum": 10
    })
)

# Test 3 - invalid category
print_result(
    "Invalid category",
    requests.post(f"{BASE_URL}/add", json={
        "userid": 123123,
        "description": "test",
        "category": "cars",
        "sum": 10
    })
)

# Test 4 - user does not exist
print_result(
    "Non-existent user",
    requests.post(f"{BASE_URL}/add", json={
        "userid": 999999,
        "description": "test",
        "category": "food",
        "sum": 10
    })
)

# Test 5 - date in the past
print_result(
    "Past date rejected",
    requests.post(f"{BASE_URL}/add", json={
        "userid": 123123,
        "description": "old item",
        "category": "food",
        "sum": 5,
        "date": "2024-01-01"
    })
)

# Test 6 - add one item per category so the report has data
categories = ["health", "housing", "sports", "education"]
for cat in categories:
    print_result(
        f"Add cost item for category: {cat}",
        requests.post(f"{BASE_URL}/add", json={
            "userid": 123123,
            "description": f"test {cat}",
            "category": cat,
            "sum": 20
        })
    )

print("\n--- TESTING GET /api/report ---\n")

# Test 7 - valid report for current month
import datetime
now = datetime.datetime.now()
print_result(
    "Get report for current month",
    requests.get(f"{BASE_URL}/report", params={
        "id": 123123,
        "year": now.year,
        "month": now.month
    })
)

# Test 8 - missing query parameters
print_result(
    "Missing query params (no month)",
    requests.get(f"{BASE_URL}/report", params={
        "id": 123123,
        "year": now.year
    })
)

# Test 9 - report for a past month (tests Computed Design Pattern)
print_result(
    "Get report for past month (January 2026)",
    requests.get(f"{BASE_URL}/report", params={
        "id": 123123,
        "year": 2026,
        "month": 1
    })
)

# Test 10 - request same past month again (should come from cache)
print_result(
    "Get same past month again - should be cached",
    requests.get(f"{BASE_URL}/report", params={
        "id": 123123,
        "year": 2026,
        "month": 1
    })
)

print("\n--- ALL TESTS DONE ---\n")
