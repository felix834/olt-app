#!/usr/bin/env python3
"""
OLT Management App Backend API Test Suite
Tests all backend APIs including authentication, OLT monitoring, customer management,
ONU management, fault management, AI support, and analytics.
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://pdf-app-builder-36.preview.emergentagent.com/api"
TIMEOUT = 30

# Test credentials from test_credentials.md
OPERATOR_CREDENTIALS = {
    "email": "operator@olt.com",
    "password": "operator123"
}

FIELD_ENGINEER_CREDENTIALS = {
    "email": "field@olt.com", 
    "password": "field123"
}

class OLTTestSuite:
    def __init__(self):
        self.operator_token = None
        self.field_engineer_token = None
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, token: str = None, data: dict = None, params: dict = None) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, params=params)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response.status_code, response.json() if response.content else {}
        except requests.exceptions.RequestException as e:
            return 500, {"error": str(e)}
        except json.JSONDecodeError:
            return response.status_code, {"error": "Invalid JSON response"}

    def test_authentication(self):
        """Test authentication endpoints"""
        print("=== Testing Authentication ===")
        
        # Test operator login
        status, data = self.make_request("POST", "/auth/login", data=OPERATOR_CREDENTIALS)
        if status == 200 and "access_token" in data:
            self.operator_token = data["access_token"]
            user_data = data.get("user", {})
            self.log_test(
                "Operator Login", 
                True, 
                f"Logged in as {user_data.get('name', 'Unknown')} with role {user_data.get('role', 'Unknown')}"
            )
        else:
            self.log_test("Operator Login", False, f"Status: {status}", data)
            
        # Test field engineer login
        status, data = self.make_request("POST", "/auth/login", data=FIELD_ENGINEER_CREDENTIALS)
        if status == 200 and "access_token" in data:
            self.field_engineer_token = data["access_token"]
            user_data = data.get("user", {})
            self.log_test(
                "Field Engineer Login", 
                True, 
                f"Logged in as {user_data.get('name', 'Unknown')} with role {user_data.get('role', 'Unknown')}"
            )
        else:
            self.log_test("Field Engineer Login", False, f"Status: {status}", data)
            
        # Test /auth/me with operator token
        if self.operator_token:
            status, data = self.make_request("GET", "/auth/me", token=self.operator_token)
            if status == 200 and "email" in data:
                self.log_test("Get Current User (Operator)", True, f"Retrieved user: {data.get('email')}")
            else:
                self.log_test("Get Current User (Operator)", False, f"Status: {status}", data)
                
        # Test /auth/me with field engineer token
        if self.field_engineer_token:
            status, data = self.make_request("GET", "/auth/me", token=self.field_engineer_token)
            if status == 200 and "email" in data:
                self.log_test("Get Current User (Field Engineer)", True, f"Retrieved user: {data.get('email')}")
            else:
                self.log_test("Get Current User (Field Engineer)", False, f"Status: {status}", data)

    def test_olt_monitoring(self):
        """Test OLT monitoring endpoints"""
        print("=== Testing OLT Monitoring ===")
        
        if not self.operator_token:
            self.log_test("OLT Monitoring", False, "No operator token available")
            return
            
        # Test get all OLTs
        status, data = self.make_request("GET", "/olts", token=self.operator_token)
        if status == 200 and isinstance(data, list):
            olt_count = len(data)
            self.log_test("Get All OLTs", True, f"Retrieved {olt_count} OLT devices")
            
            # Test get specific OLT if we have any
            if olt_count > 0:
                olt_id = data[0].get("id")
                if olt_id:
                    status, olt_data = self.make_request("GET", f"/olts/{olt_id}", token=self.operator_token)
                    if status == 200 and "name" in olt_data:
                        self.log_test("Get Specific OLT", True, f"Retrieved OLT: {olt_data.get('name')}")
                        
                        # Test get OLT ports
                        status, ports_data = self.make_request("GET", f"/olts/{olt_id}/ports", token=self.operator_token)
                        if status == 200 and isinstance(ports_data, list):
                            self.log_test("Get OLT Ports", True, f"Retrieved {len(ports_data)} ports")
                        else:
                            self.log_test("Get OLT Ports", False, f"Status: {status}", ports_data)
                    else:
                        self.log_test("Get Specific OLT", False, f"Status: {status}", olt_data)
        else:
            self.log_test("Get All OLTs", False, f"Status: {status}", data)

    def test_customer_management(self):
        """Test customer management endpoints"""
        print("=== Testing Customer Management ===")
        
        if not self.operator_token:
            self.log_test("Customer Management", False, "No operator token available")
            return
            
        # Test get all customers
        status, data = self.make_request("GET", "/customers", token=self.operator_token)
        if status == 200 and isinstance(data, list):
            customer_count = len(data)
            self.log_test("Get All Customers", True, f"Retrieved {customer_count} customers")
            
            # Test customer search
            if customer_count > 0:
                first_customer = data[0]
                search_term = first_customer.get("name", "").split()[0] if first_customer.get("name") else ""
                if search_term:
                    status, search_data = self.make_request("GET", "/customers", token=self.operator_token, params={"search": search_term})
                    if status == 200 and isinstance(search_data, list):
                        self.log_test("Customer Search", True, f"Search for '{search_term}' returned {len(search_data)} results")
                    else:
                        self.log_test("Customer Search", False, f"Status: {status}", search_data)
                
                # Test get specific customer
                customer_id = first_customer.get("customer_id") or first_customer.get("id")
                if customer_id:
                    status, customer_data = self.make_request("GET", f"/customers/{customer_id}", token=self.operator_token)
                    if status == 200 and "name" in customer_data:
                        self.log_test("Get Specific Customer", True, f"Retrieved customer: {customer_data.get('name')}")
                    else:
                        self.log_test("Get Specific Customer", False, f"Status: {status}", customer_data)
        else:
            self.log_test("Get All Customers", False, f"Status: {status}", data)

    def test_onu_management(self):
        """Test ONU management endpoints"""
        print("=== Testing ONU Management ===")
        
        if not self.operator_token:
            self.log_test("ONU Management", False, "No operator token available")
            return
            
        # First get a customer to test ONU endpoints
        status, customers = self.make_request("GET", "/customers", token=self.operator_token)
        if status == 200 and isinstance(customers, list) and len(customers) > 0:
            customer = customers[0]
            customer_id = customer.get("customer_id")
            
            if customer_id:
                # Test get customer ONUs
                status, onus = self.make_request("GET", f"/onus/customer/{customer_id}", token=self.operator_token)
                if status == 200 and isinstance(onus, list):
                    self.log_test("Get Customer ONUs", True, f"Retrieved {len(onus)} ONUs for customer {customer_id}")
                    
                    # Test get specific ONU if we have any
                    if len(onus) > 0:
                        onu = onus[0]
                        onu_id = onu.get("onu_id") or onu.get("id")
                        if onu_id:
                            status, onu_data = self.make_request("GET", f"/onus/{onu_id}", token=self.operator_token)
                            if status == 200 and "onu_id" in onu_data:
                                self.log_test("Get Specific ONU", True, f"Retrieved ONU: {onu_data.get('onu_id')}")
                                
                                # Test MAC unbind (only if ONU is online to avoid breaking things)
                                if onu_data.get("status") == "online":
                                    unbind_data = {"reason": "Testing MAC unbind functionality"}
                                    status, unbind_result = self.make_request("POST", f"/onus/{onu_id}/unbind-mac", token=self.operator_token, data=unbind_data)
                                    if status == 200 and "message" in unbind_result:
                                        self.log_test("MAC Unbind", True, f"Successfully unbound MAC for ONU {onu_id}")
                                    else:
                                        self.log_test("MAC Unbind", False, f"Status: {status}", unbind_result)
                            else:
                                self.log_test("Get Specific ONU", False, f"Status: {status}", onu_data)
                else:
                    self.log_test("Get Customer ONUs", False, f"Status: {status}", onus)
        else:
            self.log_test("ONU Management Setup", False, "No customers available for ONU testing")

    def test_fault_management(self):
        """Test fault management endpoints"""
        print("=== Testing Fault Management ===")
        
        if not self.operator_token:
            self.log_test("Fault Management", False, "No operator token available")
            return
            
        # Test get all faults
        status, faults = self.make_request("GET", "/faults", token=self.operator_token)
        if status == 200 and isinstance(faults, list):
            fault_count = len(faults)
            self.log_test("Get All Faults", True, f"Retrieved {fault_count} fault tickets")
            
            # Test fault filtering
            status, open_faults = self.make_request("GET", "/faults", token=self.operator_token, params={"status": "open"})
            if status == 200 and isinstance(open_faults, list):
                self.log_test("Filter Faults by Status", True, f"Retrieved {len(open_faults)} open faults")
            else:
                self.log_test("Filter Faults by Status", False, f"Status: {status}", open_faults)
                
            # Test create fault (operator only)
            customers_status, customers = self.make_request("GET", "/customers", token=self.operator_token)
            if customers_status == 200 and isinstance(customers, list) and len(customers) > 0:
                customer_id = customers[0].get("customer_id")
                fault_data = {
                    "customer_id": customer_id,
                    "fault_type": "No Internet",
                    "description": "Customer reports complete internet outage since morning",
                    "priority": "high"
                }
                status, new_fault = self.make_request("POST", "/faults", token=self.operator_token, data=fault_data)
                if status == 200 and "ticket_id" in new_fault:
                    self.log_test("Create Fault Ticket", True, f"Created fault ticket: {new_fault.get('ticket_id')}")
                    
                    # Test get specific fault
                    fault_id = new_fault.get("id")
                    if fault_id:
                        status, fault_detail = self.make_request("GET", f"/faults/{fault_id}", token=self.operator_token)
                        if status == 200 and "ticket_id" in fault_detail:
                            self.log_test("Get Specific Fault", True, f"Retrieved fault: {fault_detail.get('ticket_id')}")
                            
                            # Test update fault
                            update_data = {
                                "status": "assigned",
                                "assigned_to": "675b8b8b8b8b8b8b8b8b8b8b",  # Mock field engineer ID
                                "resolution_notes": "Assigned to field engineer for investigation"
                            }
                            status, update_result = self.make_request("PUT", f"/faults/{fault_id}", token=self.operator_token, data=update_data)
                            if status == 200:
                                self.log_test("Update Fault Ticket", True, "Successfully updated fault ticket")
                            else:
                                self.log_test("Update Fault Ticket", False, f"Status: {status}", update_result)
                        else:
                            self.log_test("Get Specific Fault", False, f"Status: {status}", fault_detail)
                else:
                    self.log_test("Create Fault Ticket", False, f"Status: {status}", new_fault)
            else:
                self.log_test("Fault Management Setup", False, "No customers available for fault testing")
                
        else:
            self.log_test("Get All Faults", False, f"Status: {status}", faults)
            
        # Test field engineer access
        if self.field_engineer_token:
            status, field_faults = self.make_request("GET", "/faults", token=self.field_engineer_token, params={"assigned_to_me": True})
            if status == 200 and isinstance(field_faults, list):
                self.log_test("Field Engineer - Get Assigned Faults", True, f"Retrieved {len(field_faults)} assigned faults")
            else:
                self.log_test("Field Engineer - Get Assigned Faults", False, f"Status: {status}", field_faults)

    def test_ai_support(self):
        """Test AI support endpoints"""
        print("=== Testing AI Support ===")
        
        if not self.operator_token:
            self.log_test("AI Support", False, "No operator token available")
            return
            
        # Test AI chat
        chat_data = {
            "message": "What should I check if a customer reports slow internet speed?",
            "context": "Customer troubleshooting"
        }
        status, ai_response = self.make_request("POST", "/ai/chat", token=self.operator_token, data=chat_data)
        if status == 200 and "response" in ai_response:
            response_text = ai_response.get("response", "")
            self.log_test("AI Chat", True, f"AI responded with {len(response_text)} characters")
        else:
            self.log_test("AI Chat", False, f"Status: {status}", ai_response)

    def test_analytics(self):
        """Test analytics endpoints"""
        print("=== Testing Analytics ===")
        
        if not self.operator_token:
            self.log_test("Analytics", False, "No operator token available")
            return
            
        # Test fault analytics (operator only)
        status, fault_analytics = self.make_request("GET", "/analytics/faults", token=self.operator_token)
        if status == 200 and "total_faults" in fault_analytics:
            total = fault_analytics.get("total_faults", 0)
            resolution_rate = fault_analytics.get("resolution_rate", 0)
            self.log_test("Fault Analytics", True, f"Total faults: {total}, Resolution rate: {resolution_rate:.1f}%")
        else:
            self.log_test("Fault Analytics", False, f"Status: {status}", fault_analytics)
            
        # Test OLT analytics (available to all authenticated users)
        status, olt_analytics = self.make_request("GET", "/analytics/olts", token=self.operator_token)
        if status == 200 and "total_olts" in olt_analytics:
            total = olt_analytics.get("total_olts", 0)
            health = olt_analytics.get("health_percentage", 0)
            self.log_test("OLT Analytics", True, f"Total OLTs: {total}, Health: {health:.1f}%")
        else:
            self.log_test("OLT Analytics", False, f"Status: {status}", olt_analytics)

    def test_role_based_access(self):
        """Test role-based access control"""
        print("=== Testing Role-Based Access Control ===")
        
        if not self.field_engineer_token:
            self.log_test("Role-Based Access", False, "No field engineer token available")
            return
            
        # Test that field engineer cannot create faults (operator only)
        fault_data = {
            "customer_id": "CUST10001",
            "fault_type": "Test Fault",
            "description": "This should fail for field engineer",
            "priority": "low"
        }
        status, response = self.make_request("POST", "/faults", token=self.field_engineer_token, data=fault_data)
        if status == 403:
            self.log_test("Field Engineer Cannot Create Faults", True, "Correctly blocked field engineer from creating faults")
        else:
            self.log_test("Field Engineer Cannot Create Faults", False, f"Expected 403, got {status}", response)
            
        # Test that field engineer cannot access fault analytics (operator only)
        status, response = self.make_request("GET", "/analytics/faults", token=self.field_engineer_token)
        if status == 403:
            self.log_test("Field Engineer Cannot Access Fault Analytics", True, "Correctly blocked field engineer from fault analytics")
        else:
            self.log_test("Field Engineer Cannot Access Fault Analytics", False, f"Expected 403, got {status}", response)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting OLT Management App Backend API Tests")
        print(f"Backend URL: {BASE_URL}")
        print("=" * 60)
        
        try:
            self.test_authentication()
            self.test_olt_monitoring()
            self.test_customer_management()
            self.test_onu_management()
            self.test_fault_management()
            self.test_ai_support()
            self.test_analytics()
            self.test_role_based_access()
            
        except Exception as e:
            self.log_test("Test Suite Execution", False, f"Unexpected error: {str(e)}")
            
        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
                    
        return failed_tests == 0

if __name__ == "__main__":
    test_suite = OLTTestSuite()
    success = test_suite.run_all_tests()
    sys.exit(0 if success else 1)