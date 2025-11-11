# Users API Testing Scripts

## Step 1: Seed data from seed.sql

## Step 2: Test API Endpoint (Browser Console)

Open your KudoSpace app in the browser (while authenticated), open Chrome DevTools Console, and paste these test scripts:

### Test 1: Default Behavior (exclude current user, no search)

```javascript
// Test 1: Default behavior - should exclude current user
fetch("/api/users")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 1: Default (exclude_me=true, no search)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users count:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 1 failed:", err));
```

### Test 2: Include Current User

```javascript
// Test 2: Include current user
fetch("/api/users?exclude_me=false")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 2: Include current user (exclude_me=false)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users count:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 2 failed:", err));
```

### Test 3: Search Filter (case-insensitive)

```javascript
// Test 3: Search by name
fetch("/api/users?search=alice")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 3: Search filter (search=alice)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users found:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 3 failed:", err));
```

### Test 4: Search by Email

```javascript
// Test 4: Search by email
fetch("/api/users?search=example.com")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 4: Search by email (search=example.com)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users found:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 4 failed:", err));
```

### Test 5: Search with exclude_me=false

```javascript
// Test 5: Search + include current user
fetch("/api/users?search=Johnson&exclude_me=0")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 5: Search + include me (search=Johnson, exclude_me=0)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users found:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 5 failed:", err));
```

### Test 6: Invalid Parameter (search too long)

```javascript
// Test 6: Invalid search parameter (too long)
fetch("/api/users?search=" + "a".repeat(101))
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 6: Invalid parameter (search too long)");
    console.log("Should be ERROR with code INVALID_PARAMETERS");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Error code:", data.error?.code);
    console.log("Response:", data);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 6 failed:", err));
```

### Test 7: Invalid Boolean Value

```javascript
// Test 7: Invalid exclude_me value
fetch("/api/users?exclude_me=invalid")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 7: Invalid boolean (exclude_me=invalid)");
    console.log("Should be ERROR with code INVALID_PARAMETERS");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Error code:", data.error?.code);
    console.log("Response:", data);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 7 failed:", err));
```

### Test 8: Empty Search (should return all users)

```javascript
// Test 8: Empty search string (should return all users)
fetch("/api/users?search=")
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Test 8: Empty search (should return all)");
    console.log("Status:", data.error ? "ERROR" : "SUCCESS");
    console.log("Response:", data);
    console.log("Users count:", data.data?.length || 0);
    console.log("---");
  })
  .catch((err) => console.error("❌ Test 8 failed:", err));
```

### Run All Tests at Once

```javascript
// Run all tests sequentially with delays
async function runAllTests() {
  console.log("🚀 Starting Users API Test Suite...\n");

  const tests = [
    { name: "Default (exclude_me=true)", url: "/api/users" },
    { name: "Include current user", url: "/api/users?exclude_me=false" },
    { name: "Search by name", url: "/api/users?search=alice" },
    { name: "Search by email", url: "/api/users?search=example.com" },
    { name: "Search + include me", url: "/api/users?search=Johnson&exclude_me=0" },
    { name: "Invalid search (too long)", url: "/api/users?search=" + "a".repeat(101) },
    { name: "Invalid boolean", url: "/api/users?exclude_me=invalid" },
    { name: "Empty search", url: "/api/users?search=" },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n📋 Test ${i + 1}/${tests.length}: ${test.name}`);
    console.log(`🔗 URL: ${test.url}`);

    try {
      const response = await fetch(test.url);
      const data = await response.json();

      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`📦 Response:`, data);

      if (data.data) {
        console.log(`👥 Users returned: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(`📝 Sample user:`, data.data[0]);
        }
      }

      if (data.error) {
        console.log(`⚠️ Error Code: ${data.error.code}`);
        console.log(`⚠️ Message: ${data.error.message}`);
      }
    } catch (err) {
      console.error(`❌ Test ${i + 1} failed:`, err);
    }

    console.log("─".repeat(80));

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n✨ Test suite complete!\n");
}

// Run the test suite
runAllTests();
```

## Verification Checklist

- [ ] Users are returned in alphabetical order by display_name
- [ ] Current user is excluded by default (exclude_me=true)
- [ ] Current user is included when exclude_me=false
- [ ] Search is case-insensitive
- [ ] Search works for both display_name and email
- [ ] Empty search returns all users
- [ ] Search length validation works (max 100 chars)
- [ ] Boolean parameter accepts true/false and 1/0
- [ ] Invalid parameters return 400 with details
- [ ] Unauthenticated requests return 401
