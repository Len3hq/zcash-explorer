#!/usr/bin/env node

/**
 * Zcash Explorer - ElizaOS Agent Setup Script
 * This script registers the agent as a participant in the chat channel
 */

const AGENT_ID = "cb11f567-f3a2-011c-bdfe-872f7453f6d1";
const CHANNEL_ID = "cb11f567-f3a2-011c-bdfe-872f7453f6d1";
const ELIZA_URL = "https://zcashagent103-production.up.railway.app";

async function checkServerRunning(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch (error) {
    return false;
  }
}

async function addAgentToChannel(elizaUrl, channelId, agentId) {
  const url = `${elizaUrl}/api/messaging/central-channels/${channelId}/agents`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agentId }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log("✅ Agent successfully added to channel!");
    console.log("");
    console.log("Response:", JSON.stringify(data));
    console.log("");
    console.log("🎉 Setup complete! The agent widget is now ready.");
    console.log("");
  } else {
    console.log("⚠️  Response from server:");
    console.log(JSON.stringify(data));
    console.log("");
    console.log("Note: If you see an error that the agent is already in the channel, that's OK!");
    console.log("The setup is complete and you can proceed to use the chat widget.");
    console.log("");
  }
}

async function main() {
  console.log("🤖 Setting up Zcash Agent integration...");
  console.log("");
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`Channel ID: ${CHANNEL_ID}`);
  console.log(`ElizaOS URL: ${ELIZA_URL}`);
  console.log("");

  console.log("📡 Checking if ElizaOS server is running...");
  
  const isRunning = await checkServerRunning(ELIZA_URL);
  
  if (!isRunning) {
    console.log(`❌ Error: ElizaOS server is not running on ${ELIZA_URL}`);
    console.log("");
    console.log("Please ensure the ElizaOS agent is running.");
    console.log("");
    process.exit(1);
  }

  console.log("✅ ElizaOS server is running");
  console.log("");

  console.log("➕ Adding agent to channel...");
  await addAgentToChannel(ELIZA_URL, CHANNEL_ID, AGENT_ID);
}

main().catch((error) => {
  console.error("❌ Error during setup:", error.message);
  process.exit(1);
});
