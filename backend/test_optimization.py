import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 60)
print("Backend Optimization Tests")
print("=" * 60)

# Test 1: Register user
print("\n[Test 1/10] Register user")
username = f"test_opt_{int(time.time())}"
try:
    register_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "username": username,
            "password": "Test@123456",
            "nickname": "Test Optimizer",
            "email": f"{username}@example.com"
        },
        timeout=30
    )
    print(f"Status: {register_response.status_code}")
    
    if register_response.status_code == 200:
        data = register_response.json()
        print("[PASS] Register success")
        token = data.get("token", {}).get("access_token")
        if not token:
            print("[FAIL] No token in response")
            exit(1)
        headers = {"Authorization": f"Bearer {token}"}
    else:
        print("[FAIL] Register failed")
        exit(1)
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")
    exit(1)

# Test 2: Get categories
print("\n[Test 2/10] Get default categories")
try:
    cats_response = requests.get(f"{BASE_URL}/categories", headers=headers, timeout=30)
    print(f"Status: {cats_response.status_code}")
    
    if cats_response.status_code == 200:
        data = cats_response.json()
        categories = data.get("data", [])
        print(f"[PASS] Got {len(categories)} categories")
    else:
        print("[FAIL] Get categories failed")
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 3: Create account
print("\n[Test 3/10] Create account")
try:
    account_response = requests.post(
        f"{BASE_URL}/accounts",
        json={"name": "Test Account", "account_type": "cash", "initial_balance": 10000.00, "is_default": True},
        headers=headers,
        timeout=30
    )
    print(f"Status: {account_response.status_code}")
    
    if account_response.status_code == 200:
        data = account_response.json()
        print("[PASS] Account created")
        account_id = data.get("data", {}).get("id")
        initial_balance = data.get("data", {}).get("balance", 0)
        print(f"Account ID: {account_id}, Initial Balance: {initial_balance}")
    else:
        print("[FAIL] Account creation failed")
        exit(1)
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")
    exit(1)

# Test 4: Create expense transaction
print("\n[Test 4/10] Create expense transaction")
try:
    tx_response = requests.post(
        f"{BASE_URL}/transactions",
        json={
            "type": "expense",
            "amount": 100.00,
            "from_account_id": account_id,
            "category_id": 1
        },
        headers=headers,
        timeout=30
    )
    print(f"Status: {tx_response.status_code}")
    
    if tx_response.status_code == 200:
        data = tx_response.json()
        print("[PASS] Expense transaction created")
        tx_id = data.get("data", {}).get("id")
        print(f"Transaction ID: {tx_id}")
    else:
        print("[FAIL] Expense transaction creation failed")
        exit(1)
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")
    exit(1)

# Test 5: Check balance after expense
print("\n[Test 5/10] Check balance after expense")
try:
    balance_response = requests.get(f"{BASE_URL}/accounts", headers=headers, timeout=30)
    print(f"Status: {balance_response.status_code}")
    
    if balance_response.status_code == 200:
        data = balance_response.json()
        accounts = data.get("data", {}).get("accounts", [])
        if accounts:
            current_balance = accounts[0].get("balance", 0)
            expected_balance = float(initial_balance) - 100.00
            print(f"Current Balance: {current_balance}")
            print(f"Expected Balance: {expected_balance}")
            
            if abs(float(current_balance) - expected_balance) < 0.01:
                print("[PASS] Balance updated correctly")
            else:
                diff = abs(float(current_balance) - expected_balance)
                print(f"[FAIL] Balance update error, diff: {diff}")
        else:
            print("[FAIL] Cannot get account data")
    else:
        print("[FAIL] Get accounts failed")
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 6: Create income transaction
print("\n[Test 6/10] Create income transaction")
try:
    income_response = requests.post(
        f"{BASE_URL}/transactions",
        json={
            "type": "income",
            "amount": 500.00,
            "to_account_id": account_id,
            "category_id": 3
        },
        headers=headers,
        timeout=30
    )
    print(f"Status: {income_response.status_code}")
    
    if income_response.status_code == 200:
        print("[PASS] Income transaction created")
    else:
        print("[FAIL] Income transaction creation failed")
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 7: Check balance after income
print("\n[Test 7/10] Check balance after income")
try:
    balance_response2 = requests.get(f"{BASE_URL}/accounts", headers=headers, timeout=30)
    print(f"Status: {balance_response2.status_code}")
    
    if balance_response2.status_code == 200:
        data2 = balance_response2.json()
        accounts2 = data2.get("data", {}).get("accounts", [])
        if accounts2:
            current_balance2 = accounts2[0].get("balance", 0)
            expected_balance2 = float(initial_balance) - 100.00 + 500.00
            print(f"Current Balance: {current_balance2}")
            print(f"Expected Balance: {expected_balance2}")
            
            if abs(float(current_balance2) - expected_balance2) < 0.01:
                print("[PASS] Balance updated correctly")
            else:
                diff2 = abs(float(current_balance2) - expected_balance2)
                print(f"[FAIL] Balance update error, diff: {diff2}")
        else:
            print("[FAIL] Cannot get account data")
    else:
        print("[FAIL] Get accounts failed")
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 8: Create transfer transaction
print("\n[Test 8/10] Create transfer transaction")
try:
    transfer_response = requests.post(
        f"{BASE_URL}/transactions",
        json={
            "type": "transfer",
            "amount": 200.00,
            "from_account_id": account_id,
            "to_account_id": account_id
        },
        headers=headers,
        timeout=30
    )
    print(f"Status: {transfer_response.status_code}")
    
    if transfer_response.status_code == 200:
        print("[PASS] Transfer transaction created")
    else:
        print("[FAIL] Transfer transaction creation failed")
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 9: Delete transaction
print("\n[Test 9/10] Delete transaction")
try:
    delete_response = requests.delete(
        f"{BASE_URL}/transactions/{tx_id}",
        headers=headers,
        timeout=30
    )
    print(f"Status: {delete_response.status_code}")
    
    if delete_response.status_code == 200:
        print("[PASS] Transaction deleted")
    else:
        print("[FAIL] Transaction deletion failed")
        exit(1)
        
except Exception as e:
    print(f"[ERROR] Exception: {str(e)}")

# Test 10: Verify balance rollback
print("\n[Test 10/10] Verify balance rollback")
try:
    balance_response3 = requests.get(f"{BASE_URL}/accounts", headers=headers, timeout=30)
    print(f"Status: {balance_response3.status_code}")
    
    if balance_response3.status_code == 200:
        data3 = balance_response3.json()
        accounts3 = data3.get("data", {}).get("accounts", [])
        if accounts3:
            final_balance = accounts3[0].get("balance", 0)
            expected_final_balance = float(initial_balance)
            print(f"Final Balance: {final_balance}")
            print(f"Expected Balance: {expected_final_balance}")
            
            if ab
