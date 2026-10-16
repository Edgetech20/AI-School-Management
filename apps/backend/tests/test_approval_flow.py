#!/usr/bin/env python3
"""Test script to validate the approval workflow for adaptive samples."""

import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError

BASE_URL = "http://localhost:8000/api/v1"

def login():
    """Login and get access token."""
    login_url = f'{BASE_URL}/auth/login'
    post_data = urllib.parse.urlencode({
        'username': 'admin',
        'password': 'Admin@123'
    }).encode()
    req = urllib.request.Request(
        login_url,
        data=post_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            token = json.loads(body)['access_token']
            print(f"✓ Logged in successfully")
            return token
    except HTTPError as e:
        print(f"✗ Login failed: {e.status} {e.reason}")
        print(f"  Response: {e.read().decode()}")
        raise

def get_pending_reviews(token):
    """Get list of pending reviews."""
    url = f'{BASE_URL}/attendance/recognition/review-queue'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"✓ Got {len(data)} pending reviews")
            return data
    except HTTPError as e:
        print(f"✗ Failed to get reviews: {e.status} {e.reason}")
        print(f"  Response: {e.read().decode()}")
        raise

def approve_review(token, review_id, note="Test approval"):
    """Approve a specific review."""
    url = f'{BASE_URL}/attendance/recognition/review-queue/{review_id}/approve'
    payload = json.dumps({"note": note}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        method='POST',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"\n✓ Approval response for review {review_id}:")
            print(f"  - approved: {data['approved']}")
            print(f"  - adaptive_learned: {data['adaptive_learned']}")
            print(f"  - learning_status: {data['learning_status']}")
            return data
    except HTTPError as e:
        body = e.read().decode()
        print(f"✗ Approval failed: {e.status} {e.reason}")
        print(f"  Response: {body}")
        raise

def get_metrics(token):
    """Get recognition metrics."""
    url = f'{BASE_URL}/attendance/recognition-metrics'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"\n✓ Recognition metrics:")
            print(f"  - Total samples: {data['total_samples']}")
            print(f"  - Adaptive samples: {data['adaptive_samples_count']}")
            print(f"  - Accuracy: {data['accuracy_percent']}%")
            print(f"  - Total students: {data['total_students']}")
            return data
    except HTTPError as e:
        print(f"✗ Failed to get metrics: {e.status} {e.reason}")
        raise

if __name__ == "__main__":
    try:
        print("=" * 60)
        print("ADAPTIVE SAMPLE APPROVAL WORKFLOW TEST")
        print("=" * 60)
        
        # Step 1: Login
        print("\n[1] Authenticating...")
        token = login()
        
        # Step 2: Get metrics before
        print("\n[2] Getting initial metrics...")
        metrics_before = get_metrics(token)
        
        # Step 3: Get pending reviews
        print("\n[3] Checking for pending reviews...")
        reviews = get_pending_reviews(token)
        
        if not reviews:
            print("   No pending reviews found. Please scan a face with confidence 80-95%")
            print("   to trigger a review.")
            exit(0)
        
        # Step 4: Approve first review
        print(f"\n[4] Approving first review (ID: {reviews[0]['id']})...")
        approval = approve_review(token, reviews[0]['id'])
        
        # Step 5: Get metrics after
        print("\n[5] Getting metrics after approval...")
        metrics_after = get_metrics(token)
        
        # Step 6: Verify improvement
        print("\n[6] VERIFICATION:")
        adaptive_before = metrics_before['adaptive_samples_count']
        adaptive_after = metrics_after['adaptive_samples_count']
        print(f"   Adaptive samples before: {adaptive_before}")
        print(f"   Adaptive samples after:  {adaptive_after}")
        
        if adaptive_after > adaptive_before:
            print(f"   ✓ SUCCESS: {adaptive_after - adaptive_before} new adaptive sample(s) created!")
        elif approval['adaptive_learned']:
            print(f"   ✓ PARTIAL: Approval succeeded but metrics not updated yet")
        else:
            print(f"   ✗ FAILED: {approval['learning_status']}")
            
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
