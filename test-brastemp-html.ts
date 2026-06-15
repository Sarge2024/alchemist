import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = "https://www.brastemp.com.br/experience/gastronomia/steak-tartare-receita-de-tartar/";
  
  try {
    const response = await fetch("http://localhost:4005/api/fetch-html", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.APP_API_KEY || ''
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    console.log("HTML length:", data.html?.length || 0);
    console.log("Sample:\n" + (data.html?.substring(0, 1500) || ""));
  } catch(e) {
    console.error(e);
  }
}
run();
