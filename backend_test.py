import requests
import sys
from datetime import datetime, timedelta
import json

class RestaurantPOSAPITester:
    def __init__(self, base_url="https://tableorder-19.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.restaurant_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=True):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
                try:
                    response_data = response.json() if response.content else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.content else {}
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Raw response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_signup(self):
        """Test restaurant signup"""
        test_name = f"test_restaurant_{datetime.now().strftime('%H%M%S')}"
        test_email = f"{test_name}@test.com"
        test_password = "TestPass123!"
        
        success, response = self.run_test(
            "Restaurant Signup",
            "POST",
            "auth/signup",
            200,
            data={
                "restaurant_name": test_name,
                "email": test_email, 
                "password": test_password
            },
            auth=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.restaurant_id = response['restaurant_id']
            self.test_data['restaurant'] = {
                'name': test_name,
                'email': test_email,
                'password': test_password,
                'id': self.restaurant_id
            }
            return True
        return False

    def test_login(self):
        """Test restaurant login"""
        if not self.test_data.get('restaurant'):
            return False
            
        restaurant = self.test_data['restaurant']
        success, response = self.run_test(
            "Restaurant Login",
            "POST", 
            "auth/login",
            200,
            data={
                "email": restaurant['email'],
                "password": restaurant['password']
            },
            auth=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard stats API"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats", 
            200
        )
        
        if success:
            # Verify required fields are present
            required_fields = [
                'live_customers', 'active_tables', 'today_total_sales',
                'today_orders', 'today_visitors', 'monthly_orders',
                'monthly_revenue', 'subscription_status'
            ]
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
                    return False
            return True
        return False

    def test_menu_management(self):
        """Test menu CRUD operations"""
        # Create menu item
        menu_item = {
            "name": "Test Burger",
            "price": 12.99,
            "category": "Mains",
            "is_available": True
        }
        
        success, response = self.run_test(
            "Create Menu Item",
            "POST",
            "menu",
            200,
            data=menu_item
        )
        
        if not success:
            return False
            
        item_id = response.get('id')
        if not item_id:
            print("   ❌ No item ID returned")
            return False
            
        self.test_data['menu_item_id'] = item_id
        
        # Get menu items
        success, response = self.run_test(
            "Get Menu Items", 
            "GET",
            "menu",
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        # Update menu item
        update_data = {
            "price": 15.99,
            "is_available": False
        }
        
        success, response = self.run_test(
            "Update Menu Item",
            "PUT",
            f"menu/{item_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
            
        # Delete menu item
        success, response = self.run_test(
            "Delete Menu Item",
            "DELETE",
            f"menu/{item_id}",
            200
        )
        
        return success

    def test_table_management(self):
        """Test table management"""
        # Create table
        table_data = {
            "table_name": "Test Table 1"
        }
        
        success, response = self.run_test(
            "Create Table",
            "POST", 
            "tables",
            200,
            data=table_data
        )
        
        if not success:
            return False
            
        table_id = response.get('id')
        qr_code = response.get('qr_code')
        
        if not table_id or not qr_code:
            print("   ❌ Missing table ID or QR code")
            return False
            
        self.test_data['table_id'] = table_id
        
        # Get tables
        success, response = self.run_test(
            "Get Tables",
            "GET",
            "tables", 
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        return True

    def test_customer_flow(self):
        """Test customer ordering flow"""
        if not self.test_data.get('table_id'):
            print("   ❌ No table ID available for customer test")
            return False
            
        table_id = self.test_data['table_id']
        
        # Get customer table info
        success, response = self.run_test(
            "Customer Table Info",
            "GET",
            f"customer/table/{table_id}",
            200,
            auth=False
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_keys = ['table', 'restaurant_name', 'menu', 'gallery', 'session_id']
        for key in required_keys:
            if key not in response:
                print(f"   ⚠️  Missing key: {key}")
                return False
                
        # Create sample menu item for ordering
        menu_item = {
            "name": "Test Pizza", 
            "price": 18.50,
            "category": "Mains",
            "is_available": True
        }
        
        success, menu_response = self.run_test(
            "Create Menu Item for Order",
            "POST",
            "menu",
            200,
            data=menu_item
        )
        
        if not success:
            return False
            
        menu_item_id = menu_response.get('id')
        
        # Place customer order
        order_data = {
            "table_id": table_id,
            "items": [
                {
                    "menu_item_id": menu_item_id,
                    "name": "Test Pizza",
                    "price": 18.50,
                    "quantity": 2
                }
            ]
        }
        
        success, response = self.run_test(
            "Place Customer Order",
            "POST",
            "customer/orders",
            200,
            data=order_data,
            auth=False
        )
        
        if success:
            order_id = response.get('id')
            self.test_data['order_id'] = order_id
            
        return success

    def test_order_management(self):
        """Test order management"""
        # Get orders
        success, response = self.run_test(
            "Get Orders",
            "GET",
            "orders",
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        if not self.test_data.get('order_id'):
            print("   ⚠️  No order ID available for status update test")
            return True
            
        order_id = self.test_data['order_id']
        
        # Update order status
        for status in ['preparing', 'served', 'completed']:
            success, response = self.run_test(
                f"Update Order Status to {status}",
                "PUT",
                f"orders/{order_id}",
                200,
                data={"status": status}
            )
            
            if not success:
                return False
                
        return True

    def test_bell_notifications(self):
        """Test bell notification system"""
        if not self.test_data.get('table_id'):
            print("   ⚠️  No table ID available for bell test")
            return True
            
        table_id = self.test_data['table_id']
        
        # Customer calls staff
        success, response = self.run_test(
            "Customer Call Staff",
            "POST", 
            "customer/bell",
            200,
            data={"table_id": table_id},
            auth=False
        )
        
        if not success:
            return False
            
        notification_id = response.get('id')
        
        # Get bell notifications
        success, response = self.run_test(
            "Get Bell Notifications",
            "GET",
            "bell-notifications",
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        if notification_id:
            # Resolve notification
            success, response = self.run_test(
                "Resolve Bell Notification",
                "PUT",
                f"bell-notifications/{notification_id}",
                200
            )
            
            return success
            
        return True

    def test_gallery_management(self):
        """Test gallery management"""
        # Add gallery image
        image_data = {
            "image_url": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400"
        }
        
        success, response = self.run_test(
            "Add Gallery Image",
            "POST",
            "gallery", 
            200,
            data=image_data
        )
        
        if not success:
            return False
            
        image_id = response.get('id')
        
        # Get gallery images
        success, response = self.run_test(
            "Get Gallery Images",
            "GET",
            "gallery",
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        if image_id:
            # Delete gallery image
            success, response = self.run_test(
                "Delete Gallery Image",
                "DELETE",
                f"gallery/{image_id}",
                200
            )
            
            return success
            
        return True

    def test_sales_management(self):
        """Test sales management"""
        # Get sales history
        success, response = self.run_test(
            "Get Sales History",
            "GET",
            "sales/history",
            200
        )
        
        if not success or not isinstance(response, list):
            return False
            
        # Close day
        success, response = self.run_test(
            "Close Day",
            "POST",
            "sales/close-day",
            200
        )
        
        if success:
            # Verify response structure
            required_fields = ['total_sales', 'total_orders', 'avg_order_value', 'total_visitors']
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
                    return False
                    
        return success

    def test_subscription_management(self):
        """Test subscription management"""
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)
        
        subscription_data = {
            "subscription_start": start_date.isoformat(),
            "subscription_end": end_date.isoformat()
        }
        
        success, response = self.run_test(
            "Update Subscription",
            "PUT",
            "subscription",
            200,
            data=subscription_data
        )
        
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete table if created
        if self.test_data.get('table_id'):
            self.run_test(
                "Cleanup - Delete Table",
                "DELETE",
                f"tables/{self.test_data['table_id']}",
                200
            )

def main():
    print("🚀 Starting Restaurant POS API Tests")
    print("=" * 50)
    
    tester = RestaurantPOSAPITester()
    
    # Authentication tests
    if not tester.test_signup():
        print("❌ Signup failed, stopping tests")
        return 1
        
    if not tester.test_login():
        print("❌ Login failed, stopping tests") 
        return 1
        
    # Core functionality tests
    tests = [
        tester.test_dashboard_stats,
        tester.test_menu_management,
        tester.test_table_management,
        tester.test_customer_flow,
        tester.test_order_management,
        tester.test_bell_notifications,
        tester.test_gallery_management,
        tester.test_sales_management,
        tester.test_subscription_management
    ]
    
    for test in tests:
        try:
            if not test():
                print(f"❌ Test {test.__name__} failed")
        except Exception as e:
            print(f"❌ Test {test.__name__} error: {str(e)}")
            
    # Cleanup
    tester.cleanup_test_data()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())