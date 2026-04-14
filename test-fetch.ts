import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGemini() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  console.log("Checking API Key: ", apiKey ? "Found key starting with " + apiKey.substring(0, 10) : "MISSING!");
  
  if (!apiKey) return;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, reply with just 'OK'" }] }]
      })
    });
    
    console.log("Status:", res.status, res.statusText);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

testGemini();
