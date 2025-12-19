// Test Gemini API key
const apiKey = "AIzaSyCupPkSE17EpaxS4aJJA7-BJdijGA-C33s";

async function testGemini() {
  console.log("Testing Gemini API key...\n");
  
  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest', 
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-latest'
  ];
  
  for (const model of models) {
    try {
      console.log(`Trying: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Xin chào, trả lời ngắn gọn bằng tiếng Việt" }]
          }]
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ SUCCESS with ${model}!`);
        console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text);
        console.log("\n=== USE THIS MODEL ===");
        console.log(`Model: ${model}`);
        console.log(`URL: ${url.split('?')[0]}`);
        break;
      } else {
        console.log(`❌ Failed: ${data.error?.message || 'Unknown error'}\n`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}\n`);
    }
  }
}

testGemini();
