# Kudos API Testing Scripts

## Step 1: Seed data from `supabase/seed.sql`

Ensure your local Supabase instance contains the seeded profiles/kudos so the recipient IDs below exist.

## Step 2: Prepare Test Helpers in Browser Console

Open the KudoSpace app in your browser (while authenticated). In DevTools Console, you can optionally paste the helper function to fetch a recipient list:

```javascript
async function listUsersForKudos() {
  const res = await fetch("/api/users?exclude_me=false");
  const data = await res.json();
  console.table(data.data?.map((user) => ({ id: user.id, name: user.display_name, email: user.email })));
  return data;
}
```

Call `listUsersForKudos()` to see available IDs for testing.

## Step 3: Run Individual Test Scripts

### Test 1: Successful Kudo Creation (201)

```javascript
// Test 1: Successful kudo creation
(async function testCreateKudoSuccess() {
  const payload = {
    recipient_id: "REPLACE_WITH_OTHER_USER_ID",
    message: "🎉 Huge thanks for helping with the release coordination!",
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 1: Create kudo success");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

### Test 2: Invalid Recipient UUID (400 INVALID_RECIPIENT)

```javascript
// Test 2: Invalid recipient UUID
(async function testInvalidRecipientUuid() {
  const payload = {
    recipient_id: "not-a-uuid",
    message: "Appreciate your help!",
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 2: Invalid recipient UUID");
  console.log("Expect 400 INVALID_RECIPIENT");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

### Test 3: Nonexistent Recipient (400 INVALID_RECIPIENT)

```javascript
// Test 3: Recipient not found
(async function testRecipientNotFound() {
  const payload = {
    recipient_id: "99999999-9999-9999-9999-999999999999",
    message: "Thanks for lending a hand!",
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 3: Recipient not found");
  console.log("Expect 400 INVALID_RECIPIENT");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

### Test 4: Self Kudo Blocked (400 SELF_KUDO_NOT_ALLOWED)

```javascript
// Test 4: Self kudos attempts are blocked
(async function testSelfKudoBlocked() {
  const me = await fetch("/api/users?exclude_me=false").then((res) => res.json());
  const myProfile = me.data?.find((user) => user.id === me.data?.[0]?.id);

  const payload = {
    recipient_id: myProfile?.id ?? "REPLACE_WITH_YOUR_USER_ID",
    message: "Testing self kudos blocking",
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 4: Self kudos blocked");
  console.log("Expect 400 SELF_KUDO_NOT_ALLOWED");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

> Tip: Replace `myProfile?.id` with your user ID if the above lookup does not match your setup.

### Test 5: Message Too Short (400 MESSAGE_TOO_SHORT)

```javascript
// Test 5: Message too short
(async function testMessageTooShort() {
  const payload = {
    recipient_id: "REPLACE_WITH_OTHER_USER_ID",
    message: "",
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 5: Message too short");
  console.log("Expect 400 MESSAGE_TOO_SHORT");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

### Test 6: Message Too Long (400 MESSAGE_TOO_LONG)

```javascript
// Test 6: Message too long
(async function testMessageTooLong() {
  const longMessage = "a".repeat(1001);
  const payload = {
    recipient_id: "REPLACE_WITH_OTHER_USER_ID",
    message: longMessage,
  };

  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("✅ Test 6: Message too long");
  console.log("Expect 400 MESSAGE_TOO_LONG");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

### Test 7: Missing Authentication (401 UNAUTHORIZED)

```javascript
// Test 7: Missing authentication
(async function testMissingAuth() {
  // Temporarily remove cookies by opening a new window or using fetch with omit credentials.
  const response = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient_id: "REPLACE_WITH_OTHER_USER_ID",
      message: "Should fail due to missing auth",
    }),
    credentials: "omit",
  });

  const data = await response.json();
  console.log("✅ Test 7: Missing authentication");
  console.log("Expect 401 UNAUTHORIZED");
  console.log("Status:", response.status);
  console.log("Response:", data);
})();
```

## Step 4: Run All Tests Sequentially (Optional)

```javascript
async function runKudosTestSuite() {
  console.log("🚀 Starting Kudos API Test Suite...");

  const tests = [
    {
      name: "Create success",
      payload: {
        recipient_id: "2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5",
        message: "🙌 Thanks for mentoring me through the new feature!",
      },
      expect: { status: 201 },
    },
    {
      name: "Invalid recipient UUID",
      payload: { recipient_id: "not-a-uuid", message: "Helper text" },
      expect: { status: 400, code: "INVALID_RECIPIENT" },
    },
    {
      name: "Recipient not found",
      payload: {
        recipient_id: "99999999-9999-9999-9999-999999999999",
        message: "Helper text",
      },
      expect: { status: 400, code: "INVALID_RECIPIENT" },
    },
    {
      name: "Self kudos blocked",
      payload: {
        recipient_id: "119371be-1ca5-4f96-847f-fb3f343795fc",
        message: "Testing self kudos block",
      },
      expect: { status: 400, code: "SELF_KUDO_NOT_ALLOWED" },
    },
    {
      name: "Message too short",
      payload: { recipient_id: "2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5", message: "" },
      expect: { status: 400, code: "MESSAGE_TOO_SHORT" },
    },
    {
      name: "Message too long",
      payload: {
        recipient_id: "2f2f8f84-70d1-4fae-9b9b-4d1f4f08c5f5",
        message: "a".repeat(1001),
      },
      expect: { status: 400, code: "MESSAGE_TOO_LONG" },
    },
  ];

  for (const test of tests) {
    const { name, payload, expect } = test;
    console.log(`\n📋 ${name}`);
    const response = await fetch("/api/kudos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", data);

    if (expect.status && response.status !== expect.status) {
      console.warn(`⚠️ Expected status ${expect.status} but received ${response.status}`);
    }

    if (expect.code && data.error?.code !== expect.code) {
      console.warn(`⚠️ Expected error code ${expect.code} but received ${data.error?.code}`);
    }
  }

  // Missing auth scenario (run last; requires omitting credentials)
  const unauthenticatedResponse = await fetch("/api/kudos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({
      recipient_id: "REPLACE_WITH_OTHER_USER_ID",
      message: "This should fail without auth",
    }),
  });
  const unauthenticatedData = await unauthenticatedResponse.json();
  console.log("\n📋 Missing auth");
  console.log("Status:", unauthenticatedResponse.status);
  console.log("Response:", unauthenticatedData);
}

// Run the suite
runKudosTestSuite();
```

## Verification Checklist

- [ ] Successful request returns `201` with populated sender/recipient details.
- [ ] Invalid UUID and nonexistent recipients both return `400 INVALID_RECIPIENT`.
- [ ] Self kudos produces `400 SELF_KUDO_NOT_ALLOWED`.
- [ ] Empty message yields `400 MESSAGE_TOO_SHORT`.
- [ ] Messages over 1000 characters return `400 MESSAGE_TOO_LONG`.
- [ ] Missing cookies/credentials returns `401 UNAUTHORIZED`.

---

# DELETE Kudo API Testing Scripts

## Combined DELETE Test Suite

Paste this into Chrome DevTools Console (while authenticated):

```javascript
async function runDeleteKudosTestSuite() {
  console.log("🚀 Starting DELETE Kudos API Test Suite...");

  // Helper to create a test kudo we can delete
  async function createTestKudo() {
    const usersRes = await fetch("/api/users?exclude_me=true");
    const usersData = await usersRes.json();
    const otherUser = usersData.data?.[0];

    if (!otherUser) {
      console.error("❌ Need at least one other user in database");
      return null;
    }

    const response = await fetch("/api/kudos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: otherUser.id,
        message: "Test kudo for deletion testing 🧪",
      }),
    });

    const data = await response.json();
    return data.id ? data : null;
  }

  // Test 1: Successful deletion (200)
  console.log("\n📋 Test 1: Successful deletion");
  try {
    const testKudo = await createTestKudo();
    if (!testKudo) {
      console.error("❌ Failed to create test kudo");
    } else {
      const response = await fetch(`/api/kudos/${testKudo.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      console.log("Status:", response.status);
      console.log("Response:", data);

      if (response.status === 200) {
        console.log("✅ PASS: Successfully deleted kudo");
      } else {
        console.warn(`⚠️ FAIL: Expected 200 but got ${response.status}`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 2: Invalid UUID format (400 INVALID_UUID)
  console.log("\n📋 Test 2: Invalid UUID format");
  try {
    const response = await fetch("/api/kudos/not-a-valid-uuid", {
      method: "DELETE",
    });
    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", data);

    if (response.status === 400 && data.error?.code === "INVALID_UUID") {
      console.log("✅ PASS: Invalid UUID correctly rejected");
    } else {
      console.warn(`⚠️ FAIL: Expected 400 INVALID_UUID but got ${response.status} ${data.error?.code}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 3: Kudo not found (404 KUDO_NOT_FOUND)
  console.log("\n📋 Test 3: Kudo not found");
  try {
    const response = await fetch("/api/kudos/99999999-9999-9999-9999-999999999999", {
      method: "DELETE",
    });
    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", data);

    if (response.status === 404 && data.error?.code === "KUDO_NOT_FOUND") {
      console.log("✅ PASS: Non-existent kudo correctly handled");
    } else {
      console.warn(`⚠️ FAIL: Expected 404 KUDO_NOT_FOUND but got ${response.status} ${data.error?.code}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 4: Unauthorized deletion attempt (403 FORBIDDEN)
  console.log("\n📋 Test 4: Unauthorized deletion attempt");
  try {
    // Get a kudo that belongs to someone else
    const kudosRes = await fetch("/api/kudos");
    const kudosData = await kudosRes.json();

    const usersRes = await fetch("/api/users?exclude_me=false");
    const usersData = await usersRes.json();
    const myId = usersData.data?.[0]?.id;

    const otherUserKudo = kudosData.data?.find((k) => k.sender_id !== myId);

    if (!otherUserKudo) {
      console.warn("⚠️ SKIP: No kudos from other users found for testing");
    } else {
      const response = await fetch(`/api/kudos/${otherUserKudo.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      console.log("Status:", response.status);
      console.log("Response:", data);

      if (response.status === 403 && data.error?.code === "FORBIDDEN") {
        console.log("✅ PASS: Unauthorized deletion correctly blocked");
      } else {
        console.warn(`⚠️ FAIL: Expected 403 FORBIDDEN but got ${response.status} ${data.error?.code}`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 5: Missing authentication (401 UNAUTHORIZED)
  console.log("\n📋 Test 5: Missing authentication");
  try {
    const testKudo = await createTestKudo();
    if (!testKudo) {
      console.warn("⚠️ SKIP: Could not create test kudo");
    } else {
      const response = await fetch(`/api/kudos/${testKudo.id}`, {
        method: "DELETE",
        credentials: "omit",
      });
      const data = await response.json();

      console.log("Status:", response.status);
      console.log("Response:", data);

      if (response.status === 401 && data.error?.code === "UNAUTHORIZED") {
        console.log("✅ PASS: Unauthenticated request correctly rejected");
      } else {
        console.warn(`⚠️ FAIL: Expected 401 UNAUTHORIZED but got ${response.status} ${data.error?.code}`);
      }

      // Cleanup: delete the test kudo with auth
      await fetch(`/api/kudos/${testKudo.id}`, { method: "DELETE" });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n✨ DELETE Kudos Test Suite Complete!");
}

// Run the test suite
runDeleteKudosTestSuite();
```
