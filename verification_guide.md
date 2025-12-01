# End-to-End Verification Guide

Follow these steps to verify PII detection, Knowledge Graph storage, and Contextual Prompt improvements.

## 1. PII Detection Test
**Goal**: Verify that sensitive data is caught locally by the extension *before* it leaves the browser.

**Action**:
1. Open **ChatGPT** or **Gemini**.
2. Paste the following prompt into the input box:
   ```text
   Here is the customer data for debugging:
   Name: Sarah Connor
   Email: sarah.connor@example.com
   Phone: 555-0199
   SSN: 123-45-6789
   Please analyze this record.
   ```
3. Press **Enter** or click **Send**.

**Expected Result**:
- 🛑 **Red Alert Modal** appears: "⚠️ PII Detected!"
- The prompt is **NOT** sent to the AI provider.
- **Backend Logs**: Check your terminal running the backend. You should see:
  ```text
  ALERTS: Received alert from undefined: pii_detected
  DETAILS: {'tool': 'chatgpt', 'piiTypes': ['Email Address', 'Phone Number', 'Social Security Number'], 'riskLevel': 'high'}
  ```

---

## 2. Building the Knowledge Graph
**Goal**: Seed the Supermemory Knowledge Graph with context about your project.

**Action**:
1. Refresh the page to clear the previous state.
2. Enter this safe, context-heavy prompt:
   ```text
   I am building a financial dashboard using Next.js and Tailwind CSS. 
   The application needs to display real-time stock data and must follow strict accessibility (WCAG) guidelines.
   ```
3. Press **Enter**.
4. If the "Improve Prompt" modal appears, you can choose a variant or "Keep Original". The important part is that the final prompt is submitted.

**Expected Result**:
- The prompt is sent to the AI provider.
- **Backend Logs**: You should see activity indicating storage:
  ```text
  INFO:     POST /prompt-variants/ ...
  (In the background) Adding memory to Supermemory...
  ```

---

## 3. Contextual Prompt Improvement
**Goal**: Verify that the system remembers your context (Next.js, Tailwind, Accessibility) when improving a vague prompt.

**Action**:
1. Enter a generic follow-up prompt:
   ```text
   Write a component to display a user profile card.
   ```
2. Press **Enter**.

**Expected Result**:
- ✨ **Improvement Modal** appears.
- Look closely at the **Variants**. They should be "Contextually Aware".
- Instead of just "Write a user profile card", the suggestions should look like:
  > "Create a **Next.js** component for a user profile card using **Tailwind CSS** that displays real-time data and ensures **WCAG accessibility compliance**."
- **Backend Logs**:
  ```text
  Searching Supermemory for: Write a component...
  Relevant Context found: ["I am building a financial dashboard using Next.js..."]
  Generating variants with Gemini...
  ```

## How it Works Under the Hood

1.  **Interception**: The extension catches your "Write a component..." prompt.
2.  **API Call**: It sends this text to your backend (`POST /prompt-variants`).
3.  **KG Search**: The backend asks Supermemory: *"Do we have any context related to this user or topic?"* -> Supermemory returns the "Next.js/Financial/Accessibility" memory.
4.  **LLM Generation**: The backend sends a prompt to **Gemini**:
    > *User Prompt*: "Write a component..."
    > *Context*: "User is building a financial app with Next.js..."
    > *Task*: "Generate 3 improved variants."
5.  **Response**: Gemini generates variants that *merge* the user's intent with the retrieved context.
6.  **Display**: The extension shows you these "smart" suggestions.
